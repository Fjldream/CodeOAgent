// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {describeBody,explainSelection} from '../src/selected-script.ts';
import {readContext} from '../src/shared.ts';
const example='const a=InParam.a; if(a > 0){ OutParam.b=Math.round(a*3); } else { throw Error("invalid"); } endResponse(RequestID);';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const request=readContext({kind:'request',projectId:'proj',object:'s1',editor:{session:'test',sequence:1,digest:sha(example)}});
const row={GUID:'s1',name:'Sample',functionName:'F',whetherenable:'是'};
const read=async(route:string)=>route.endsWith('scriptData')?{context:example}:[row];
test('请求宿主从选区唯一定位，区分分支、输入、计算、输出和结束响应，云端摘要不含正文',async()=>{
  const {answer,summary,evidence}=await explainSelection(request,read);
  for(const text of ['当前编辑器与已保存正文一致','调用方请求 F','请求输入 a','若','四舍五入','响应字段 b','否则','抛出','结束本次请求'])assert.ok(answer.includes(text),text);
  assert.deepEqual(Object.keys(summary).sort(),['host','localReference','status']);
  assert.equal(evidence.digest,sha(example));
  assert.doesNotMatch(JSON.stringify(summary),/Sample|InParam|OutParam/);
  await assert.rejects(explainSelection(request,async()=>[row,row]),/唯一/);
});
test('编辑稿按指纹核对；保存对象不会因草稿替换；不同子页取不同正文',async()=>{
  const draft='global["dest"] += 5;',saved='return 0;';
  const ctx=readContext({kind:'calculation',calcMenu:'calculate-conditionalevent-script',object:'s1',projectId:'proj',scriptPhase:'exist',dirty:true,editor:{session:'test',sequence:2,digest:sha(draft)}});
  const read=async(path:string)=>path.endsWith('scriptData')?{context:{in:'return 1;',exist:saved,out:'return 2;'}}:[{...row,expression:'X',interval:10,unit:'s'}];
  const current=await explainSelection(ctx,read,draft);
  assert.match(current.answer,/当前编辑稿/);assert.match(current.answer,/持续成立时按 10 s/);assert.match(current.answer,/写回 全局变量 dest/);
  assert.equal(current.evidence.digest,sha(saved));
  assert.match((await explainSelection(ctx,read)).answer,/已保存正文.*一致性未确认/s);
  await assert.rejects(explainSelection(ctx,read,'return 3;'),/指纹/);
  assert.throws(()=>readContext({...ctx,scriptPhase:'invalid'}),/子页/);
});
test('六类脚本的登记、周期和事件规则从当前工程读取，未知语法与动态目标如实呈现',async()=>{
  for(const [kind,calcMenu,pattern] of [
    ['period',undefined,/固定间隔 10 s/],['request',undefined,/调用方请求/],['calculation','calculate-system-scripts',/生命周期/],
    ['calculation','calculate-datachange-script',/变量 X/],['calculation','calculate-selfdefine-script',/调用方调用/],
    ['calculation','calculate-conditionalevent-script',/由真转假/],
  ] as const) {
    const ctx=readContext({kind,calcMenu,projectId:'proj',object:'s1',...(calcMenu==='calculate-conditionalevent-script'&&{scriptPhase:'out'})});
    const report=await explainSelection(ctx,async path=>path.endsWith('scriptData')?{context:ctx.scriptPhase?{out:'return;'}:'return;'}:[{...row,expression:'X',periodType:'interval',unit:'s',interval:10}]);
    assert.match(report.answer,pattern);
  }
  assert.equal(describeBody('if(').status,'unparsed');
  assert.equal(describeBody('  ').status,'empty');
  assert.match(describeBody('function f(global){global[key]++;}').lines.join(' '),/global\[key\] 加 1/);
  assert.match(describeBody('const rc=await KIOQueryDatas(src,tags,buffer);').lines.join(' '),/样本填入 buffer/);
});
// end
