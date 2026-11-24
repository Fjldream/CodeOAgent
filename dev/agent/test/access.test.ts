// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('同工程两账号隔离；撤权后隐藏历史、证据、流和提议', async (t) => {
  let revoked = false;
  let releaseRead: (() => void) | undefined;
  let waitForRead: Promise<void> | undefined;
  const center = createServer(async (req, res) => {
    const who = req.headers.authorization?.split(' ')[1];
    const route = new URL(req.url!, 'http://localhost').pathname;
    let data: unknown;
    switch (route) {
      case '/api/user/userInfo':
        data = { tenantId: 1, userId: who === 'A' ? 21 : 22 };
        break;
      case '/api/project/permissions':
        data = {
          items: [{ projectId: 'shared', projectType: 1, hasProjectPermission: who === 'B' || !revoked }],
        };
        break;
      case '/api/client/getPages':
        data = { message: { Pages: [{ name: 'Page' }] } };
        break;
      case '/api/client/batchGetPageFile':
        await waitForRead;
        data = { success: [{ linkMng: { linkList: [{ script: '$System.Input' }] } }] };
        break;
      case '/api/client/getVariableList':
        data = [
          { name: 'Input', projectDataSourceId: 's', dataSourceItem: { appName: 'source', tagName: 'T' } },
        ];
        break;
      case '/api/client/getDataSourceList':
        data = { message: [{ id: 's', name: 'Rt', appName: 'source' }] };
        break;
      default:
        res.writeHead(404).end();
        return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ errorCode: 0, data }));
  });
  center.listen(0, '127.0.0.1');
  await once(center, 'listening');
  const address = center.address();
  assert.ok(address && typeof address === 'object');
  const dir = mkdtempSync(join(tmpdir(), 'kf-access-'));
  const svc = spawn(process.execPath, [fileURLToPath(new URL('../src/server.ts', import.meta.url))], {
    env: {
      ...process.env,
      KF_CENTER_ORIGIN: 'http://127.0.0.1:' + address.port,
      KF_AGENT_PORT: '0',
      KF_AGENT_DATA_DIR: dir,
      KF_AGENT_ENABLE_MODEL: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    const stopped = once(svc, 'exit');
    svc.kill();
    await stopped;
    center.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const [line] = await once(svc.stdout, 'data');
  const base = String(line).match(/http:\/\/127\.0\.0\.1:\d+/)![0] + '/api/assistant/';
  const call = (who: string, path: string, data?: any) =>
    fetch(base + path, {
      method: data ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + who, 'Content-Type': 'application/json' },
      body: data && JSON.stringify(data),
    });
  const a = await (await call('A', 'plans', { title: 'A' })).json(),
    b = await (await call('B', 'plans', { title: 'B' })).json();
  const submit = async (who: string, chat: string) => {
    const run = randomUUID();
    const start = await call(who, 'chats/' + chat + '/turns', {
      requestId: run,
      context: { kind: 'page', projectId: 'shared', object: 'Page' },
      question: '核对配置',
      intent: 'propose',
    });
    assert.equal(start.status, 202);
    const stream = await call(who, 'runs/' + run + '/events');
    assert.match(await stream.text(), /"type":"end"/);
    return run;
  };
  const arun = await submit('A', a.chatId);
  await submit('B', b.chatId);
  assert.equal((await call('B', 'chats/' + a.chatId)).status, 404);
  // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
  for (const action of ['alarm-start', 'alarm-finish'])
    assert.equal((await call('B', 'chats/' + a.chatId + '/' + action, {})).status, 404);
  assert.equal((await call('A', 'chats/' + a.chatId + '/alarm-finish', {ticket:'expired'})).status, 404);
  // end
  assert.equal((await call('B', 'runs/' + arun + '/events')).status, 404);
  const before = await (await call('A', 'chats/' + a.chatId)).json();
  assert.equal(before.turns[0].evidence.layer, 'saved');
  const item = before.proposals[0].id;
  waitForRead = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const slow = randomUUID();
  await call('A', 'chats/' + a.chatId + '/turns', {
    requestId: slow,
    context: { kind: 'page', projectId: 'shared', object: 'Page' },
    question: '取消本轮',
    intent: 'lookup',
  });
  const stream = await call('A', 'runs/' + slow + '/events'),
    reader = stream.body!.getReader();
  const first = JSON.parse(new TextDecoder().decode((await reader.read()).value).trim());
  await reader.cancel();
  assert.equal((await call('A', 'runs/' + slow + '/cancel', {})).status, 200);
  releaseRead!();
  const resumed = await (await call('A', 'runs/' + slow + '/events?after=' + first.seq)).text();
  assert.match(resumed, /"status":"interrupted"/);
  assert.doesNotMatch(resumed, /"type":"status"/);
  revoked = true;
  const after = await (await call('A', 'chats/' + a.chatId)).json();
  assert.equal(after.turns[0].status, 'hidden');
  assert.equal(after.turns[0].evidence, undefined);
  assert.equal(after.turns[0].question, undefined);
  assert.equal(after.proposals[0].body, undefined);
  assert.equal((await call('A', 'proposals/' + item + '/decision', { decision: 'confirmed' })).status, 403);
  assert.equal((await call('A', 'runs/' + arun + '/events')).status, 403);
  assert.equal((await (await call('B', 'chats/' + b.chatId)).json()).turns[0].status, 'done');
});
// end
