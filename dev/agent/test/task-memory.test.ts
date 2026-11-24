// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Store } from "../src/store.ts";
import {
  validateChanges,
  updatedMemory,
  memoryRows,
  publicMemory,
} from "../src/task-memory.ts";

const set = (topic: string, quote: string, id = 0) => ({
  action: "set",
  id,
  kind: "rule",
  topic,
  quote,
});
test("只接收本轮原话；覆盖与撤销使用可见编号，匿名投影不含工程位置", () => {
  const initial = validateChanges(
    { changes: [set("持续时长", "10 秒")] },
    "暂定 10 秒",
    [],
  );
  const saved = updatedMemory([], initial);
  assert.throws(() =>
    validateChanges(
      { changes: [set("持续时长", "30 秒", 2)] },
      "改为 30 秒",
      saved,
    ),
  );
  assert.throws(() =>
    validateChanges(
      { changes: [set("持续时长", "20 秒", 1)] },
      "改为 30 秒",
      saved,
    ),
  );
  assert.throws(() =>
    validateChanges(
      { changes: [set("持续时长", "30 秒")] },
      "改为 30 秒",
      saved,
    ),
  );
  const revised = updatedMemory(
    saved,
    validateChanges(
      { changes: [set("持续时长", "30 秒", 1)] },
      "改为 30 秒",
      saved,
    ),
  );
  assert.deepEqual(publicMemory(revised), [
    { id: 1, kind: "rule", topic: "持续时长", quote: "30 秒" },
  ]);
  assert.equal(
    updatedMemory(
      revised,
      validateChanges(
        { changes: [{ action: "remove", id: 1, quote: "取消持续时长" }] },
        "取消持续时长",
        revised,
      ),
    ).length,
    0,
  );
});
test("先保存用户决定，回复失败及重复完成不会回滚口径，跨窗口保留，账号和正式方案隔离", () => {
  const db = new Store(":memory:");
  const owner = "ordinary";
  const { id: plan, chatId: chat } = db.createPlan(owner, "plan");
  const ctx = {
    kind: "general",
    projectId: "",
    object: "",
    dirty: false,
  } as const;
  const run = (q: string, status: string, ops: any[]) => {
    const id = randomUUID();
    db.start(owner, chat, id, q, ctx, "ask");
    const changes = validateChanges(
      { changes: ops },
      q,
      memoryRows(db.db, chat),
    );
    db.remember(id, changes);
    db.remember(id, changes);
    db.finish(id, status, "答复", null);
    db.finish(id, "done", "重复完成", null);
    return id;
  };
  run("先做班报", "done", [set("交付目标", "班报")]);
  for (let i = 0; i < 9; i++) run("继续", "done", []);
  assert.equal(memoryRows(db.db, chat)[0].quote, "班报");
  run("改为月报", "failed", [set("交付目标", "月报", 1)]);
  assert.equal(memoryRows(db.db, chat)[0].quote, "月报");
  run("改为日报", "done", [set("交付目标", "日报", 1)]);
  assert.equal(memoryRows(db.db, chat)[0].quote, "日报");
  assert.equal(db.plan(owner, plan).revision, 0);
  assert.equal(db.items(plan).length, 0);
  assert.throws(() => db.chat("another", chat));
  assert.equal(
    memoryRows(db.db, db.createChat(owner, plan, "second")).length,
    0,
  );
  db.db.close();
});
// end
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import { memoryClauses, coveredChanges } from "../src/task-memory.ts";
test("含决定和提问的消息逐句验完整性，结尾疑问不能使已有决定消失", () => {
  const q = "最终做巡查列表，供维护岗复核。你怎么看？";
  assert.equal(memoryClauses(q).length, 3);
  assert.throws(() =>
    coveredChanges({ clauses: [{ n: 3, action: "question" }] }, q, []),
  );
  const clauses = [
    { n: 1, action: "set", id: 0, kind: "goal", topic: "交付物" },
    { n: 2, action: "set", id: 0, kind: "rule", topic: "读者" },
    { n: 3, action: "question" },
  ];
  const items = updatedMemory([], coveredChanges({ clauses }, q, []));
  assert.deepEqual(
    items.map((x) => x.quote),
    ["最终做巡查列表", "供维护岗复核"],
  );
  const mismatch = coveredChanges(
    {
      clauses: [{ ...clauses[0], quote: "供维护岗复核" }, ...clauses.slice(1)],
    },
    q,
    [],
  );
  assert.equal(mismatch[0].item?.quote, "最终做巡查列表");
});
// end

// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
test("同一旧条目的替换与退役是一次更新，不同后继值仍不能自动合并", () => {
  const original = updatedMemory(
    [],
    validateChanges({ changes: [set("期限", "一周")] }, "一周", []),
  );
  const rev = { action: "rule", id: 1 },
    drop = { action: "remove", id: 1 };
  for (const [q, ops, expected] of [
    ["改为一月，旧要求取消", [rev, drop], "改为一月"],
    ["取消旧要求，改为一季", [drop, rev], "改为一季"],
  ] as const) {
    const delta = coveredChanges(
      { clauses: ops.map((op, i) => ({ ...op, n: i + 1 })) },
      q,
      original,
    );
    assert.equal(delta.length, 1);
    assert.equal(updatedMemory(original, delta)[0].quote, expected);
  }
  assert.throws(() =>
    coveredChanges(
      {
        clauses: [
          { ...rev, n: 1 },
          { ...rev, n: 2 },
        ],
      },
      "改为一月，改为一季",
      original,
    ),
  );
});
// end

// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import {selectTurnMemory, extractMemory} from "../src/task-memory.ts";
import {resolveModelAnswer} from "../src/model-answer.ts";
test("只投影本轮任务且保留无关任务，替换后的摘要不含旧值", () => {
  const items = [
    {slot:"one",kind:"goal",topic:"另一任务",quote:"保留报告"},
    {slot:"two",kind:"rule",topic:"份数为十",quote:"十份"},
  ] as const;
  const changes = coveredChanges({clauses:[{n:1,action:"rule",id:2}]}, "改为七份", [...items]);
  const projected = selectTurnMemory([2],[...items],changes);
  assert.deepEqual(projected.map(item=>item.quote),["改为七份"]);
  assert.ok(!projected[0].topic.includes("十"));
  assert.equal(updatedMemory([...items],changes).length,2);
  assert.throws(()=>selectTurnMemory([3],[...items],changes));
  assert.throws(()=>selectTurnMemory(undefined,[...items],changes));
});
test("未收到规范追问时，短答仍可结合上轮用户提出的业务选择录入", async (t) => {
  const previous="两种排序都可用，我还没确定。", question="采用到达顺序";
  t.mock.method(globalThis,"fetch",async (_url, init) => {
    const body=JSON.parse(init.body);
    const prompt=JSON.parse(body.messages[1].content);
    assert.equal(prompt.precedingUserMessage,previous);
    assert.equal(prompt.previousQuestion,undefined);
    return Response.json({choices:[{message:{content:JSON.stringify({focus:[],clauses:[{n:1,action:"rule",topic:"排序依据"}]})}}]});
  });
  const result = await extractMemory({url:"http://localhost/v1",key:"",model:"fixture"},new AbortController().signal,question,[],undefined,previous);
  assert.equal(result.relevant[0].quote,question);
});
test("工作记忆不能整表替代答复，缺少业务决定时允许复核后追问", async () => {
  const facts={task_memory:"多项无关业务要求"};
  await assert.rejects(resolveModelAnswer('{"kind":"facts","tools":["task_memory"]}',facts,"fixture",[],true,async()=>JSON.stringify({select:["task_memory"]})));
  const clarification="你选择哪种排序依据？";
  const result=await resolveModelAnswer("应查工程变量。",facts,"fixture",[],true,async draft=>JSON.stringify(draft.startsWith("{")?{kind:"approve_clarification"}:{kind:"clarify_goal",question:clarification}));
  assert.equal(result.answer,clarification);
  assert.equal(result.source.pendingClarification,true);
});
// end
