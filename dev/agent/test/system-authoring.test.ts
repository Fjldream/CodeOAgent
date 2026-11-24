// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {checkSubmission, draftQuery} from '../src/script-authoring.ts';
import {splitAssistantAnswer} from '../../../devFront/src/assistant/assistant-answer.js';

test('系统事件分别绑定两段完整正文，诊断指明阶段', () => {
  const ref = '@variable:1122334455667788';
  const bindings = new Map([[ref, {kind:'variable' as const, name:'LocalState'}]]);
  const draft = {host:'system', code:'global["'+ref+'"] = 1;', shutdown:'global["'+ref+'"] = 2;'};
  const check = (input: typeof draft) => checkSubmission(draftQuery({drafts:[input]}).drafts[0], bindings);
  const result = check(draft);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(splitAssistantAnswer(result.eventAnswer!).filter(x=>x.code).map(x=>x.code),
    ['global["LocalState"] = 1;', 'global["LocalState"] = 2;']);
  assert.match(result.eventAnswer!, /Node 快照在启动时误调关闭正文/);
  assert.match(result.eventAnswer!, /工程模板保存关闭回调/);
  assert.match(check({...draft,shutdown:'OutParam.x = 0;'}).errors.join(), /应用程序关闭时 L1/);
  assert.match(check({...draft,code:'return InParam;'}).errors.join(), /应用程序启动时 L1/);
  assert.throws(()=>check({...draft,shutdown:''}));
  assert.throws(()=>check({...draft,host:'period'}));
  assert.deepEqual(check({...draft,code:'await WriteFile(2, "local-test", "started");',shutdown:'await ReadFile("local-test", {});'}).errors, []);
});

test('真实节点系统宿主先进入启动再进入关闭，不等待异步完成，exit 不重复触发', async () => {
  const root = new URL('../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/service/globalScriptMng/', import.meta.url);
  const load = (path:string, context={}) => {
    const mod = {exports:{} as any};
    vm.runInNewContext(readFileSync(new URL(path,root),'utf8'), {module:mod, __dir:'', ...context});
    return mod.exports;
  };
  const guard = load('scriptGuard.js');
  const manager = load('systemScript/systemScript.js', {require:()=>guard});
  const order:string[] = [];
  for (let boot=0; boot<2; boot++) {
    manager.init(async () => { order.push('start'); await Promise.resolve(); order.push('ready'); },
                 () => { order.push('close'); });
    assert.deepEqual(order.slice(-2), ['start','close']);
    await Promise.resolve();
    manager.vm_endSystemFunc();
  }
  assert.deepEqual(order, ['start','close','ready','start','close','ready']);
});

test('开发工程模板宿主将关闭回调留到退出钩子调用', () => {
  const path = new URL('../../../kf-reference/KingFusion3.6_Center/kingdevopscenter/kingcalculation/exe/solutions/project_demo/src/lib/service/globalScriptMng/systemScript/systemScript.js', import.meta.url);
  const mod = {exports:{} as any};
  vm.runInNewContext(readFileSync(path,'utf8'), {module:mod});
  const calls:string[] = [];
  mod.exports.init(() => calls.push('start'), () => calls.push('close'));
  assert.deepEqual(calls, ['start']);
  mod.exports.vm_endSystemFunc();
  assert.deepEqual(calls, ['start','close']);
});
// end
