// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
import { getQuickJS } from 'quickjs-emscripten';
import { HttpError } from './shared.ts';

type Sample = {ref: string; normal: number; recovered: number};
type Binding = {kind: string; read?: boolean; write?: boolean; sourceRef?: string};
export const qualitySchema = {type: 'array', minItems: 1, maxItems: 8,
  description: '仅在周期实时点业务要求坏质量停写时提供全部必需输入，使用自选合成正常值及恢复值，两组均应触发正常写入。逐点模拟坏质量后检查停写和恢复。',
  items: {type:'object',additionalProperties:false,required:['ref','normal','recovered'],
    properties:{ref:{type:'string',description:'填 bindings 内 kind=point、read=true 的 ref 原串，例如 @point:abcdef。题面显示名仅用于定位。'},normal:{type:'number'},recovered:{type:'number'}}}};
export function qualityInputs(value: unknown, host: string): Sample[] {
  if (host !== 'period' || !Array.isArray(value) || !value.length || value.length > 8 ||
      value.some(s => !s || (typeof s.ref !== 'string' || !s.ref.length || s.ref.length > 160) || !Number.isFinite(s.normal) || !Number.isFinite(s.recovered)) ||
      new Set(value.map(s=>s.ref)).size !== value.length)
    throw new HttpError(400,'质量测试需要周期宿主和 1 至 8 个不同输入的匿名引用、正常值和恢复值');
  return value.map(({ref,normal,recovered})=>({ref,normal,recovered}));
}
export function qualityBindingErrors(samples: Sample[], bindings: Map<string,Binding>) {
  const available=[...bindings].filter(([,b])=>b.kind==='point' && b.read).map(([ref])=>ref);
  return samples.flatMap((s,i)=>available.includes(s.ref) ? [] : [
    'qualitySamples['+i+'].ref 未匹配到可读点。按工程取材给出的 offset 匹配问题中的输入，把 ref 字段换成对应匿名字符串。可读引用 '+available.slice(0,12).join('、')
  ]);
}
export async function qualityProbe(code: string, samples: Sample[], bindings: Map<string,Binding>) {
  const issues: string[] = [];
  const invalid = qualityBindingErrors(samples,bindings);
  if (invalid.length) return invalid;
  const engine = await getQuickJS();
  const vm = engine.newContext();
  const deadline = Date.now()+750;
  vm.runtime.setMemoryLimit(12*1024*1024);
  vm.runtime.setMaxStackSize(256*1024);
  vm.runtime.setInterruptHandler(()=>Date.now()>deadline);
  let bad = '', recovered = false, writes = 0;
  const read = new Set<string>();
  function install(name: string, fn: Parameters<typeof vm.newFunction>[1]) {
    const handle = vm.newFunction(name, fn);
    vm.setProp(vm.global,name,handle);
    handle.dispose();
  }
  function evaluate(source: string) {
    return vm.unwrapResult(vm.evalCode(source));
  }
  try {
    install('__read', (source,point) => {
      const ref = vm.getString(point);
      const sample = samples.find(s=>s.ref===ref);
      if (!sample || bindings.get(ref)?.sourceRef !== vm.getString(source)) throw Error('合成样本缺失或连接错配');
      read.add(ref);
      return vm.newString(JSON.stringify({N:ref,Q:ref===bad?0:192,V:recovered?sample.recovered:sample.normal,T:new Date().toISOString()}));
    });
    install('__write',(source,point)=>{
      const b=bindings.get(vm.getString(point));
      if (!b?.write || b.sourceRef !== vm.getString(source)) throw Error('模型尝试写未获授权的目标点');
      writes++;
      return vm.newNumber(0);
    });
    evaluate(`globalThis.global=globalThis;
      ((read,write)=>{
        globalThis.KIOQueryDatas=async (source,points,rows)=>{for(const p of points)rows.push(JSON.parse(read(source,p)));return 0};
        globalThis.KIOUpdateDatas=async (source,changes,codes)=>{codes.length=0;for(const p of changes)write(source,p.N);return 0};
        globalThis.Trace=()=>{};globalThis.console={log:Trace,error:Trace,warn:Trace};
      })(__read,__write);delete globalThis.__read;delete globalThis.__write;`).dispose();
    const cycle = evaluate('(async function(){\n'+code+'\n})');
    try {
      function runCycle(label: string) {
        writes=0;read.clear();
        const promise=vm.unwrapResult(vm.callFunction(cycle,vm.undefined));
        try {
          for(let n=0;vm.runtime.hasPendingJob();n++){
            if(n>=64 || Date.now()>deadline)throw Error('超出合成验证执行上限');
            vm.unwrapResult(vm.runtime.executePendingJobs(32));
          }
          vm.unwrapResult(vm.getPromiseState(promise)).dispose();
        } finally {promise.dispose();}
        if (bad && writes) issues.push(label+'：坏质量期间调用了写接口，请在所有写入前检查每个必需点的 Q。');
        if (!bad && !writes) issues.push(label+'：未写入。核对合成输入是否满足业务条件；恢复周期须重新取样。');
        if (!bad && samples.some(s=>!read.has(s.ref))) issues.push(label+'：仍有必需点未经本周期取样。');
      }
      runCycle('正常周期');
      for(const sample of samples) {
        bad=sample.ref;runCycle('输入 '+bad+' 的 Q=0');
        bad='';recovered=true;runCycle('恢复 Q=192');
      }
    } finally {cycle.dispose();}
  } catch (error) {
    issues.push('合成周期未完成。检查模拟输入及调用的宿主接口。'+String(error).slice(0,200));
  } finally {vm.dispose();}
  return [...new Set(issues)];
}
// end
