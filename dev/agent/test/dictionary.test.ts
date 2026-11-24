// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  dictionaryBinding,
  dictionaryEndpoints,
  dictionaryReading,
  dictionaryReport,
  probeText,
  probeMatches,
} from "../src/dictionary.ts";
import type { Center } from "../src/center.ts";
import { Store } from "../src/store.ts";
import { readContext } from "../src/shared.ts";
import { CalcJournal } from "../src/calc-journal.ts";
const ctx = readContext({
  kind: "calculation",
  projectId: "project",
  calcMenu: "calculate-global-variable",
  object: "11",
  group: "-1",
});
const calc = {
  projectId: "project",
  projectType: 0,
  appId: "app",
  appName: "calc",
  port: 501,
  canOperate: true,
};
function fixture() {
  const type = "工业数据源_网络模式";
  const variable = {
    id: 11,
    type: "IO_Number",
    name: "Item",
    dataSourceName: "Rt",
    TagName: "Raw",
    dataSourceType: type,
    value: 97,
  };
  const point = { tagName: "Raw", deviceName: "Unit" };
  const cfg = {
    engineeringId: "io",
    newWorkDateType: "KingIOServerLinux",
    dataType: ["1"],
    restful_ip: "127.0.0.1",
    restful_port: "222",
    getVariableListMethod: "restful",
  };
  const variables = [variable],
    points = [point];
  const apps = [
    calc,
    { ...calc, projectId: "io", projectType: 2, appId: "i", port: 222 },
    {
      ...calc,
      projectId: "ds",
      projectType: 3,
      appId: "d",
      appName: "Src",
      port: 221,
    },
  ];
  const probe = probeText({ name: "Item", alias: "Rt", tag: "Raw" }) + "\n\n";
  const center = {
    require: async () => {},
    evidence: async () => ({
      title: "请求式脚本 / Probe",
      digest: createHash("sha256").update(probe).digest("hex"),
    }),
    call: async (_: string, path: string, query: any) => {
      if (path.includes("scriptData")) return { context: probe };
      if (path.includes("projectJsonData"))
        return query.type === "globalVars"
          ? variables
          : query.type === "APIs"
            ? [
                {
                  name: "Probe",
                  functionName: "Probe",
                  GUID: "script",
                  whetherenable: "是",
                },
              ]
            : [{ name: "Rt", connectName: "Src", type }];
      if (path.includes("getAllDataSource"))
        return [{ guid: "ds", name: "Src", type, config: cfg }];
      if (path.includes("/collect/variables")) return points;
      if (path.includes("opsResourceData"))
        return {
          appResource: apps,
          nodeResource: [{ nodeId: "n", address: "127.0.0.1" }],
          nodeProApp: [{ nodeId: "n", appPros: apps }],
        };
      if (path.includes("displayAppListStatus"))
        return [
          {
            appId: "app",
            nodeId: "n",
            appDeployStatus: 1,
            appStatus: "running",
          },
        ];
      throw Error(path);
    },
  } as unknown as Center;
  const store = new Store(":memory:");
  const { chatId } = store.createPlan("owner", "test");
  const journal = new CalcJournal(store, center);
  return {
    center,
    store,
    chatId,
    variable,
    variables,
    points,
    cfg,
    probe,
    journal,
  };
}
test("按已保存选区追到唯一设备，拒绝重名、歧义和读取端点不符", async () => {
  const f = fixture(),
    binding = await dictionaryBinding(f.center, "t", ctx);
  assert.equal(binding.initial, 97);
  assert.equal(binding.device, "Unit");
  assert.equal((await dictionaryEndpoints(f.center, "t", binding)).length, 2);
  f.cfg.restful_port = "999";
  await assert.rejects(
    dictionaryEndpoints(
      f.center,
      "t",
      await dictionaryBinding(f.center, "t", ctx),
    ),
  );
  f.points.push(f.points[0]);
  await assert.rejects(dictionaryBinding(f.center, "t", ctx));
  f.points.pop();
  f.variables.push({ ...f.variable, id: 12 });
  await assert.rejects(dictionaryBinding(f.center, "t", ctx));
});
test("词典取证归属、正文、质量和缺失字段独立验证", async () => {
  const f = fixture(),
    b = await dictionaryBinding(f.center, "t", ctx);
  assert.ok(
    probeMatches(
      b,
      f.probe,
      createHash("sha256").update(f.probe).digest("hex"),
    ),
  );
  const raw = {
    name: "Item",
    alias: "Rt",
    tag: "Raw",
    before: 0,
    after: 0,
    code: 0,
    sample: { N: "Raw", V: 0, Q: 192, T: "2026-01-01T12:00:00Z" },
  };
  assert.equal(dictionaryReading(b, raw).sample.value, 0);
  assert.throws(() => dictionaryReading(b, { ...raw, alias: "wrong" }));
  assert.throws(() =>
    dictionaryReading(b, { ...raw, sample: { ...raw.sample, T: null } }),
  );
  assert.equal(
    dictionaryReading(b, { ...raw, code: null, sample: null }).sample,
    null,
  );
});
test("同一变量跨窗展示初值、同步、坏质量保留和恢复，换映射或撤权不继承旧结论", async () => {
  const f = fixture();
  const begin = () =>
    f.journal.begin("owner", "t", f.chatId, ctx, "app", "Probe");
  const report = (allowed = true) =>
    dictionaryReport(
      f.center,
      f.store,
      "owner",
      "t",
      f.chatId,
      ctx,
      async () => allowed,
    );
  for (const [v, q] of [
    [10, 192],
    [10, 0],
    [25, 192],
  ]) {
    const p = await begin();
    await f.journal.finish("owner", "t", f.chatId, p.ticket, {
      url: p.urls[0],
      type: "normal",
      status: 200,
      method: "POST",
      at: new Date(p.start).toISOString(),
      output: {
        dictionary: {
          name: "Item",
          alias: "Rt",
          tag: "Raw",
          before: v,
          after: v,
          code: 0,
          sample: { N: "Raw", V: v, Q: q, T: "2026-01-01T12:00:00Z" },
        },
      },
    });
  }
  assert.match(
    (await report()).lines.join(" "),
    /质量 0.*此前良好样本的实例词典值相同/,
  );
  assert.equal((await report()).summary.matched, 3);
  const p = await begin();
  f.variable.value = 96;
  await assert.rejects(
    f.journal.finish("owner", "t", f.chatId, p.ticket, {
      url: p.urls[0],
      type: "normal",
      status: 200,
      method: "POST",
      at: new Date(p.start).toISOString(),
      output: {},
    }),
    /变更/,
  );
  assert.deepEqual((await report()).summary, { matched: 0, historical: 3 });
  await assert.rejects(report(false));
  await assert.rejects(
    dictionaryReport(
      f.center,
      f.store,
      "other",
      "t",
      f.chatId,
      ctx,
      async () => true,
    ),
  );
});
// end
