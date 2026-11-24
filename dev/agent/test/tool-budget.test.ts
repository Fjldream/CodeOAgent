// modified by jinlong.feng at 2026-11-23 KF计算工具计额与写入契约
import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeQueryTool, relay, type ModelRun } from '../src/opencode.ts';
import { runtimeReference } from '../src/calc-runtime.ts';

function init(): ModelRun {
  return { question: '测试', contextKind: 'period', history: [], knownSelection: false,
    observations: {inspect_script_environment: {}}, read: async () => null,
    inspect: async (_name, args) => args, tools: 3, requests: 0, signal: new AbortController().signal };
}

test('并发和额度耗尽后重查同一运行接口只计一次，新一轮独立计费', async () => {
  const run = init();
  const read = () => invokeQueryTool(run, 'lookup_calc_runtime', {family:'sql'});
  assert.deepEqual(await Promise.all([read(),read()]), [{family:'sql'},{family:'sql'}]);
  assert.equal(run.tools,4);
  await invokeQueryTool(run,'lookup_calc_runtime',{symbol:'SQLExecute'});
  await read();
  await assert.rejects(invokeQueryTool(run,'lookup_calc_runtime',{family:'kio'}));
  assert.equal(run.tools,5);
  const second = init();
  await invokeQueryTool(second,'lookup_calc_runtime',{family:'sql'});
  assert.equal(second.tools,4);
});
test('适配器源码的写返回值可以随函数族获取', () => {
  const sql = runtimeReference('period',{family:'sql'}).cards!;
  assert.match(sql.find(c=>c.symbol==='SQLExecute')!.usage, /-2/);
  assert.match(runtimeReference('period',{family:'kio'}).cards!.find(c=>c.symbol==='KIOUpdateDatas')!.usage,/不填逐点结果/);
});
test('关闭工具的分片调用在派发前拦下，允许一次纠正，重复违规终止且不再访问供应商', async t => {
  let rejectedRounds = 2;
  const mock = t.mock.method(globalThis,'fetch', async () => {
    const parts = rejectedRounds-- > 0 ? ['kf_lookup_', 'calc_runtime'] : ['kf_check_', 'script_drafts'];
    const chunks = parts.map(name=>'data: '+JSON.stringify({choices:[{index:0,delta:{tool_calls:[{index:0,function:{name}}]}}]})+'\n\n');
    return new Response(chunks.join('')+'data: [DONE]\n\n');
  });
  const req={tools:[{function:{name:'kf_check_script_drafts'}}]};
  const settings={url:'http://localhost/test',model:'test',key:''};
  const received:string[]=[];
  const res={writeHead(){},end(s:string){received.push(s);}};
  const run=init();
  await assert.rejects(relay(run,req,res,settings),/停止重复/);
  await assert.rejects(relay(run,req,res,settings),/已停止/);
  assert.equal(mock.mock.callCount(),2);
  assert.deepEqual(received,[]);
  rejectedRounds=1;
  await relay(init(),req,res,settings);
  assert.equal(received.length,1);
  assert.equal(mock.mock.callCount(),4);
  assert.doesNotMatch(received[0],/kf_lookup_/);
});
// end
