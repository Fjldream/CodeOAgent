// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Store } from "../src/store.ts";
import { solutionOverview } from "../src/solution-overview.ts";
import { trackActivity } from "../src/query-activity.ts";
import { HttpError, type Context } from "../src/shared.ts";
function setup() {
  const store = new Store(":memory:"),
    owner = "regular",
    plan = store.createPlan(owner, "合成方案");
  const ctx = (kind: Context["kind"], projectId: string): Context => ({
    kind,
    projectId,
    object: "",
    dirty: false,
  });
  const client = ctx("client", "ui"),
    io = ctx("collection", "collect"),
    calc = ctx("calculation", "calc");
  const projects: any = {
    client: [["ui", "展示端"]],
    calculation: [["calc", "处理端"]],
    collect: [["collect", "采集端"]],
    alarm: [],
    dataSource: [],
  };
  const defs: any[] = [
    {
      guid: "src",
      name: "共享源",
      type: "KingIOServer",
      config: { engineeringId: "collect", dataType: [1] },
    },
  ];
  const denied = new Set<string>();
  const allowed = async (_t: string, c: Context) => !denied.has(c.projectId);
  const reader: any = {
    allowed,
    require: async (t: string, c: Context) => {
      if (!(await allowed(t, c))) throw new HttpError(403, "不可见");
    },
    call: async (_t: string, path: string, q: any) => {
      if (path === "/projectGroup") return [{ guid: "g" }];
      if (path.endsWith("/project") || path.endsWith("/projectList"))
        return projects[path.split("/")[1]].map(([guid, name]: any) => ({
          guid,
          name,
        }));
      if (path.endsWith("/getAllDataSource")) return defs;
      if (path.endsWith("/projectJsonData"))
        return q.type === "dataAccess"
          ? [{ name: "In", connectName: "共享源", type: "KingIOServer" }]
          : [];
      if (path.endsWith("/getDataSourceList"))
        return {
          message: [
            {
              name: "Local",
              id: "a",
              appName: "app",
              dataSourceName: "共享源",
            },
          ],
        };
      if (path.endsWith("/getVariableList"))
        return {
          message: [
            {
              group: {
                Variables: [
                  {
                    name: "显示量",
                    isMap: true,
                    projectDataSourceId: "a",
                    dataSourceItem: { appName: "app", tagName: "输入量" },
                  },
                ],
              },
            },
          ],
        };
      throw Error("unexpected " + path);
    },
    evidence: async () => ({
      title: "合成片段",
      bindings: [{ alias: "In", name: "结果", direction: "write" }],
    }),
  };
  function add(
    question: string,
    ctx: Context,
    proposal?: string,
    chat = plan.chatId,
  ) {
    const id = randomUUID();
    store.start(owner, chat, id, question, ctx, "ask");
    store.finish(id, "done", "助手的推测勿引用", null, proposal);
    return id;
  }
  const permitted = async (row: any) =>
    !JSON.parse(row.dependencies || "[]").some((c: Context) =>
      denied.has(c.projectId),
    ) && (await allowed("", JSON.parse(row.context)));
  const run = (c: Context, events: any[] = []) =>
    solutionOverview(
      reader,
      "token",
      store,
      owner,
      plan.chatId,
      c,
      permitted,
      trackActivity((e) => events.push(e)),
    );
  return { store, plan, owner, denied, defs, run, client, io, calc, ctx, add };
}
test("不同类别入口回读同一条链，分别列出保存、发言和已确认条目，按真实进度报告", async () => {
  const f = setup(),
    other = f.store.createChat(f.owner, f.plan.id, "另一段对话");
  f.add(
    "合成方案需要按批次记录总量。下一步怎么做？",
    f.client,
    "已确认的设计",
    other,
  );
  f.store.decide(f.owner, String(f.store.items(f.plan.id)[0].id), "confirmed");
  f.add("处理端需要改为按班次记录总量", f.calc, "草稿不可当作决定");
  f.add("我需要输入密码 MixedSensitive123!", f.client);
  f.add("请问目标是什么？", f.client);
  f.add("排查脚本", { ...f.calc, kind: "period", object: "period" });
  const outside = f.store.createPlan(f.owner, "另一方案");
  f.add("目标是其他方案独有的描述", f.client, undefined, outside.chatId);
  const events: any[] = [],
    a = await f.run(f.client, events),
    b = await f.run(f.io);
  assert.equal(a.answer, b.answer);
  assert.equal(a.evidence.digest, b.evidence.digest);
  for (const term of [
    "采集端",
    "共享源",
    "处理端",
    "输入量 → 显示量",
    "写回 共享源 / 结果",
    "按批次",
    "改为按班次",
    "第 1 版 · 已确认的设计",
  ])
    assert.ok(a.answer.includes(term), term);
  for (const term of [
    "MixedSensitive",
    "草稿不可",
    "其他方案独有",
    "助手的推测",
  ])
    assert.ok(!a.answer.includes(term), term);
  assert.deepEqual(Object.keys(a.summary), ["status", "localReference"]);
  assert.equal(events.filter((e) => e.state === "done").length, 5);
  assert.equal(events.filter((e) => e.state === "running").length, 5);
  assert.equal(f.store.plan(f.owner, f.plan.id).revision, 1);
});
test("禁止同名拼接、越权回读、泄露曾被授权的来源；空方案不会新增清单", async () => {
  const f = setup();
  f.defs.push({ ...f.defs[0], guid: "other" });
  let r = await f.run(f.client);
  assert.ok(!r.answer.includes("输入量"));
  assert.match(r.answer, /已确认项为 0/);
  f.defs.pop();
  const id = f.add("合成方案的目标需要保密", f.client);
  f.store.db
    .prepare("update runs set dependencies=? where id=?")
    .run(JSON.stringify([f.calc]), id);
  f.denied.add("calc");
  f.denied.add("collect");
  r = await f.run(f.client);
  assert.doesNotMatch(r.answer, /需要保密|处理端|采集端/);
  assert.ok(r.answer.includes("共享源"));
  await assert.rejects(f.run(f.io));
  assert.throws(() => f.store.chat("other", f.plan.chatId));
});
// end
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
test("同一工程中穿插另一任务，混合发言保留已关联的陈述，疑问和无依据的改口不进入业务依据", async () => {
  const f = setup();
  f.add("我希望当前画面按批次显示产量。损耗以净重为准。该从哪里开始？", {
    ...f.client,
    kind: "page",
    object: "批次看板",
  });
  f.add("改一下，周报留存范围改为两个季度，旧范围作废。", f.client);
  const report = await f.run(f.io);
  assert.match(report.answer, /按批次显示产量。 损耗以净重为准/);
  assert.doesNotMatch(report.answer, /该从哪里开始|两个季度/);
  assert.match(report.answer, /同一引用链上的其他工程/);
});
// end
