// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
import { createHash } from "node:crypto";
import type { Center } from "./center.ts";
import { one, projectContext } from "./alarm-rule.ts";
import { realtimeSource } from "./client-points.ts";
import { stamp } from "./connection-receipts.ts";
import { HttpError, type Context } from "./shared.ts";
import type { Store } from "./store.ts";

const conflict = (message: string) => new HttpError(409, message);
const scalar = (v: unknown) =>
  typeof v === "boolean" ||
  Number.isFinite(v) ||
  (typeof v === "string" && v.length <= 512);
export async function dictionaryBinding(
  center: Center,
  token: string,
  context: Context,
) {
  if (
    context.kind !== "calculation" ||
    context.calcMenu !== "calculate-global-variable" ||
    !context.object
  )
    throw conflict("请在计算工程数据词典勾选一个 IO 变量。");
  await center.require(token, context);
  const list = (type: string, groupId: string) =>
    center.call(token, "/calculation/projectJsonData", {
      projectId: context.projectId,
      type,
      groupId,
    });
  const row = one<any>(
    (await list("globalVars", context.group || "-1")).filter(
      (r: any) => String(r.id) === context.object,
    ),
    "词典选区",
  );
  if (!["IO_Number", "IO_Boolean", "IO_String"].includes(row.type))
    throw conflict("选中的是内存变量，请选择带数据源映射的 IO 变量。");
  if (!row.name || !row.TagName || !row.dataSourceName)
    throw conflict("请先保存完整的 IO 变量映射。");
  const all = await list("globalVars", "-1");
  if (all.filter((v: any) => v.name === row.name).length !== 1)
    throw conflict("词典变量重名，无法确认运行时全局变量的归属。");
  const link = one<any>(
    (await list("dataAccess", "-1")).filter(
      (r: any) => r.name === row.dataSourceName,
    ),
    "工程别名",
  );
  const source = one<any>(
    (await center.call(token, "/dataSource/getAllDataSource")).filter(
      (r: any) => r.name === link.connectName,
    ),
    "平台源",
  );
  const sourceContext = projectContext("datasource", source.guid);
  await center.require(token, sourceContext);
  if (
    row.dataSourceType !== link.type ||
    link.type !== source.type ||
    !realtimeSource(source.type, source.config)
  )
    throw conflict("当前映射未核实为 KIO 实时源。");
  const upstream = projectContext("collection", source.config.engineeringId);
  await center.require(token, upstream);
  const point = one<any>(
    (
      await center.call(token, "/collect/variables", {
        projectId: upstream.projectId,
        groupId: "-1",
      })
    ).filter((r: any) => r.tagName === row.TagName),
    "映射采集点",
  );
  const dependencies = [sourceContext, upstream];
  for (const ctx of [context, ...dependencies])
    await center.require(token, ctx);
  return {
    name: String(row.name),
    alias: String(row.dataSourceName),
    tag: String(row.TagName),
    initial: row.value,
    device: point.deviceName,
    endpoint: {
      host: source.config.restful_ip,
      port: String(source.config.restful_port),
      method: source.config.getVariableListMethod,
    },
    source: source.name,
    collection: source.config.engineeringName || upstream.projectId,
    dependencies,
    signature: stamp([
      context.projectId,
      row,
      link,
      source.guid,
      source.config,
      point,
    ]),
  };
}
export type DictionaryBinding = Awaited<ReturnType<typeof dictionaryBinding>>;
export async function dictionaryEndpoints(
  center: Center,
  token: string,
  b: DictionaryBinding,
) {
  if (b.endpoint.method !== "restful")
    throw conflict("当前取证支持指向数采实例的 REST 读取路径。");
  const resources = await center.call(
    token,
    "/opscenter/api/v1/opsResourceData",
  );
  function instance(
    context: Context,
    type: number,
    match: (a: any) => boolean,
  ) {
    const app = one<any>(
      resources.appResource.filter(
        (a: any) =>
          a.projectType === type &&
          a.canOperate === true &&
          a.projectId === context.projectId &&
          match(a),
      ),
      "映射的运行实例",
    );
    const owner = one<any>(
      resources.nodeProApp.filter((n: any) =>
        n.appPros.some((a: any) => a.appId === app.appId),
      ),
      "实例节点归属",
    );
    const node = one<any>(
      resources.nodeResource.filter((n: any) => n.nodeId === owner.nodeId),
      "节点",
    );
    return {
      address: node.address,
      dep: { ...context, runtimeApp: app.appId, runtimeNode: node.nodeId },
    };
  }
  const [ds, io] = b.dependencies;
  const source = instance(ds, 3, (a) => a.appName === b.source);
  const host = ["localhost", "::1", "127.0.0.1"].includes(b.endpoint.host)
    ? source.address
    : b.endpoint.host;
  const upstream = instance(io, 2, (a) => String(a.port) === b.endpoint.port);
  if (!host || host !== upstream.address)
    throw conflict("保存的读取地址与映射的数采实例不一致。");
  return [source.dep, upstream.dep];
}
export function probeText(
  binding: Pick<DictionaryBinding, "name" | "alias" | "tag">,
) {
  const name = JSON.stringify(binding.name),
    alias = JSON.stringify(binding.alias),
    tag = JSON.stringify(binding.tag);
  return [
    "const before = global[" + name + "];",
    "const rows = [];",
    "let code = null;",
    "try { code = await KIOQueryDatas(" +
      alias +
      ", [" +
      tag +
      "], rows); } catch (error) {}",
    "const matches = rows.filter(row => row.N === " + tag + ");",
    "OutParam.dictionary = { name: " +
      name +
      ", alias: " +
      alias +
      ", tag: " +
      tag +
      ", before, after: global[" +
      name +
      "], code, sample: code === 0 && matches.length === 1 ? matches[0] : null };",
    "endResponse(RequestID);",
  ].join("\n");
}
export function probeMatches(
  binding: DictionaryBinding,
  source: string,
  digest: string,
) {
  return (
    createHash("sha256").update(source).digest("hex") === digest &&
    source.replace(/\r\n/g, "\n").trimEnd() === probeText(binding)
  );
}
export function dictionaryReading(b: DictionaryBinding, raw: any) {
  if (
    !raw ||
    raw.name !== b.name ||
    raw.alias !== b.alias ||
    raw.tag !== b.tag ||
    !scalar(raw.before) ||
    !scalar(raw.after) ||
    !(raw.code === null || Number.isSafeInteger(raw.code))
  )
    throw conflict("本次回包与选区不符，或缺少实例词典读值。");
  const s = raw.sample;
  if (
    s !== null &&
    (raw.code !== 0 ||
      s?.N !== b.tag ||
      (s.V != null && !scalar(s.V)) ||
      !scalar(s.Q) ||
      typeof s.Q === "boolean" ||
      !(
        (typeof s.T === "string" && s.T.length > 0 && s.T.length <= 80) ||
        Number.isFinite(s.T)
      ))
  )
    throw conflict("采集样本缺少匹配的点名、质量或源时间。");
  return {
    before: raw.before,
    after: raw.after,
    code: raw.code,
    sample: s === null ? null : { value: s.V ?? null, quality: s.Q, time: s.T },
  };
}
export async function dictionaryReport(
  center: Center,
  store: Store,
  owner: string,
  token: string,
  chat: string,
  context: Context,
  permitted: (r: any) => Promise<boolean>,
) {
  store.chat(owner, chat);
  const b = await dictionaryBinding(center, token, context);
  const lines = [
    "已保存 · " + b.name + " · 词典初值 " + JSON.stringify(b.initial),
    "映射 · " +
      b.alias +
      " → " +
      b.source +
      " → " +
      b.collection +
      " / " +
      b.device +
      " / " +
      b.tag,
  ];
  const dependencies: Context[] = [...b.dependencies];
  const rows = store.db
    .prepare(
      "SELECT * FROM calc_captures WHERE chat=? AND project=? AND json_extract(result,'$.dictionary.row')=? ORDER BY json_extract(result,'$.dictionary.at'),rowid",
    )
    .all(chat, context.projectId, context.object);
  const good = new Map<string, unknown>();
  let matched = 0,
    historical = 0;
  for (const row of rows) {
    if (!(await permitted(row))) continue;
    const r = JSON.parse(String(row.result)),
      d = r.dictionary;
    const deps = JSON.parse(String(row.dependencies));
    const current = d.signature === b.signature;
    if (current) matched++;
    else historical++;
    dependencies.push(...deps);
    const s = d.reading.sample,
      stable = d.reading.before === d.reading.after;
    const key = JSON.stringify([d.app, d.route, d.signature]);
    let comparison = "";
    if (
      current &&
      stable &&
      s &&
      [0, "0", "Bad"].includes(s.quality) &&
      good.has(key)
    )
      comparison =
        good.get(key) === d.reading.after
          ? "；与此前良好样本的实例词典值相同"
          : "；与此前良好样本的实例词典值不同";
    if (current && stable && s && [192, "192", "Good"].includes(s.quality))
      good.set(key, d.reading.after);
    lines.push(
      (current ? "采样时映射与当前一致" : "历史映射") +
        " · " +
        r.appName +
        " · " +
        d.at +
        " · 实例词典值 " +
        JSON.stringify(d.reading.after) +
        (stable
          ? ""
          : "（查询前 " +
            JSON.stringify(d.reading.before) +
            "，查询期间发生变化）") +
        " · KC 返回码 " +
        JSON.stringify(d.reading.code) +
        (s
          ? " · 点值 " +
            JSON.stringify(s.value) +
            " · 质量 " +
            s.quality +
            " · 源时间 " +
            s.time
          : " · 未取得唯一点样本，质量与源时间未知") +
        comparison,
    );
  }
  if (!matched)
    lines.push(
      "本段对话尚无当前映射的 App 实测。请在目标工程保存并部署下方只读请求脚本，再关联该 App 的一次实际回包。",
    );
  lines.push(
    "质量和源时间来自 App 查询的点样本。实例词典只提供变量值。每行只说明标注时刻。",
  );
  if (
    !(await permitted({
      context: JSON.stringify(context),
      dependencies: JSON.stringify(dependencies),
    }))
  )
    throw new HttpError(403, "关联工程权限已变更");
  return {
    lines,
    dependencies,
    probe: probeText(b),
    summary: { matched, historical },
  };
}
// end
