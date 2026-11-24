// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
import { createHash, randomUUID } from "node:crypto";
import type { Center } from "./center.ts";
import { calcList } from "./calc-config.ts";
import { clientVariableRows } from "./client-variables.ts";
import { realtimeSource } from "./client-points.ts";
import type { Track } from "./query-activity.ts";
import { visibleProjects } from "./solution-start.ts";
import type { Store } from "./store.ts";
import { HttpError, type Context, type Evidence } from "./shared.ts";

const roles = {
  collection: "数采",
  datasource: "数据源",
  client: "客户端",
  calculation: "计算",
  alarm: "报警",
};
type Kind = keyof typeof roles;
type Reader = Pick<Center, "allowed" | "call" | "require" | "evidence">;
type Project = { context: Context; name: string };
type Link = {
  consumer: Project;
  alias: string;
  target: string;
  guid?: string;
  type?: string;
  maps: string[];
};
type Edge = {
  from: string;
  to: string;
  usage: string;
  detail: string;
  alias?: string;
};
type Row = Record<string, any>;
const key = (ctx: Context) => ctx.kind + ":" + ctx.projectId;
const make = (kind: Kind, projectId: string): Context => ({
  kind,
  projectId,
  object: "",
  dirty: false,
});
function root(ctx: Context) {
  if (!ctx.projectId || ctx.kind === "general") return;
  const kind = ["page", "report", "scene"].includes(ctx.kind)
    ? "client"
    : ["request", "period"].includes(ctx.kind)
      ? "calculation"
      : (ctx.kind as Kind);
  return make(kind, ctx.projectId);
}
function rows(value: unknown): Row[] {
  if (!Array.isArray(value))
    throw new HttpError(502, "工程引用列表格式待核实。");
  return value;
}
async function connections(
  reader: Reader,
  token: string,
  consumer: Project,
): Promise<Link[]> {
  const { kind, projectId } = consumer.context;
  const read = (route: string, params = {}) =>
    reader.call(token, route, { projectId, ...params });
  if (kind === "client") {
    const [list, payload] = await Promise.all([
      read("/client/getDataSourceList"),
      read("/client/getVariableList"),
    ]);
    const aliases = rows(list.message),
      vars = clientVariableRows(payload);
    return aliases
      .filter(
        (a) =>
          a.name &&
          a.dataSourceName &&
          aliases.filter((b) => b.name === a.name).length === 1,
      )
      .map((a) => ({
        consumer,
        alias: a.name,
        target: a.dataSourceName,
        maps: vars
          .filter(
            (v) =>
              v.isMap === true &&
              a.id &&
              v.projectDataSourceId === a.id &&
              a.appName &&
              v.dataSourceItem?.appName === a.appName &&
              v.dataSourceItem.tagName,
          )
          .map((v) => v.dataSourceItem.tagName + " → " + v.name),
      }));
  }
  if (kind === "calculation") {
    const [aliases, vars] = await Promise.all([
      calcList(read, "dataAccess", "-1"),
      calcList(read, "globalVars", "-1"),
    ]);
    return aliases.items
      .filter(
        (a) =>
          a.connectName &&
          a.type &&
          aliases.items.filter((b) => b.name === a.name).length === 1,
      )
      .map((a) => ({
        consumer,
        alias: a.name,
        target: a.connectName,
        type: a.type,
        maps: vars.items
          .filter(
            (v) =>
              ["IO_Number", "IO_String", "IO_Boolean"].includes(v.type) &&
              v.dataSourceName === a.name &&
              v.dataSourceType === a.type &&
              v.TagName,
          )
          .map((v) => v.TagName + " → " + v.name),
      }));
  }
  if (kind === "alarm") {
    const list = await reader.call(token, "/alarm/dataSource", {
      guid: projectId,
    });
    if (!list || typeof list !== "object")
      throw new HttpError(502, "报警连接格式待核实。");
    return (Object.values(list) as Row[])
      .filter((a) => a.name && a.dm_guid && a.dm_name)
      .map((a) => ({
        consumer,
        alias: a.name,
        target: a.dm_name,
        guid: a.dm_guid,
        maps: [],
      }));
  }
  return [];
}
export function connectedEdges(seed: string, edges: Edge[]) {
  const members = new Set([seed]);
  for (let size = -1; size !== members.size; ) {
    size = members.size;
    for (const edge of edges)
      if (members.has(edge.from) || members.has(edge.to)) {
        members.add(edge.from);
        members.add(edge.to);
      }
  }
  return {
    members,
    edges: edges
      .filter((e) => members.has(e.from))
      .sort((a, b) =>
        (a.from + a.to + a.detail).localeCompare(b.from + b.to + b.detail),
      ),
  };
}
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
// A turn can contain a requirement followed by a question. Establish what the
// statement refers to before treating it as business context for this component.
export function attributedStatement(
  raw: string,
  ctx: Context,
  names: Set<string>,
) {
  if (
    raw.length > 3000 ||
    /口令|密码|密钥|token|secret|password|https?:|`|[A-Za-z\d+/=_@%!#$^-]{18,}/i.test(
      raw,
    )
  )
    return;
  const parts = raw.match(/[^。！？?!；;\n]+[。！？?!；;]?/gu) ?? [];
  const clauses = parts
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !/[？?]$/.test(s) &&
        !/^(?:请问|请告诉|请从|请查|麻烦查|如果缺|第一步|下一步)/.test(s),
    );
  const hasGoal = (s: string) =>
    /需要|目标|希望|要求|用于|我要|想要|想把|改为|改成|只统计|只看|统计范围|负责|用来|以.+为准|按.+计算|应当|必须|用于|采集|记录|显示|检测|生成|汇总|输出|监测|触发|恢复/.test(
      s,
    );
  if (!clauses.some(hasGoal)) return;
  const text = clauses.join(" ");
  const objects: Partial<Record<Context["kind"], string>> = {
    page: "画面|页面|控件",
    scene: "场景|部件",
    report: "报表|单元格",
    period: "周期脚本|脚本",
    request: "请求脚本|脚本",
    client: "客户端工程|客户端画面",
    calculation: "计算工程|计算脚本",
    alarm: "报警工程|报警词条",
    collection: "数采工程|采集工程|设备",
    datasource: "数据源",
  };
  const bound = objects[ctx.kind];
  const anchor =
    [...names].some(
      (n) =>
        n.length >= 2 &&
        text.toLocaleLowerCase().includes(n.toLocaleLowerCase()),
    ) ||
    (bound &&
      new RegExp("(?:当前|本|这个|选中的|该)(?:" + bound + ")").test(text));
  if (anchor && text.length <= 650) return text;
}
// end
const direct: Track = async (_label, work) => work();
export async function solutionOverview(
  reader: Reader,
  token: string,
  store: Store,
  owner: string,
  chat: string,
  entry: Context,
  permitted: (row: Row) => Promise<boolean>,
  track: Track = direct,
) {
  const thread = store.chat(owner, chat),
    plan = store.plan(owner, String(thread.plan));
  const seed = root(entry);
  if (!seed)
    throw new HttpError(400, "请从方案内任一工程入口查看已保存的引用。");
  await reader.require(token, seed);
  const history = store.db
    .prepare(
      `SELECT r.id,r.context,r.dependencies,r.question,r.created,c.title FROM runs r
    JOIN chats c ON c.id=r.chat WHERE c.plan=? AND r.status='done' AND r.intent='ask' ORDER BY r.rowid DESC LIMIT 160`,
    )
    .all(plan.id);
  const nodes = new Map<string, Project>(),
    deps = new Map<string, Context>();
  const depend = (ctx: Context) => deps.set(JSON.stringify(ctx), ctx);
  const add = (ctx: Context, name?: string) => {
    const loc = key(ctx);
    if (!nodes.has(loc) || name)
      nodes.set(loc, { context: ctx, name: name || ctx.projectId });
  };
  let incomplete = false;
  async function optional<T>(work: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await work();
    } catch (e) {
      if (!(e instanceof HttpError) || ![403, 404, 409, 502].includes(e.status))
        throw e;
      incomplete = true;
      return fallback;
    }
  }
  add(seed);
  await track(
    "查找当前账号可读的关联工程",
    async () => {
      const kinds = Object.keys(roles) as Kind[];
      const lists = await Promise.all(
        kinds.map((k) => optional(() => visibleProjects(reader, token, k), [])),
      );
      for (const list of lists)
        for (const project of list) add(project.context, project.name);
      const seen = new Set<string>();
      for (const row of history) {
        const ctx = root(JSON.parse(String(row.context)));
        if (!ctx || nodes.has(key(ctx)) || seen.has(key(ctx))) continue;
        if (seen.size >= 20) {
          incomplete = true;
          break;
        }
        seen.add(key(ctx));
        if (await reader.allowed(token, ctx)) add(ctx);
      }
      return nodes.size;
    },
    (n) => "核查 " + n + " 个工程入口",
  );
  const graph = await track(
    "追踪数据源、工程别名和变量映射",
    async () => {
      const definitions = await optional(
        async () =>
          rows(await reader.call(token, "/dataSource/getAllDataSource")),
        [],
      );
      const edges: Edge[] = [];
      const links: Link[] = [];
      const consumers = [...nodes.values()].filter((p) =>
        ["client", "calculation", "alarm"].includes(p.context.kind),
      );
      for (let i = 0; i < consumers.length; i += 5) {
        const batch = await Promise.all(
          consumers
            .slice(i, i + 5)
            .map((p) => optional(() => connections(reader, token, p), [])),
        );
        links.push(...batch.flat());
      }
      let alarmDirectory: Row[] | undefined;
      for (const def of definitions) {
        if (typeof def.guid !== "string" || !def.name) continue;
        const source = make("datasource", def.guid);
        const matched = links.filter(
          (l) =>
            l.target === def.name &&
            (!l.type || l.type === def.type) &&
            (l.guid
              ? l.guid === def.guid
              : definitions.filter((d) => d.name === def.name).length === 1),
        );
        if (
          !matched.length &&
          !nodes.has(key(source)) &&
          !nodes.has("collection:" + def.config?.engineeringId) &&
          !(
            def.type === "AlarmEngineering" &&
            [...nodes.values()].some(
              (p) =>
                p.context.kind === "alarm" &&
                p.name === def.config?.alarmProject,
            )
          )
        )
          continue;
        if (!(await reader.allowed(token, source))) continue;
        add(source, def.name);
        for (const link of matched) {
          const maps = [...new Set(link.maps)].sort();
          edges.push({
            from: key(source),
            to: key(link.consumer.context),
            alias: link.alias,
            usage: maps.length ? "变量映射" : "工程连接",
            detail:
              "工程别名 " +
              link.alias +
              (maps.length
                ? "，点到变量 " +
                  maps.slice(0, 5).join("、") +
                  (maps.length > 5 ? " 等 " + maps.length + " 项" : "")
                : ""),
          });
        }
        let producer: Context | undefined;
        if (realtimeSource(def.type, def.config))
          producer = make("collection", def.config.engineeringId);
        if (def.type === "AlarmEngineering" && def.config?.alarmProject) {
          alarmDirectory ??= await optional(
            async () => rows(await reader.call(token, "/alarm/allProjects")),
            [],
          );
          const items = alarmDirectory.filter(
            (p) => p.name === def.config.alarmProject,
          );
          if (items.length === 1 && items[0].guid)
            producer = make("alarm", items[0].guid);
        }
        if (producer && (await reader.allowed(token, producer))) {
          if (!nodes.has(key(producer)))
            add(
              producer,
              producer.kind === "alarm" ? def.config.alarmProject : undefined,
            );
          edges.push({
            from: key(producer),
            to: key(source),
            usage: producer.kind === "alarm" ? "报警事件源" : "实时数据源",
            detail:
              producer.kind === "alarm"
                ? "源配置中的报警工程与目录唯一匹配"
                : "源配置保存了数采工程标识",
          });
        }
      }
      return connectedEdges(key(seed), edges);
    },
    (g) =>
      "沿保存的配置连到 " +
      g.members.size +
      " 个工程，核对 " +
      g.edges.length +
      " 条关系",
  );
  for (const loc of graph.members) depend(nodes.get(loc)!.context);
  const inherit = (row: Row) => {
    depend(JSON.parse(String(row.context)));
    for (const ctx of JSON.parse(String(row.dependencies))) depend(ctx);
  };
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  const flowUses:{sourceId:string;point:string;direction:string}[]=[];
// end
  const uses = await track(
    "核对方案中已访问对象的读写方向",
    async () => {
      const result = new Set<string>(),
        visited = new Set<string>();
      const locators = [...store.referenceScope(owner, chat, []), entry];
      for (const ctx of locators) {
        const parent = root(ctx);
        if (
          !parent ||
          !graph.members.has(key(parent)) ||
          !["period", "request", "page"].includes(ctx.kind) ||
          !ctx.object
        )
          continue;
        const locator = JSON.stringify([
          ctx.kind,
          ctx.projectId,
          ctx.object,
          ctx.control || "",
        ]);
        if (visited.has(locator)) continue;
        if (visited.size >= 12) {
          incomplete = true;
          break;
        }
        visited.add(locator);
        if (!(await reader.allowed(token, ctx))) continue;
        const report = await optional(() => reader.evidence(token, ctx), null);
        for (const b of report?.bindings || []) {
          const matches = graph.edges.filter(
            (e) =>
              e.to === key(parent) &&
              e.alias === b.alias &&
              (!b.definition || nodes.get(e.from)?.name === b.definition),
          );
          if (matches.length !== 1) continue;
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
          flowUses.push({sourceId:nodes.get(matches[0].from)!.context.projectId,point:b.name,direction:b.direction});
// end
          depend(ctx);
          result.add(
            report!.title +
              " · " +
              { read: "读取", write: "写回", event: "接收事件" }[b.direction] +
              " " +
              nodes.get(matches[0].from)!.name +
              (b.name ? " / " + b.name : ""),
          );
        }
      }
      return [...result].sort();
    },
    (r) => "从已保存对象核实 " + r.length + " 条读写关系",
  );
  // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
  const businessProjects = new Set<string>();
  const names = new Set([
    String(plan.title),
    ...[...graph.members].map((k) => nodes.get(k)!.name),
  ]);
  // end
  const quotes = await track(
    "回看开发人员在方案对话中的原话",
    async () => {
      const result: string[] = [];
      for (const row of history) {
        const ctx = root(JSON.parse(String(row.context)));
        if (
          ctx
            ? !graph.members.has(key(ctx))
            : !String(row.question).includes(String(plan.title))
        )
          continue;
        // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
        const original = JSON.parse(String(row.context)) as Context;
        const anchors = new Set(names);
        if (
          original.object &&
          ["page", "scene", "report"].includes(original.kind)
        )
          anchors.add(original.object);
        const content = attributedStatement(
          String(row.question).trim(),
          original,
          anchors,
        );
        if (!content || !(await permitted(row))) continue;
        if (ctx) businessProjects.add(key(ctx));
        // end
        inherit(row);
        result.push(
          String(row.created).slice(0, 10) +
            " · " +
            String(row.title) +
            " · “" +
            content.replace(/\s+/g, " ") +
            "”",
        );
        if (result.length === 4) break;
      }
      return result;
    },
    (r) => "找到 " + r.length + " 段相关原话",
  );
  const items = await track(
    "读取开发人员已确认的方案清单",
    async () => {
      const result: string[] = [];
      for (const row of store.items(String(plan.id))) {
        if (row.status !== "confirmed" || !(await permitted(row))) continue;
        // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
        const ctx = root(JSON.parse(String(row.context)));
        if (ctx && graph.members.has(key(ctx))) businessProjects.add(key(ctx));
        // end
        inherit(row);
        result.push("第 " + row.version + " 版 · " + row.body);
      }
      return result;
    },
    (r) => "第 " + plan.revision + " 版，当前可读 " + r.length + " 项",
  );
  const label = (loc: string) => {
    const p = nodes.get(loc)!;
    return roles[p.context.kind as Kind] + "「" + p.name + "」";
  };
  const lines = graph.edges.map(
    (e) =>
      label(e.from) +
      " → " +
      label(e.to) +
      "（" +
      e.usage +
      "；" +
      e.detail +
      "）",
  );
  // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
  // Follow upstream from attributable business anchors. Other consumers of the
  // same source are visible as technical neighbours without claiming membership.
  if (!businessProjects.size) businessProjects.add(key(seed));
  for (let size = -1; size !== businessProjects.size; ) {
    size = businessProjects.size;
    for (const edge of graph.edges)
      if (businessProjects.has(edge.to)) businessProjects.add(edge.from);
  }
  const primary = lines.filter(
    (_, i) =>
      businessProjects.has(graph.edges[i].to) &&
      businessProjects.has(graph.edges[i].from),
  );
  const shared = lines.filter((s) => !primary.includes(s));
  // end
  const usages = [...new Set(graph.edges.map((e) => e.usage))].sort();
  const kinds = [
    ...new Set(
      [...graph.members].map((k) => roles[nodes.get(k)!.context.kind as Kind]),
    ),
  ].sort();
  const purpose: string[] = [];
  if (graph.edges.some((e) => e.usage === "实时数据源"))
    purpose.push("数采工程把采集数据提供给实时数据源");
  if (graph.edges.some((e) => e.to.startsWith("client:")))
    purpose.push("客户端通过工程内连接接入数据");
  if (graph.edges.some((e) => e.to.startsWith("calculation:")))
    purpose.push("计算工程配置了可用于脚本或词典的输入输出连接");
  if (graph.edges.some((e) => e.to.startsWith("alarm:")))
    purpose.push("报警工程接入数据源");
  if (graph.edges.some((e) => e.usage === "报警事件源"))
    purpose.push("事件源把报警工程的事件提供给消费端");
  const answer = [
    "## " + plan.title,
    "### 从工程配置看，这个方案做了什么",
    lines.length
      ? "沿当前入口可核对" +
        kinds.join("、") +
        "之间的" +
        usages.join("、") +
        "。"
      : "当前入口是" +
        label(key(seed)) +
        "，可读配置中尚未连出可确认的跨工程引用。",
    ...(purpose.length ? [purpose.join("，") + "。"] : []),
    // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
    ...primary.map((s) => "- " + s),
    ...(shared.length
      ? [
          "### 同一引用链上的其他工程（归属待确认）",
          ...shared.map((s) => "- " + s),
        ]
      : []),
    ...(uses.length ? ["### 已保存对象的读写"] : []),
    // end
    ...uses.map((s) => "- " + s),
    "以上是已保存的连接或映射。共用数据源只说明存在技术关联；实际取值、页面显示及方案归属仍需各自证据。",
    "### 开发人员在对话中说过的",
    ...(quotes.length
      ? quotes.map((s) => "- " + s)
      : ["在本次回看的相关记录中，未提取到明确的业务口径。"]),
    ...(quotes.length ? ["按最近发言在前列出，保留原话供对照。"] : []),
    "### 已确认的方案清单",
    ...(items.length
      ? items.map((s) => "- " + s)
      : ["第 " + plan.revision + " 版，当前账号可读的已确认项为 0。"]),
    "### 核对范围",
    "从当前入口追踪可读引用，目录每类最多 8 个候选，并补查同一方案近期访问的工程。" +
      (incomplete ? "部分目录、工程配置或历史入口未能完整核实。" : ""),
    "本轮未读取目标 App 的运行回执。",
  ].join("\n");
  const dependencies = [...deps.values()];
  const evidence: Evidence = {
    scope: "solution",
    id: randomUUID(),
    at: new Date().toISOString(),
    layer: "saved",
    title: "方案级引用与数据流",
    source: "KF 工程连接、平台数据源配置、方案对话及确认记录",
    facts: lines.map((value) => ({ label: "已保存关系", value })),
    gaps: [],
    references: [],
    digest: createHash("sha256")
      .update(JSON.stringify([lines, uses, quotes, items, plan.revision]))
      .digest("hex"),
  };
  return {
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    flow:{projects:[...graph.members].map(k=>nodes.get(k)!.context),uses:flowUses},
// end
    answer,
    evidence,
    dependencies,
    summary: {
      status: incomplete ? "partial" : "inspected",
      localReference: "[[inspect_solution_overview]]",
    },
  };
}
// end
