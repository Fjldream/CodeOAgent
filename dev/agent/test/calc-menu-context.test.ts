// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
import assert from 'node:assert/strict';
import test from 'node:test';
import {calcConfig} from '../src/calc-config.ts';
import {resolveModelAnswer} from '../src/model-answer.ts';
import {readSkill} from '../src/skills.ts';
const ctx={kind:'calculation',projectId:'example',calcMenu:'calculate-period-script',group:'g'} as const;
test('普通提问只提供对象名时按当前工程分组精确定位，重名保留歧义',async()=>{
  const list=[{name:'Report Tick',GUID:'a'},{name:'Report',GUID:'b'}];
  const read=async (_path,params)=>{assert.equal(params.groupId,'g');assert.equal(params.type,'periods');return list;};
  const result=await calcConfig(read,ctx,{},'Report Tick');
  assert.equal(result.summary.exactNameMatches,1);assert.equal(result.facts.length,1);
  assert.match(result.facts[0].value,/Report Tick/);assert.equal(JSON.stringify(result.summary).includes('Report Tick'),false);
  const duplicates=await calcConfig(async()=>[...list,list[0]],ctx,{},'Report Tick');
  assert.equal(duplicates.summary.exactNameMatches,2);assert.match(duplicates.gaps.join(''),/同名/);
  assert.equal((await calcConfig(read,ctx,{},'怎样读返回值？')).summary.exactNameMatches,0);
  assert.equal(readSkill(ctx.kind,undefined,ctx.calcMenu).title,'周期性脚本');
});
test('复核员认可错误菜单或仅给通用步骤时精确命名问题仍保有证据，来源如实标注',async()=>{
  const facts={get_context:'当前菜单 · 周期性脚本\n已保存配置 · Report Tick'};
  const wrong='当前在数据词典，没有可核对的脚本。';
  const result=await resolveModelAnswer(wrong,facts,'fixture',['get_context'],true,
    async (_draft,_keys,repair)=>JSON.stringify(repair?{select:['step:script']}:{kind:'approve',basis:['step:script']}),'get_context');
  assert.equal(result.answer,facts.get_context);assert.equal(result.source.kind,'local');
  const grounded=await resolveModelAnswer('[[get_context]]',facts,'fixture',['get_context'],true,
    async()=>JSON.stringify({kind:'approve',basis:['get_context']}),'get_context');
  assert.equal(grounded.source.kind,'model-text');assert.match(grounded.answer,/Report Tick/);
});
// end
// modified by jinlong.feng at 2026-11-23 KF意图澄清与续问
test('澄清可为零次工程查询，保存原问以承接下轮，未经核验不能交付',async()=>{
  const question='你希望我核对执行时段，还是帮你调整这条规则？';
  const draft=JSON.stringify({kind:'clarify_goal',question});
  const received=await resolveModelAnswer(draft,{},'fixture',[],true,async()=>JSON.stringify({kind:'approve_clarification'}));
  assert.equal(received.source.continuity,question);
  assert.equal(received.answer,question);assert.deepEqual(received.source.tools,[]);
  await assert.rejects(resolveModelAnswer(draft,{},'fixture',[],false,async()=>JSON.stringify({kind:'unverified'})));
  await assert.rejects(resolveModelAnswer('脚本没有保存。',{},'fixture',[],false,async()=>JSON.stringify({kind:'approve_clarification'})));
});
// end
