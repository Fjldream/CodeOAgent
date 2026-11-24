// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { getQuickJS } from 'quickjs-emscripten';
import { HttpError } from './shared.ts';

type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
type Host = 'request' | 'period';
type Write = { ref: string; value: Json };
type Sample = {
  kind: 'normal' | 'boundary' | 'invalid'; covers: string[];
  fault?: { operation: 'variableWriteThrows'; ref: string };
  input: Json; initial: Record<string, Json>; response: Json; writes: Write[];
};
type Role = { ref: string; kind: string; read?: boolean; write?: boolean; sourceRef?: string };
type Material = {bindings: Role[]; previousReview: {policy: string; retained?: string}};
export type BusinessPlan = {host: Host; samples: Sample[]; clauses: Record<string,string>; digest: string};
const object = (v: unknown): v is Record<string,any> => v !== null && typeof v === 'object' && !Array.isArray(v);
const invalid = (s: string) => new HttpError(422, '业务测试样本无效。'+s);

function clausesFor(material: Material) {
  const clauses: Record<string,string> = {};
  for (const name of ['policy','retained'] as const) {
    const parts = material.previousReview[name]?.split(/[。；\n]+/u).map(s=>s.trim()).filter(Boolean) ?? [];
    parts.forEach((s,i)=>{clauses[name+(i+1)] = s;});
  }
  return clauses;
}

// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
// A business fixture contains the values bound to the host arguments, never a transport request.
function requestFields(clauses: Record<string,string>, argument: string) {
  const fields=new Set<string>();
  const matcher=new RegExp('\\b'+argument+'(?:\\.([A-Za-z_$][\\w$]*)|\\[["\']([^"\']+)["\']\\])','g');
  for (const text of Object.values(clauses)) for (const m of text.matchAll(matcher)) fields.add(m[1]??m[2]);
  return fields;
}
function checkEnvelope(value: unknown, allowed: Set<string>, field: string, index: number) {
  if (!object(value)) return;
  for (const key of Object.keys(value)) {
    if (/^(inparam|outparam|requestid|requesttype|token)$/i.test(key) && !allowed.has(key))
      throw invalid('样本 '+index+' 的 '+field+' 多装了一层宿主字段 '+key+'。input 直接放 InParam 内的业务字段，response 直接放 OutParam 内的业务字段。四个宿主参数由执行器提供。');
  }
}
// end
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
type Condition=Omit<Sample,'response'|'writes'>;
function readConditions(material:Material,host:Host,value:unknown):Condition[] {
  const clauses=clausesFor(material),roles=new Map(material.bindings.map(b=>[b.ref,b]));
  if(!object(value)||!Array.isArray(value.samples)||value.samples.length<3||value.samples.length>24||
     JSON.stringify(value).length>48000)throw invalid('提交 3 至 24 组有限的合成条件。');
  const conditions:Condition[]=[],covered=new Set<string>(),kinds=new Set<string>();
  for(const row of value.samples){
    if(!object(row)||!['normal','boundary','invalid'].includes(row.kind)||!Array.isArray(row.covers)||
       !row.covers.length||row.covers.some(k=>typeof k!=='string'||!Object.hasOwn(clauses,k))||
       !Object.hasOwn(row,'input')||!object(row.initial))throw invalid('条件必须含 kind、covers、input、initial。');
    if(host==='request')checkEnvelope(row.input,requestFields(clauses,'InParam'),'input',conditions.length+1);
    if(Object.keys(row.initial).some(ref=>!['variable','point'].includes(roles.get(ref)?.kind??'')))
      throw invalid('初值只能使用已确认的变量和点引用。');
    if(row.fault!==undefined&&(!object(row.fault)||row.fault.operation!=='variableWriteThrows'||
       roles.get(row.fault.ref)?.kind!=='variable'||!roles.get(row.fault.ref)?.write))throw invalid('写异常需要已确认的可写内存变量。');
    if(conditions.some(c=>isDeepStrictEqual([c.fault,c.input,c.initial],[row.fault,row.input,row.initial])))
      throw invalid('相同输入、初值和故障条件重复。');
    const {kind,covers,input,initial,fault}=row;
    conditions.push({kind,covers,input,initial,...fault&&{fault}});
    kinds.add(kind);covers.forEach(k=>covered.add(k));
  }
  const missing=Object.keys(clauses).filter(k=>!covered.has(k));
  if(missing.length||kinds.size!==3)throw invalid('需要覆盖正常、边界、异常三类及全部条款。未覆盖：'+missing.join('、'));
  return conditions;
}

export function readBusinessPlan(host: Host, material: Material, value: unknown): BusinessPlan {
  const conditions=readConditions(material,host,value);
  const clauses=clausesFor(material),outputs=requestFields(clauses,'OutParam');
  const allowed=new Set(material.bindings.filter(r=>r.write).map(r=>r.ref));
  const samples=conditions.map((condition,i)=>{
    const {response,writes}=(value as {samples:Sample[]}).samples[i];
    if((host==='request'?!object(response):response!==null)||!Array.isArray(writes)||writes.length>64||
       writes.some(w=>!object(w)||!allowed.has(w.ref)||!Object.hasOwn(w,'value')))
      throw invalid('公式结果需要完整回包及按序记录的已授权写入。');
    // modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
    if(condition.fault && writes.some(w=>w.ref===condition.fault!.ref))
      throw invalid('样本 '+(i+1)+'，已注入 '+JSON.stringify(condition.fault)+'，该引用的预期成功写入次数为 0，公式实际给出 '+JSON.stringify(writes)+'。按该故障条件执行已确认的异常分支。');
    // end
    if(host==='request'){
      checkEnvelope(response,outputs,'response',i+1);
      if(condition.kind==='normal'&&outputs.size&&![...outputs].some(k=>Object.hasOwn(response as object,k)))
        throw invalid('正常样本的 response 缺少已确认回包字段：'+[...outputs].join('、'));
    }
    return {...condition,response,writes};
  });
  if(allowed.size&&!samples.some(row=>row.writes.length)){
    const index=samples.findIndex(row=>row.kind==='normal');
    throw invalid('整套条件没有覆盖一次成功写入。正常样本 '+(index+1)+'，输入 '+JSON.stringify(samples[index].input)+
      '，实际回包 '+JSON.stringify(samples[index].response)+'，实际写入 []。请核对目标是否为可写绑定，使用对应绑定的 write(value)；bindings 数组本身只读。');
  }
  const digest=createHash('sha256').update(JSON.stringify([host,clauses,material.bindings,samples])).digest('hex');
  return {host,clauses,samples,digest};
}
// end

// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
type Settings = {url:string; model:string; key:string};
async function askForJson(settings: Settings, signal: AbortSignal, system: string, data: unknown) {
  const response=await fetch(settings.url,{
    method:'POST', signal, redirect:'error',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+settings.key},
    body:JSON.stringify({model:settings.model,temperature:0,stream:false,response_format:{type:'json_object'},
      messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(data)}]})
  });
  if (!response.ok) throw new HttpError(502,'未能取得业务测试样本或复核结果。');
  const result=await response.json();
  try { return JSON.parse(result.choices?.[0]?.message?.content); }
  catch {
    throw invalid('样本和预期必须能经标准 JSON 传输。禁止裸 NaN、Infinity、undefined、注释和尾逗号。用可发送的错误类型、缺失属性或超出业务边界的有限数值构造异常；重新提交完整 JSON 对象。');
  }
}

// modified by jinlong.feng at 2026-11-24 KF业务预期逐项复核
type Difference = {field:'response'|'writes'|'result'; kind:'format'|'value'; reason:string};
export function businessExpectationRows(plan:BusinessPlan,prediction:unknown) {
  const results=object(prediction) && Array.isArray(prediction.results) ? prediction.results : [];
  return plan.samples.map((sample,index)=>{
    const answer=results[index];
    const issues: Difference[]=[];
    if (!object(answer) || results.length!==plan.samples.length) {
      issues.push({field:'result',kind:'format',reason:'需要与输入一一对应的 results 数组及对象'});
    } else {
      const expected={response:sample.response,writes:sample.writes};
      for (const field of ['response','writes'] as const) {
        const value=answer[field];
        if (!Object.hasOwn(answer,field)) {
          issues.push({field,kind:'format',reason:'缺少 '+field+' 字段'});
        } else if (!isDeepStrictEqual(value,expected[field])) {
          if(field==='writes') {
            const shaped=Array.isArray(value) && value.every(w=>object(w) &&
              typeof w.ref==='string' && Object.hasOwn(w,'value') && Object.keys(w).length===2);
            issues.push(shaped ? {field,kind:'value',reason:'写入次数、目标、顺序或值不一致'} :
              {field,kind:'format',reason:'writes 必须是有序数组，每项只含 ref 与 value，停写填空数组'});
          } else {
            const wrongShape=plan.host==='request' ? !object(value) ||
              (object(expected.response) && Object.hasOwn(value,'OutParam') && !Object.hasOwn(expected.response,'OutParam'))
              : value!==null;
            issues.push(wrongShape ? {field,kind:'format',reason:'请求直接返回业务对象，周期填写 null'} :
              {field,kind:'value',reason:'回包字段、类型或值不一致'});
          }
        }
      }
    }
    return {sample:index+1,expected:{response:sample.response,writes:sample.writes},actual:answer??null,issues};
  });
}

export function compareBusinessExpectations(plan: BusinessPlan, prediction: unknown) {
  const failures=businessExpectationRows(plan,prediction).filter(r=>r.issues.length);
  if (failures.length) throw invalid('独立预期不一致。'+failures.map(row=>
    '样本 '+row.sample+' '+row.issues.map(issue=>issue.field+' '+issue.reason).join('、')).join('；'));
}
// end
// end
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
// The reference program receives only the synthetic input, initial state, fault and binding roles.
async function executeFormula(body:string,condition:Condition,roles:Role[],inputFields:string[]) {
  const vm=(await getQuickJS()).newContext();
  const deadline=Date.now()+300;
  vm.runtime.setMemoryLimit(8*1024*1024);
  vm.runtime.setMaxStackSize(256*1024);
  vm.runtime.setInterruptHandler(()=>Date.now()>deadline);
  const args=[condition.input,condition.initial,condition.fault??null,roles];
  try {
    const program=`(()=>{
      const stringify=JSON.stringify.bind(JSON),finite=Number.isFinite;
      Math.random=undefined;globalThis.Date=undefined;
      function readonly(o){if(o && typeof o==='object'){Object.values(o).forEach(readonly);Object.freeze(o)}return o}
      const [payload,initial,fault,roles]=readonly(JSON.parse(${JSON.stringify(JSON.stringify(args))}));
      let contractIssue='';
      const input=payload && typeof payload==='object' && !Array.isArray(payload) ? new Proxy(payload,{
        get(target,key){
          if(key==='InParam'&&!Object.hasOwn(target,key)&&!${JSON.stringify(inputFields)}.includes(key)){
            contractIssue='input 已经是 InParam 本身，多读了一层 input.InParam。直接从 InParam 或 input 读取业务字段。';
          }
          return Reflect.get(target,key);
        }
      }):payload;
      const InParam=input;
      const observed=[];
      let attempted=false;
      const bindings=roles.map(role=>{
        const write=role.write?(value)=>{
          attempted=true;
          if(fault?.operation==='variableWriteThrows' && fault.ref===role.ref)throw Error('simulated write exception');
          if(observed.length>=64)throw Error('write limit');
          observed.push({ref:role.ref,value:JSON.parse(stringify(value,(k,v)=>{
            if(v===undefined||typeof v==='function'||typeof v==='number'&&!finite(v))throw Error('non-JSON write');return v;
          }))});
        }:undefined;
        return Object.freeze({...role,canWrite:!!role.write,write});
      });
      const result=(function(input,initial,fault,bindings){"use strict";\n${body}\n})(input,initial,fault,Object.freeze(bindings));
      if(contractIssue)return stringify({contractIssue});
      if(!result || typeof result!=='object' || !Object.hasOwn(result,'response'))throw Error('missing response');
      // The outer interpreter compares any declared writes with the observed JSON values.

      const output={response:result.response,writes:attempted?observed:(result.writes??[]),
        ...(attempted && Object.hasOwn(result,'writes') && {declared:result.writes})};
      return stringify(output,(key,value)=>{
        if(value===undefined||typeof value==='function'||typeof value==='number'&&!finite(value))throw Error('non-JSON');
        return value;
      });
    })()`;
    const handle=vm.unwrapResult(vm.evalCode(program));
    try {
      const serialized=vm.getString(handle);
      if(serialized.length>12000)throw invalid('参考公式单条输出超出范围。');
      const result=JSON.parse(serialized);
      if(object(result)&&typeof result.contractIssue==='string')throw invalid(result.contractIssue);
      if(!object(result)||!Object.hasOwn(result,'response')||!Array.isArray(result.writes))
        throw invalid('参考公式必须返回 {response,writes}。');
      if(Object.hasOwn(result,'declared')&&!isDeepStrictEqual(result.declared,result.writes))
        throw invalid('参考公式声明的写入 '+JSON.stringify(result.declared)+' 与实际模拟写入 '+JSON.stringify(result.writes)+' 不一致。直接返回 response，由宿主记录赋值。');
      return {response:result.response,writes:result.writes};
    } finally {handle.dispose();}
  } catch(error) {
    if(error instanceof HttpError)throw error;
    throw invalid('参考公式执行失败。直接写函数体，不加 function 外壳。input、initial、fault、bindings 均为只读；请创建新的 response 对象。通过可写绑定的 write(value) 记录模拟写入，不得修改形参。');
  } finally {vm.dispose();}
}

const formulaContract='只用已确认的 clauses 与 bindings 推导确定性 JS 参考公式，输出标准 JSON {"body":"函数体"}。形参 input 与只读别名 InParam 是同一份直接业务入参，字段访问与已确认条款中的 InParam 完全相同，initial 是匿名引用对应初值，fault 是故障条件，bindings 是只读数组。直接提交函数体。对已确认的成功写入路径，找到对应角色（例如 bindings.find(b=>b.canWrite)；多目标按匿名 ref 区分），调用该角色的 write(value)。这是隔离解释器内的模拟函数，宿主记录目标、值、顺序和重复次数；遇到指定赋值故障时会抛出异常，按已确认的失败条款捕获并回包。返回 {response:业务对象}，周期返回 {response:null}。response 使用新对象，不复制输入。不需要自行填写 writes。不要对 bindings 或其属性赋值。没有网络、KC、现场状态或候选 JS。对任意输入按公式计算。';

export async function planBusinessProbe(host: Host, material: Material,
    settings: Settings, signal: AbortSignal, record?: (digest:string,report:unknown)=>void) {
  const spec={host,clauses:clausesFor(material),bindings:material.bindings.map(({ref,kind,read,write,sourceRef})=>({ref,kind,read,write,sourceRef}))};
  let conditions:Condition[]|undefined,reason='';
  for(let i=0;i<3&&!conditions;i++){
    try {
      const value=await askForJson(settings,signal,'你是 KF 业务口径测试设计器。仅设计测试条件。标准 JSON {"samples":[...]}，每项含 kind(normal/boundary/invalid)、covers(条款编号数组)、input（业务 InParam 本身）、initial（匿名引用到初值，点为 {V,Q,T}）。涉及内存写异常时增设 fault:{operation:"variableWriteThrows",ref:"对应引用"}。必须覆盖所有条款，包含空集合、缺参及适用边界和异常；3 至 24 个互异条件。只使用能经 JSON 传输的输入，禁止裸 NaN、Infinity 和 undefined。不要填写预期回包或写入。'+reason,spec);
      conditions=readConditions(material,host,value);
    }catch(e){if(!(e instanceof HttpError)||e.status!==422)throw e;reason=e.message;}
  }
  if(!conditions)throw invalid(reason);
  const fixedConditions=conditions;
  const inputFields=[...requestFields(spec.clauses,'InParam')];
  const accessPaths=inputFields.map(key=>'InParam['+JSON.stringify(key)+']').join('、');
  const formulaSpec={...spec,bindings:spec.bindings.map(({read,write,...role})=>({...role,canRead:!!read,canWrite:!!write}))};
  async function buildReference(role:string,previousBody='',diagnostic=''){
    let body=previousBody,feedback=diagnostic;
    for(let attempt=0;attempt<3;attempt++){
      try {
        const data=feedback ? {...formulaSpec,repair:{previousBody:body,diagnostic:feedback}} : formulaSpec;
        const raw=await askForJson(settings,signal,'你是 KF 业务公式'+role+'。'+formulaContract+(accessPaths?' 本次从这些直接路径取值：'+accessPaths+'。':''),data);
        if(typeof raw?.body!=='string'||!raw.body.trim()||raw.body.length>16000)throw invalid('请提交有限长度的完整纯函数体。');
        body=raw.body;
        const samples=[];
        for(const [index,condition] of fixedConditions.entries()){
          try {samples.push({...condition,...await executeFormula(body,condition,spec.bindings,inputFields)});}
          catch(e){throw invalid('样本 '+(index+1)+'，输入 '+JSON.stringify(condition.input)+'。'+(e instanceof Error?e.message:''));}
        }
        return {body,plan:readBusinessPlan(host,material,{samples})};
      } catch(e){if(!(e instanceof HttpError)||e.status!==422)throw e;feedback=e.message;}
    }
    throw invalid(feedback);
  }
  const roles=['公式编制员','独立复核员'];
  let references=[await buildReference(roles[0]),await buildReference(roles[1])];
  for(let round=0;;round++){
    const [reference,crosscheck]=references.map(r=>r.plan);
    const formulae=references.map(r=>r.body);
    const rows=businessExpectationRows(reference,{results:crosscheck.samples.map(({response,writes})=>({response,writes}))});
    const digest=createHash('sha256').update(JSON.stringify([reference.digest,formulae])).digest('hex');
    record?.(digest,{conditions,formulae,rows});
    const mismatch=rows.find(row=>row.issues.length);
    if(!mismatch)return {...reference,digest};
    const condition=conditions[mismatch.sample-1];
    const details='样本 '+mismatch.sample+'，输入 '+JSON.stringify(condition.input)+'，初值 '+JSON.stringify(condition.initial)+
      (condition.fault?'，故障 '+JSON.stringify(condition.fault):'');
    if(round===1)throw invalid('两份独立参考公式尚未一致。'+details+'，公式一 '+JSON.stringify(mismatch.expected)+'，公式二 '+JSON.stringify(mismatch.actual)+'。');
    // Each translator sees only its own earlier program and its own computed result.
    const updated=[];
    for(const [i,reference] of references.entries()){
      const own=i===0?mismatch.expected:mismatch.actual;
      updated.push(await buildReference(roles[i],reference.body,details+'。你的公式实际得到 '+JSON.stringify(own)+
        '。两份独立执行结果分歧，请按已确认条款核对边界和回包字段，重交完整纯函数体。'));
    }
    references=updated;
  }
}
// end

// Each case gets a fresh interpreter. Only synthetic state and the candidate cross the boundary.
// Keep observations in the host and compare with the previously sealed oracle outside the interpreter.
export async function runBusinessProbe(plan: BusinessPlan, code: string, roles: Role[], names: Map<string,{name:string}>) {
  const engine=await getQuickJS();
  const failures:string[]=[];
  for (const [index,s] of plan.samples.entries()) {
    const vm=engine.newContext();
    const deadline=Date.now()+350;
    vm.runtime.setMemoryLimit(12*1024*1024); vm.runtime.setMaxStackSize(256*1024);
    vm.runtime.setInterruptHandler(()=>Date.now()>deadline);
    const writes: Write[]=[], replies: Json[]=[];
    let fault='', injected=false;
    const install=(name:string,fn:Parameters<typeof vm.newFunction>[1])=>{
      const h=vm.newFunction(name,fn); vm.setProp(vm.global,name,h); h.dispose();
    };
    try {
      const entries=roles.map(r=>({...r,name:names.get(r.ref)?.name,source:names.get(r.sourceRef??'')?.name}));
      install('__observe',(event,key,data)=>{
        if(writes.length+replies.length>128)throw Error('观察超限');
        const kind=vm.getString(event), ref=vm.getString(key);
        if(kind==='injected'){injected=true;return;}
        if(kind==='fault'){fault='访问了缺少模拟契约的对象或使用错误的请求标识';return;}
        const value=JSON.parse(vm.getString(data));
        if(kind==='reply') replies.push(value);
        else writes.push({ref,value});
      });
      const setup=`((notify,roles,initial,input,scenario)=>{
        const state=Object.assign(Object.create(null),initial), out={}, id=1739;
        const json=JSON.stringify.bind(JSON);
        const fault=()=>{notify('fault','','');throw Error('unsupported host operation')};
        function variable(key){return roles.find(r=>r.kind==='variable' && r.name===key)||fault()}
        function write(r,v){if(!r.write)fault();
          if(scenario?.operation==='variableWriteThrows' && scenario.ref===r.ref){
            notify('injected',r.ref,'');throw Error('simulated variable write failure')
          }
          const data=json(v,(k,x)=>{if(x===undefined||typeof x==='number'&&!Number.isFinite(x))fault();return x});notify('write',r.ref,data);state[r.ref]=v}
        const g=new Proxy(Object.create(null),{get:(o,k)=>{const r=variable(k);if(!(r.ref in state))fault();return state[r.ref]},
          set:(o,k,v)=>{write(variable(k),v);return true},defineProperty:fault,deleteProperty:fault});
        const point=(src,key)=>roles.find(r=>r.kind==='point'&&r.source===src&&r.name===key)||fault();
        const read=async(src,keys,rows)=>{for(const k of keys){const r=point(src,k);if(!r.read||!(r.ref in state))fault();rows.push({...state[r.ref],N:k})}return 0};
        const update=async(src,items,errors)=>{errors.length=0;for(const i of items){const r=point(src,i.N);const old=state[r.ref];write(r,i.V);state[r.ref]={...old,V:i.V}}return 0};
        const end=req=>{if(req!==id)fault();notify('reply','',json(out))};
        return run=>run.call(g,g,g,input,out,id,'',end,read,update,()=>{});
      })(__observe,${JSON.stringify(entries)},JSON.parse(${JSON.stringify(JSON.stringify(s.initial))}),JSON.parse(${JSON.stringify(JSON.stringify(s.input))}),${JSON.stringify(s.fault??null)})`;
      const host=vm.unwrapResult(vm.evalCode(setup));
      try {
        vm.unwrapResult(vm.evalCode('delete globalThis.__observe')).dispose();
        const fn=vm.unwrapResult(vm.evalCode('(async function(global,globalThis,InParam,OutParam,RequestID,Token,endResponse,KIOQueryDatas,KIOUpdateDatas,Trace){\n'+code+'\n})'));
        try {
          const promise=vm.unwrapResult(vm.callFunction(host,vm.undefined,fn));
          try {
            for(let n=0;vm.runtime.hasPendingJob();n++){
              if(n>64||Date.now()>deadline)throw Error('超时');
              vm.unwrapResult(vm.runtime.executePendingJobs(32));
            }
            const state=vm.getPromiseState(promise);
            if(state.type!=='fulfilled'){if(state.type==='rejected')state.error.dispose();throw Error('未正常完成');}
            state.value.dispose();
          } finally {promise.dispose();}
        } finally {fn.dispose();}
      } finally {host.dispose();}
    } catch {fault ||= '脚本执行异常、宿主调用未覆盖或超出执行上限';}
    finally {vm.dispose();}
    if(s.fault && !injected) fault ||= '脚本没有执行样本指定的写入故障分支';
    const expected=plan.host==='request'?[s.response]:[];
    if(fault || !isDeepStrictEqual(expected,replies) || !isDeepStrictEqual(s.writes,writes)){
      // modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
      const excerpt=(v:unknown,limit:number)=>{
        const text=JSON.stringify(v);
        return text.length>limit?text.slice(0,limit)+'…':text;
      };
      failures.push('样本 '+(index+1)+'（'+s.kind+'），输入 '+excerpt(s.input,220)+
        '，初值 '+excerpt(s.initial,160)+(s.fault?'，故障 '+excerpt(s.fault,120):'')+
        '。预期回包 '+excerpt(expected,240)+'，实际回包 '+excerpt(replies,240)+
        '；预期写入 '+excerpt(s.writes,260)+'，实际写入 '+excerpt(writes,260)+(fault?'。'+fault:''));
      // end
    }
  }
  return failures;
}
// end
