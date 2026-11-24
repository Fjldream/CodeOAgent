// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { HttpError } from "./shared.ts";

type Kind = "goal" | "rule";
export type MemoryItem = {
  slot: string;
  kind: Kind;
  topic: string;
  quote: string;
};
export type MemoryChange = { slot: string; item?: MemoryItem };
type Row = MemoryItem & { context: string; dependencies: string };
export const memoryInstructions =
  "以下任务记忆只记录开发人员在本段对话中明确提出的目标、口径。按当前有效版本作答，已替换口径只作为历史；用户可以随时纠正。" +
  "切换 KF 工程仍承接业务目标，当前工程的已保存配置、已部署状态和运行事实必须按权限另查。工程能查的先查。只有不同答案会影响下一步且用户仍未确定时才追问。" +
  "任务记忆不代表工程事实，也不代表用户已确认写入正式方案。";

export function installMemory(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS task_memory(
    chat TEXT NOT NULL REFERENCES chats(id), slot TEXT NOT NULL, kind TEXT NOT NULL,
    topic TEXT NOT NULL, quote TEXT NOT NULL, source TEXT NOT NULL REFERENCES runs(id),
    PRIMARY KEY(chat,slot))`);
}
export function memoryRows(db: DatabaseSync, chat: string): Row[] {
  return db
    .prepare(
      `SELECT m.slot,m.kind,m.topic,m.quote,r.context,r.dependencies
    FROM task_memory m JOIN runs r ON r.id=m.source AND r.chat=m.chat
    WHERE m.chat=? ORDER BY m.rowid`,
    )
    .all(chat) as Row[];
}
export function publicMemory(items: MemoryItem[]) {
  return items.map(({ kind, topic, quote }, i) => ({
    id: i + 1,
    kind,
    topic,
    quote,
  }));
}
export function updatedMemory(items: MemoryItem[], changes: MemoryChange[]) {
  const state = new Map(items.map((item) => [item.slot, item]));
  for (const { slot, item } of changes) {
    if (item) state.set(slot, item);
    else state.delete(slot);
  }
  return [...state.values()];
}
export function validateChanges(
  raw: unknown,
  question: string,
  items: MemoryItem[],
): MemoryChange[] {
  const entries = (raw as { changes?: unknown })?.changes;
  if (!Array.isArray(entries) || entries.length > 12)
    throw Error("变更清单无效");
  const seen = new Set<string>();
  const changes: MemoryChange[] = [];
  for (const op of entries) {
    if (
      !op ||
      !Number.isInteger(op.id) ||
      op.id < 0 ||
      op.id > items.length ||
      typeof op.quote !== "string" ||
      !op.quote.trim() ||
      op.quote.length > 380 ||
      !question.includes(op.quote)
    )
      throw Error("须逐字引用本轮用户原话及有效编号");
    const prior = items[op.id - 1];
    const slot = prior?.slot ?? randomUUID();
    if (seen.has(slot)) throw Error("同项重复");
    seen.add(slot);
    if (op.action === "remove" && prior) {
      changes.push({ slot });
      continue;
    }
    if (
      op.action !== "set" ||
      !["goal", "rule"].includes(op.kind) ||
      typeof op.topic !== "string" ||
      !op.topic.trim() ||
      op.topic.length > 48
    )
      throw Error("记忆项格式无效");
    const item = {
      slot,
      kind: op.kind as Kind,
      topic: op.topic.trim(),
      quote: op.quote.trim(),
    };
    if (
      !prior &&
      [...items, ...changes.flatMap((c) => (c.item ? [c.item] : []))].some(
        (v) => v.topic === item.topic,
      )
    )
      throw Error("同一主题请使用已有编号修订");
    changes.push({ slot, item });
  }
  if (updatedMemory(items, changes).length > 32)
    throw Error("任务记忆超过 32 条，须合并或明确撤销");
  return changes;
}
export function commitMemory(
  db: DatabaseSync,
  run: string,
  changes: MemoryChange[],
) {
  const record = db.prepare("SELECT chat FROM runs WHERE id=?").get(run)!;
  for (const { slot, item } of changes) {
    if (!item) {
      db.prepare("DELETE FROM task_memory WHERE chat=? AND slot=?").run(
        record.chat,
        slot,
      );
      continue;
    }
    db.prepare(
      `INSERT INTO task_memory(chat,slot,kind,topic,quote,source) VALUES(?,?,?,?,?,?)
      ON CONFLICT(chat,slot) DO UPDATE SET kind=excluded.kind,topic=excluded.topic,quote=excluded.quote,source=excluded.source`,
    ).run(record.chat, slot, item.kind, item.topic, item.quote, run);
  }
}
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
export function memoryClauses(question: string) {
  const pieces = question
    .split(/[，。！？；;!?\n]+|,\s+(?=\S)|\.\s+(?=[A-Z])/u)
    .map((text) => text.trim())
    .filter(Boolean);
  return (pieces.length ? pieces : [question]).map((text, index) => ({
    n: index + 1,
    text,
  }));
}
export function coveredChanges(
  raw: unknown,
  question: string,
  items: MemoryItem[],
) {
  const clauses = memoryClauses(question);
  const decisions = (raw as { clauses?: unknown })?.clauses;
  if (!Array.isArray(decisions) || decisions.length !== clauses.length)
    throw Error("每个分句必须有一个对应判断");
  // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
  const changes: {
    action: string;
    id: number;
    kind?: Kind;
    topic?: string;
    quote: string;
  }[] = [];
  for (const [index, decision] of decisions.entries()) {
    if (!decision || decision.n !== index + 1)
      throw Error("分句编号须完整且按序");
    if (
      ["skip", "question", "status", "duplicate", "other"].includes(
        decision.action,
      )
    )
      continue;
    const clause = clauses[index].text;
    const quote =
      typeof decision.quote === "string" &&
      decision.quote.trim() &&
      clause.includes(decision.quote)
        ? decision.quote.trim()
        : clause;
    const kind = decision.action === "set" ? decision.kind : decision.action;
    const replacing = kind === "goal" || kind === "rule";
    if (!replacing && decision.action !== "remove")
      throw Error("未知的记忆操作");
    const id = decision.id ?? 0;
    if (!Number.isInteger(id) || id < 0 || id > items.length)
      throw Error("须引用当前可见的记忆编号");
    const prior = items[id - 1];
    // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    const topic = typeof decision.topic === "string" && decision.topic.trim()
      ? decision.topic.trim()
      : prior && replacing ? (kind === "goal" ? "任务目标" : "业务口径")
      : prior?.topic ?? quote.slice(0, 48);
    // end
    changes.push({
      action: replacing ? "set" : "remove",
      id,
      kind,
      topic,
      quote,
    });
  }
  // All IDs refer to the pre-turn snapshot. Retiring an old value and providing its
  // replacement describes one replacement. Two different successors remain ambiguous.
  const replacements = new Set(
    changes.filter((c) => c.action === "set" && c.id > 0).map((c) => c.id),
  );
  const finalChanges = changes.filter(
    (c) => c.action !== "remove" || !replacements.has(c.id),
  );
  // end
  return validateChanges({ changes: finalChanges }, question, items);
}
// end
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
// Visible IDs refer to the pre-turn view. A selection controls a single answer;
// the other tasks remain available for future turns in this conversation.
export function selectTurnMemory(
  focus: unknown, items: MemoryItem[], changes: MemoryChange[],
) {
  if (!Array.isArray(focus) || focus.some(id => !Number.isInteger(id) || id < 1 || id > items.length))
    throw Error("focus 必须只列与本轮同一任务的可见编号");
  const visible = new Set(focus.map(id => items[id - 1].slot));
  for (const change of changes) if (change.item) visible.add(change.slot);
  return updatedMemory(items, changes).filter(item => visible.has(item.slot));
}
// end
export async function extractMemory(
  settings: { url: string; model: string; key: string },
  signal: AbortSignal,
  question: string,
  items: MemoryItem[],
  previousQuestion?: string,
  precedingUserMessage?: string,
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  modelText: (text: string) => string = text => text,
// end
) {
  // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
  const clauses = memoryClauses(question);
  const instructions =
    "你是 KF 开发对话的工作记忆整理器。逐句识别客户明确的业务要求；一条消息可以同时给出决定并提出问题。输出 JSON 对象的 clauses 数组，必须按顺序完整覆盖每个 n。" +
    "每项 action 只取 goal、rule、remove、skip 四者之一。goal 表示要完成的目标，rule 表示实际采用的口径。已说明的交付物、受众、单位、通过条件、范围等应逐项保留。" +
    '新增用 {"n":序号,"action":"rule","id":0,"topic":"简短稳定的主题"}，改口用旧条目的 id 和新值所在分句。用户说旧值作废同时给出替代值，记一次替换，重复说明的分句用 skip。彻底撤销且没有后继值才使用 remove。' +
    '询问、未决定选项、工程中看到的事实、助手建议、重复内容、登录凭据都用 {"n":序号,"action":"skip"}。按 previousQuestion 理解明确的短答。只输出 JSON。' +
    "同时返回 focus 数组，仅列本轮业务任务仍相关的已有编号。明确另起任务时排除无关的旧任务，切换工程本身不改变任务。当前只是要查资料的临时操作须 skip。上轮用户说明业务选择而本轮给出答案时，结合 precedingUserMessage 将确定的选项记录为 rule，即使上轮助手未成功追问。topic 只写决定的维度，不含具体值。";
  // end
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(settings.url, {
      method: "POST",
      redirect: "error",
      signal,
      headers: {
        Authorization: "Bearer " + settings.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0,
        stream: false,
        ...(new URL(settings.url).hostname === "api.deepseek.com"
          ? {
              thinking: { type: "disabled" },
              response_format: { type: "json_object" },
            }
          : {}),
        messages: [
          { role: "system", content: instructions + correction },
          {
            role: "user",
            content: JSON.stringify({
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
              memory: publicMemory(items).map(item => ({...item,topic:modelText(item.topic),quote:modelText(item.quote)})),
              previousQuestion: previousQuestion && modelText(previousQuestion),
              precedingUserMessage: precedingUserMessage && modelText(precedingUserMessage),
// end
              // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
              clauses: clauses.map(c => ({...c,text:modelText(c.text)})),
              // end
              question: modelText(question),
            }),
          },
        ],
      }),
    });
    if (!response.ok)
      throw new HttpError(502, "任务记忆服务暂时不可用，本轮尚未完成。");
    const result = await response.json();
    try {
      const content = result.choices?.[0]?.message?.content ?? "";
      // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      const decision = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
      const changes = coveredChanges(decision, question, items);
      const relevant = selectTurnMemory(decision.focus ?? (items.length ? undefined : []), items, changes);
      return {changes,relevant};
      // end
    } catch (err) {
      correction =
        " 上次结果未通过本机校验：" +
        (err instanceof SyntaxError
          ? "JSON 格式错误"
          : String((err as Error).message));
    }
  }
  throw new HttpError(
    502,
    "模型未能按用户原话核对任务记忆。已有口径未变，可重试本轮。",
  );
}
// end
