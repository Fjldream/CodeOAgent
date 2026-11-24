// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
import assert from 'node:assert/strict';
import test from 'node:test';
import { startSolution, solutionRoute, readStartQuery } from '../src/solution-start.ts';
import { HttpError, type Context } from '../src/shared.ts';

const general: Context = { kind: 'general', projectId: '', object: '', dirty: false };
const route = (input: string, goals: string[]) => solutionRoute(readStartQuery({ input, goals }));
test('交付目标与已有输入决定路线，新设备、已有源、静态、报表或仅展示已有报警分别处理', () => {
  assert.deepEqual(route('device', ['screen', 'alarmWindow', 'calculate']).route, [
    'acquire',
    'monitor',
    'realtime',
    'calculate',
    'alarm',
    'eventSource',
    'client',
    'mapping',
    'screen',
    'window',
    'release',
  ]);
  assert.deepEqual(route('realtime', ['screen']).route, [
    'reuseRealtime',
    'client',
    'mapping',
    'screen',
    'release',
  ]);
  assert.deepEqual(route('database', ['report']).route, ['database', 'client', 'report', 'release']);
  assert.deepEqual(route('history', ['report']).route, ['history', 'client', 'report', 'release']);
  assert.deepEqual(route('static', ['screen']).route, ['client', 'staticScreen', 'release']);
  assert.deepEqual(route('events', ['alarmWindow']).route, ['reuseEvents', 'client', 'window', 'release']);
  assert.deepEqual(route('events', ['screen', 'alarmWindow']).route, [
    'reuseEvents',
    'client',
    'window',
    'release',
  ]);
  assert.deepEqual(route('point', ['monitor']).route, ['point', 'monitor']);
  assert.deepEqual(route('realtime', ['alarm', 'screen']).route, [
    'reuseRealtime',
    'alarm',
    'client',
    'mapping',
    'screen',
    'release',
  ]);
  assert.deepEqual(route('static', ['report']).route, ['client', 'staticReport', 'release']);
  assert.deepEqual(route('point', ['scene']).route, [
    'point',
    'realtime',
    'client',
    'mapping',
    'scene',
    'release',
  ]);
});
test('缺项与互相冲突的条件返回澄清，严格限制公开工具参数', () => {
  assert.equal(route('unknown', []).missing.length, 2);
  assert.equal(route('unknown', ['screen']).missing.length, 1);
  assert.equal(route('static', ['calculate']).route.length, 0);
  for (const args of [
    { input: 'other' },
    { goals: ['screen', 'screen'] },
    { goals: 'calculate' },
    { directory: ['client'] },
    { token: 'secret' },
  ])
    assert.throws(() => readStartQuery(args));
});
test('只对显式要求的分类查目录，按普通账号过滤、同名保留标识、直接共享和空目录不产生不存在结论', async () => {
  const seen: string[] = [];
  const reader = {
    async call(_token: string, path: string) {
      seen.push(path);
      if (path === '/projectGroup') return [{ guid: 'group' }];
      assert.equal(path, '/client/projectList');
      return [
        { guid: 'hidden', name: '不可见名称' },
        { guid: 'a', name: '同名' },
        { guid: 'b', name: '同名' },
        { guid: 'a', name: '重复' },
      ];
    },
    async require() {},
    async allowed(_token: string, ctx: Context) {
      return ctx.projectId !== 'hidden';
    },
  };
  const q = readStartQuery({ input: 'static', goals: ['screen'] });
  await startSolution(reader, 'user', general, q);
  assert.deepEqual(seen, []);
  const deps: string[] = [];
  const r = await startSolution(reader, 'user', general, { ...q, directory: 'client' }, (c) =>
    deps.push(c.projectId),
  );
  assert.deepEqual(seen, ['/projectGroup', '/client/projectList']);
  assert.match(r.lines.join('\n'), /同名 · a/);
  assert.match(r.lines.join('\n'), /同名 · b/);
  assert.deepEqual(deps, ['a', 'b']);
  assert.doesNotMatch(JSON.stringify(r), /不可见名称|重复/);
  assert.doesNotMatch(JSON.stringify(r.projection), /同名|group/);
  const unavailable = await startSolution(
    {
      ...reader,
      call: async () => {
        throw new HttpError(502, '目录暂不可用');
      },
    },
    'user',
    general,
    { ...q, directory: 'client' },
  );
  assert.equal(unavailable.projection.directoryStatus, 'unverified');
  assert.equal(unavailable.projection.visibleCandidates, undefined);
  assert.match(unavailable.lines.join('\n'), /PC端首页/);
  const empty = await startSolution({ ...reader, allowed: async () => false }, 'user', general, {
    ...q,
    directory: 'client',
  });
  assert.match(empty.lines.join('\n'), /本次目录范围未检出/);
  await assert.rejects(
    startSolution(
      {
        ...reader,
        require: async (t, ctx) => {
          if (ctx.projectId === 'a') throw new HttpError(403, '权限变化');
        },
      },
      'user',
      general,
      { ...q, directory: 'client' },
    ),
    /权限变化/,
  );
});
test('大默认组不能耗尽后续有权分组的预算，列表标志须经本人权限复核', async () => {
  for (const hint of [false, undefined]) {
    const seen: string[] = [];
    const reader = {
      async require() {},
      async allowed(_token: string, c: Context) {
        seen.push(c.projectId);
        return c.projectId === 'visible';
      },
      async call(_token: string, path: string, args?: Record<string, string>) {
        if (path === '/projectGroup') return [{ guid: 'default' }, { guid: 'shared' }];
        if (args?.projectGroupId === 'default')
          return Array.from({ length: 56 }, (_, i) => ({
            guid: 'old' + i,
            name: '不可见',
            hasProjectPermission: hint,
          }));
        return [
          { guid: 'stale', name: '被撤回', hasProjectPermission: true },
          { guid: 'visible', name: '可复用' },
        ];
      },
    };
    const result = await startSolution(
      reader,
      'user',
      general,
      readStartQuery({ input: 'static', goals: ['screen'], directory: 'client' }),
    );
    assert.ok(seen.length <= 32);
    assert.equal(result.projection.visibleCandidates, 1);
    assert.match(result.lines.join('\n'), /可复用 · visible/);
    assert.doesNotMatch(result.lines.join('\n'), /被撤回|不可见/);
  }
});
// end
