// modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {bindCondition} from '../src/condition-authoring.ts';
import {draftQuery,checkSubmission} from '../src/script-authoring.ts';
import {splitAssistantAnswer} from '../../../devFront/src/assistant/assistant-answer.js';

const id='@variable:1122334455667788';
const bindings=new Map<string,any>([[id,{kind:'variable',name:'Reading',trigger:{mode:'memory'}}]]);
const v='global["'+id+'"]';
const draft={host:'condition',code:'return 1;',condition:{expression:v+' >= 4 && '+v+' < 9',interval:2,unit:'s',exist:'return 2;',out:'return 3;'}};
test('三段独立校验、各自绑定、按序交付，错误归属到具体阶段',()=>{
  const check=(d:any)=>checkSubmission(draftQuery({drafts:[d]}).drafts[0],bindings);
  const result=check(draft);
  assert.deepEqual(result.errors,[]);
  assert.match(result.expression!,/global\["Reading"\] >= 4/);
  assert.deepEqual(splitAssistantAnswer(result.conditionAnswer!).filter(x=>x.code).map(x=>x.code),[draft.code,draft.condition.exist,draft.condition.out]);
  assert.match(check({...draft,condition:{...draft.condition,out:'OutParam.result=1;'}}).errors.join(),/离开时 L1/);
  for(const props of [{unit:'ms'},{unit:'fortnight'},{interval:0},{interval:2**31},{exist:''},{out:undefined}])
    assert.throws(()=>check({...draft,condition:{...draft.condition,...props}}));
});
test('布尔结果、匿名引用、词典权限及无副作用表达式',()=>{
  for(const e of [v, v+' && 1', v+' = 1',v+'++','true','Boolean('+v+')','global["Reading"] > 0',v+' == "LIKE"'])
    assert.throws(()=>bindCondition(e,bindings));
  assert.throws(()=>bindCondition(v+' > 0',new Map()));
  assert.ok(bindCondition('!('+v+' === 0) || ('+v+' + 1 >= 9)',bindings));
});
test('节点调度源码按布尔边沿派发，无即时保持，离开取消定时器且支持再次进入',()=>{
  const src=new URL('../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/service/globalScriptMng/conditionEventScript/condition_script.js',import.meta.url);
  const timers=new Map<number,any>();let seq=0;
  const calls:string[]=[]; const cfg={name:'example',expression:'global["test"] > 0',interval:'2',unit:'s',in:'enter',exist:'hold',out:'leave'};
  const sandbox:any={__dir:'',module:{},execProjectPath:'fixture',conditionData:{conditions:[cfg]},global:{test:0},
    require:(path:string)=>path.includes('/core/utils')?{fileUtil:{syncReadFile:()=>''},util:{isNumber:(s:string)=>!isNaN(Number(s))}}:
      path.includes('scriptGuard')?{SCRIPT_TYPE:{},safeRunScript(_t:any,_n:any,fn:any){fn();},reportScriptLoadError(){assert.fail();}}:
      ()=>calls.push(path.split('/').pop()!),
    setInterval:(fn:any,delay:number,...args:any[])=>{timers.set(++seq,{run:()=>fn(...args),delay});return seq;},
    clearInterval:(n:number)=>timers.delete(n),logger:{log:()=>assert.fail()}};
  vm.runInNewContext(readFileSync(src,'utf8'),sandbox);
  sandbox.module.exports.init();const scan=timers.get(1);assert.equal(scan.delay,50); scan.run();
  sandbox.global.test=1;scan.run();assert.deepEqual(calls,['enter']);assert.equal(timers.size,1);
  scan.run();assert.equal(timers.get(2).delay,2000);timers.get(2).run();timers.get(2).run();
  scan.run();assert.equal(timers.size,2);
  sandbox.global.test=0;scan.run();scan.run();assert.equal(timers.size,1);
  sandbox.global.test=2;scan.run();assert.deepEqual(calls,['enter','hold','hold','leave','enter']);
});
// end
