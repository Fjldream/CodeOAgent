// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
import { randomBytes, randomUUID } from 'node:crypto';
// end
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { Store } from './store.ts';
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
import { prepareCalculation, generationQuery } from './calc-generation.ts';
// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
import { formulaScope, formulaQuery, formulaInventory, compileFormula, clarifyFormula } from './formula.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
import { supportedTool } from './query-tools.ts';
// modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
// modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
import {scriptEnvironment,scriptContracts,authorQuery,draftQuery,checkSubmission,bindDraftFunctions} from './script-authoring.ts';
// end
// end
// end
// end
// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
import {planBusinessProbe,runBusinessProbe} from './business-probe.ts';
// end
import {qualityBindingErrors, qualityProbe} from './quality-probe.ts';
// end
import { runtimeReference, readRuntimeQuery } from './calc-runtime.ts';
// end
import { readCalcQuery, sectionForMenu } from './calc-config.ts';
// end
import { Center } from './center.ts';
import {
  HttpError,
  readContext,
  identifier,
  textField,
  missing,
  type Context,
  type Evidence,
} from './shared.ts';
// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
import {
  canUseTool,
  // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
  invokeQueryTool,
  // end
  modelSettings,
  projection,
  relay,
  reviewModelDraft,
  runOpenCode,
  type ModelRun,
} from './opencode.ts';
// end
import { compareInputs, evidenceGuide } from './guidance.ts';
// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
import { parseGuidance, sameSelection } from './next-step.ts';
// modified by jinlong.feng at 2026-11-23 KF意图澄清与续问
import { clarificationQuestion } from './model-answer.ts';
// end
import { resolveModelAnswer, sourceTitle, type ToolText, type AnswerSource } from './model-answer.ts';
// end
// end

// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
// modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
import { isQueryTool, readPointQuery, readQueryArguments } from './query-tools.ts';
// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import { inspectControlBinding, readBindingQuery } from './control-binding.ts';
// end
import { inspectCollectionSetup, readSetupQuery } from './collection-setup.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { planFromEntry, readStartQuery } from './solution-start.ts';
// end
// end
import { inspectClientPoints, pointProjection } from './client-points.ts';
// end
import { variableInventoryAnswer } from './client-variables.ts';
// end
// end
import { checkCandidate } from './candidate.ts';
import { traceReferences } from './trace.ts';
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
import {memoryRows, extractMemory, publicMemory, type MemoryItem} from './task-memory.ts';
// end
import { readSkill } from './skills.ts';
import { scriptExample } from './examples.ts';
// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import { alarmRoute, type AlarmRoute } from './alarm-route.ts';
import { alarmTargets, correlateAlarm, alarmLines, type AlarmBatch } from './alarm-samples.ts';
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
import { SceneJournal } from './scene-journal.ts';
// end
import { ReportJournal } from './report-journal.ts';
// end
import { CalcJournal } from './calc-journal.ts';
// end
import { inspectAlarmRule, compareRuleBatch, readRuleQuery, type RuleQuery } from './alarm-rule.ts';
async function ruleReport(owner: string, token: string, entry: Context, query: RuleQuery, chat?: string) {
  const result = await inspectAlarmRule(center, token, entry, query);
  const lines = [...result.lines, 'Center 规则回读 · ' + result.at];
  const dependencies: (Context & { runtimeApp?: string })[] = [...result.dependencies];
  let captures = 0,
    conflicts = 0,
    complete = 0,
    priorVersions = 0;
  if (chat) {
    store.chat(owner, chat);
    const rows = store.db
      .prepare('SELECT * FROM alarm_rule_captures WHERE chat=? ORDER BY rowid DESC LIMIT 4')
      .all(chat);
    const permitted = accessChecker(token);
    for (const row of rows) {
      const origin = JSON.parse(String(row.context)) as Context;
      if (
        entry.kind === 'page' &&
        (entry.projectId !== origin.projectId ||
          entry.object !== origin.object ||
          entry.control !== origin.control)
      )
        continue;
      if (!(await permitted(row))) continue;
      const details = compareRuleBatch(result.rule, JSON.parse(String(row.batch)));
      if (!details) continue;
      if (details.comparison === 'conflict') conflicts++;
      if (details.comparison === 'consistent') complete++;
      if (details.priorVersion) priorVersions++;
      captures++;
      lines.push('现场联查 ' + row.id, ...details.lines);
      dependencies.push(...JSON.parse(String(row.dependencies)));
    }
  }
  if (!captures)
    lines.push(
      '本段对话尚无可比对的同词条规则快照。需要解释实际事件时，在目标运行报警窗关联扩展，再执行“联查采样与报警”。',
    );
  const check = accessChecker(token);
  if (!(await check({ context: JSON.stringify(entry), dependencies: JSON.stringify(dependencies) })))
    throw new HttpError(403, '关联工程或实例权限已变更。');
  return {
    lines,
    dependencies,
    savedLines: result.lines,
    at: result.at,
    projection: { state: result.rule.state, captures, conflicts, complete, priorVersions },
  };
}
// end
const alarmSessions = new Map<string, { owner: string; chat: string; start: number; route: AlarmRoute }>();
// end
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// end
const home = resolve(process.env.KF_AGENT_DATA_DIR || resolve(root, '.state'));
mkdirSync(home, { recursive: true, mode: 0o700 });
// Holding a separate SQLite lock keeps a second service from recovering this service's live runs.
const serviceLock = new DatabaseSync(resolve(home, 'service-lock.sqlite'));
try {
  serviceLock.exec('BEGIN EXCLUSIVE');
} catch {
  throw Error('另一个助手实例正在使用此数据目录');
}
const store = new Store(resolve(home, 'assistant.sqlite'));
const center = new Center(
  process.env.KF_CENTER_ORIGIN || 'https://localhost',
  process.env.KF_CENTER_CA,
  process.env.KF_CENTER_CERT_SHA256,
);
const settings = modelSettings();
const active = new Map<string, AbortController>(),
  grants = new Map<string, ModelRun>();
// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
const browserRequests = new Map<
  string,
  { owner: string; ticket: string; receive: (sample: { browser?: unknown; editor?: unknown } | null) => void }
>();
function askRuntimeBrowser(owner: string, id: string, tab: string, context: Context, signal: AbortSignal) {
  if (signal.aborted) return null;
  return new Promise<{ browser?: unknown; editor?: unknown } | null>((resolve) => {
    const ticket = randomBytes(16).toString('hex');
    const done = (sample: { browser?: unknown; editor?: unknown } | null) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      browserRequests.delete(id);
      resolve(sample);
    };
    const abort = () => done(null);
    const timer = setTimeout(abort, 9000);
    signal.addEventListener('abort', abort, { once: true });
    browserRequests.set(id, { owner, ticket, receive: done });
    store.event(id, {
      type: 'observe-screen',
      ticket,
      tab,
      projectId: context.projectId,
      page: context.object,
      control: context.control,
    });
  });
}
// end
let privateBase = '';
const bearer = (request: any) => /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')?.[1];
function json(response: any, value: unknown, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}
async function body(request: any, limit = 24000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, '输入过长');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    throw new HttpError(400, 'JSON 格式错误');
  }
}
// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
const sceneJournal = new SceneJournal(store, center);
// end
const reportJournal = new ReportJournal(store, center);
// end
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
import {ConnectionJournal} from './connection-receipts.ts';
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
import { dictionaryReport } from './dictionary.ts';
import {dependencyKind,dependencyReport} from './dependency.ts';
// end
const connectionJournal = new ConnectionJournal(store,center);
// end
const calcJournal = new CalcJournal(store, center);
// end
// end
// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
async function calculateFromEvidence(
  tool: 'inspect_calculation_io' | 'compile_calculation_formula',
  token: string,
  owner: string,
  chat: string,
  context: Context,
  args: unknown,
  question = '',
  previousQuestions: string[] = [],
) {
  if (!supportedTool(tool, context.kind)) throw new HttpError(400, '请从计算工程或客户端打开');
  const linked =
    formulaScope(args).scope === 'lastCalculationReceipt'
      ? await calcJournal.recentCalculation(owner, chat, accessChecker(token))
      : undefined;
  const entry = linked?.entry ?? context;
  const inventory = await formulaInventory(center, token, entry, question, previousQuestions);
  const dependencies = [...inventory.dependencies, ...(linked?.dependencies ?? [])];
  const report =
    tool === 'inspect_calculation_io'
      ? { lines: inventory.lines, summary: inventory.summary }
      : compileFormula(entry, inventory, formulaQuery(args));
  if (
    !(await accessChecker(token)({
      context: JSON.stringify(context),
      dependencies: JSON.stringify(dependencies),
    }))
  )
    throw new HttpError(403, '关联工程权限已变更');
  return { ...report, dependencies };
}
// end
function accessChecker(token: string) {
  // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
  const memo = new Map<string, Promise<boolean>>();
  const instances = new Map<string, ReturnType<Center['runtimeAccess']>>();
  return async (row: any) => {
    const contexts: (Context & { runtimeApp?: string; runtimeNode?: string })[] = [
      JSON.parse(row.context),
      ...JSON.parse(row.dependencies ?? '[]'),
    ];
    for (const context of contexts) {
      const key = context.kind + ':' + context.projectId;
      if (!memo.has(key)) memo.set(key, center.allowed(token, context));
      if (!(await memo.get(key))) return false;
      if (context.runtimeApp) {
        if (!instances.has(key)) instances.set(key, center.runtimeAccess(token, context));
        const allowed = await instances.get(key)!;
        if (!allowed.some((app) => app.appId === context.runtimeApp && app.nodeId === context.runtimeNode))
          return false;
      }
    }
    // end
    return true;
  };
}
// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
function replySource(row: Record<string, unknown>) {
  const source: AnswerSource = row.answer_source
    ? JSON.parse(String(row.answer_source))
    : { kind: row.status !== 'done' ? 'system' : row.intent === 'ask' ? 'legacy' : 'local' };
  const { continuity: _privateContinuity, ...publicSource } = source;
  return { ...publicSource, label: sourceTitle(source) };
}
// end
async function history(owner: string, token: string, id: string) {
  const chat = store.chat(owner, id),
    canRead = accessChecker(token);
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
  const activities=new Map<string,Map<string,any>>();
  for(const row of store.db.prepare("SELECT e.run,e.data FROM events e JOIN runs r ON r.id=e.run WHERE r.chat=? AND json_extract(e.data,'$.type')='activity' ORDER BY e.seq").all(id)){
    const key=String(row.run),event=JSON.parse(String(row.data));
    if(!activities.has(key))activities.set(key,new Map());
    activities.get(key)!.set(event.step,event);
  }
  // end
  const turns = await Promise.all(
    store.histories(id).map(
      async (row) =>
        (await canRead(row))
          ? {
              id: row.id,
              question: row.question,
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
              activities:[...(activities.get(String(row.id))?.values()??[])],
// end
              context: JSON.parse(String(row.context)),
              status: row.status,
              answer: row.answer,
              // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
              source: replySource(row),
              // end
              evidence: row.evidence ? JSON.parse(String(row.evidence)) : null,
              created: row.created,
            }
          : // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            {
              id: row.id,
              status: 'hidden',
              answer: '关联工程不可见',
              source: { kind: 'system', label: 'KF 权限提示' },
            },
      // end
    ),
  );
  const proposals = await Promise.all(
    store.items(String(chat.plan)).map(async (row) =>
      (await canRead(row))
        ? {
            id: row.id,
            run: row.run,
            body: row.body,
            base: row.base,
            status: row.status,
            version: row.version,
          }
        : { id: row.id, status: 'hidden', version: row.version },
    ),
  );
  return { id, plan: chat.plan, title: chat.title, revision: chat.revision, turns, proposals };
}
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import { describeScene } from './scene-observation.ts';
function describe(e: Evidence) {
  const fields = e.facts.map((f) => f.label + '：' + f.value);
  return [e.title + '的已保存配置', ...fields, ...e.gaps, describeScene(e.sceneView)]
    .filter(Boolean)
    .join('\n');
}
// end
function summary(e: Evidence) {
  if (!e.facts.length) return '';
  return (
    '已核对 ' +
    e.title +
    ' 的已保存配置。' +
    e.facts
      .map((f) => f.label + '：' + f.value)
      .join('；')
      .slice(0, 1200)
  );
}
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
import {selectedHost, explainSelection} from './selected-script.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import {trackActivity,type Track} from './query-activity.ts';
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
import { reviewConstraints, reviewDiagnostics } from './review-constraints.ts';
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
import {dictionaryNames} from './script-authoring.ts';
import {projectText} from './reference-names.ts';
// end
import {reviewNameDiagnostics,recheckClarification,confirmedScriptScope,isScriptConfirmation,scriptMode,isAmendment,amendmentDiagnostics,missingReviewRefs,priorScope,selectTarget,connectEnvironment,approvedBindings,confirmed,checkpointEvidence,readReview,reviewText,type Checkpoint} from './solution-script.ts';
// end
// end
// end
// end
// end
// end
import { solutionOverview } from './solution-overview.ts';
async function readSolutionOverview(owner:string,token:string,chat:string,ctx:Context,track?:Track){
  const report=await solutionOverview(center,token,store,owner,chat,ctx,accessChecker(token),track);
  if(!await accessChecker(token)({context:JSON.stringify(ctx),dependencies:JSON.stringify(report.dependencies)}))
    throw new HttpError(403,'方案关联工程权限发生变化。');
  return report;
}
// end
import {projectOverview} from './project-overview.ts';
async function readProjectOverview(owner:string,token:string,chat:string,ctx:Context,track?:Track){
  store.chat(owner,chat);
  await center.require(token,ctx);
  const permitted=accessChecker(token);
  const report=await projectOverview(ctx,
    (route,params)=>center.call(token,route,{...params,projectId:ctx.projectId}),
    hashes=>calcJournal.overviewReceipts(owner,chat,ctx.projectId,hashes,permitted),track);
  if(!await permitted({context:JSON.stringify(ctx),dependencies:JSON.stringify(report.dependencies)}))throw new HttpError(403,'工程或运行回执权限发生变化。');
  return report;
}
// end
async function execute(
  owner: string,
  token: string,
  chat: string,
  id: string,
  question: string,
  context: Context,
  intent: string,
  controller: AbortController,
  // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
  browserTab?: string,
  scriptDraft?: string,
// end
  // end
) {
  const capability = randomBytes(32).toString('hex');
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]);
  let evidence: Evidence | null = null;
  // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
  let attemptedModel: ModelRun | undefined;
  // modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
  const sampleDiagnostics=new Map<string,string[]>();
  let formulaFailure='';
  // end
  // end
  try {
    store.event(id, { type: 'status', message: '正在核对本轮入口' });
    if (intent !== 'ask' || !settings) {
      if (intent === 'ask' && !settings) {
        store.finish(
          id,
          'unavailable',
          '当前未配置云端模型。可点击“核对已保存配置”读取当前对象，或整理为待确认方案。',
          null,
        );
        return;
      }
      evidence = await center.evidence(token, context);
      signal.throwIfAborted();
      let relation = '';
      if (evidence?.references.length && ['page', 'period'].includes(context.kind)) {
        const other = context.kind === 'page' ? 'period' : 'page';
        const canRead = accessChecker(token);
        const previous = store
          .histories(chat)
          .reverse()
          .find(
            (row) => row.status === 'done' && row.evidence && JSON.parse(String(row.context)).kind === other,
          );
        if (previous && (await canRead(previous))) {
          const prior = JSON.parse(String(previous.evidence)) as Evidence;
          relation = compareInputs(evidence, prior);
          if (relation) {
            store.db
              .prepare('UPDATE runs SET dependencies=? WHERE id=?')
              .run(
                JSON.stringify([
                  JSON.parse(String(previous.context)),
                  ...JSON.parse(String(previous.dependencies)),
                ]),
                id,
              );
          }
        }
      }
      const suggested =
        evidence && intent === 'propose' ? [summary(evidence), relation].filter(Boolean).join('\n') : '';
      const answer = evidence
        ? intent === 'propose'
          ? suggested
            ? '已根据本次读回整理一项待确认差异。'
            : '材料不足，无法生成可确认的条目。'
          : [describe(evidence), relation].filter(Boolean).join('\n')
        : '请先打开客户端页面或周期脚本，再核对已保存配置。';
      if ((await center.identity(token)) !== owner || !(await accessChecker(token)(store.run(owner, id))))
        throw new HttpError(403, '工程权限已变更');
      signal.throwIfAborted();
      store.finish(id, 'done', answer, evidence, suggested || undefined);
      return;
    }
    const chatRecord = store.chat(owner, chat);
    const canRead = accessChecker(token);
    // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
    // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    const earlierTurns = store.histories(chat).filter(row => row.id !== id);
    const precedingTurn = earlierTurns.at(-1);
    const finished = earlierTurns.filter(row => row.status === 'done');
    // end
    const recent = finished.slice(-6);
    const matchesSelection = (row: (typeof recent)[number]) =>
      // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
      row.evidence &&
      sameSelection(JSON.parse(String(row.context)), context) &&
      !JSON.parse(String(row.evidence)).variableInventory;
    // end
    const earlierSelection =
      !recent.some(matchesSelection) && finished.slice(0, -6).findLast(matchesSelection);
    const previous = earlierSelection ? [earlierSelection, ...recent] : recent;
    // end
    // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
    const previousCalculationQuestions: string[] = [];
    // end
    const priorMessages: { role: string; content: string }[] = [];
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
    const priorSolution=priorScope(store,owner,chat);
    const namesTarget = priorSolution && (['calculation','period','request'].includes(context.kind)
      ? context.projectId : priorSolution.checkpoint?.target);
    const modelText = projectText(namesTarget ? await dictionaryNames(center,token,namesTarget) : new Map());
    // end

    // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
    let knownSelection = false;
    // end
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    const historicalFacts: ToolText = {};
    // end
    let predecessor: Evidence | undefined;
    const dependencies = new Map<string, Context>();
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    const savedMemory: MemoryItem[] = [];
    let lastClarification: string | undefined;
    let precedingUserMessage: string | undefined;
    if (precedingTurn && await canRead(precedingTurn)) {
      precedingUserMessage = String(precedingTurn.question).slice(0,2000);
      for (const dep of [JSON.parse(String(precedingTurn.context)), ...JSON.parse(String(precedingTurn.dependencies))]) {
        dependencies.set(dep.runtimeApp ? 'app:' + dep.runtimeApp : dep.kind + ':' + dep.projectId, dep);
      }
    }
    for (const row of memoryRows(store.db, chat)) {
      if (!await canRead(row)) continue;
      savedMemory.push(row);
      for (const dep of [JSON.parse(row.context), ...JSON.parse(row.dependencies)]) {
        dependencies.set(dep.runtimeApp ? 'app:' + dep.runtimeApp : dep.kind + ':' + dep.projectId, dep);
      }
    }
// end
    let inaccessible = false;
    for (const row of previous) {
      if (!(await canRead(row))) {
        inaccessible = true;
        continue;
      }
      // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
      for (const ctx of [JSON.parse(String(row.context)), ...JSON.parse(String(row.dependencies))])
        dependencies.set(ctx.runtimeApp ? 'app:' + ctx.runtimeApp : ctx.kind + ':' + ctx.projectId, ctx);
      // end
      // Keep local descriptions and raw fields out of external messages.
      const evidence = row.evidence ? JSON.parse(String(row.evidence)) : null;
      // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      const priorContext = JSON.parse(String(row.context));
      // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
      if (priorContext.projectId === context.projectId)
        previousCalculationQuestions.push(String(row.question).slice(0, 2000));
      // end
      if (evidence && priorContext.projectId === context.projectId) {
        const stamp = '上次读回的已保存配置（' + evidence.at + '）\n';
        // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
        // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        // modified by jinlong.feng at 2026-11-22 KF报警规则回读
        if (evidence.alarmRule) {
          if (context.kind === 'alarm' && sameSelection(priorContext, context)) {
            historicalFacts['history:inspect_alarm_rule'] =
              stamp + evidence.facts.map((fact: { value: string }) => fact.value).join('\n');
          }
        } else if (evidence.controlBinding && sameSelection(priorContext, context)) {
          // end
          historicalFacts['history:inspect_control_binding'] =
            stamp + evidence.facts.map((fact: { value: string }) => fact.value).join('\n');
        } else if (
          evidence.collectionSetup &&
          context.kind === 'collection' &&
          priorContext.kind === 'collection'
        ) {
          // end
          historicalFacts['history:inspect_collection_setup'] =
            stamp + evidence.facts.map((fact: { value: string }) => fact.value).join('\n');
        } else if (evidence.pointLookup && sameSelection(priorContext, context)) {
          // end
          const slot =
            evidence.pointLookup.tool === 'find_objects' ? 'history:find_objects' : 'history:trace_refs';
          historicalFacts[slot] =
            stamp + evidence.facts.map((fact: { value: string }) => fact.value).join('\n');
        } else if (evidence.variableInventory && ['client', 'page', 'scene', 'report'].includes(context.kind))
          // end
          historicalFacts['history:read_client_variables'] = stamp + variableInventoryAnswer(evidence);
        else if (!evidence.variableInventory && sameSelection(priorContext, context))
          historicalFacts['history:read_object'] =
            stamp + evidenceGuide(evidence, undefined, JSON.stringify({ sections: ['facts'] }));
      }
      // end
      if (row === earlierSelection) {
        knownSelection = true;
        priorMessages.push({
          role: 'system',
          content: '此选区较早的历史核对记录：' + JSON.stringify(projection(evidence)),
        });
        continue;
      }
      // end
      if (
        // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
        evidence &&
        // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
        !evidence.variableInventory &&
        !evidence.pointLookup &&
        // end
        // end
        ((context.kind === 'page' && JSON.parse(String(row.context)).kind === 'period') ||
          (context.kind === 'period' && JSON.parse(String(row.context)).kind === 'page'))
      )
        predecessor = evidence;
      // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
      // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
      const matches = !evidence?.variableInventory && sameSelection(JSON.parse(String(row.context)), context);
      // end
      const given = row.guidance ? parseGuidance(JSON.parse(String(row.guidance))) : null;
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      const priorSource: AnswerSource | null = row.answer_source
        ? JSON.parse(String(row.answer_source))
        : null;
      // end
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      if (row === precedingTurn && priorSource?.pendingClarification) lastClarification = priorSource.continuity;
// end
      if (evidence && matches) knownSelection = true;
      priorMessages.push(
        { role: 'user', content: String(row.question).slice(0, 2000) },
        {
          role: 'assistant',
          content: JSON.stringify({
            ...(evidence ? { historicalEvidence: projection(evidence), sameSelection: matches } : {}),
            ...(given ? { previousGuidance: given } : {}),
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            ...(priorSource?.basis ? { previousBasis: priorSource.basis } : {}),
            ...(priorSource?.continuity ? { previousReply: priorSource.continuity } : {}),
            // end
          }),
        },
      );
      // end
    }
    // New chats can recover confirmed plan membership through anonymous evidence references.
    for (const item of store
      .items(String(chatRecord.plan))
      .filter((p) => p.status === 'confirmed')
      .slice(-8)) {
      if (!(await canRead(item))) continue;
      const prior = store.run(owner, String(item.run));
      if (!prior.evidence) continue;
      // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
      for (const ctx of [JSON.parse(String(prior.context)), ...JSON.parse(String(prior.dependencies))])
        dependencies.set(ctx.runtimeApp ? 'app:' + ctx.runtimeApp : ctx.kind + ':' + ctx.projectId, ctx);
      // end
      priorMessages.push({
        role: 'system',
        content: '本人已确认的方案依据 ' + JSON.stringify(projection(JSON.parse(String(prior.evidence)))),
      });
    }
    store.db
      .prepare('UPDATE runs SET dependencies=? WHERE id=?')
      .run(JSON.stringify([...dependencies.values()]), id);
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    if (!await accessChecker(token)(store.run(owner,id))) throw new HttpError(403,'关联工程权限已变更');
    const {changes:memoryChanges,relevant} = await extractMemory(settings,signal,question,savedMemory,lastClarification,precedingUserMessage,modelText);
    signal.throwIfAborted();
    if ((await center.identity(token)) !== owner || !await accessChecker(token)(store.run(owner,id))) throw new HttpError(403,'记忆来源工程权限已变更');
    store.remember(id,memoryChanges);
    const taskMemory = publicMemory(relevant);
// end
    const facts: ToolText = {};
// modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
    if (taskMemory.length) facts.task_memory = ['本段对话当前的业务要求', ...taskMemory.map(item => item.topic + ' · ' + item.quote)].join('\n');
// end

    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    let inventory: Evidence | null = null;
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    let setupEvidence: Evidence | null = null;
    // end
    let pointEvidence: Evidence | null = null;
    // end
    // end
    // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
    // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
    const qualityCases = new Map<string, ReturnType<typeof import('./quality-probe.ts').qualityInputs>>();
    // end
// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
    const businessPlans = new Map<string,Awaited<ReturnType<typeof planBusinessProbe>>>();
    const businessReceipts: {host:string;digest:string;cases:number;failed:number}[] = [];
// end
    let lastRejectedDrafts: string | undefined;
    const runtimeLookups = new Map<string, ReturnType<typeof runtimeReference>>();
    const publicArguments: NonNullable<ModelRun['publicArguments']> = {};
    // end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
    const track=trackActivity(event=>{if(!signal.aborted)store.event(id,event);});
    // end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核

    let clarificationRechecked = false;
// end
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
    let bridge:{env:Awaited<ReturnType<typeof scriptEnvironment>>;scope:ReturnType<typeof connectEnvironment>;flow:Awaited<ReturnType<typeof solutionOverview>>['flow'];target:Context;checkpoint:Checkpoint;confirmed:boolean;approved?:ReturnType<typeof confirmedScriptScope>}|undefined;
// end
    function retain(ctx:Context){dependencies.set(JSON.stringify(ctx),ctx);}
    function saveDependencies(){
      store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
    }
// end
    const run: ModelRun = {
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
      solutionState:priorSolution?.checkpoint?.phase || (priorSolution ? "overview" : undefined),
      ...(priorSolution?.checkpoint?.phase === "review" && isScriptConfirmation(question) && {requiredTool: "prepare_solution_script" as const}),
// end
// end
      track,
// end
      // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
      publicArguments,
      // end
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
      question: modelText(question),
      taskMemory: taskMemory.map(item => ({...item,topic:modelText(item.topic),quote:modelText(item.quote)})),
// end
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
      history: priorMessages.map(message => ({...message,content:modelText(message.content)})),
// end
      contextKind: context.kind,
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
      menuTitle: context.calcMenu ? readSkill(context.kind, undefined, context.calcMenu).title : undefined,
// end
      calcSection: sectionForMenu(context.calcMenu),
      // end
      // modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
      selectedScriptHost:selectedHost(context),
// end
      knownSelection,
      historicalSlots: Object.keys(historicalFacts),
      // end
      // end
      signal,
      tools: 0,
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      requests: 0,
      observations: {},
      // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
      inspect: async (name, query) => {
        // end
        if ((await center.identity(token)) !== owner) throw new HttpError(403, '身份已变更');
        await center.require(token, context);
        // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
        // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
        // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        // modified by jinlong.feng at 2026-11-22 KF报警规则回读
        // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
        // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
        // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
        if(name==='prepare_solution_script'){
          if(!priorSolution || !await canRead(priorSolution.anchor) || !await canRead(priorSolution.row)){
            facts[name]='当前对话中没有可读的方案总览。请先从方案内的工程核对数据流。';
            return {status:'unavailable',localReference:'[[prepare_solution_script]]'};
          }
          for(const row of [priorSolution.anchor,priorSolution.row]){
            retain(JSON.parse(String(row.context)));for(const dep of JSON.parse(String(row.dependencies)))retain(dep);
          }
          const report=await readSolutionOverview(owner,token,chat,JSON.parse(String(priorSolution.anchor.context)),track);
          for(const dep of report.dependencies)retain(dep);
          saveDependencies();
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
          const mode = scriptMode(question, (query as {mode?:string}|undefined)?.mode);
// end
          const changing=isAmendment(question,mode);
          const targetId=selectTarget(report.flow,context,mode==='new'?undefined:priorSolution.checkpoint,changing);
// end
          if(!targetId){
            facts[name]='当前数据流无法唯一定位计算工程。请打开要承载脚本的计算工程，在本段对话继续；助手会核对它保存的数据源。';
            return {status:'choose-target',localReference:'[[prepare_solution_script]]'};
          }
          const target:Context={kind:'calculation',projectId:targetId,object:'',dirty:false};
          await center.require(token,target);retain(target);
          const env=await scriptEnvironment(center,token,target,question,previousCalculationQuestions);
          for(const dep of env.dependencies)retain(dep);
          saveDependencies();
          const scope=connectEnvironment(report.flow,env);
          const checkpoint:Checkpoint={anchor:String(priorSolution.anchor.id),target:targetId,fingerprint:scope.fingerprint,phase:'inspect'};
          const previous=priorSolution.checkpoint;
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
          const same=mode!=='new' && previous?.target===targetId && !!previous.review &&
            (previous.phase==='review' || changing && previous.phase==='delivered');
          if(same && changing) checkpoint.amendment={baseRun:String(priorSolution.row.id),base:previous.review!};
          else if(same && previous.amendment) checkpoint.amendment=previous.amendment;
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
          checkpoint.constraints = reviewConstraints(question, env.bindings, same ? previous?.constraints : undefined);
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
          if (!priorSolution.immediate && previous?.review && confirmed(question,previous,checkpoint)) {
            throw new HttpError(409,'上一次需求核对没有完成，请重述最新变更后再确认。');
          }
          const accepted = same && !changing && priorSolution.immediate && !!previous?.constraints && confirmed(question,previous,checkpoint)
// end
            && !reviewDiagnostics(previous.review!, checkpoint.constraints).length;
// end
          if(same)checkpoint.review=previous.review;
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
          const approved = accepted ? confirmedScriptScope(previous!.review!, env, scope) : undefined;
          bridge={env,scope,target,checkpoint,flow:report.flow,confirmed:accepted,approved};
// end
          facts[name]='已沿本段方案的保存引用核对目标计算工程、可用输入、输出和已有函数。';
          setupEvidence=checkpointEvidence(checkpoint,facts[name]);
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
          if (approved) {
            for (const host of previous!.review!.hosts) {
              if ((host==='request' || host==='period') && !businessPlans.has(host)) {
                // modified by jinlong.feng at 2026-11-24 KF业务预期逐项复核
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
                if(formulaFailure)throw new HttpError(422,formulaFailure);
                try {
                  businessPlans.set(host,await planBusinessProbe(host,approved.material,settings!,signal,
                    (digest,report)=>store.recordBusinessPrediction(id,host,digest,report)));
                } catch(error) {
                  if(error instanceof HttpError && [409,422].includes(error.status)) formulaFailure=error.message;
                  throw error;
                }
                // end
                // end
              }
            }
            return {...approved.material, status:'confirmed', localReference:'[[prepare_solution_script]]'};
          }
// end
          return {...env.summary,bindings:scope.bindings,cards:scriptContracts(['global',...env.connectionContracts]),
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
            status:accepted?'confirmed':'needs-review',previousReview:same && previous.constraints ? previous.review:undefined,
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
            constraints:checkpoint.constraints,
            ...(checkpoint.amendment && {changeInstructions:'这是原任务的新版本。项目引用已重新读取；根据 previousReview 和本轮提问填写 retained、retired、当前 policy。上版确认对新要求无效。'}),
// end
// end
            localReference:'[[prepare_solution_script]]'};
        }
        if(name==='review_solution_script'){
          if(!bridge||bridge.confirmed)throw new HttpError(409,'请先核对本轮方案的计算宿主。');
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
          let review;
          try {
            review=readReview(query);
            approvedBindings(review,bridge.env,new Set(bridge.scope.bindings.map(b=>b.ref)));
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
            const issues=[...reviewNameDiagnostics(review,new Set(bridge.scope.bindings.map(item => item.ref))),...reviewDiagnostics(review,bridge.checkpoint.constraints!),...amendmentDiagnostics(review,bridge.checkpoint.amendment)];
// end
            if (issues.length) return {status:'revise', diagnostics:issues, instruction:'根据这些约束修改选择，重新提交完整清单。'};
          } catch (error) {
            if (!(error instanceof HttpError)) throw error;
            return {status:'revise',diagnostics:[error.message],instruction:'使用已登记的匿名引用，修改并重新提交完整清单。'};
          }
// end
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
          const clarification = recheckClarification(review,bridge.scope,clarificationRechecked);
          if (clarification) {
            clarificationRechecked = true;
            return clarification;
          }
          bridge.checkpoint={...bridge.checkpoint,review,phase:'review'};
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
          facts[name]=reviewText(review,bridge.env,bridge.checkpoint.amendment);
// end
          setupEvidence=checkpointEvidence(bridge.checkpoint,facts[name]);
          return {status:review.missing?'clarification':'awaiting-confirmation',localReference:'[[review_solution_script]]'};
        }
// end
        if(name==='inspect_solution_overview'){
          const result=await readSolutionOverview(owner,token,chat,context,track);
          for(const dep of result.dependencies)dependencies.set(JSON.stringify(dep),dep);
          store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
          setupEvidence=result.evidence;
          facts[name]=result.answer;
          return result.summary;
        }
// end
        if(name==='inspect_project_overview'){
          const r=await readProjectOverview(owner,token,chat,context,track);
          for(const dep of r.dependencies)dependencies.set(JSON.stringify(dep),dep);
          store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
          setupEvidence=r.evidence;
          facts[name]=r.answer;
          return r.summary;
        }
// end
        if (name==='explain_selected_script') {
          const report=await explainSelection(context,(route,params)=>center.call(token,route,{...params,projectId:context.projectId}),scriptDraft);
          evidence=report.evidence;
          facts[name]=report.answer;
          return report.summary;
        }
// end
        if (name === 'inspect_scene_binding') {
          const report = await sceneJournal.read(owner, token, chat, context, accessChecker(token));
          for (const dep of report.dependencies) dependencies.set(JSON.stringify(dep), dep);
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          facts[name] = report.lines.join('\n');
          return { ...report.summary, localReference: '[[inspect_scene_binding]]' };
        }
        // end
        if (name === 'inspect_report_dataset') {
          const report = await reportJournal.read(owner, token, chat, context, accessChecker(token));
          for (const dep of report.dependencies) dependencies.set(JSON.stringify(dep), dep);
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          facts[name] = report.lines.join('\n');
          return { ...report.summary, localReference: '[[inspect_report_dataset]]' };
        }
        // end
        if (name === 'inspect_calc_results') {
          const report = await calcJournal.report(owner, token, chat, context, accessChecker(token));
          for (const dependency of report.dependencies) {
            dependencies.set('app:' + dependency.runtimeApp, dependency);
          }
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          if (report.current) {
            const hasReceipt = report.projection.periods + report.projection.requests > 0;
            setupEvidence = {
              ...report.current,
              gaps: report.current.gaps.filter(
                (gap) => !hasReceipt || gap !== '尚无目标 App 的部署和运行读数。',
              ),
            };
          }
          facts[name] = report.lines.join('\n');
          return { ...report.projection, localReference: '[[inspect_calc_results]]' };
        }
        // end
        if (name === 'inspect_alarm_rule') {
          const report = await ruleReport(
            owner,
            token,
            context,
            query && 'tag' in query ? { tag: query.tag } : {},
            chat,
          );
          for (const dep of report.dependencies)
            dependencies.set(dep.runtimeApp ? 'app:' + dep.runtimeApp : dep.kind + ':' + dep.projectId, dep);
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          setupEvidence = {
            id: randomUUID(),
            at: report.at,
            layer: 'saved',
            title: '报警规则',
            source: 'alarm/tags · 词条与报警窗关联',
            references: [],
            facts: report.savedLines.map((value) => ({ label: '规则', value })),
            gaps: [],
            alarmRule: report.projection,
          };
          facts[name] = report.lines.join('\n');
          return { ...report.projection, localReference: '[[inspect_alarm_rule]]' };
        }
        // end
        if (name === 'inspect_control_binding') {
          const result = await inspectControlBinding(
            center,
            token,
            context,
            query && 'variable' in query ? query : {},
            (ctx) => {
              dependencies.set(ctx.kind + ':' + ctx.projectId, ctx);
            },
          );
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          setupEvidence = {
            id: randomUUID(),
            at: result.at,
            layer: 'saved',
            title: '二维控件绑定',
            source: 'client/batchGetPageFile · client/getVariableList · 客户端连接、实时源与数采点权限回读',
            references: [],
            facts: result.lines.slice(0, -1).map((value) => ({ label: '核对', value })),
            gaps: [],
            controlBinding: result.projection,
          };
          facts[name] = result.lines.join('\n');
          return result.projection;
        }
        // end
        // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
        // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
        // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
        // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
        if (name === 'clarify_calculation_contract') {
          const report = clarifyFormula(query);
          facts[name] = report.lines.join('\n');
          return { ...report.summary, localReference: '[[clarify_calculation_contract]]' };
        }
        if (name === 'inspect_calculation_io' || name === 'compile_calculation_formula') {
          const report = await calculateFromEvidence(
            name,
            token,
            owner,
            chat,
            context,
            query,
            question,
            previousCalculationQuestions,
          );
          for (const dep of report.dependencies) dependencies.set(JSON.stringify(dep), dep);
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          facts[name] = report.lines.join('\n');
          return { ...report.summary, localReference: '[[' + name + ']]' };
        }
        // end
        if (name === 'prepare_calculation') {
          const { method, bindings, scope } = generationQuery(query);
          const linked =
            scope === 'lastCalculationReceipt'
              ? await calcJournal.recentCalculation(owner, chat, accessChecker(token))
              : undefined;
          for (const dep of linked?.dependencies ?? []) dependencies.set(JSON.stringify(dep), dep);
          const report = await prepareCalculation(center, token, linked?.entry ?? context, method, bindings);
          for (const dep of report.dependencies) dependencies.set(JSON.stringify(dep), dep);
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          facts[name] = report.lines.join('\n');
          return { ...report.summary, localReference: '[[prepare_calculation]]' };
        }
        // end
        // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
        if(name==='inspect_script_environment'||name==='check_script_drafts'){
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
          const env=await scriptEnvironment(center,token,bridge?.target??context,question,previousCalculationQuestions);
          if(bridge){
            const scope=connectEnvironment(bridge.flow,env),review=bridge.checkpoint.review;
            if(!bridge.confirmed||!review||scope.fingerprint!==bridge.checkpoint.fingerprint)throw new HttpError(409,'引用或业务口径尚待重新确认。');
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
            if (!bridge.approved) throw new HttpError(409,'本轮缺少已确认的工程引用。');
            env.bindings = bridge.approved.bindings;
// end
          }
// end

          for (const dep of env.dependencies)dependencies.set(JSON.stringify(dep),dep);
          store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
          if(name==='inspect_script_environment'){
            const inputs = authorQuery(query);
            publicArguments[name] = inputs;
            // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
            const cards = scriptContracts([...new Set(['global', ...env.connectionContracts, ...inputs.symbols])]);
            // end
            // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
            facts[name]=[...env.lines,...cards.map(c=>[c.symbol,c.state,c.signature,c.usage,c.result,
              c.verification && '已核对源码，运行待验证'].filter(Boolean).join(' · '))].join('\n');
            // end
            return {...env.summary,cards,localReference:'[[inspect_script_environment]]'};
          }
          // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
          let drafts;
          // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
          let draftBindings;
          try {
            ({drafts}=draftQuery(query));
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
            if(bridge){
              const expected=bridge.checkpoint.review!.hosts;
              if(drafts.length!==expected.length||drafts.some(d=>!expected.includes(d.host)))throw new HttpError(400,'请按已确认的宿主提交完整正文：'+expected.join('、'));
            }
// end
            draftBindings=bindDraftFunctions(drafts,env.bindings,env.occupiedNames);
          }
          // end
          catch (error) {
            if (!(error instanceof HttpError)) throw error;
            const diagnostics = [{errors:[error.message], warnings:[], functions:[]}];
            delete facts[name];
            return {status:'revise', diagnostics, instruction:'请按工具 schema 修正 drafts 和 qualitySamples 的字段，再提交完整脚本。'};
          }
          // end
          // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
          const results = [];
          for (const draft of drafts) {
            // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
            // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
            // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
            const result = checkSubmission(draft, draftBindings);
            // end
            // end
            // end
            if (draft.qualitySamples) qualityCases.set(draft.host,draft.qualitySamples);
            const samples = qualityCases.get(draft.host);
            if (samples) result.errors.push(...qualityBindingErrors(samples,env.bindings));
            if (!result.errors.length && samples) {
              result.errors.push(...await qualityProbe(draft.code,samples,env.bindings));
              if (!result.errors.length) result.warnings.push('合成周期已覆盖各必需点坏质量停写和恢复续写；实际目标仍须现场回读。');
            }
            results.push(result);
          }
          // end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
          if (bridge && results.every(result=>!result.errors.length)) {
            const review=bridge.checkpoint.review!;
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
            const mismatch=missingReviewRefs(drafts,review,!!bridge.checkpoint.amendment);
// end
            for(const ref of mismatch) {
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
              const entry = bridge.approved?.material.bindings.find(item => item.ref === ref);
              const use = entry?.access.length ? entry.access.join('；') : '核对或移除未经确认的操作 '+ref;
// end
              results[0].errors.push('核对工程角色：'+use+'。');
            }
          }
// end
// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
          if (bridge?.approved && results.every(r=>!r.errors.length)) {
            for (const result of results) {
              const plan=businessPlans.get(result.host);
              if (!plan) {
                if (result.host==='request'||result.host==='period') result.errors.push('本轮尚无独立业务样本，无法交付。');
                continue;
              }
              const failures=await runBusinessProbe(plan,result.code!,bridge.approved.material.bindings,bridge.approved.bindings);
              businessReceipts.push({host:result.host,digest:plan.digest,cases:plan.samples.length,failed:failures.length});
              const safeText=projectText(new Map([...bridge.approved.bindings].map(([ref,b])=>[b.name,ref])));
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
              if(failures.length){
                const diagnostics=failures.slice(0,4).map(safeText);
                sampleDiagnostics.set(result.host,diagnostics);
                result.errors.push(...diagnostics);
              }else if(sampleDiagnostics.has(result.host)){
                result.warnings.push('模型已根据以下差异修订，本次复验通过。\n'+sampleDiagnostics.get(result.host)!.join('\n'));
              }
              // end
              if (!failures.length) result.warnings.push('已执行 '+plan.samples.length+' 个已确认口径的合成样本，逐次核对回包和写入。');
            }
          }
// end
          const diagnostics=results.map(({host,errors,warnings,functions})=>({host,errors,warnings,functions}));
          const rejected=results.some(r=>r.errors.length);
          if(rejected){
            delete facts[name];
            const submitted = JSON.stringify(drafts);
            const unchanged = submitted === lastRejectedDrafts;
            lastRejectedDrafts = submitted;
            // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
            const excerpts = results.map((result, i) => {
              const lines = drafts[i].code.split('\n');
              return {host: result.host, issues: result.errors.map(message => {
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
                const phase = /^(应用程序启动时|应用程序关闭时) L(\d+)/.exec(message);
                if (phase) {
                  const body = phase[1] === '应用程序关闭时' ? drafts[i].shutdown : drafts[i].code;
                  const line = Number(phase[2]);
                  return {message, line, expression: body?.split('\n')[line - 1]?.trim().slice(0, 240)};
                }
                const line = Number(/^L(\d+)/.exec(message)?.[1]);
// end
                return {message, ...(line && {line, expression: lines[line - 1]?.trim().slice(0, 240)})};
              })};
            });
            return {status:'revise',unchanged,diagnostics,drafts,excerpts,
              instruction: (unchanged ? '提交的正文逐字相同。' : '') +
                '逐项修改 issues 指向的实参或声明；核对改后行，再提交修改后的完整正文。若无匹配权限，向用户说明缺少的资料。'};
            // end
          }
          // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
          // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
          // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
          const definition=drafts.find(d=>d.host==='customFunction')?.definition;
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
          facts[name] = [...(definition?['新增自定义函数 · 名称及函数名：'+definition.functionName+' · 生效：是','有序形参：'+(definition.parameters.join(', ')||'无')]:[]),...results.flatMap(r => r.eventAnswer ? [r.eventAnswer,...r.warnings] : [
// end
          // end
          // end
            ...(r.expression ? ['数据变化脚本 · 数据项：' + r.expression + ' · 生效：是'] : []),
            // modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
            r.host + (businessPlans.has(r.host) ? ' · 完整 JS（业务样本通过）' : ' · 完整 JS 候选（静态检查）'),
// end
            r.code, ...r.warnings,
          // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
          ])].join('\n');
          // end
          // end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
          if(bridge)setupEvidence=checkpointEvidence({...bridge.checkpoint,...(businessReceipts.length>0 && {businessReceipts,businessSuites:[...businessPlans.values()]}),phase:'delivered'},'按本段确认口径生成，工程正文仍需由开发人员保存。');
// end
          return {status:'checked',executed:businessReceipts.length>0,...(businessReceipts.length>0 && {execution:'synthetic',businessReceipts}),diagnostics,localReference:'[[check_script_drafts]]'};
        }
        if (name === 'lookup_calc_runtime') {
        // end
          // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
          const inputs = readRuntimeQuery(query ?? {});
          publicArguments[name] = inputs;
          const key = JSON.stringify([inputs.family ?? '', inputs.symbol ?? '']);
          const reference = runtimeLookups.get(key) ?? runtimeReference(context.kind, inputs);
          runtimeLookups.set(key, reference);
          const { lines: localLines, ...summary } = reference;
          facts[name] = runtimeLookups.size === 1 ? localLines.join('\n') : [...runtimeLookups.values()].flatMap(item => item.lines).join('\n');
          const prior = [...runtimeLookups].filter(([k]) => k !== key).map(([k, item]) => {
            const [family, symbol] = JSON.parse(k);
            return { family, symbol, state: item.state, signature: item.signature, usage: item.usage,
              // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
              result: item.result, effect: item.effect, verification: item.verification,
              // end
              // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
              cards: item.cards,
              // end
             };
          });
          return { ...summary, ...inputs, prior, localReference: '[[lookup_calc_runtime]]' };
          // end
        }
        // end
        if (name === 'inspect_calc_config') {
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
          const options=readCalcQuery(query ?? {});
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
          const selectedKind=options.section??sectionForMenu(context.calcMenu);
          if(dependencyKind(selectedKind) && !options.sourceChoices && !options.connectionReceipt){
            const r=await dependencyReport(center,store,owner,token,chat,context,selectedKind,options.exactName,options.member,accessChecker(token));
            for(const dep of r.dependencies)dependencies.set(JSON.stringify(dep),dep);
            store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
            facts[name]=r.lines.join('\n');
            return {...r.summary,section:selectedKind,guidance:r.lines[0],localReference:'[[inspect_calc_config]]'};
          }
          if(context.kind==='calculation' && context.calcMenu==='calculate-global-variable' && context.object && !options.exactName && !options.sourceChoices && !options.connectionReceipt && (!options.section || options.section==='globalVars')){
// end
            const r=await dictionaryReport(center,store,owner,token,chat,context,accessChecker(token));
            for(const dep of r.dependencies) dependencies.set(JSON.stringify(dep),dep);
            store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
            facts[name]=r.lines.join('\n');
            return {...r.summary,localReference:'[[inspect_calc_config]]'};
          }
          if(options.connectionReceipt) {
// end
            const report=await connectionJournal.report(owner,token,chat,context,options.exactName,accessChecker(token));
            for(const dep of report.dependencies) dependencies.set(JSON.stringify(dep),dep);
            store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]),id);
            facts[name]=report.lines.join('\n');
            return {...report.summary,localReference:'[[inspect_calc_config]]'};
          }
          setupEvidence = await center.calcConfiguration(token, context, options, dep => {
// end
            dependencies.set(dep.kind + ':' + dep.projectId, dep);
          });
          store.db.prepare('UPDATE runs SET dependencies=? WHERE id=?').run(JSON.stringify([...dependencies.values()]), id);
// end
          facts[name] = evidenceGuide(setupEvidence, undefined, JSON.stringify({ sections: ['facts'] }));
          return {
            ...setupEvidence.calcConfig,
            evidenceId: setupEvidence.id,
            layer: 'saved',
            localReference: '[[inspect_calc_config]]',
          };
        }
        // end
        if (name === 'inspect_collection_setup') {
          const result = await inspectCollectionSetup(
            center,
            token,
            context,
            query && 'view' in query ? query : readSetupQuery({}),
          );
          // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
          const { view, status, guidance, runtimeVerified } = result.projection;
          setupEvidence = {
            id: randomUUID(),
            at: result.at,
            layer: 'saved',
            title: '设备与点配置',
            source: result.source,
            references: [],
            facts: result.lines.slice(0, -1).map((value) => ({ label: '核对', value })),
            gaps: [],
            collectionSetup: { view, status, guidance, runtimeVerified },
          };
          // end
          facts[name] = result.lines.join('\n');
          return result.projection;
        }
        // end
        if (name === 'plan_solution') {
          const selected = query && 'goals' in query ? query : readStartQuery({});
          // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
          const result = await planFromEntry(center, token, context, selected, (dependency) => {
            dependencies.set(dependency.kind + ':' + dependency.projectId, dependency);
          });
          // end
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          facts[name] = result.lines.join('\n');
          return result.projection;
        }
        if (query && 'objectType' in query) {
          // end
          const result = await inspectClientPoints(center, token, context, query, (ctx) => {
            dependencies.set(ctx.kind + ':' + ctx.projectId, ctx);
          });
          store.db
            .prepare('UPDATE runs SET dependencies=? WHERE id=?')
            .run(JSON.stringify([...dependencies.values()]), id);
          pointEvidence = {
            id: result.id,
            at: result.sources.at(-1)!.at,
            layer: 'saved',
            title: '采集点、连接与映射',
            source: result.sources.map((item) => item.source).join(' / '),
            references: [],
            facts: result.lines.slice(1).map((value) => ({ label: '核对', value })),
            gaps: [],
            pointLookup: {
              tool: name === 'trace_refs' ? name : 'find_objects',
              status: result.status,
              limited: result.limited,
              states: result.paths.map((p) => p.state),
              runtimeVerified: false,
            },
          };
          facts[name] = result.lines.join('\n');
          return pointProjection(result);
        }
        switch (name) {
          // end
          // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
          case 'read_client_variables':
            inventory = await center.clientVariables(token, context);
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            facts.read_client_variables = variableInventoryAnswer(inventory);
            // end
            return projection(inventory);
          // end
          case 'get_context':
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            facts.get_context =
              '当前入口 · ' +
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
              readSkill(context.kind, undefined, context.calcMenu).title +
// end

              (context.projectId ? '，工程标识 ' + context.projectId : '') +
              (context.object ? '，当前对象 ' + context.object : '') +
              (context.control ? '，单选控件 ' + context.control : '');
            // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
            if (context.sceneView) facts.get_context += '\n' + describeScene(context.sceneView);
            // end
            return {
              kind: context.kind,
              // end
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
              ...(context.calcMenu && {section: sectionForMenu(context.calcMenu), menu: run.menuTitle}),
// end
              hasObject: !!context.object,
              editSnapshot: !!context.editor,
              selectedCell: !!context.cell,
              // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
              selectedControl: !!context.control,
              ...(context.sceneView
                ? { sceneEditor: true, hasSingleSelection: context.sceneView.selected === 1 }
                : {}),
              // end
            };
          // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
          case 'lookup_reference': {
            // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
            const guide = readSkill(context.kind, undefined, context.calcMenu);
            // end

            facts.lookup_reference = [guide.title, ...guide.steps].join('\n');
            return guide;
          }
          // end
          case 'find_objects': {
            const items = await center.findObjects(token, context);
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            facts.find_objects = items.map((item) => item.name).join('、') || '当前范围未找到对象。';
            // end
            return {
              scope: 'current project',
              candidates: items.map((item, index) => ({
                ref: index + 1,
                kind: item.kind,
              })),
              limit: 12,
            };
          }
          case 'validate_candidate': {
            const type = context.kind === 'period' ? 'periods' : 'APIs';
            const listing = await center.call(token, '/calculation/projectJsonData', {
              projectId: context.projectId,
              type,
              groupId: '-1',
            });
            if (!Array.isArray(listing) || listing.filter((row) => row.GUID === context.object).length !== 1)
              throw missing();
            const obj = await center.call(token, '/calculation/scriptData', {
              type,
              projectId: context.projectId,
              scriptId: context.object,
            });
            const checked = await checkCandidate(center, token, context, obj.context);
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            facts.validate_candidate = [
              '已保存脚本 · 静态检查',
              ...(checked.issues.length ? checked.issues : ['已支持的检查项通过。']),
              '脚本执行结果需在目标实例验证。',
            ].join('\n');
            // end
            return { scope: 'static only', problems: checked.issues.length, executed: false };
          }
          case 'trace_refs': {
            const graph = await traceReferences(
              center,
              token,
              context,
              () => [],
              false,
              undefined,
              (dependency) => {
                dependencies.set(dependency.kind + ':' + dependency.projectId, dependency);
              },
            );
            store.db
              .prepare('UPDATE runs SET dependencies=? WHERE id=?')
              .run(JSON.stringify([...dependencies.values()]), id);
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            facts.trace_refs = [
              '已保存引用 · 证据 ' + graph.id,
              ...graph.trails.map((row) => row.path + '（' + row.status + '）'),
              ...graph.gaps,
            ].join('\n');
            // end
            return {
              id: graph.id,
              layer: graph.layer,
              resolvedPaths: graph.trails.length,
              hasGaps: !!graph.gaps.length,
            };
          }
          // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
          case 'read_alarm_samples': {
            store.chat(owner, chat);
            const record = store.db.prepare('SELECT * FROM alarm_captures WHERE chat=?').get(chat);
            if (!record || !(await accessChecker(token)(record))) {
              facts[name] =
                '本段对话暂无当前账号可读取的现场联查。可在二维编辑器单选实时报警窗，打开工程工具，选择“联查采样与报警”。';
              return { available: false };
            }
            for (const dep of JSON.parse(String(record.dependencies)))
              dependencies.set('app:' + dep.runtimeApp, dep);
            store.db
              .prepare('UPDATE runs SET dependencies=? WHERE id=?')
              .run(JSON.stringify([...dependencies.values()]), id);
            const batch = JSON.parse(String(record.batch)) as AlarmBatch;
            facts[name] = alarmLines(String(record.id), batch).join('\n');
            return {
              available: true,
              layer: 'paired collection monitor and visible alarm window',
              count: batch.samples.length,
              phases: [...new Set(batch.samples.map((s) => s.phase))],
              scope: 'most recent observation in this conversation; actual fields in local reference',
            };
          }
          // end
          case 'read_runtime': {
            // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
            const sample =
              browserTab && context.kind === 'page' && context.control
                ? await askRuntimeBrowser(owner, id, browserTab, context, signal)
                : null;
            const runtime = await center.runtime(token, context, sample?.browser, sample?.editor);
            run.runtime = runtime;
            if (runtime.apps.length) {
              for (const app of runtime.apps) {
                dependencies.set(
                  'app:' + app.appId,
                  Object.assign({ ...context }, { runtimeApp: app.appId, runtimeNode: app.nodeId }),
                );
              }
              store.db
                .prepare('UPDATE runs SET dependencies=? WHERE id=?')
                .run(JSON.stringify([...dependencies.values()]), id);
            }
            facts.read_runtime = [
              '只读运行核对 · ' + runtime.at + ' · 证据 ' + runtime.id,
              'Center 发布目录 · ' + (runtime.publications.join('、') || '无可核实版本'),
              // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
              ...runtime.apps.map(
                (app) =>
                  app.name +
                  ' · ' +
                  app.deployed +
                  ' · ' +
                  app.process +
                  (app.configuredVersion ? ' · App 配置的工程版本 ' + app.configuredVersion : ''),
              ),
              // end
              ...(runtime.screen?.lines || []),
              ...runtime.gaps,
            ].join('\n');
            return {
              observedAt: runtime.at,
              layer: runtime.screen?.sampleAt ? 'browser observed control' : 'node process',
              instances: runtime.apps.map((app) => ({ deployed: app.deployed, process: app.process })),
              businessObservation: !!runtime.screen?.sampleAt,
              // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
              // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
              ...(runtime.screen && {
                controlComparison: runtime.screen.status,
                bindingCycle: runtime.screen.bindingCycle,
                installedFieldObserved: runtime.screen.installed != null,
                pageComparison: runtime.screen.pageComparison,
                artifactDigestVerified: false,
              }),
              // end
              // end
            };
            // end
          }
          case 'read_object':
            evidence = await run.read();
            // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
            if (evidence)
              facts.read_object = evidenceGuide(
                evidence,
                predecessor,
                JSON.stringify({ sections: ['facts', 'comparison'] }),
              );
            // end
            return projection(evidence);
        }
      },
      // end
      read: async () => {
        await center.identity(token);
        evidence = await center.evidence(token, context);
        if (evidence && !signal.aborted)
          store.event(id, {
            type: 'delta',
            text: '已读到当前对象的已保存配置。\n证据 ' + evidence.id + '\n',
          });
        return evidence;
      },
    };
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    attemptedModel = run;
    // end
    grants.set(capability, run);
    // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
    const invokeModel = (native: string|null) => runOpenCode({
    // end
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      entryKind: context.kind,
      // end
      home,
      chat,
      // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
      native,
      // end
      endpoint: privateBase + '/internal',
      capability,
      signal,
      onSession: (native) =>
        store.db.prepare('UPDATE chats SET native=?,native_home=? WHERE id=?').run(native, home, chat),
    });
    // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
    let answer = await invokeModel(
      !inaccessible && chatRecord.native_home === home ? (chatRecord.native as string | null) : null,
    );
    // A provider can cite a tool before actually emitting its call. Give it one chance
    // to supply real arguments under the existing tool and request budgets.
    let decision;
    try {
      decision = JSON.parse(answer.trim());
    } catch {
      /* natural-language answer */
    }
    if (decision?.kind === 'facts' && Array.isArray(decision.tools)) {
      const missing = decision.tools.find((key: unknown) => isQueryTool(key) && canUseTool(run, key));
      if (missing && run.requests <= 3) {
        run.requiredTool = missing;
        const saved = store.chat(owner, chat);
        answer = await invokeModel(saved.native_home === home ? (saved.native as string | null) : null);
        if (!Object.hasOwn(run.observations, missing))
          throw new HttpError(422, '本轮未取得所引用工具的实际结果，请重试。');
      }
    }
    // end
    signal.throwIfAborted();
    if (!(await accessChecker(token)(store.run(owner, id)))) throw new HttpError(403, '工程权限已变更');
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    if(bridge){
      const next=bridge.confirmed?'check_script_drafts':'review_solution_script';
      if(!run.observations[next] && canUseTool(run,next) && run.requests<5){
        run.requiredTool=next;
        const saved=store.chat(owner,chat);
        answer=await invokeModel(saved.native_home===home ? saved.native as string|null:null);
      }
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
      if(!run.observations[next] || (run.observations.review_solution_script as {status?:string})?.status==='revise')
        throw new HttpError(422,'输入输出或待生成宿主未通过校验，尚不能确认。');
// end
    }
// end
    const rejected=()=> (run.observations.check_script_drafts as {status?:string}|undefined)?.status==='revise';
    if(rejected() && canUseTool(run,'check_script_drafts') && run.requests<7){
      run.requiredTool='check_script_drafts';
      const saved=store.chat(owner,chat);
      answer=await invokeModel(saved.native_home===home ? saved.native as string|null:null);
    }
    if(rejected())throw new HttpError(422,'JS 候选仍有校验错误：'+(run.observations.check_script_drafts as any).diagnostics.flatMap(d=>d.errors).slice(0,5).join('；'));
    if (!(await accessChecker(token)(store.run(owner,id)))) throw new HttpError(403,'工程权限已变更。');
// modified by jinlong.feng at 2026-11-23 KF意图澄清与续问
    // A model can ask for the goal without reading a project. If it made a factual
    // claim about a script list without any lookup, ground the review in that list.
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
    let requiredFact: 'get_context' | 'explain_selected_script' | 'inspect_project_overview' | 'inspect_solution_overview' | 'prepare_solution_script' | 'review_solution_script' | undefined;
// end
// end
// end
    if (!clarificationQuestion(answer) && Object.keys(run.observations).every(key => key === 'get_context' || key === 'lookup_reference') && context.kind === 'calculation' && run.calcSection &&
        ['periods','APIs','conditions','functions','systemScripts','dataChanges'].includes(run.calcSection)) {
      const menuEvidence = await center.calcConfiguration(token, context, {}, undefined, question);
      const config = menuEvidence.calcConfig!;
      // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      // Only expose unsolicited lookup evidence for an actual named-object match.
      // Unrelated list rows otherwise displace a business decision in answer review.
      if (config.exactNameMatches || run.observations.get_context) {
        setupEvidence = menuEvidence;
        const header = '当前菜单 · ' + run.menuTitle;
        facts.get_context = [header, evidenceGuide(menuEvidence, undefined, JSON.stringify({sections:['facts']}))].join('\n');
        run.observations.get_context = {menu: run.menuTitle, section: config.section, saved: config.total,
          exactNameMatches: config.exactNameMatches, layer: 'saved', localReference: '[[get_context]]'};
        if (config.exactNameMatches) requiredFact = 'get_context';
      }
      // end
    }
// end
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
    if (facts.explain_selected_script && !facts.check_script_drafts &&
        Object.keys(run.observations).every(key=>['explain_selected_script','get_context','read_object','inspect_calc_config','lookup_reference'].includes(key))) requiredFact='explain_selected_script';
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
    if(facts.inspect_project_overview && !facts.check_script_drafts && !facts.explain_selected_script) requiredFact='inspect_project_overview';
// end
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
    if(facts.inspect_solution_overview && !facts.check_script_drafts) requiredFact='inspect_solution_overview';
// end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    if(facts.review_solution_script)requiredFact='review_solution_script';
    else if(facts.prepare_solution_script&&!facts.check_script_drafts)requiredFact='prepare_solution_script';
// end
    const result = await resolveModelAnswer(
    // end
      answer,
      { ...historicalFacts, ...facts },
      settings.model,
      Object.keys(run.observations),
      priorMessages.length > 0,
      (draft, options, repair) => reviewModelDraft(run, draft, options, repair, settings),
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
      requiredFact,
// end

    );
    signal.throwIfAborted();
    if ((await center.identity(token)) !== owner || !(await accessChecker(token)(store.run(owner, id))))
      throw new HttpError(403, '工程权限已变更');
    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    store.finish(
      id,
      'done',
      result.answer,
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
      facts.explain_selected_script ? evidence : (setupEvidence ?? pointEvidence ?? evidence ?? inventory),
// end
      undefined,
      result.guidance,
      result.source,
    );
    // end
    // end
    // end
  } catch (error) {
    // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
    const rejectedDraft = attemptedModel?.observations.check_script_drafts as
      { status?: string; unchanged?: boolean; diagnostics?: {errors:string[]}[] } | undefined;
    const draftFailure = !(error instanceof HttpError && [401,403,404].includes(error.status)) &&
      rejectedDraft?.status === 'revise' &&
      (rejectedDraft.unchanged ? '修订稿与上一份被退回的正文相同。' : '候选脚本尚未通过检查。') +
      (rejectedDraft.diagnostics ?? []).flatMap(item=>item.errors).slice(0,4).join('；');
    // end
    store.finish(
      id,
      signal.aborted ? 'interrupted' : 'failed',
      signal.aborted
        ? '本轮已中断，可重新提问。'
        // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
        : (!(error instanceof HttpError && [401,403,404].includes(error.status)) &&
            (formulaFailure || [...sampleDiagnostics.values()].flat().slice(0,4).join("\n"))) || draftFailure || (error instanceof HttpError ? error.message : '本轮处理失败，请检查助手服务或模型配置。'),
        // end
      null,
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      undefined,
      undefined,
      {
        kind: 'system',
        ...(settings && attemptedModel?.requests
          ? { model: settings.model, tools: Object.keys(attemptedModel.observations) }
          : {}),
      },
      // end
    );
  } finally {
    grants.delete(capability);
    active.delete(id);
  }
}
async function events(req: any, res: any, owner: string, token: string, id: string, after: number) {
  if (!Number.isSafeInteger(after) || after < 0) throw new HttpError(400, '游标无效');
  const row = store.run(owner, id);
  if (!(await accessChecker(token)(row))) throw new HttpError(403, '工程不可见');
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  let checked = Date.now();
  while (!res.destroyed) {
    if (Date.now() - checked > 2500) {
      if ((await center.identity(token)) !== owner || !(await accessChecker(token)(store.run(owner, id))))
        break;
      checked = Date.now();
    }
    const entries = store.updates(id, after);
    for (const e of entries) {
      after = Number(e.seq);
      res.write(JSON.stringify({ seq: after, ...JSON.parse(String(e.data)) }) + '\n');
    }
    if (entries.length === 100) continue;
    if (store.run(owner, id).status !== 'active') break;
    await delay(180);
  }
  res.end();
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost'),
      method = req.method;
    if (url.pathname.startsWith('/internal/')) {
      const grant = grants.get(bearer(req) ?? '');
      if (!grant || grant.signal.aborted || method !== 'POST') throw missing();
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      const tool = url.pathname.slice('/internal/'.length);
      if (isQueryTool(tool)) {
        // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
        // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
        const input = await body(req, tool === 'check_script_drafts' ? 180000 : tool==='review_solution_script'?16000:2048);
        const args = ['check_script_drafts','review_solution_script'].includes(tool) ? input : readQueryArguments(tool,input);
// end
        // end
        return json(res, await invokeQueryTool(grant, tool, args));
        // end
      }
      // end
      if (url.pathname === '/internal/v1/chat/completions' && settings)
        return await relay(grant, await body(req, 900000), res, settings);
      throw missing();
    }
    if (!url.pathname.startsWith('/api/assistant/')) throw missing();
    const [, , , resource, id, action] = url.pathname.split('/');
    if (resource === 'health' && method === 'GET') return json(res, { ok: true });
    const token = bearer(req);
    if (!token) throw new HttpError(401, '请先登录 KF 开发中心');
    const owner = await center.identity(token);
    if (resource === 'workspace' && method === 'GET')
      return json(res, { owner, modelEnabled: !!settings, plans: store.workspace(owner) });
    if (method === 'POST' && !/^application\/json\b/i.test(req.headers['content-type'] ?? ''))
      throw new HttpError(415, '需要 JSON');
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
    if (resource === 'chats' && method === 'POST' && ['alarm-start', 'alarm-finish'].includes(action)) {
      store.chat(owner, identifier(id));
      const input = await body(req, action === 'alarm-start' ? 24000 : 250000);
      for (const [key, s] of alarmSessions) if (Date.now() - s.start > 180000) alarmSessions.delete(key);
      if (action === 'alarm-start') {
        const ctx = readContext(input.context),
          route = await alarmRoute(center, token, ctx, textField(input.tag, 160, '完整采集点名'));
        for (const [key, s] of alarmSessions)
          if (s.owner === owner && s.chat === id) alarmSessions.delete(key);
        const ticket = randomBytes(16).toString('hex');
        alarmSessions.set(ticket, { owner, chat: id, start: Date.now(), route });
        return json(res, { ticket, monitor: route.monitor, targets: alarmTargets(route) });
      }
      const session = alarmSessions.get(input.ticket);
      if (!session || session.chat !== id || session.owner !== owner) throw missing();
      const route = await alarmRoute(center, token, session.route.context, session.route.tag);
      if (JSON.stringify(route) !== JSON.stringify(session.route) || Date.now() - session.start > 180000)
        throw new HttpError(409, '联查已过期或配置发生变化，请重新开始。');
      const batch = correlateAlarm(
        route,
        input.entries,
        session.start,
        Date.now(),
        process.env.KF_AGENT_SOURCE_UTC_OFFSET || '',
      );
      if (alarmSessions.get(input.ticket) !== session) throw new HttpError(409, '联查已结束或被新任务替代。');
      store.db
        .prepare(
          'INSERT OR REPLACE INTO alarm_captures(chat,id,context,dependencies,batch) VALUES(?,?,?,?,?)',
        )
        .run(
          id,
          input.ticket,
          JSON.stringify(route.context),
          JSON.stringify(route.dependencies),
          JSON.stringify(batch),
        );
      alarmSessions.delete(input.ticket);
      return json(res, { id: input.ticket, lines: alarmLines(input.ticket, batch) });
    }
    // end
    if (resource === 'tools' && id === 'monitor_point' && !action && method === 'POST') {
      const input = await body(req);
      return json(
        res,
        await center.monitorPoint(
          token,
          readContext(input.context),
          identifier(input.appId),
          textField(input.tag, 160, '点名'),
        ),
      );
    }
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    if (resource === 'tools' && id === 'runtime_targets' && method === 'POST') {
      const input = await body(req);
      return json(res, await center.runtimeTargets(token, readContext(input.context)));
    }
    // end
    if (resource === 'tools' && id === 'script_example' && method === 'POST') {
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      const input = await body(req);
      const context = readContext(input.context);
      await center.require(token, context);
      return json(res, scriptExample(context.kind, input.purpose));
      // end
    }
    // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
    // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    if (resource === 'scene-captures' && method === 'POST' && !action) {
      const input = await body(req, 32768),
        chat = identifier(input.chatId);
      if (id === 'begin')
        return json(
          res,
          await sceneJournal.begin(owner, token, chat, readContext(input.context), input.binding),
        );
      if (id === 'sample')
        return json(
          res,
          await sceneJournal.sample(owner, token, chat, identifier(input.ticket), input.observation),
        );
      throw missing();
    }
    // end
    if (resource === 'report-captures' && method === 'POST' && !action) {
      const input = await body(req, 49152),
        chat = identifier(input.chatId);
      if (id === 'begin')
        return json(res, await reportJournal.begin(owner, token, chat, readContext(input.context)));
      if (id === 'finish')
        return json(
          res,
          await reportJournal.finish(owner, token, chat, identifier(input.ticket), input.observation),
        );
      throw missing();
    }
    // end
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
    if(resource==='connection-captures' && method==='POST' && !action) {
      const input=await body(req,32768), chat=identifier(input.chatId);
      if(id==='begin') return json(res, await connectionJournal.begin(owner,token,chat,readContext(input.context),input));
      if(id==='finish') return json(res, await connectionJournal.finish(owner,token,chat,identifier(input.ticket),input.observation));
      throw missing();
    }
    if (resource === 'calc-captures' && method === 'POST' && !action) {
// end
      const input = await body(req, 32768);
      const chat = identifier(input.chatId);
      if (id === 'begin') {
        const appId = input.appId ? identifier(input.appId) : undefined;
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
        return json(res, await calcJournal.begin(owner, token, chat, readContext(input.context), appId, typeof input.probe==="string"?input.probe:undefined,input.dependency));
// end
// end
      }
      if (id === 'finish') {
        return json(
          res,
          await calcJournal.finish(owner, token, chat, identifier(input.ticket), input.observation),
        );
      }
      throw missing();
    }
    // end
    if (resource === 'tools' && id === 'validate_candidate' && method === 'POST') {
      const input = await body(req, 270000),
        context = readContext(input.context);
      await center.require(token, context);
      if (!['period', 'request'].includes(context.kind)) throw new HttpError(400, '请从计算脚本编辑器验证');
      return json(res, await checkCandidate(center, token, context, input.code));
    }
    if (resource === 'tools' && !action && method === 'POST' && isQueryTool(id)) {
      const input = await body(req);
      const context = readContext(input.context);
      await center.require(token, context);
      // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
      // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
      // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      // modified by jinlong.feng at 2026-11-22 KF报警规则回读
      // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
      // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
      // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
      if(id==='inspect_solution_overview'){
        const result=await readSolutionOverview(owner,token,identifier(input.chatId),context);
        return json(res,{answer:result.answer,evidence:result.evidence,...result.summary});
      }
// end
      if(id==='inspect_project_overview') {
        const r=await readProjectOverview(owner,token,identifier(input.chatId),context);
        return json(res,{answer:r.answer,evidence:r.evidence,...r.summary});
      }
// end
      if (id==='explain_selected_script') {
        const result=await explainSelection(context,(route,params)=>center.call(token,route,{...params,projectId:context.projectId}));
        await center.require(token,context);
        return json(res,{answer:result.answer,evidence:result.evidence,...result.summary});
      }
// end
      if (id === 'inspect_scene_binding') {
        const r = await sceneJournal.read(
          owner,
          token,
          identifier(input.chatId),
          context,
          accessChecker(token),
        );
        if (
          !(await accessChecker(token)({
            context: JSON.stringify(context),
            dependencies: JSON.stringify(r.dependencies),
          }))
        )
          throw new HttpError(403, '关联工程权限已变更。');
        return json(res, { lines: r.lines, choices: r.choices, ...r.summary });
      }
      // end
      if (id === 'inspect_report_dataset') {
        const r = await reportJournal.read(
          owner,
          token,
          identifier(input.chatId),
          context,
          accessChecker(token),
        );
        if (
          !(await accessChecker(token)({
            context: JSON.stringify(context),
            dependencies: JSON.stringify(r.dependencies),
          }))
        )
          throw new HttpError(403, '关联工程权限已变更。');
        return json(res, { lines: r.lines, ...r.summary });
      }
      // end
      if (id === 'inspect_calc_results') {
        const chat = identifier(input.chatId);
        const report = await calcJournal.report(owner, token, chat, context, accessChecker(token));
        const record = {
          context: JSON.stringify(context),
          dependencies: JSON.stringify(report.dependencies),
        };
        if (!(await accessChecker(token)(record))) throw new HttpError(403, '关联工程权限已变更。');
        return json(res, { lines: report.lines, ...report.projection });
      }
      // end
      if (id === 'inspect_alarm_rule') {
        const report = await ruleReport(
          owner,
          token,
          context,
          readRuleQuery(input.query ?? {}),
          input.chatId ? identifier(input.chatId) : undefined,
        );
        return json(res, { lines: report.lines, ...report.projection });
      }
      // end
      if (id === 'inspect_control_binding') {
        const result = await inspectControlBinding(
          center,
          token,
          context,
          readBindingQuery(input.query ?? {}),
        );
        return json(res, { lines: result.lines, state: result.projection.state });
      }
      // end
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
      // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
      if (id === 'clarify_calculation_contract') {
        if (!supportedTool(id, context.kind)) throw new HttpError(400, '请从计算工程或客户端打开');
        return json(res, clarifyFormula(input.query));
      }
      if (id === 'inspect_calculation_io' || id === 'compile_calculation_formula') {
        const chat =
          formulaScope(input.query).scope === 'lastCalculationReceipt' ? identifier(input.chatId) : '';
        const { dependencies, ...report } = await calculateFromEvidence(
          id,
          token,
          owner,
          chat,
          context,
          input.query,
        );
        return json(res, report);
      }
      // end
      if (id === 'prepare_calculation') {
        if (!supportedTool(id, context.kind)) throw new HttpError(400, '请从计算工程或客户端打开');
        const { method, bindings, scope } = generationQuery(input.query);
        const linked =
          scope === 'lastCalculationReceipt'
            ? await calcJournal.recentCalculation(owner, identifier(input.chatId), accessChecker(token))
            : undefined;
        const report = await prepareCalculation(center, token, linked?.entry ?? context, method, bindings);
        if (
          linked &&
          !(await accessChecker(token)({
            context: JSON.stringify(context),
            dependencies: JSON.stringify(linked.dependencies),
          }))
        )
          throw new HttpError(403, '关联工程权限已变更。');
        return json(res, { lines: report.lines, scripts: report.scripts, ...report.summary });
      }
      // end
      if (id === 'lookup_calc_runtime')
        return json(res, runtimeReference(context.kind, readRuntimeQuery(input.query ?? {})));
      // end
      if (id === 'inspect_calc_config') {
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
        const query=readCalcQuery(input.query ?? {});
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
        const selectedKind=query.section??sectionForMenu(context.calcMenu);
        if(input.chatId && dependencyKind(selectedKind) && !query.sourceChoices && !query.connectionReceipt){
          const r=await dependencyReport(center,store,owner,token,identifier(input.chatId),context,selectedKind,query.exactName,query.member,accessChecker(token));
          return json(res,{lines:r.lines,probe:r.probe,...r.summary});
        }
        if(context.kind==='calculation' && context.calcMenu==='calculate-global-variable' && context.object && input.chatId && !query.exactName && !query.connectionReceipt && !query.sourceChoices && (!query.section || query.section==='globalVars')){
// end
          const r=await dictionaryReport(center,store,owner,token,identifier(input.chatId),context,accessChecker(token));
          return json(res,{lines:r.lines,probe:r.probe,...r.summary});
        }
        if(query.connectionReceipt) {
// end
          const report=await connectionJournal.report(owner,token,identifier(input.chatId),context,query.exactName,accessChecker(token));
          if(!await accessChecker(token)({context:JSON.stringify(context),dependencies:JSON.stringify(report.dependencies)})) throw new HttpError(403,'工程权限已变更');
          return json(res,{lines:report.lines,...report.summary});
        }
        const evidence = await center.calcConfiguration(token, context, query);
// end
        return json(res, {
          lines: [
            evidence.title,
            ...evidence.facts.map((row) => row.value),
            ...evidence.gaps,
            evidence.calcConfig!.guidance,
          ],
          ...evidence.calcConfig,
        });
      }
      // end
      if (id === 'inspect_collection_setup') {
        const query = readSetupQuery(input.query === undefined ? {} : input.query);
        const result = await inspectCollectionSetup(center, token, context, query);
        return json(res, { lines: result.lines });
      }
      // end
      if (id === 'plan_solution') {
        const query = readStartQuery(input.query === undefined ? {} : input.query);
        // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
        const result = await planFromEntry(center, token, context, query);
        // end
        return json(res, { lines: result.lines });
      }
      // end
      if (input.query !== undefined) {
        let query;
        try {
          query = readPointQuery(id, input.query);
        } catch {
          throw new HttpError(400, '采集点筛选条件无效');
        }
        if (!query) throw new HttpError(400, '缺少采集点查询参数');
        return json(res, await inspectClientPoints(center, token, context, query));
      }
      let result;
      // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
      // end
      if (id === 'read_client_variables') result = await center.clientVariables(token, context);
      // end
      if (id === 'find_objects')
        result = await center.findObjects(
          token,
          context,
          input.term ? textField(input.term, 160, '对象名称') : '',
        );
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      if (id === 'lookup_reference') result = readSkill(context.kind, input.topic, context.calcMenu);
      // end

      if (id === 'get_context') result = { context, scope: '当前账号与本次入口' };
      if (id === 'read_object') result = await center.evidence(token, context);
      // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
      if (id === 'read_runtime')
        result = await center.runtime(token, context, input.browserObservation, input.editorObservation);
      // end
      if (id === 'trace_refs') {
        const chat = input.chatId && identifier(input.chatId);
        const plan = chat && store.chat(owner, chat).plan;
        result = await traceReferences(
          center,
          token,
          context,
          (bindings) => (chat ? store.referenceScope(owner, chat, bindings).map(readContext) : []),
          input.direction === 'reverse',
          plan ? (ctx, e) => store.transaction(() => store.indexEvidence(String(plan), ctx, e)) : undefined,
        );
      }
      await center.require(token, context);
      return json(res, result);
    }
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    if (resource === 'runs' && action === 'screen' && method === 'POST') {
      const pending = browserRequests.get(identifier(id));
      if (!pending || pending.owner !== owner) throw missing();
      const input = await body(req, 4096);
      if (pending.ticket !== input.ticket || !(await accessChecker(token)(store.run(owner, id))))
        throw missing();
      pending.receive({ browser: input.observation, editor: input.editorObservation });
      return json(res, { ok: true });
    }
    // end
    if (resource === 'plans' && !id && method === 'POST')
      // end
      return json(res, store.createPlan(owner, textField((await body(req)).title, 80, '方案名称')), 201);
    if (resource === 'plans' && action === 'chats' && method === 'POST')
      return json(
        res,
        { id: store.createChat(owner, identifier(id), textField((await body(req)).title, 80, '对话名称')) },
        201,
      );
    if (resource === 'chats' && !action && method === 'GET')
      return json(res, await history(owner, token, identifier(id)));
    if (resource === 'chats' && action === 'turns' && method === 'POST') {
      store.chat(owner, identifier(id));
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
      const input = await body(req,300000);
      const runId = identifier(input.requestId),
// end
        context = readContext(input.context),
        question = textField(input.question, 4000, '问题');
      const intent = input.intent ?? 'ask';
      if (!['ask', 'lookup', 'propose'].includes(intent)) throw new HttpError(400, '未知操作');
      await center.require(token, context);
      if (store.start(owner, id, runId, question, context, intent)) {
        const controller = new AbortController();
        active.set(runId, controller);
        // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
        void execute(
          owner,
          token,
          id,
          runId,
          question,
          context,
          intent,
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
          controller,
          typeof input.browserTab === 'string' && /^[a-z0-9-]{36}$/i.test(input.browserTab)
            ? input.browserTab : undefined,
          intent==='ask' && context.dirty && typeof input.scriptDraft==='string' ? input.scriptDraft : undefined,
// end
        );
        // end
      }
      return json(res, { id: runId }, 202);
    }
    if (resource === 'runs' && action === 'events' && method === 'GET')
      return await events(req, res, owner, token, identifier(id), Number(url.searchParams.get('after') || 0));
    if (resource === 'runs' && action === 'cancel' && method === 'POST') {
      store.run(owner, identifier(id));
      active.get(id)?.abort();
      return json(res, { ok: true });
    }
    if (resource === 'proposals' && action === 'decision' && method === 'POST') {
      const row = store.proposal(owner, identifier(id));
      if (!(await accessChecker(token)(row))) throw new HttpError(403, '关联工程不可见');
      const { decision } = await body(req);
      if (!['confirmed', 'rejected'].includes(decision)) throw new HttpError(400, '未知决定');
      return json(res, store.decide(owner, id, decision));
    }
    throw missing();
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    json(
      res,
      { message: error instanceof HttpError ? error.message : '助手服务暂不可用' },
      error instanceof HttpError ? error.status : 500,
    );
  }
});
server.listen(Number(process.env.KF_AGENT_PORT || 43170), '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('助手服务缺少 TCP 监听地址');
  privateBase = 'http://127.0.0.1:' + address.port;
  console.log(
    'KF assistant listening on ' + privateBase + ' (' + (settings ? 'OpenCode' : 'KF read-only') + ')',
  );
});
process.on('SIGTERM', () => {
  for (const controller of active.values()) controller.abort();
  server.close(() => process.exit());
});
// end
