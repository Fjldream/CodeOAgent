// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { Store } from '../src/store.ts';
import { ConnectionJournal, stamp, readsAlias } from '../src/connection-receipts.ts';
import type { Center } from '../src/center.ts';

const calc = { kind: 'calculation' as const, projectId: 'P', object: '', dirty: false };
const request = { ...calc, kind: 'request' as const, object: 'read' };
const app = { appId: 'app1', projectId: 'P', projectType: 0, appName: 'unit', port: 22300, canOperate: true };
function fixture() {
  const source = { guid: 'ds', name: 'source', type: 'T', config: { password: 'private', port: 42 } };
  const code = "const a='local'; await SQLQuery(a,'select 1',[],3000);";
  const center = {
    require: async () => {},
    evidence: async () => ({
      title: '请求式脚本 / Read',
      digest: createHash('sha256').update(code).digest('hex'),
    }),
    call: async (_token: string, path: string) => {
      if (path.includes('scriptData')) return { context: code };
      if (path.includes('projectJsonData'))
        return [{ id: 'alias', name: 'local', type: 'T', connectName: 'source' }];
      if (path.includes('getAllDataSource')) return [source];
      if (path.endsWith('opsResourceData'))
        return {
          appResource: [app],
          nodeResource: [{ nodeId: 'node', address: '127.0.0.1' }],
          nodeProApp: [{ nodeId: 'node', appPros: [app] }],
        };
      if (path.endsWith('displayAppListStatus'))
        return [{ appId: 'app1', nodeId: 'node', appDeployStatus: 1, appStatus: 'running' }];
      throw Error(path);
    },
  };
  const store = new Store(':memory:');
  const { chatId } = store.createPlan('one', 'session');
  const journal = new ConnectionJournal(store, center as unknown as Center);
  const start = () =>
    journal.begin('one', 'token', chatId, calc, {
      alias: 'local',
      mode: 'development',
      sourceId: 'ds',
      configStamp: stamp(source.config),
    });
  const finish = (ticket: string, raw: any) => journal.finish('one', 'token', chatId, ticket, raw);
  const report = () => journal.report('one', 'token', chatId, calc, 'local', async () => true);
  return { store, source, start, finish, report, journal, chatId };
}
test('同一别名成功、失败、并发变更、恢复原配置与撤权', async () => {
  const f = fixture(),
    first = await f.start();
  await assert.rejects(f.journal.finish('two', 'other', f.chatId, first.ticket, { errorCode: 0 }));
  await f.finish(first.ticket, { errorCode: 0 });
  const stale = await f.start();
  f.source.config.port++;
  await assert.rejects(f.finish(stale.ticket, { errorCode: 0 }), /变更/);
  assert.equal((await f.report()).summary.development.current, 0);
  await f.finish((await f.start()).ticket, { errorCode: 500 });
  f.source.config.port--;
  assert.equal((await f.report()).summary.development.current, 0);
  await f.finish((await f.start()).ticket, { errorCode: 0 });
  const r = await f.report();
  assert.equal(r.summary.development.current, 1);
  assert.equal(r.summary.development.historical, 2);
  const hidden = await f.journal.report('one', 'token', f.chatId, calc, 'local', async () => false);
  assert.equal(hidden.summary.development.current, 0);
  assert.doesNotMatch(
    JSON.stringify(f.store.db.prepare('select * from connection_receipts').all()),
    /private/,
  );
});
test('请求回包仅匹配目标窗口、账号、别名和可解释的结果；失败不会复用上次读数', async () => {
  const f = fixture();
  for (const [alias, code] of [
    ['other', 0],
    ['local', 0],
    ['local', -1],
  ] as const) {
    const cap = await f.journal.begin('one', 'token', f.chatId, request, {
      alias: 'local',
      mode: 'runtime',
      appId: 'app1',
    });
    const p = f.finish(cap.ticket, {
      url: cap.urls![0],
      type: 'normal',
      at: new Date(cap.start).toISOString(),
      status: 200,
      method: 'POST',
      output: { connectionRead: { alias, code, rows: [{ value: 12, password: 'private' }] } },
    });
    if (alias === 'other') await assert.rejects(p, /匹配/);
    else await p;
  }
  const r = await f.report();
  assert.deepEqual(r.summary.runtime, { current: 1, historical: 1 });
  assert.match(r.lines.join(' '), /历史回执.*实际返回行.*12/);
  assert.match(r.lines.join(' '), /当前保存配置最近一次.*没有已确认读数/);
  assert.doesNotMatch(r.lines.join(' '), /private/);
});
test('脚本必须确实引用选择的工程连接，排除注释、局部同名函数与动态别名', () => {
  assert.equal(readsAlias('/*SQLQuery("a")*/ OutParam.value=1;', 'a'), false);
  assert.equal(readsAlias('function SQLQuery(){} SQLQuery("a")', 'a'), false);
  assert.equal(readsAlias('const a=InParam.which; await SQLQuery(a,"select 1",[],3000)', 'a'), false);
  assert.equal(readsAlias('const a="a"; await KIOQueryDatas(a,["p"],[])', 'a'), true);
});
// end
