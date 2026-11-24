// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
import { createHash } from 'node:crypto';
// modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
// modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
import { parse } from 'acorn';
import {definitionSchema,functionDefinition,returnContract,formalDiagnostics,type Definition} from './custom-functions.ts';
// end
import {bindCondition,conditionSchema,conditionSettings,conditionText,type ConditionSettings} from './condition-authoring.ts';
// end
import { kcRegistrations } from './kc-registrations.ts';
// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
import {qualityInputs, qualitySchema} from './quality-probe.ts';
import { scriptBindings } from './js-bindings.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
import { globalFamilies, runtimeReference, systemLifecycleNotice } from './calc-runtime.ts';
import { sourceFunctionContracts } from './calc-function-knowledge.ts';
// end
// end
import { calcList } from './calc-config.ts';
import { formulaInventory } from './formula.ts';
import { HttpError, type Context } from './shared.ts';
import type { Center } from './center.ts';

const hosts = {
  period: 'period',
  request: 'endResponse',
  system: 'system',
  dataChange: 'dataChange',
  condition: 'condition',
  customFunction: 'customFunction',
} as const;
type Host = keyof typeof hosts;
type Binding = {
  kind: 'source' | 'point' | 'variable' | 'function';
  // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
  name: string;
  parameters?:string[];
  contract?:ReturnType<typeof returnContract>;
  // end
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
  connectionFamily?: string;
  sourceRef?: string;
  read?: boolean;
// end
// modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
  write?: boolean;
  trigger?: { mode: 'memory' | 'mapped'; pointRef?: string };
};
// end
type Reader = Pick<Center, 'require' | 'call' | 'allowed'>;
const problem = (message: string) => new HttpError(400, message);
const symbolSchema = { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 80 } };
export const authorContextSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { symbols: symbolSchema },
};
export const draftSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['drafts'],
  properties: {
    drafts: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['host', 'code'],
        properties: {
          // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
          // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
          qualitySamples: qualitySchema,
          // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
          condition:conditionSchema,
          shutdown: {type:"string", minLength:1, maxLength:16000, description:"system 专用：应用程序关闭时的完整 JS 正文；code 为启动正文。"},
// end
          definition:definitionSchema,
          // end
          // end
          // end
          // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
          host: { type: 'string', enum: Object.keys(hosts) },
          triggerRef: {type: 'string', description: 'dataChange 必填，选取有 trigger 属性的词典变量引用。'},
          // end
          code: {
            type: 'string',
            maxLength: 16000,
            description:
              '完整 KF JavaScript 函数正文。工程实名写为工具返回的双引号引用字符串，如 "@point:..."；引用由本机绑定。',
          },
        },
      },
    },
  },
};
export function authorQuery(raw: any) {
  const symbols = raw?.symbols ?? [];
  if (
    !Array.isArray(symbols) ||
    symbols.length > 12 ||
    symbols.some((s) => typeof s !== 'string' || !/^\w{1,80}$/.test(s))
  )
    throw problem('请提供最多12个 KC 符号');
  return { symbols: [...new Set<string>(symbols)] };
}
export function draftQuery(raw: any) {
  if (!Array.isArray(raw?.drafts) || !raw.drafts.length || raw.drafts.length > 6)
    throw problem('需要1至6份完整候选正文');
  const seen = new Set<string>();
  const drafts = raw.drafts.map((d: any) => {
    if (
      !d ||
      !Object.hasOwn(hosts, d.host) ||
      seen.has(d.host) ||
      typeof d.code !== 'string' ||
      !d.code.trim() ||
      d.code.length > 16000
    )
      throw problem('候选宿主重复、正文缺失或过长');
    // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
    seen.add(d.host);
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
    if (d.host === 'system') {
      if (typeof d.shutdown !== 'string' || !d.shutdown.trim() || d.shutdown.length > 16000)
        throw problem('system 需要两段完整正文。code 填启动时，shutdown 填关闭时，每段最多 16000 字符。');
    } else if (d.shutdown !== undefined) throw problem('仅系统事件可指定 shutdown');
    const condition=conditionSettings(d.host,d.condition);
// end
    const definition=functionDefinition(d.host,d.definition);
    // end
    // end
    // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
    // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
    if (d.host === 'dataChange' && (typeof d.triggerRef !== 'string' || !/^@variable:[a-f0-9]{16}$/.test(d.triggerRef)))
      throw problem('dataChange 需要环境中带 trigger 的 @variable 引用作为 triggerRef，数据项在正文之外配置。');
    if (d.host !== 'dataChange' && d.triggerRef !== undefined) throw problem('只有数据变化宿主可指定 triggerRef');
    // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
    return { host: d.host as Host, code: d.code as string, ...(d.host === "system" && {shutdown: d.shutdown as string}), ...(d.triggerRef && {triggerRef:d.triggerRef}), ...(condition && {condition}), ...(definition && {definition}),
// end
    // end
    // end
    // end
      ...(d.qualitySamples !== undefined && {qualitySamples:qualityInputs(d.qualitySamples,d.host)}) };
  });
    // end
  // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
  if (drafts.reduce((n, d) => n + d.code.length + (d.shutdown?.length ?? 0) + (d.condition?.exist.length ?? 0) + (d.condition?.out.length ?? 0), 0) > 32000) throw problem('单轮正文总量超过32000字符');
// end
  // end
  return { drafts };
}
const refId = (kind: string, identity: unknown) =>
  '@' + kind + ':' + createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 16);
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
export function dictionaryRef(projectId: string, row: Record<string, any>) {
  return refId('variable', [projectId, row.name, row.type, row.dataSourceName, row.TagName, row.paramlist]);
}

export async function dictionaryNames(reader: Reader, token: string, projectId: string) {
  await reader.require(token, {kind: 'calculation', projectId, object: '', dirty: false});
  const read = (path: string, params: Record<string, string>) => reader.call(token, path, {projectId, ...params});
  const rows = (await calcList(read, 'globalVars', '-1')).items;
  return new Map<string, string>(rows.filter(row => typeof row.name === 'string' && row.name.length)
    .map(row => [row.name, dictionaryRef(projectId, row)]));
}
// end
const registered = new Map<
  string,
  { family: string; source: string; formals?: number; requiredFormals?: number; async?: boolean }
>();
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
for (const [family, entry] of Object.entries(kcRegistrations)) {
  for (const [name, signature] of Object.entries(entry.symbols)) {
    const minimum = sourceFunctionContracts[name]?.minimumArgs;
    registered.set(name, { family, source: entry.source, ...signature,
      ...(minimum !== undefined && { requiredFormals: minimum }) });
  }
}
// end
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
// file_global_func.js dispatches these overloads via arguments.length.
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
for (const [name, minimum] of [['ReadFile', 2], ['WriteFile', 3], ['KHQueryRawDatas', 8]] as const) {
  const wrapper = registered.get(name)!;
  registered.set(name, {...wrapper, requiredFormals: minimum});
}
// end
// end
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
export function variableAccess(ref: string, write: boolean) {
  const member = 'global[' + JSON.stringify(ref) + ']';
  return write ? member + ' = 计算值' : '读取 ' + member;
}
export function pointAccess(ref: string, source: string, write: boolean) {
  const alias = JSON.stringify(source), tag = JSON.stringify(ref);
  return write ? '采集点写入使用 await KIOUpdateDatas(' + alias + ', [{N:' + tag + ', V:计算值}], errors)，按接口返回码处理'
    : '采集点读取使用 KIOQueryDatas，连接为 ' + alias + '，点列表含 ' + tag;
}
export function usesConnection(symbol: string) {
// end
  const entry = registered.get(symbol);
  return !!entry && ["kio", "kh", "ks", "mongo", "sql", "redis"].includes(entry.family);
}
export function scriptContracts(symbols: string[]) {
// end
  return symbols.map((symbol) => {
    const card = runtimeReference('calculation', { symbol });
    const registration = registered.get(symbol);
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    return {
      symbol,
      state: card.state,
      ...(registration && { registration }),
      ...(card.state === 'contract' && {
        signature: card.signature,
        usage: card.usage,
        example: card.example,
        ...(card.verification && {result: card.result, effect: card.effect, verification: card.verification}),
      }),
      source: card.source,
    };
    // end
  });
}
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
function connectionFamily(provider: string) {
  if (/KingIOServer/i.test(provider)) return 'kio';
  if (/KingHistorian|KHFDBServer/i.test(provider)) return 'kh';
  if (/KingSCADA/i.test(provider)) return 'ks';
  if (/mongo/i.test(provider)) return 'mongo';
  if (/redis/i.test(provider)) return 'redis';
  if (/postgres|mysql|sqlserver|oracle|达梦|关系型|TimeScaleDB|^DM$/i.test(provider)) return 'sql';
}
// end
export async function scriptEnvironment(
  reader: Reader,
  token: string,
  ctx: Context,
  question = '',
  previous: string[] = [],
) {
  if (!['calculation', 'period', 'request'].includes(ctx.kind)) throw problem('请打开目标计算工程');
  const inventory = await formulaInventory(reader, token, ctx, question, previous);
  const read = (path: string, args: Record<string, string>) =>
    reader.call(token, path, { projectId: ctx.projectId, ...args });
  const custom = (await calcList(read, 'functions', '-1')).items;
  const bindings = new Map<string, Binding>();
  const visible: {
    ref: string;
    kind: string;
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    connectionFamily?: string;
    // end
    sourceRef?: string;
    read?: boolean;
    write?: boolean;
    // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
    offset?: number;
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
    trigger?: Binding['trigger'];
    signature?: {arity:number;contract?:ReturnType<typeof returnContract>};
    // end
    // end
  }[] = [];
  const dependencies = [...inventory.dependencies];
  const lines: string[] = [];
  const add = (ref: string, b: Binding, description = '') => {
    bindings.set(ref, b);
    const i = question.indexOf(b.name);
    visible.push({
      ref,
      kind: b.kind,
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      ...(b.connectionFamily && {connectionFamily:b.connectionFamily}),
      // end
      sourceRef: b.sourceRef,
      read: b.read,
      // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
      write: b.write,
      // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
      ...(b.trigger && {trigger:b.trigger}),
      ...(b.parameters && {signature:{arity:b.parameters.length,contract:b.contract}}),
      // end
      // end
      ...(i >= 0 && { offset: i }),
    });
    lines.push(ref + ' → ' + [b.name, description].filter(Boolean).join(' · '));
  };
  // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
  const connectionContracts = new Set<string>();
  // end
  // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  const sourceIds=new Map<string,string>();
// end
  const sources = new Map<string, string>();
  const kioAliases = new Set<string>();
  // end
  const directory = await reader.call(token, '/dataSource/getAllDataSource');
  for (const alias of inventory.projectAliases.slice(0, 24)) {
    const target = directory.filter((d) => d.name === alias.connectName);
    if (target.length !== 1 || inventory.projectAliases.filter((a) => a.name === alias.name).length !== 1)
      continue;
    const source: Context = { kind: 'datasource', projectId: target[0].guid, object: '', dirty: false };
    if (!(await reader.allowed(token, source))) continue;
    dependencies.push(source);
    const ref = refId('source', [
      ctx.projectId,
      alias.name,
      target[0].guid,
      target[0].type,
      target[0].config?.engineeringId,
    ]);
    // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    const providerType = target[0].config?.newWorkDateType || target[0].config?.newWorkDataType || target[0].type;
    const family = connectionFamily(String(providerType)) ?? connectionFamily(String(target[0].type));
    if (family === 'kio') {
      // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
      kioAliases.add(alias.name);
      connectionContracts.add('KIOQueryDatas');
      // end
      connectionContracts.add('KIOUpdateDatas');
    }
    if (family === 'sql') {
      connectionContracts.add('SQLQuery');
      connectionContracts.add('SQLExecute');
    }
    if (family && family !== 'kio' && family !== 'sql')
      for (const symbol of globalFamilies[family]) connectionContracts.add(symbol);
    // end
    // end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    if(alias.type===target[0].type)sourceIds.set(ref,source.projectId);
// end
    sources.set(alias.name, ref);
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
    add(ref, { kind: 'source', name: alias.name, connectionFamily:family }, alias.connectName);
// end
  }
  for (const point of inventory.points) {
    const sourceRef = sources.get(point.alias);
    if (!sourceRef) continue;
    add(
      '@point:' + point.ref,
      { kind: 'point', name: point.name, sourceRef, read: point.canRead, write: point.canWrite },
      point.alias + ' / ' + point.type,
    );
  }
  for (const [kind, rows, key] of [
    ['variable', inventory.projectVariables, 'name'],
    ['function', custom, 'functionName'],
  ] as const) {
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
    const ordered=kind==='function'?[...rows].sort((a,b)=>Number(question.includes(String(b[key])))-Number(question.includes(String(a[key])))):rows;
    let functionReads=0;
    for (const row of ordered.slice(0,64)) {
    // end
      const name = row[key];
      if (typeof name !== 'string' || !name || rows.filter((r) => r[key] === name).length !== 1) continue;
      // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
      let parameters:string[]|undefined, contract, bodyFingerprint;
      if(kind==='function'){
        if(row.whetherenable!=='是' || typeof row.paramlist!=='string' || inventory.projectVariables.some(v=>v.name===name)) continue;
        parameters=row.paramlist.trim()?row.paramlist.split(',').map(p=>p.trim()):[];
        if(typeof row.GUID==='string' && functionReads<8){
          functionReads++;
          const saved=await read('/calculation/scriptData',{type:'functions',scriptId:row.GUID});
          if(typeof saved?.context==='string'){
            bodyFingerprint=createHash('sha256').update(saved.context).digest('hex');
            contract=returnContract(saved.context,parameters);
          }
        }
      }
      add(
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
        kind === 'variable' ? dictionaryRef(ctx.projectId,row)
          : refId(kind, [ctx.projectId, name, row.type, row.dataSourceName, row.TagName, row.paramlist,row.GUID,bodyFingerprint]),
// end
      // end
        // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
        // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
        { kind, name, parameters, contract, ...(kind === 'variable' && {trigger: dictionaryTrigger(row, inventory.projectVariables, inventory.projectAliases, kioAliases, bindings)}) },
        // end
        // end
        kind === 'variable' ? row.type : String(row.paramlist ?? ''),
      );
    }
  }
  for (const dep of dependencies) await reader.require(token, dep);
  return {
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
    sourceIds,
    fieldTypes:new Map([...inventory.points.map(p=>['@point:'+p.ref,p.type] as const),...[...bindings].filter(([,b])=>b.kind==='variable').map(([ref,b])=>[ref,String(inventory.projectVariables.find(v=>v.name===b.name)?.type??'')] as const)]),
// end
    bindings,
    // modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
    connectionContracts: [...connectionContracts],
    occupiedNames:new Set([...custom.flatMap(row=>[row.name,row.functionName]),...inventory.projectVariables.map(v=>v.name),...inventory.projectAliases.map(a=>a.name)].filter((n):n is string=>typeof n==='string')),
    // end
    // end
    dependencies,
    lines,
    summary: {
      bindings: visible,
      pointMentions: inventory.summary.matchedQuestionOffsets.map((m) => ({ ...m, ref: '@point:' + m.ref })),
      previousPointMentions: inventory.summary.previousQuestionMatches.map((group) => ({
        ...group,
        matches: group.matches.map((m) => ({ ...m, ref: '@point:' + m.ref })),
      })),
      hosts: Object.fromEntries(
        Object.entries(hosts).map(([host, symbol]) => [
          host,
          runtimeReference('calculation', { symbol }).usage,
        ]),
      ),
      registered: Object.fromEntries(
        Object.entries(kcRegistrations).map(([family, entry]) => [family, Object.keys(entry.symbols)]),
      ),
      bindingSyntax:
        // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
        'JS 的点名、连接参数以及 qualitySamples[].ref 均填写 bindings 中的 ref 字符串。offset 标示该对象在问题里的起始位置，提交前把显示名替换为匹配的 ref。工程变量和工程函数用 global[引用字符串]。' +
        visible.filter(b => b.offset !== undefined).slice(0, 20)
          .map(b => '问题位置 ' + b.offset + ' → ' + JSON.stringify(b.ref)).join('；'),
        // end
    },
  };
}
// modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
// The KIO subscriber assigns only the first mapping for an incoming tag.
export function dictionaryTrigger(row: any, variables: any[], aliases: any[], kio: Set<string>, bindings: Map<string,Binding>): Binding['trigger'] {
  if (!/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(row.name)) return;
  if (['Number','String','Boolean'].includes(row.type)) return {mode:'memory'};
  if (!['IO_Number','IO_String','IO_Boolean'].includes(row.type) || !kio.has(row.dataSourceName)) return;
  const alias = aliases.find(a => a.name === row.dataSourceName && a.type === row.dataSourceType);
  if (!alias || variables.filter(v => /^IO_/.test(v.type) && v.TagName === row.TagName && v.dataSourceName === alias.name).length !== 1) return;
  const source = [...bindings].find(([,b]) => b.kind === 'source' && b.name === alias.name);
  if (!source) return;
  const points = [...bindings].filter(([,b]) => b.kind === 'point' && b.name === row.TagName && b.sourceRef === source[0]);
  if (points.length === 1 && points[0][1].read) return {mode:'mapped', pointRef:points[0][0]};
}
type Node = any;
// end
function visit(node: Node, fn: (node: Node, parent?: Node) => void, parent?: Node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) visit(item, fn, parent);
    return;
  }
  if (!node.type) return;
  fn(node, parent);
  for (const [key, value] of Object.entries(node))
    if (!['loc', 'start', 'end'].includes(key)) visit(value, fn, node);
}
const jsCalls = new Set(
  'Number String Boolean Date Array Object Map Set WeakMap WeakSet RegExp Error TypeError RangeError Promise BigInt parseInt parseFloat isFinite isNaN encodeURIComponent decodeURIComponent setTimeout clearTimeout setInterval clearInterval'.split(
    ' ',
  ),
);
// modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
export function checkDraft(host: Host, code: string, bindings: Map<string, Binding>, triggerRef?: string) {
  const result = inspectBody(host, code, bindings, true, triggerRef);
  if (host === 'dataChange' && triggerRef !== undefined) {
    const variable = bindings.get(triggerRef);
    if (variable?.kind !== 'variable' || !variable.trigger) result.errors.push('触发引用无效或没有唯一可读映射。请从 bindings 选择带 trigger 的变量，缺少映射时向用户核对数据词典。');
    else result.expression = variable.name;
  }
  return result;
}
// end
// modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
type DraftResult = {host: Host; errors: string[]; warnings: string[]; functions: string[]; code?: string; expression?: string};
// modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
// modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
export function bindDraftFunctions(drafts:{host:string;code:string;definition?:Definition}[], bindings:Map<string,Binding>, occupied:Set<string>) {
  const bound=new Map(bindings);
  const proposed=drafts.find(d=>d.host==='customFunction');
  const definition=proposed?.definition;
  if(definition){
    const name=definition.functionName;
    if(occupied.has(name)||name in globalThis||registered.has(name)||['global','InParam','OutParam','RequestID','Token','endResponse','logger','module','exports','require'].includes(name))
      throw problem('拟新增函数名已被占用。复用已有函数时只提交调用方；需要新功能时另取可调用名。');
    bound.set('@function:new',{kind:'function',name,parameters:definition.parameters,contract:returnContract(proposed!.code,definition.parameters)});
  }
  return bound;
}
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
export function checkSubmission(draft:{host:Host;code:string;shutdown?:string;triggerRef?:string;condition?:ConditionSettings;definition?:Definition},bindings:Map<string,Binding>) {
// end
// end
  const first=checkDraft(draft.host,draft.code,bindings,draft.triggerRef);
  // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
  if(draft.host==='customFunction' && draft.definition){
    first.errors.push(...formalDiagnostics(draft.definition,draft.code,n=>n in globalThis || registered.has(n)));
    first.warnings=first.warnings.filter(w=>!draft.definition!.parameters.some(p=>w.startsWith('自定义函数形参或自由变量 '+p+' ')));
  }
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
  if (draft.host === 'system') {
    const closing = checkDraft('system', draft.shutdown ?? '', bindings);
    if (!draft.shutdown?.trim()) closing.errors.push('shutdown 缺少关闭时的完整正文');
    const phases = [first, closing];
    const names = ['应用程序启动时', '应用程序关闭时'];
    const errors = phases.flatMap((p, i) => p.errors.map(message => names[i] + ' ' + message));
    const warnings = phases.flatMap((p, i) => p.warnings.map(message => names[i] + ' ' + message));
    return {host:draft.host, code:first.code, expression:undefined, errors, warnings,
      functions:[...new Set(phases.flatMap(p => p.functions))],
      eventAnswer:errors.length ? undefined : [...phases.map((p, i) => names[i] + '\n```js\n' + p.code + '\n```'), systemLifecycleNotice].join('\n\n')};
  }
  if (draft.host!=='condition') return {...first,eventAnswer:undefined};
// end
  // end
  const config=conditionSettings('condition',draft.condition)!;
  const phases=[first,checkDraft('condition',config.exist,bindings),checkDraft('condition',config.out,bindings)];
  const names=['进入时','存在时','离开时'];
  const errors=phases.flatMap((p,i)=>p.errors.map(message=>names[i]+' '+message));
  let expression='';
  try {expression=bindCondition(config.expression,bindings);}
  catch (err) {if (!(err instanceof HttpError)) throw err; errors.push('条件表达式 '+err.message);}
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
  const answer = errors.length ? undefined : conditionText(expression, config, phases.map(p => p.code!));
  return {host:draft.host,expression,code:first.code,errors,
    warnings:phases.flatMap((p,i)=>p.warnings.map(message=>names[i]+' '+message)),
    functions:[...new Set(phases.flatMap(p=>p.functions))],
    conditionAnswer:answer, eventAnswer:answer};
// end
}
function inspectBody(host: Host, code: string, bindings: Map<string, Binding>, allowWrapper: boolean, triggerRef?: string): DraftResult {
// end
// end
  const errors = new Set<string>(),
    warnings = new Set<string>(),
    functions = new Set<string>();
  const report = (n: Node, message: string) => errors.add('L' + n.loc.start.line + ' ' + message);
  // Resolve bindings conservatively. Dynamic aliases or execution paths stay visible as warnings.

  const replacements: { start: number; end: number; value: string }[] = [];
  // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  const comments: {start:number;end:number}[] = [];
  // end
  let ast: Node;
  try {
    ast = parse(code, {
      // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
      onComment: comments,
      // end
      ecmaVersion: 'latest',
      locations: true,
      // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
      ranges: true,
      // end
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
  } catch (e) {
    return {
      host,
      // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
      // modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
      errors: ['L' + ((e as any).loc?.line ?? 1) + ' JS 语法：' + String((e as Error).message) +
        (host==='request' && /^\s*(?:async\s+)?function\s*\(/u.test(code) ? '。移除最外层函数声明和配对的花括号，code 仅提交 KF 编辑器中的可执行函数体；四个宿主参数已经注入。':'') +
// end
        (/\bawait\b/.test(code.split('\n')[((e as any).loc?.line ?? 1)-1] ?? '')
          ? '。检查包含 await 的辅助函数是否声明为 async，并在调用处等待结果。' : '')],
      // end
      warnings: [],
      functions: [] as string[],
    };
  }
  // KF creates the request entry function itself. Accept a single model-authored entry declaration
  // only when its arguments match the host exactly and its body does not refer to its own name.
  const top = ast.body.filter((node: Node) => node.type !== 'EmptyStatement');
  // modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
  if (host === 'request' && top.length === 1 && top[0].type === 'ExpressionStatement') {
    const expression = top[0].expression;
    if (expression.type === 'FunctionExpression' || expression.type === 'ArrowFunctionExpression') {
      report(expression, '最外层是未调用的函数表达式，KF 执行这段代码时只会创建函数。移除外层函数、形参及包裹括号，仅提交可执行正文，直接使用宿主注入的 InParam、OutParam、RequestID、Token。');
      return {host, errors: [...errors], warnings: [], functions: []};
    }
  }
  // end
  if (host === 'request' && top.length === 1 && top[0].type === 'FunctionDeclaration') {
    const entry = top[0];
    let selfReference = false;
    visit(entry.body, node => {
      if (node.type === 'Identifier' && node.name === entry.id.name) selfReference = true;
    });
    const expected = ['InParam', 'OutParam', 'RequestID', 'Token'];
    if (allowWrapper && !selfReference && !entry.generator && entry.params.length === expected.length &&
        entry.params.every((p: Node, i: number) => p.type === 'Identifier' && p.name === expected[i])) {
      const body = code.slice(entry.body.start + 1, entry.body.end - 1);
      const result = inspectBody(host, body, bindings, false);
      result.warnings.unshift('本机已提取请求入口函数体；KF 由宿主传入四个参数。行号按编辑器正文计算。');
      return result;
    }
    return {host, errors: ['请求入口只有函数声明，没有执行语句。提交供 KF 调用的函数体，使用宿主注入的参数，移除外层声明或显式调用辅助函数。'],warnings:[],functions:[]};
  }
  // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
  const parents = new WeakMap<Node, Node>();
  visit(ast, (node, parent) => { if (parent) parents.set(node, parent); });
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  const {resolve, declared, reason, unusedTables} = scriptBindings(ast, parents);
  for (const id of unusedTables()) report(id, '局部映射 '+id.name+' 只有初始化或填充，没有消费者。移除多余映射及其填充语句，保留有业务作用的表达式，再提交完整正文。');
// end
  const hint = (kind: string, source?: string, write = false) => {
    const refs = [...bindings].filter(([, item]) => item.kind === kind &&
      (kind !== 'point' || (item.sourceRef === source && (write ? item.write : item.read))));
    return refs.length ? '本轮可选 ' + refs.slice(0, 6).map(([ref]) => JSON.stringify(ref)).join('、') : '本轮没有匹配引用，请重新核对工程连接和权限';
  };
  // end
  const binding = (n: Node) => bindings.get(resolve(n)?.value);
  let ends = 0;
  visit(ast, (n, p) => {
    if (
      n.type === 'Literal' &&
      typeof n.value === 'string' &&
      /^@(source|point|variable|function):/.test(n.value)
    ) {
      const b = bindings.get(n.value);
      if (!b) report(n, '工程引用已失效，请重新取材。');
      else replacements.push({ start: n.start, end: n.end, value: JSON.stringify(b.name) });
    }
    if (
      n.type === 'Identifier' &&
      !(p?.type === 'MemberExpression' && p.property === n && !p.computed) &&
      !(p?.type === 'Property' && p.key === n && !p.shorthand)
    ) {
      if (['OutParam', 'RequestID', 'Token'].includes(n.name) && host !== 'request')
        report(n, n.name + ' 属于请求式宿主');
      if (n.name === 'InParam' && !['request', 'dataChange'].includes(host))
        report(n, '此宿主未注入 InParam');
    }
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier') {
      // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
      const root = n.object.name;
      if (triggerRef && root === 'InParam' && !declared(n.object))
        report(n, '精确词典触发的 InParam 是字符串 Global。请用 global[triggerRef 对应的引用字符串] 读取当前值；质量须从关联点查询。');
      if (triggerRef && root === 'global' && n.computed && resolve(n.property)?.value === triggerRef &&
          ((p?.type === 'AssignmentExpression' && p.left === n) || p?.type === 'UpdateExpression'))
        report(n, '正文写入了自身触发变量，可能重入。请核对输出引用并与触发项分开。');
      // end
      if (
        !declared(n.object) &&
        !jsCalls.has(root) &&
        ![
          'global',
          'globalThis',
          'Math',
          'JSON',
          'console',
          'Reflect',
          'Symbol',
          'Intl',
          'Buffer',
          'Promise',
          'ArrayBuffer',
          'DataView',
          'BigInt',
          'Uint8Array',
          'InParam',
          'OutParam',
          'Token',
          'RequestID',
          'module',
          'exports',
          'process',
        ].includes(root)
      ) {
        if (host === 'customFunction')
          warnings.add('自定义函数形参或自由变量 ' + root + ' 须核对目标函数定义。');
        else report(n, '成员访问的对象 ' + root + ' 未找到声明，请检查拼写或使用 global[工程引用]');
      }
    }
    if (n.type === 'MemberExpression' && n.object.name === 'global' && n.computed) {
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
      const b = binding(n.property);
      if (!declared(n.object) && b?.kind === 'point') {
        const write = (p?.type === 'AssignmentExpression' && p.left === n) || p?.type === 'UpdateExpression';
        report(n, pointAccess(resolve(n.property).value, b.sourceRef!, write));
      }
// end
      if (!b || !['variable', 'function'].includes(b.kind))
        warnings.add('global 动态或未映射成员需核对工程词典、函数或进程状态。');
    }
    // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
    if (n.type !== 'CallExpression') return;
    // modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
    const callee=resolve(n.callee);
    if(callee?.type==='MemberExpression' && callee.object?.name==='global' && !declared(callee.object) && callee.computed){
      const target=binding(callee.property);
// end
      if(target?.kind!=='function') report(n,'工程函数调用需使用当前启用函数的 @function 引用；同一提交中的新增函数用 "@function:new"。');
      else if(target.parameters){
        if(n.arguments.length!==target.parameters.length || n.arguments.some((arg:Node)=>arg.type==='SpreadElement'))
          report(n,'工程函数签名为 '+target.parameters.length+' 个有序形参，请逐个传入对应实参。');
        if(target.contract?.returns==='undefined' && p?.type==='AwaitExpression' && parents.get(p)?.type!=='ExpressionStatement')
          report(n,'已核对的函数正文没有返回值，不能把它当作计算结果。请使用返回值匹配的函数或另行定义。');
        if(!['AwaitExpression','ReturnStatement'].includes(p?.type)) report(n,'工程函数由 KF 包装成 async，请 await 取得返回值后再写回或填充 OutParam。');
      }
      return;
    }
    // end
    const name =
      n.callee.type === 'Identifier'
        ? n.callee.name
        : n.callee.object?.name === 'global' && !n.callee.computed
          ? n.callee.property.name
          : undefined;
    if (!name) return;
    if (name === 'endResponse') {
      ends++;
      // modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
      if (host !== 'request' || n.arguments.length !== 1 || n.arguments[0]?.name !== 'RequestID') {
        report(n, '请求式正文用 endResponse(RequestID) 结束回包，仅传一个参数。返回字段先写入 OutParam。');
      } else if (declared(n.arguments[0])) {
        report(n, '局部形参或声明遮蔽了宿主的 RequestID。移除同名形参或声明，让 endResponse(RequestID) 使用本次请求的宿主标识。');
      } else if (declared(n.callee)) {
        report(n, '局部声明遮蔽了宿主的 endResponse。重命名局部函数，使用宿主注入的 endResponse(RequestID)。');
      }
      // end
      return;
    }
    const reg = registered.get(name);
    if (!reg) {
      if (!declared(n.callee) && !jsCalls.has(name) && name !== 'require')
        report(n, '未找到调用 ' + name + ' 的本地声明或 KC 登记；工程函数用 global[函数引用]。');
      if (name === 'require') warnings.add('模块依赖和目标节点版本须另行核对。');
      return;
    }
    if (declared(n.callee)) {
      warnings.add('同名局部声明，需人工辨别 ' + name);
      return;
    }
    functions.add(name);
    const args = n.arguments;
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    const knowledge = Object.hasOwn(sourceFunctionContracts, name) ? sourceFunctionContracts[name] : undefined;
    const minimum = reg.requiredFormals ?? 0;
    const spread = args.some((arg: Node) => arg.type === 'SpreadElement');
    if (reg.formals !== undefined && !(knowledge && spread) && (args.length < minimum || args.length > reg.formals))
      report(n, name + ' 的脚本入口参数数量为 ' + minimum + ' 至 ' + reg.formals +
        (knowledge ? '。用法 ' + knowledge.signature : ''));
    if (knowledge && spread) warnings.add(name + ' 的展开实参需核对参数位置。');
    if (knowledge?.callback && !spread && args.length >= minimum) {
      const position = knowledge.callback === 'last' ? args.length : knowledge.callback;
      const callback = resolve(args[position - 1]);
      if (callback && ['Literal', 'ArrayExpression', 'ObjectExpression', 'TemplateLiteral'].includes(callback.type))
        report(args[position - 1], name + ' 第' + position + '参需要回调函数。' + knowledge.result);
    }
    if (knowledge?.outputArray && !spread) {
      const output = args[knowledge.outputArray - 1];
      const value = resolve(output);
      if (value && ['Literal', 'ObjectExpression', 'TemplateLiteral'].includes(value.type))
        report(output, name + ' 第' + knowledge.outputArray + '参需要接收结果的数组。');
    }
    // end
    const detail = runtimeReference('calculation', { symbol: name });
    if (name === 'SQLQuery' && args.length >= 3 && resolve(args[2])?.type !== 'ArrayExpression')
      warnings.add('核对 SQLQuery 第三个参数为接收结果行的数组。');
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    if (reg.async && !knowledge?.callback && !['AwaitExpression', 'ReturnStatement'].includes(p?.type))
      warnings.add(name + ' 返回 Promise，请核对等待或传递结果的路径。');
    if (reg.async && knowledge?.callback && p?.type === 'AwaitExpression' && parents.get(p)?.type !== 'ExpressionStatement')
      warnings.add(name + ' 的外层 Promise 不交付业务结果。' + knowledge.result);
    if (detail.verification)
      warnings.add(name + ' 已核对源码，待验证 · ' + detail.verification.method);
    else if (detail.state !== 'contract') warnings.add(name + ' 已核对登记，适配器语义仍需验证。');
    // end
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
    if (usesConnection(name)) {
// end
      const alias = binding(args[0]);
      // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
      if (!alias || alias.kind !== 'source') report(args[0] ?? n, name + ' 第1参：' + reason(args[0]) +
        '。改用当前连接的匿名字符串，或在调用前用只赋值一次的局部变量保存它。' + hint('source'));
      // end
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      else if (alias.connectionFamily && alias.connectionFamily !== reg.family)
        report(args[0], name + ' 第1参需要 ' + reg.family + ' 连接，当前引用属于 ' + alias.connectionFamily + '。');
      // end
      if (reg.family === 'kio') {
        const list = resolve(args[1]);
        const write = name.includes('Update');
        if (list?.type !== 'ArrayExpression') {
          warnings.add('动态点列表须核对运行回执。');
          return;
        }
        for (const item of list.elements) {
          const tag = write
            ? item?.properties?.find((p: Node) => !p.computed && (p.key.name ?? p.key.value) === 'N')?.value
            : item;
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
          const b = binding(tag);
          if (b?.kind === 'variable') {
            report(tag, '目标是工程词典变量。' + variableAccess(resolve(tag).value, write) +
              '。移除该变量对应的 KIO 调用和连接参数，再提交完整 JS。');
            continue;
          }
// end
          if (
            !b ||
            b.kind !== 'point' ||
            b.sourceRef !== resolve(args[0])?.value ||
            !(write ? b.write : b.read)
          )
                        // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
            report(tag ?? n, name + ' 第2参的' + (write ? '写入项 N' : '读取点') + '：' +
              (b ? '引用的连接或读写方向不匹配' : reason(tag)) + '。换成与第1参同源且有' +
              (write ? '写' : '读') + '权限的点。' + hint('point', resolve(args[0])?.value, write));
            // end
        }
      }
    }
  });
  if (host === 'request' && !ends) errors.add('请求脚本缺少 endResponse(RequestID)');
  if (host === 'request' && ends) warnings.add('回包次数、异常分支和并发按真实请求验收。');
  // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  for (const {start,end} of comments) {
    const original = code.slice(start,end);
    const value = original.replace(/@(?:source|point|variable|function):[a-z0-9]+/gi, ref => {
      const name = bindings.get(ref)?.name;
      return name && !/[\r\n\u2028\u2029]/u.test(name) && !name.includes('*/') ? name : ref;
    });
    if (value !== original) replacements.push({start,end,value});
  }
  // end
  let local = code;
  for (const edit of replacements.sort((a, b) => b.start - a.start))
    local = local.slice(0, edit.start) + edit.value + local.slice(edit.end);
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  if (/@(?:variable|point|source|function):[a-z0-9]+/i.test(local)) {
    errors.add('交付正文含未展开的工程引用。删除注释或说明中的匿名编号；可执行位置使用完整引用字符串，勿拼接或嵌入模板。');
  }
  return {
    host,
    errors: [...errors],
// end
    warnings: [...warnings],
    functions: [...functions],
    ...(!errors.size && { code: local }),
  };
}
// end
