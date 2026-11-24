// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.ts';
import { CalcJournal } from '../src/calc-journal.ts';
import { captureResult, type CaptureRoute } from '../src/calc-result.ts';
import { requestObservation } from '../../../devFront/src/assistant/calc-har.js';
import { scriptReferences, type Center } from '../src/center.ts';
const request = { kind: 'request', projectId: 'testProject', object: 'script', dirty: false } as const;
const general = { kind: 'general', projectId: '', object: '', dirty: false } as const;
const url = 'http://127.0.0.1:20100/Compute';
function source() {
  let digest = 'a'.repeat(64),
    collision = false;
  const app = {
    projectType: 0,
    projectId: request.projectId,
    appId: 'app',
    appName: 'QA',
    port: 20100,
    canOperate: true,
  };
  return {
    edit() {
      digest = 'b'.repeat(64);
    },
    collide() {
      collision = true;
    },
    center: {
      require: async () => {},
      evidence: async () => ({ digest, title: '请求式脚本 / Compute', facts: [], gaps: [] }),
      call: async (_: string, path: string) =>
        path.endsWith('opsResourceData')
          ? {
              appResource: collision ? [app, { ...app, appId: 'other' }] : [app],
              nodeResource: [{ nodeId: 'node', address: '127.0.0.1' }],
              nodeProApp: [{ nodeId: 'node', appPros: [{ appId: 'app' }, { appId: 'other' }] }],
            }
          : [{ appId: 'app', nodeId: 'node', appDeployStatus: 1, appStatus: 'running' }],
    } as unknown as Center,
  };
}
function record(start: number) {
  const entry = {
    startedDateTime: new Date(start).toISOString(),
    request: {
      url,
      method: 'POST',
      headers: [{ name: 'Authorization', value: 'private' }],
      postData: {
        text: JSON.stringify({
          RequestType: 'normal',
          token: 'private',
          InParam: { value: 0, password: 'private' },
        }),
      },
    },
    response: {
      status: 200,
      content: {
        text: JSON.stringify({ result: 0, enabled: false, data: [null, { access_token: 'private' }] }),
      },
    },
  };
  const parse = (entries: unknown[]) => requestObservation({ log: { entries } }, { urls: [url], start });
  const sample = parse([entry]);
  assert.doesNotMatch(JSON.stringify(sample), /private/);
  assert.throws(() => parse([entry, entry]));
  assert.throws(() => parse([{ ...entry, startedDateTime: new Date(start - 1).toISOString() }]));
  assert.throws(() => parse([{ ...entry, request: { ...entry.request, url: url + 'Other' } }]));
  return sample;
}
test('真实业务零值、空值和布尔值，按账号、对话、实例和脚本版本回读；一次性取证及地址消歧', async () => {
  const s = new Store(':memory:');
  const { chatId } = s.createPlan('A', '测试');
  const other = s.createPlan('B', '测试').chatId;
  const fake = source(),
    j = new CalcJournal(s, fake.center);
  try {
    const a = await j.begin('A', 'token', chatId, request);
    await assert.rejects(j.finish('B', 'b', other, a.ticket, record(a.start)));
    const first = await j.finish('A', 'a', chatId, a.ticket, record(a.start));
    assert.match(first.lines.join(' '), /"result":0/);
    await assert.rejects(j.finish('A', 'a', chatId, a.ticket, record(a.start)));
    assert.equal((await j.report('B', 'b', other, general, async () => true)).projection.requests, 0);
    assert.equal((await j.report('A', 'a', chatId, general, async () => false)).projection.requests, 0);
    const before = await j.begin('A', 'a', chatId, request);
    fake.edit();
    await assert.rejects(j.finish('A', 'a', chatId, before.ticket, record(before.start)), /发生变化/);
    const seen = await j.report('A', 'a', chatId, general, async () => true);
    assert.equal(seen.projection.prior, 1);
    assert.match(seen.lines.join(' '), /历史回执/);
    assert.equal(
      (await j.report('A', 'a', chatId, { ...request, object: 'other' }, async () => true)).projection
        .requests,
      0,
    );
    fake.collide();
    await assert.rejects(j.begin('A', 'a', chatId, request, 'app'), /共用/);
  } finally {
    s.db.close();
  }
});
test('点监视按实际实例、读写方向、质量、源时间归属，缺点、旧采样和平台错误不能冒充有效结果', () => {
  const route = {
    entry: { ...request, kind: 'period' },
    monitors: [{ direction: 'write', source: 'DS', point: { tag: 'sameName', appId: 'io' } }],
  } as CaptureRoute;
  const start = Date.now(),
    at = new Date(start).toISOString();
  const row = {
    value: 0,
    time: new Date(start - 80000).toISOString(),
    quality: 192,
    at,
    source: 'DS',
    direction: 'write',
    tag: 'sameName',
    appId: 'io',
  };
  assert.equal(captureResult(route, [row], start, start, '+08:00').qualified, false);
  assert.equal(
    captureResult(route, [{ ...row, time: at, quality: 0 }], start, start, '+08:00').qualified,
    false,
  );
  assert.equal(captureResult(route, [{ ...row, time: at }], start, start, '+08:00').qualified, true);
  for (const change of [{ appId: 'other' }, { direction: 'read' }, { at: new Date(start - 1).toISOString() }])
    assert.throws(() => captureResult(route, [{ ...row, ...change }], start, start, '+08:00'));
  assert.throws(() => captureResult(route, [], start, start, ''));
  const data = record(start);
  const noInput = captureResult(
    { ...route, entry: request, urls: [url] },
    { ...data, input: undefined, output: { errorCode: -1, description: 'domain result' } },
    start,
    start,
    '',
  );
  assert.match(noInput.lines.join(' '), /未提供 InParam/);
  assert.match(noInput.lines.join(' '), /domain result/);
  assert.throws(() =>
    captureResult(
      { ...route, entry: request, urls: [url] },
      { ...data, output: { code: 20000, msg: 'token缺失' } },
      start,
      start,
      '',
    ),
  );
});
test('异步宿主函数沿用同步函数的读写方向、常量解析和遮蔽保护', () => {
  const refs = scriptReferences(
    'AsynKIOQueryDatas("A",["in"], rows); AsynKIOUpdateDatas("A",[{N:"out",V:0}], errors);',
  );
  assert.deepEqual(refs.edges.map((e) => [e.tag, e.direction]).sort(), [
    ['in', '读取点'],
    ['out', '写回点'],
  ]);
  assert.equal(
    scriptReferences('function AsynKIOUpdateDatas(){} AsynKIOUpdateDatas("A",[{N:"out"}],[]);').edges.length,
    0,
  );
});
// end
