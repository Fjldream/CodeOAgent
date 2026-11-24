// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { HttpError, missing, type Context, type Evidence } from './shared.ts';
// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
import type { Guidance } from './next-step.ts';
// end

// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
import type { AnswerSource } from './model-answer.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import {installMemory, commitMemory, type MemoryChange} from './task-memory.ts';
// end
export class Store {
  db: DatabaseSync;
  // modified by jinlong.feng at 2026-11-24 KF业务预期逐项复核
  recordBusinessPrediction(run:string, host:string, digest:string, report:unknown) {
    this.db.prepare('INSERT INTO business_predictions(run,host,digest,report) VALUES(?,?,?,?)')
      .run(run,host,digest,JSON.stringify(report));
  }
  // end
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
    // modified by jinlong.feng at 2026-11-24 KF业务预期逐项复核
    this.db.exec('CREATE TABLE IF NOT EXISTS business_predictions(id INTEGER PRIMARY KEY,run TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,host TEXT NOT NULL,digest TEXT NOT NULL,report TEXT NOT NULL)');
    // end
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);' +
        'CREATE INDEX IF NOT EXISTS plans_owner ON plans(owner);' +
        'CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY,plan TEXT NOT NULL REFERENCES plans(id),title TEXT NOT NULL,native TEXT);' +
        "CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,chat TEXT NOT NULL REFERENCES chats(id),question TEXT NOT NULL,context TEXT NOT NULL,intent TEXT NOT NULL,status TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',evidence TEXT,dependencies TEXT NOT NULL DEFAULT '[]',created TEXT NOT NULL);" +
        "CREATE UNIQUE INDEX IF NOT EXISTS one_run ON runs(chat) WHERE status='active';" +
        'CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,run TEXT NOT NULL REFERENCES runs(id),data TEXT NOT NULL);' +
        'CREATE INDEX IF NOT EXISTS run_events ON events(run,seq);' +
        'CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,plan TEXT NOT NULL REFERENCES plans(id),run TEXT UNIQUE NOT NULL REFERENCES runs(id),body TEXT NOT NULL,base INTEGER NOT NULL,status TEXT NOT NULL,version INTEGER);',
    );
// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
    this.db.exec(`CREATE TABLE IF NOT EXISTS connection_receipts(chat TEXT NOT NULL REFERENCES chats(id),project TEXT NOT NULL,alias TEXT NOT NULL,context TEXT NOT NULL,dependencies TEXT NOT NULL,result TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS connection_lookup ON connection_receipts(chat,project,alias);
      CREATE TABLE IF NOT EXISTS connection_versions(chat TEXT NOT NULL REFERENCES chats(id),project TEXT NOT NULL,alias TEXT NOT NULL,signature TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(chat,project,alias));`);
// end
    this.db.exec(`CREATE TABLE IF NOT EXISTS calc_captures(id TEXT PRIMARY KEY,chat TEXT NOT NULL REFERENCES chats(id),kind TEXT NOT NULL,project TEXT NOT NULL,script TEXT NOT NULL,context TEXT NOT NULL,dependencies TEXT NOT NULL,result TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS calc_captures_chat ON calc_captures(chat);`);
// end
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    this.db.exec(`CREATE TABLE IF NOT EXISTS scene_captures(id TEXT PRIMARY KEY,chat TEXT NOT NULL REFERENCES chats(id),context TEXT NOT NULL,dependencies TEXT NOT NULL,result TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS scene_captures_chat ON scene_captures(chat);`);
// end
    this.db.exec(`CREATE TABLE IF NOT EXISTS report_captures(id TEXT PRIMARY KEY, chat TEXT NOT NULL REFERENCES chats(id), context TEXT NOT NULL, dependencies TEXT NOT NULL, result TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS report_captures_chat ON report_captures(chat);`);
// end
    // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS alarm_captures(chat TEXT PRIMARY KEY REFERENCES chats(id), id TEXT NOT NULL, context TEXT NOT NULL, dependencies TEXT NOT NULL, batch TEXT NOT NULL)',
    );
    // end
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
    this.db.exec(`CREATE TABLE IF NOT EXISTS alarm_rule_captures(chat TEXT NOT NULL REFERENCES chats(id),id TEXT PRIMARY KEY,context TEXT NOT NULL,dependencies TEXT NOT NULL,batch TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS alarm_rule_chat ON alarm_rule_captures(chat);
      CREATE TRIGGER IF NOT EXISTS archive_rule_capture AFTER INSERT ON alarm_captures
      WHEN json_type(NEW.batch,'$.ruleSnapshot')='object' BEGIN
        INSERT INTO alarm_rule_captures(chat,id,context,dependencies,batch) VALUES(NEW.chat,NEW.id,NEW.context,NEW.dependencies,NEW.batch);
        DELETE FROM alarm_rule_captures WHERE chat=NEW.chat AND rowid NOT IN (SELECT rowid FROM alarm_rule_captures WHERE chat=NEW.chat ORDER BY rowid DESC LIMIT 4);
      END`);
// end
    if (
      !this.db
        .prepare('PRAGMA table_info(runs)')
        .all()
        .some((column) => column.name === 'plan_base')
    ) {
      this.db.exec('ALTER TABLE runs ADD COLUMN plan_base INTEGER');
    }
    // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
    if (
      !this.db
        .prepare('PRAGMA table_info(runs)')
        .all()
        .some((column) => column.name === 'guidance')
    ) {
      this.db.exec('ALTER TABLE runs ADD COLUMN guidance TEXT');
    }
    // end
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    if (
      !this.db
        .prepare('PRAGMA table_info(runs)')
        .all()
        .some((column) => column.name === 'answer_source')
    ) {
      this.db.exec('ALTER TABLE runs ADD COLUMN answer_source TEXT');
    }
    // end
    if (
      !this.db
        .prepare('PRAGMA table_info(chats)')
        .all()
        .some((column) => column.name === 'native_home')
    ) {
      this.db.exec('ALTER TABLE chats ADD COLUMN native_home TEXT');
    }
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ref_objects(
        plan TEXT NOT NULL REFERENCES plans(id), locator TEXT NOT NULL, observed TEXT NOT NULL,
        evidence TEXT NOT NULL, digest TEXT, PRIMARY KEY(plan,locator)
      );
      CREATE TABLE IF NOT EXISTS ref_edges(
        plan TEXT NOT NULL, locator TEXT NOT NULL, endpoint TEXT NOT NULL, direction TEXT NOT NULL,
        PRIMARY KEY(plan,locator,endpoint,direction),
        FOREIGN KEY(plan,locator) REFERENCES ref_objects(plan,locator) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS ref_reverse ON ref_edges(plan,endpoint);
    `);
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    installMemory(this.db);
    if (!this.db.prepare('PRAGMA table_info(runs)').all().some(row => row.name === 'memory_applied'))
      this.db.exec('ALTER TABLE runs ADD COLUMN memory_applied INTEGER NOT NULL DEFAULT 0');

// end
    this.transaction(() => {
      for (const row of this.db.prepare("SELECT id FROM runs WHERE status='active'").all()) {
        // end
        this.db
          .prepare("UPDATE runs SET status='interrupted',answer=? WHERE id=?")
          .run('助手服务已重启，可重新提问。', row.id);
        this.event(String(row.id), { type: 'end', status: 'interrupted' });
      }
    });
  }
  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = operation();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  workspace(owner: string) {
    return this.db
      .prepare('SELECT id,title,revision FROM plans WHERE owner=? ORDER BY rowid DESC')
      .all(owner)
      .map((plan) => ({
        ...plan,
        chats: this.db.prepare('SELECT id,title FROM chats WHERE plan=? ORDER BY rowid DESC').all(plan.id),
      }));
  }
  plan(owner: string, id: string) {
    const row = this.db.prepare('SELECT * FROM plans WHERE id=? AND owner=?').get(id, owner);
    if (!row) throw missing();
    return row;
  }
  chat(owner: string, id: string) {
    const row = this.db
      .prepare('SELECT c.*,p.revision FROM chats c JOIN plans p ON c.plan=p.id WHERE c.id=? AND p.owner=?')
      .get(id, owner);
    if (!row) throw missing();
    return row;
  }
  createPlan(owner: string, title: string) {
    return this.transaction(() => {
      const id = randomUUID();
      this.db.prepare('INSERT INTO plans(id,owner,title) VALUES(?,?,?)').run(id, owner, title);
      return { id, chatId: this.createChat(owner, id, '第一段对话') };
    });
  }
  createChat(owner: string, plan: string, title: string) {
    this.plan(owner, plan);
    const id = randomUUID();
    this.db.prepare('INSERT INTO chats(id,plan,title) VALUES(?,?,?)').run(id, plan, title);
    return id;
  }
  histories(chat: string) {
    return this.db.prepare('SELECT * FROM runs WHERE chat=? ORDER BY rowid').all(chat);
  }
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  indexEvidence(plan: string, context: Context, evidence: Evidence) {
    // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    if (evidence.solutionScript) return;
// end
    if (evidence.scope === "solution") return;
    // end
    // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
    if (evidence.alarmRule) return;
// end
    if (evidence.controlBinding) return;
    // end
    if (evidence.collectionSetup) return;
    // end
    if (evidence.variableInventory || evidence.pointLookup) return;
    // end
    // end
    if (!['page', 'request', 'period'].includes(context.kind)) return;
    const locator = JSON.stringify({
      kind: context.kind,
      projectId: context.projectId,
      object: context.object,
      ...(context.control ? { control: context.control } : {}),
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      ...(context.buttonName && {buttonName:context.buttonName}),
      // end
    });
    const updated = this.db
      .prepare(
        `INSERT INTO ref_objects(plan,locator,observed,evidence,digest) VALUES(?,?,?,?,?)
      ON CONFLICT(plan,locator) DO UPDATE SET observed=excluded.observed,evidence=excluded.evidence,digest=excluded.digest
      WHERE ref_objects.observed <= excluded.observed`,
      )
      .run(plan, locator, evidence.at, evidence.id, evidence.digest ?? null);
    if (!updated.changes) return;
    this.db.prepare('DELETE FROM ref_edges WHERE plan=? AND locator=?').run(plan, locator);
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO ref_edges(plan,locator,endpoint,direction) VALUES(?,?,?,?)',
    );
    for (const b of evidence.bindings ?? [])
      insert.run(plan, locator, JSON.stringify([b.source, b.name]), b.direction);
  }
  referenceScope(owner: string, chat: string, bindings: NonNullable<Evidence['bindings']>) {
    const plan = this.chat(owner, chat).plan;
    const endpoints = JSON.stringify(bindings.map((b) => JSON.stringify([b.source, b.name])));
    const indexed = this.db
      .prepare(
        `SELECT o.locator FROM ref_objects o WHERE o.plan=? ORDER BY
      EXISTS(SELECT 1 FROM ref_edges e WHERE e.plan=o.plan AND e.locator=o.locator AND e.endpoint IN (SELECT value FROM json_each(?))) DESC,
      o.observed DESC`,
      )
      .all(plan, endpoints);
    // M1 history contains locators but predates the index. It is also reread under the current KF login.
    const history = this.db
      .prepare(
        `SELECT DISTINCT r.context FROM runs r JOIN chats c ON c.id=r.chat
      WHERE c.plan=? AND r.status='done' ORDER BY r.rowid DESC`,
      )
      .all(plan);
    return [...indexed.map((row) => String(row.locator)), ...history.map((row) => String(row.context))].map(
      (value) => JSON.parse(value),
    );
  }
  items(plan: string) {
    // end
    return this.db
      .prepare(
        'SELECT d.*,r.context,r.dependencies FROM proposals d JOIN runs r ON d.run=r.id WHERE d.plan=? ORDER BY d.rowid',
      )
      .all(plan);
  }
  run(owner: string, id: string) {
    const row = this.db
      .prepare(
        'SELECT r.*,c.plan FROM runs r JOIN chats c ON c.id=r.chat JOIN plans p ON p.id=c.plan WHERE r.id=? AND p.owner=?',
      )
      .get(id, owner);
    if (!row) throw missing();
    return row;
  }
  start(owner: string, chat: string, id: string, question: string, context: Context, intent: string) {
    const record = this.chat(owner, chat);
    const prior = this.db.prepare('SELECT * FROM runs WHERE id=?').get(id);
    if (prior) {
      if (
        prior.chat !== chat ||
        prior.question !== question ||
        prior.context !== JSON.stringify(context) ||
        prior.intent !== intent
      )
        throw new HttpError(409, '该请求编号已被使用');
      return false;
    }
    if (this.db.prepare("SELECT 1 FROM runs WHERE chat=? AND status='active'").get(chat))
      throw new HttpError(409, '此对话正在回复');
    this.db
      .prepare(
        "INSERT INTO runs(id,chat,question,context,intent,status,created,plan_base) VALUES(?,?,?,?,?,'active',?,?)",
      )
      .run(id, chat, question, JSON.stringify(context), intent, new Date().toISOString(), record.revision);
    return true;
  }
  event(id: string, event: Record<string, unknown>) {
    this.db.prepare('INSERT INTO events(run,data) VALUES(?,?)').run(id, JSON.stringify(event));
  }
  updates(id: string, after: number) {
    return this.db
      .prepare('SELECT seq,data FROM events WHERE run=? AND seq>? ORDER BY seq LIMIT 100')
      .all(id, after);
  }
  // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
  remember(run: string, changes: MemoryChange[]) {
    this.transaction(() => {
      const update=this.db.prepare("UPDATE runs SET memory_applied=1 WHERE id=? AND status='active' AND memory_applied=0").run(run);
      if(update.changes) commitMemory(this.db,run,changes);
    });
  }
// end
  finish(
    id: string,
    status: string,
    answer: string,
    evidence: Evidence | null,
    proposal?: string,
    guidance?: Guidance,
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    source?: AnswerSource,

    // end
  ) {
    this.transaction(() => {
      const updated = this.db
        .prepare(
          "UPDATE runs SET status=?,answer=?,evidence=?,guidance=?,answer_source=? WHERE id=? AND status='active'",
        )
        .run(
          status,
          answer,
          evidence ? JSON.stringify(evidence) : null,
          guidance ? JSON.stringify(guidance) : null,
          // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
          JSON.stringify(source ?? { kind: status === 'done' ? 'local' : 'system' }),
          // end
          id,
        );
      // end
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      if (!updated.changes) return;

      if (status === 'done' && evidence) {
        const row = this.db
          .prepare('SELECT c.plan,r.context FROM runs r JOIN chats c ON c.id=r.chat WHERE r.id=?')
          .get(id);
        if (row) this.indexEvidence(String(row.plan), JSON.parse(String(row.context)), evidence);
      }
      // end
      if (proposal && status === 'done')
        this.db
          .prepare(
            "INSERT INTO proposals(id,plan,run,body,base,status) SELECT ?,p.id,?,?,COALESCE(r.plan_base,p.revision),'pending' FROM plans p JOIN chats c ON c.plan=p.id JOIN runs r ON r.chat=c.id WHERE r.id=?",
          )
          .run(randomUUID(), id, proposal, id);
      this.event(id, { type: 'end', status });
    });
  }
  proposal(owner: string, id: string) {
    const row = this.db
      .prepare(
        'SELECT d.*,r.context,r.dependencies FROM proposals d JOIN plans p ON d.plan=p.id JOIN runs r ON r.id=d.run WHERE d.id=? AND p.owner=?',
      )
      .get(id, owner);
    if (!row) throw missing();
    return row;
  }
  decide(owner: string, id: string, decision: 'confirmed' | 'rejected') {
    return this.transaction(() => {
      const draft = this.proposal(owner, id),
        plan = this.plan(owner, String(draft.plan));
      if (draft.status === decision) return { status: decision, revision: draft.version };
      if (draft.status !== 'pending') throw new HttpError(409, '该差异已有决定');
      if (decision === 'confirmed' && draft.base !== plan.revision)
        throw new HttpError(409, '方案已更新，请重新生成提议');
      const revision = Number(plan.revision) + (decision === 'confirmed' ? 1 : 0);
      this.db.prepare('UPDATE plans SET revision=? WHERE id=?').run(revision, plan.id);
      this.db.prepare('UPDATE proposals SET status=?,version=? WHERE id=?').run(decision, revision, id);
      return { status: decision, revision };
    });
  }
}
// end
