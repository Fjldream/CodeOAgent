// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDraft } from '../src/script-authoring.ts';
import { qualityProbe } from '../src/quality-probe.ts';

const source='@source:s', input='@point:a', output='@point:b';
const refs = new Map<string,any>([[source,{kind:'source',name:'S'}],
  [input,{kind:'point',name:'A',sourceRef:source,read:true}],
  [output,{kind:'point',name:'B',sourceRef:source,write:true}]]);
const read='await KIOQueryDatas(s,["@point:a"],[]);';
const errors=(code:string)=>checkDraft('period',code,refs).errors;
test('声明、单次独立赋值、别名链和局部遮蔽按引用位置解析',()=>{
  for(const kind of ['var','let','const']){
    assert.deepEqual(errors(kind+' a="@source:s"; '+kind+' s=a; '+read),[]);
    assert.deepEqual(errors('let s=0; { '+kind.replace('var','let')+' s="@source:s"; '+read+'}'),[]);
  }
  assert.deepEqual(errors('var s; s="@source:s"; '+read),[]);
  assert.deepEqual(errors('function a(){var s=0;} function b(){var s="@source:s";return KIOQueryDatas(s,["@point:a"],[]);}'),[]);
  assert.ok(errors('let s="@source:s"; {let s=3;'+read+'}').length);
});
test('赋值覆盖、条件初始化、嵌套更新、参数遮蔽、未初始化和循环写引用须修订',()=>{
  for (const code of [
    'var s="@source:s";s="bad";'+read,
    'let s="@source:s";function change(){s++;}'+read,
    'let s="@source:s"; ({s}={s:4});'+read,
    'if(Date.now()){var s="@source:s";}'+read,
    'let s="@source:s";for(s of []){}'+read,
    read+'var s="@source:s";',
    'let s="@source:s"; async function f(s){'+read+'}',
  ]) assert.match(errors(code).join(' '),/第1参.*@source:s/);
});
test('周期合成测试覆盖单点坏质量、恢复续写及错误分支的修订',async()=>{
  const rows='const rows=[];await KIOQueryDatas("@source:s",["@point:a"],rows);';
  const write='await KIOUpdateDatas("@source:s",[{N:"@point:b",V:rows[0].V}],[]);';
  const samples=[{ref:input,normal:18,recovered:26}];
  const original=rows+write;
  assert.match((await qualityProbe(original,samples,refs)).join(' '),/Q=0.*写接口/);
  const fixed=rows+'if(rows[0].Q===192){'+write+'}';
  assert.deepEqual(errors(fixed),[]);
  assert.deepEqual(await qualityProbe(fixed,samples,refs),[]);
  const stuck=rows+'if(rows[0].Q!==192)global.fault=true;if(!global.fault){'+write+'}';
  assert.match((await qualityProbe(stuck,samples,refs)).join(' '),/恢复.*未写入/);
});
// end
// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
test('测试样本误填显示名时反馈到具体字段，可与正文错误同轮修订',async()=>{
  const {draftQuery}=await import('../src/script-authoring.ts');
  const {qualityBindingErrors}=await import('../src/quality-probe.ts');
  const code='await KIOQueryDatas("DisplaySource",["DisplayPoint"],[]);';
  const parsed=draftQuery({drafts:[{host:'period',code,
    qualitySamples:[{ref:'DisplayPoint',normal:1,recovered:4}]}]}).drafts[0];
  assert.match(errors(code).join(' '),/第1参.*@source:s/);
  assert.match(qualityBindingErrors(parsed.qualitySamples,refs).join(' '),/qualitySamples\[0\].ref.*@point:a/);
  assert.deepEqual(qualityBindingErrors([{ref:'@point:a',normal:1,recovered:4}],refs),[]);
});
// end
