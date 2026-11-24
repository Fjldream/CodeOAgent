// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
import {scriptBindings} from "./js-bindings.ts";
// end
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
import { parse } from "acorn";
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
import { usesConnection, variableAccess, pointAccess, scriptContracts } from "./script-authoring.ts";
// end
// end
import { createHash, randomUUID } from "node:crypto";
import { HttpError, type Context, type Evidence } from "./shared.ts";
import type { Store } from "./store.ts";
import type { scriptEnvironment } from "./script-authoring.ts";
import type { solutionOverview } from "./solution-overview.ts";

type Env = Awaited<ReturnType<typeof scriptEnvironment>>;
type Flow = Awaited<ReturnType<typeof solutionOverview>>["flow"];
const invalid = (s: string) => new HttpError(409, s);
const kinds = [
  "period",
  "request",
  "system",
  "condition",
  "dataChange",
  "customFunction",
];
export const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hosts", "inputs", "outputs", "functions", "policy", "missing"],
  properties: {
    hosts: { type: "array", items: { type: "string", enum: kinds } },
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
    inputs: { type: "array", maxItems: 16, items: {type: "string"},
      description: "仅列脚本读取其值的点或工程变量。InParam 等宿主参数写在 policy。用于定位工程的连接不列入任何清单。" },
    outputs: { type: "array", maxItems: 16, items: {type: "string"},
      description: "仅列脚本实际写入的点或工程变量。OutParam 写在 policy。" },
    functions: { type: "array", maxItems: 16, items: {type: "string"}, description: "实际复用的 @function 引用。" },
    connections: { type: "array", maxItems: 16, items: {type: "string"},
      description: "仅列脚本直接调用 KC 接口所用的 @source 连接。点所属的连接自动解析。仅用于定位的连接省略。" },
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
    retained: {type:'string',maxLength:650,description:'变更轮专用：具体说明继续生效的输入、输出或业务口径。'},
    retired: {type:'string',maxLength:650,description:'变更轮专用：说明被新要求替代的旧规则或旧目标。只写作废的部分。'},
    policy: {
// end
      type: "string",
      maxLength: 1200,
      description:
        "policy、retained、retired、missing 中提到工程对象时一律逐字使用提供的 @类型:编号。已经明确的业务口径，保留公式、单位、边界、异常、宿主和输出。不要擅自决定缺失口径。",
    },
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
    decisionOptions:{type:"array",minItems:2,maxItems:2,uniqueItems:true,items:{type:"string",minLength:1,maxLength:160},
      description:"只有确实缺少业务决定时填写两种仍与用户原话相容的做法及不同的可观察结果。已确定的做法写入 policy 并清空 missing；不为可选增强功能或已排除的做法提问。"},
    // end
    missingBasis: {type:"string", enum:["business","unresolvedReference","projectFact"],
      description:"有待确认问题时标注其依据：业务决定、缺失或有歧义的引用、可由现有工程或宿主解释的事实。"},
    missing: {
// end
      type: "string",
      maxLength: 450,
      description: "只询问影响结果且现场查不到的业务口径；全部明确时空字符串。",
    },
  },
};
export function readReview(raw: any) {
  if (
    !raw ||
    typeof raw !== "object" ||
    Object.keys(raw).some((k) => !Object.hasOwn(reviewSchema.properties, k)) ||
    typeof raw.policy !== "string" ||
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
    ['retained','retired'].some(k=>raw[k]!==undefined && (typeof raw[k]!=='string' || raw[k].length>650)) ||
    !raw.policy.trim() ||
// end
    raw.policy.length > 1200 ||
    typeof raw.missing !== "string" ||
    raw.missing.length > 450
  )
    throw invalid("口径摘要或待确认问题无效。");
  for (const k of ["hosts", "inputs", "outputs", "functions"]) {
    if (
      !Array.isArray(raw[k]) ||
      raw[k].length > 16 ||
      new Set(raw[k]).size !== raw[k].length ||
      raw[k].some(
        (s: unknown) =>
          typeof s !== "string" ||
          (k === "hosts"
            ? !kinds.includes(s)
            : !/^@(point|function|variable|source):[a-z0-9]+$/i.test(s)),
      )
    )
      throw invalid("宿主或工程引用无效。");
  }
  if (!raw.hosts.length && !raw.missing.trim())
    throw invalid("请确认使用哪一种脚本宿主。");
  return {
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
    ...(raw.connections !== undefined && { connections: readConnections(raw.connections) }),
    hosts: raw.hosts as string[],
// end
    inputs: raw.inputs as string[],
    outputs: raw.outputs as string[],
    functions: raw.functions as string[],
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
    ...(typeof raw.retained==='string' && {retained:raw.retained.trim()}),
    ...(typeof raw.retired==='string' && {retired:raw.retired.trim()}),
    policy: raw.policy.trim(),
// end
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
    ...(raw.missing?.trim() && ["business","unresolvedReference","projectFact"].includes(raw.missingBasis) && {missingBasis:raw.missingBasis as string}),
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
    ...(raw.missing?.trim() && Array.isArray(raw.decisionOptions) && raw.decisionOptions.length===2 &&
      raw.decisionOptions.every((s:unknown)=>typeof s==="string" && s.trim().length>0 && s.length<=160) &&
      new Set(raw.decisionOptions.map((s:string)=>s.trim())).size===2 &&
      {decisionOptions:raw.decisionOptions.map((s:string)=>s.trim()) as string[]}),
    // end
    missing: raw.missing.trim(),
// end
  };
}
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
function readConnections(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 16 || new Set(value).size !== value.length ||
      value.some(ref => typeof ref !== "string" || !/^@source:[a-z0-9]+$/i.test(ref)))
    throw invalid("connections 仅接受本轮可用的匿名工程连接。");
  return value;
}
export type Review = ReturnType<typeof readReview>;
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
import type { ReviewConstraints } from "./review-constraints.ts";
export type Checkpoint = {
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
  businessSuites?: import("./business-probe.ts").BusinessPlan[];
  businessReceipts?: {host:string;digest:string;cases:number;failed:number}[];
// end
  constraints?: ReviewConstraints;
  amendment?: {baseRun:string; base:Review};
// end
// end
  anchor: string;
  target: string;
  fingerprint: string;
  review?: Review;
  phase: "inspect" | "review" | "delivered";
};
export function priorScope(store: Store, owner: string, chat: string) {
  store.chat(owner, chat);
  const row = store.db
    .prepare(
      `SELECT * FROM runs WHERE chat=? AND status='done' AND
 (json_extract(evidence,'$.scope')='solution' OR json_extract(evidence,'$.solutionScript') IS NOT NULL)
 ORDER BY rowid DESC LIMIT 1`,
    )
    .get(chat);
  if (!row) return;
  const checkpoint = JSON.parse(String(row.evidence)).solutionScript as
    | Checkpoint
    | undefined;
  const anchor = checkpoint ? store.run(owner, checkpoint.anchor) : row;
  if (
    anchor.chat !== chat ||
    JSON.parse(String(anchor.evidence)).scope !== "solution"
  )
    throw invalid("方案总览来源已变化，请重新核对。");
  const latest = store.db
    .prepare(
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
      "SELECT id FROM runs WHERE chat=? AND status!='active' ORDER BY rowid DESC LIMIT 1",
// end
    )
    .get(chat);
  return { row, anchor, checkpoint, immediate: latest?.id === row.id };
}
export function selectTarget(
  flow: Flow,
  current: Context,
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
  previous?: Checkpoint,
  amend = false,
) {
// end
  if (["calculation", "period", "request"].includes(current.kind))
    return current.projectId;
  const role = ["scene", "page", "report"].includes(current.kind)
    ? "client"
    : current.kind;
  if (
    !flow.projects.some(
      (p) => p.kind === role && p.projectId === current.projectId,
    )
  )
    throw invalid("当前入口与已核实的方案数据流缺少关联。");
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
  if (previous && (amend || previous.phase !== "delivered")) return previous.target;
// end
  const matches = flow.projects.filter((p) => p.kind === "calculation");
  return matches.length === 1 ? matches[0].projectId : null;
}
export function connectEnvironment(flow: Flow, env: Env) {
  const sources = new Set(
    flow.projects
      .filter((p) => p.kind === "datasource")
      .map((p) => p.projectId),
  );
  const aliases = new Set(
    [...env.sourceIds].filter(([, id]) => sources.has(id)).map(([ref]) => ref),
  );
  if (!aliases.size)
    throw invalid(
      "目标计算工程尚未保存指向本方案数据源的唯一连接。请核对「数据源管理」后重试。",
    );
  const bindings = env.summary.bindings
    .filter((b) =>
      b.kind === "source"
        ? aliases.has(b.ref)
        : b.kind === "point"
          ? aliases.has(b.sourceRef!)
          : true,
    )
    .map((b) => {
      const binding = env.bindings.get(b.ref)!;
      const directions = b.sourceRef
        ? flow.uses
            .filter(
              (u) =>
                u.sourceId === env.sourceIds.get(b.sourceRef!) &&
                u.point === binding.name,
            )
            .map((u) => u.direction)
        : [];
      return {
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
        ...b,
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
        fieldType:env.fieldTypes.get(b.ref),
        ...(b.kind === "variable" && {access: [variableAccess(b.ref,false), variableAccess(b.ref,true)]}),
        ...(b.kind === "point" && b.sourceRef && {access:[
          ...(b.read ? [pointAccess(b.ref,b.sourceRef,false)] : []),
          ...(b.write ? [pointAccess(b.ref,b.sourceRef,true)] : [])
        ]}),
// end
        ...(b.kind === "source" && { role: "工程定位或 KC 调用的连接参数，本身没有业务数据值。" }),
// end
        ...(directions.length
          ? { observedUse: [...new Set(directions)].sort() }
          : {}),
      };
    });
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        bindings
          .map((b) => [
            b.ref,
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
            b.sourceRef, env.bindings.get(b.ref)?.connectionFamily, b.trigger,
// end
            b.read,
            b.fieldType,
            b.write,
            b.signature,
            b.observedUse,
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      ),
    )
    .digest("hex");
  return { bindings, fingerprint, aliases };
}
export function approvedBindings(
  review: Review,
  env: Env,
  allowed: Set<string>,
) {
  const selected = new Map<string, ReturnType<Env["bindings"]["get"]>>();
  for (const [role, refs] of [
    ["inputs", review.inputs],
    ["outputs", review.outputs],
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
    ["functions", review.functions],
    ["connections", review.connections ?? []],
// end
  ] as const) {
    for (const ref of refs) {
      const b = env.bindings.get(ref);
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
      if (b?.kind === "source" && (role === "inputs" || role === "outputs"))
        throw invalid("工程连接不提供业务值。请从 inputs/outputs 移除该连接。若脚本直接调用连接接口，登记到 connections；仅用于定位时省略。");
      if (
        !b ||
// end
        !allowed.has(ref) ||
        (role === "functions"
          ? b.kind !== "function"
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
          : role === "connections" ? b.kind !== "source" : !["variable", "point"].includes(b.kind)) ||
// end
        (b.kind === "point" && !(role === "inputs" ? b.read : b.write))
      )
        throw invalid("所选工程引用的归属、类型或读写方向不符。");
      selected.set(
        ref,
        b.kind === "point"
          ? {
              ...b,
              read: b.read && review.inputs.includes(ref),
              write: b.write && review.outputs.includes(ref),
            }
          : b,
      );
      if (b.sourceRef) selected.set(b.sourceRef, env.bindings.get(b.sourceRef));
    }
  }
  return new Map(
    [...selected].filter(
      (entry): entry is [string, NonNullable<(typeof entry)[1]>] => !!entry[1],
    ),
  );
}
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
export function confirmedScriptScope(review: Review, env: Env, scope: ReturnType<typeof connectEnvironment>) {
  const bindings = approvedBindings(review, env, new Set(scope.bindings.map(item => item.ref)));
  const symbols = new Set<string>(["global"]);
  const families = new Set<string>();
  const visible = scope.bindings.filter(item => bindings.has(item.ref)).map(item => {
    const binding = bindings.get(item.ref)!;
    const ref = item.ref, read = review.inputs.includes(ref), write = review.outputs.includes(ref);
    const access: string[] = [];
    if (binding.kind === "variable") {
      if (read) access.push(variableAccess(ref, false));
      if (write) access.push(variableAccess(ref, true));
    } else if (binding.kind === "point") {
      for (const direction of [false, true]) {
        if (!(direction ? write : read)) continue;
        symbols.add(direction ? "KIOUpdateDatas" : "KIOQueryDatas");
        access.push(pointAccess(ref, binding.sourceRef!, direction));
      }
    } else if (binding.kind === "function") {
      access.push("await global[" + JSON.stringify(ref) + "](有序实参)");
    } else if (review.connections?.includes(ref) && binding.connectionFamily) {
      families.add(binding.connectionFamily);
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      for (const symbol of env.summary.registered[binding.connectionFamily] ?? []) symbols.add(symbol);
      // end
    }
    const trigger = item.trigger?.pointRef && !bindings.has(item.trigger.pointRef) ? undefined : item.trigger;
    return {ref, kind: binding.kind, read, write, fieldType:item.fieldType,
      // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
      ...(binding.connectionFamily && {connectionFamily:binding.connectionFamily}),
      // end
      sourceRef: binding.sourceRef, signature:item.signature, trigger, access};
  });
  const registered = Object.fromEntries(Object.entries(env.summary.registered).map(([family, names]) =>
    [family, names.filter(name => !usesConnection(name) || families.has(family) || symbols.has(name))]));
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  const namedFunctions = new Set((review.policy + ' ' + (review.retained ?? '')).match(/[A-Za-z_$][\w$]*/g));
  for (const name of Object.values(registered).flat()) {
    if (namedFunctions.has(name)) symbols.add(name);
  }
  // end
  const hosts = Object.fromEntries(review.hosts.map(host => [host, env.summary.hosts[host]]));
  return {bindings, material: {bindings:visible, hosts, registered, cards:scriptContracts([...symbols]),
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
    bindingSyntax:"按 access 直接使用确认引用，本机会解析工程名。只写运行时使用的代码，无需名称对照表。请求入参、回包和边界按已确认口径处理。",
// end
    previousReview:{hosts:review.hosts, inputs:review.inputs, outputs:review.outputs, functions:review.functions,
      // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
      connections:review.connections ?? [], policy:review.policy,
      ...(review.retained && {retained:review.retained})}}};
// end
}
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
// Give the planner one evidence-based reconsideration before showing a clarification.
export function recheckClarification(review: Review, scope: ReturnType<typeof connectEnvironment>, checked: boolean) {
  if (!review.missing) return;
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
  if (checked && (review.missingBasis==="unresolvedReference" ||
      review.missingBasis==="business" && review.decisionOptions?.length===2)) return;
  // end
  const refs = new Set([...review.inputs, ...review.outputs, ...review.functions, ...(review.connections ?? [])]);
  const evidence = scope.bindings.filter(b => refs.has(b.ref)).map(b =>
    [b.ref, b.kind, b.fieldType, ...(b.access ?? []), b.signature && JSON.stringify(b.signature)].filter(Boolean).join(" "));
  return {status:"revise", diagnostics:[
    "提交的待确认问题：" + review.missing,
    ...evidence,
    // modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
    ...scope.bindings.filter(b=>b.kind==="variable" && review.outputs.includes(b.ref)).map(b=>
      b.ref+" 是工程内存变量。global 属性赋值是同步 JS 操作；正常完成可继续，抛错时进入已约定的异常分支。该接口没有独立的写入返回码。只有用户明确要求写后回读才增加读操作；额外的监视、重试或确认机制不能成为本次生成的前置问题。"),
    // end
    ...(review.hosts.includes("request") ? ["请求宿主通过 OutParam 交付回包；用户已指定的回包字段同样承载明确约定的 null 或空值。"] : [])
  ], instruction:"对照当前需求、已查引用及宿主约定逐项复核。工程事实与接口写法直接落实到 policy。只保留仍无法由证据决定、且会改变业务结果的选择或确实缺失的目标；其他情况将 missing 留空。若仍需提问，请只询问该项；业务选择须填写 decisionOptions，列出两个仍与已确认口径相容、产生不同结果的做法。只有一种符合时将其写入 policy 并清空 missing。标注 missingBasis 为 business 或 unresolvedReference 并说明会影响的结果或待区分的对象。重新提交完整清单。"};
}
export function isScriptConfirmation(question: string) {
// end
// end
  return /^(?:我)?(?:确认|同意)(?:上述|按上述口径|按此口径)?(?:生成(?:完整)?(?:JS|脚本)?)?[。！!]*$/iu.test(question.replace(/\s+/gu, ""));
}
export function scriptMode(question: string, suggested?: string) {
  return isScriptConfirmation(question) ? "continue" : suggested;
}
export function isAmendment(question: string, mode?: string) {
  if (isScriptConfirmation(question)) return false;
// end
  return mode==='amend' || mode!=='new' && /(?:改(?:为|成|一下|动|口|用|写|下)|变更|作废|替换|不再|调整|上(?:一版|次|版).*改)/u.test(question);
}
export function amendmentDiagnostics(review:Review, amendment?:Checkpoint['amendment']) {
  if (amendment && !review.missing && amendment.base.policy===review.policy &&
      ['hosts','inputs','outputs','functions'].every(key=>JSON.stringify(review[key])===JSON.stringify(amendment.base[key]))) {
    return ['此次修改尚未反映在当前有效口径或工程引用中，请根据用户最新要求重新核对。'];
  }
  return amendment && (!review.retained?.trim() || !review.retired?.trim() || review.retained===review.retired)
    ? ['比较 previousReview 和本轮需求，retained 列出继续生效的约定，retired 单独列出被取代的约定，policy 仅写本轮现行规则。重新提交完整清单。']
    : [];
}
export function confirmed(
// end
  question: string,
  previous: Checkpoint | undefined,
  current: Checkpoint,
) {
  return (
    !!previous?.review &&
    previous.phase === "review" &&
    !previous.review.missing &&
    previous.anchor === current.anchor &&
    previous.target === current.target &&
    previous.fingerprint === current.fingerprint &&
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
    isScriptConfirmation(question) &&
    ![...previous.review.inputs, ...previous.review.outputs].some(ref => ref.startsWith("@source:"))
// end
  );
}
export function checkpointEvidence(
  checkpoint: Checkpoint,
  answer: string,
): Evidence {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    layer: "saved",
    title: "方案计算脚本工作记录",
    source: "对话内方案引用与计算工程登记",
    solutionScript: checkpoint,
    facts: [{ label: "本轮工作记录", value: answer }],
    references: [],
    gaps: [],
  };
}
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
export function reviewNameDiagnostics(review: Review, allowed: Set<string>) {
  const fields = [review.policy,review.retained,review.retired,review.missing];
  const unknown = fields.flatMap(field => field?.match(/@(?:point|source|variable|function):[a-z0-9]+/gi) ?? [])
    .some(ref => !allowed.has(ref));
  return unknown ? ['清单文字引用了当前工程未核实的编号。核对 bindings，逐字使用已有引用；已不可读的旧对象用业务角色描述。'] : [];
}
// end
export function reviewText(r: Review, env: Env, amendment?: Checkpoint['amendment']) {
  const names = (text:string) => text.replace(/@(point|source|variable|function):[a-z0-9]+/gi, ref=>env.bindings.get(ref)?.name??'已不可读的工程对象');
  const removed = amendment?.base.outputs.filter(ref=>!r.outputs.includes(ref))??[];
  const added = amendment?r.outputs.filter(ref=>!amendment.base.outputs.includes(ref)):[];
  const preserved = amendment?['inputs','outputs','functions'].flatMap(key=>{
    const k=key as 'inputs'|'outputs'|'functions';
    const refs=r[k].filter(ref=>amendment.base[k].includes(ref));
    const label={inputs:'输入',outputs:'输出',functions:'函数'}[k];
    return refs.length?[label+' '+refs.map(names).join('、')]:[];
  }):[];

// end
  const labels = (refs: string[]) =>
    refs.map((id) => env.bindings.get(id)!.name).join("、");
  return [
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
    ...(amendment ? [
      '### 本轮需求变更',
      '- 沿用：'+names(r.retained??''),
      ...(preserved.length?['- 重新核对后沿用的引用：'+preserved.join('；')]:[]),
      '- 作废：'+names(r.retired??''),
      ...(removed.length?['- 停止写入：'+removed.map(names).join('、')]:[]),
      ...(added.length?['- 改为写入：'+added.map(names).join('、')]:[]),
      '### 当前有效口径',
    ] : ['### 计算需求核对']),
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
    names(r.policy),
// end
    ...(r.hosts.length ? ['- 待生成脚本：'+r.hosts.map(h=>({period:'周期性脚本',request:'请求式脚本',system:'系统脚本',condition:'条件事件脚本',dataChange:'数据变化脚本',customFunction:'新自定义函数'})[h]??h).join('、')] : []),
// end
    ...[
      ["输入", r.inputs],
      ["输出", r.outputs],
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
      ["复用函数", r.functions],
      ["脚本调用的连接", r.connections ?? []],
// end
    ].flatMap(([k, v]) =>
      (v as string[]).length ? ["- " + k + "：" + labels(v as string[])] : [],
    ),
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
    names(r.missing) || "如上述口径准确，请回复“确认生成”；需要调整时直接说明。",
// end
  ].join("\n");
}
// end

// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
export function missingReviewRefs(drafts: any[], review: Review, strictWrites=false) {
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
  const found = new Set<string>(), written=new Set<string>(), called=new Set<string>();
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
  const usedConnections = new Set<string>(), readPoints = new Set<string>(), writtenPoints = new Set<string>();
// end
// end
  function inspectRoles(ast: any) {
    const parents=new WeakMap(), nodes:any[]=[];
    function walk(node:any, parent?:any) {
      if (!node || typeof node!=='object') return;
      if (Array.isArray(node)) { for(const child of node)walk(child,parent);return; }
      if (typeof node.type!=='string') return;
      if (parent) parents.set(node,parent);
      nodes.push(node);
      for (const child of Object.values(node)) walk(child,node);
    }
    walk(ast);
    const {resolve,declared}=scriptBindings(ast,parents);
    function globalRef(node:any) {
      if (node?.type!=='MemberExpression'||node.object?.name!=='global'||declared(node.object)||!node.computed) return;
      return resolve(node.property)?.value;
    }
    for (const node of nodes) {
      if (node.type==='Literal' && typeof node.value==='string') found.add(node.value);
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
      if(strictWrites && node.type==='Identifier' && ['global','globalThis'].includes(node.name) && !declared(node)){
        const parent=parents.get(node);
        if(parent?.type!=='MemberExpression' || parent.object!==node)written.add('@variable:unconfirmed');
      }
      const destination=node.type==='AssignmentExpression'?node.left:
        node.type==='UpdateExpression'||node.type==='UnaryExpression'&&node.operator==='delete'?node.argument:null;
      const target=globalRef(destination);
      if(strictWrites && destination?.type==='MemberExpression'){
        const object=resolve(destination.object)??destination.object;
        if(['global','globalThis'].includes(object.name) && !declared(object) && !review.outputs.includes(target)){
          written.add('@variable:unconfirmed');
        }
      }
// end
      if(typeof target==='string') written.add(target);
      if(node.type==='CallExpression'){
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
        const callee = node.callee;
        const name = callee.type === "Identifier" && !declared(callee) ? callee.name :
          callee.type === "MemberExpression" && !callee.computed && callee.object.name === "global" && !declared(callee.object) ? callee.property.name : undefined;
        if (name && usesConnection(name)) {
          const source = resolve(node.arguments[0])?.value;
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
          if (typeof source === "string") usedConnections.add(source);
          if (/^(?:Asyn)?KIO(?:Query|Update)Datas$/.test(name)) {
            const write = name.includes("Update");
            const list = resolve(node.arguments[1]);
            for (const element of list?.elements ?? []) {
              const item = resolve(element);
              const tag = write ? item?.properties?.find((p:any) => !p.computed && (p.key.name ?? p.key.value) === "N")?.value : item;
              const ref = resolve(tag)?.value;
              if (typeof ref === "string") (write ? writtenPoints : readPoints).add(ref);
            }
          }
// end
        }
        const ref=globalRef(resolve(node.callee));
// end
        if(typeof ref==='string')called.add(ref);
      }
    }
  }
// end
  for (const draft of drafts) {
    if (draft.triggerRef) found.add(draft.triggerRef);
    for (const body of [
      draft.code,
      draft.shutdown,
      draft.condition?.expression,
      draft.condition?.exist,
      draft.condition?.out,
    ]) {
      if (typeof body !== "string") continue;
      try {
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
        inspectRoles(
          parse(body, {
            ranges: true, locations: true,
// end
            ecmaVersion: "latest",
            allowAwaitOutsideFunction: true,
            allowReturnOutsideFunction: true,
          }),
        );
      } catch {
        /* host validator explains syntax errors */
      }
    }
  }
  return [
    ...new Set([...review.inputs, ...review.outputs, ...review.functions]),
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
  ].filter((ref) => !found.has(ref) || review.outputs.includes(ref) && ref.startsWith('@variable:') && !written.has(ref)
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
    || ref.startsWith('@point:') && (review.inputs.includes(ref) && !readPoints.has(ref) || review.outputs.includes(ref) && !writtenPoints.has(ref))
    || review.functions.includes(ref) && !called.has(ref))
// end
    .concat([...written].filter(ref=>ref.startsWith('@variable:') && !review.outputs.includes(ref)),
      (review.connections ?? []).filter(ref => !usedConnections.has(ref)));
// end
// end
}
// end
