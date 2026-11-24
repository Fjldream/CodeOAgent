// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectClientPoints, pointProjection } from '../src/client-points.ts';
import { querySchema, readPointQuery } from '../src/query-tools.ts';
import { HttpError, type Context } from '../src/shared.ts';
import type { Center } from '../src/center.ts';

const entry: Context = { kind: 'page', projectId: 'client', object: 'Cooling', control: 'g1', dirty: false };
const query = { objectType: 'collectionPoint', tag: 'Feedback' } as const;
const typ = '工业数据源_网络模式';
function fixture() {
  const state = {
    allowed: new Set(['client', 'io1', 'io2', 'src']),
    alias: [] as any[],
    variables: [] as any[],
    points: {
      io1: [{ deviceName: 'FlowTransmitter', tagName: 'Feedback', regAddress: '31' }],
      io2: [],
    } as Record<string, any[]>,
    links: [] as any[],
    requireDenied: '',
    reads: [] as string[],
  };
  const reader: Pick<Center, 'call' | 'allowed' | 'require'> = {
    async call(_token, path, params = {}) {
      state.reads.push(path + ':' + (params.projectId ?? ''));
      switch (path) {
        case '/projectGroup':
          return [{ guid: 'group' }];
        case '/collect/project':
          return [
            { guid: 'io1', name: 'North' },
            { guid: 'io2', name: 'South' },
          ];
        case '/dataSource/project':
          return [
            {
              guid: 'src',
              name: 'FlowSource',
              projectData: {
                type: typ,
                config: { dataType: ['1'], newWorkDateType: 'KingIOServerLinux', engineeringId: 'io1' },
              },
            },
          ];
        case '/dataSource/getAllDataSource':
          return [];
        case '/collect/variables':
          return state.points[params.projectId];
        case '/client/getDataSourceList':
          return { message: state.alias };
        case '/client/getVariableList':
          return { message: [{ root: { Variables: state.variables } }] };
        case '/client/getPages':
          return { message: { Pages: [{ name: 'Cooling' }] } };
        case '/client/batchGetPageFile':
          return {
            success: [{ objects: [{ guid: 'g1', name: 'FlowLabel' }], linkMng: { linkList: state.links } }],
          };
        default:
          throw Error('unexpected read ' + path);
      }
    },
    async allowed(_token, ctx) {
      return state.allowed.has(ctx.projectId);
    },
    async require(_token, ctx) {
      if (ctx.projectId === state.requireDenied || !state.allowed.has(ctx.projectId))
        throw new HttpError(403, '没有工程读取权限');
    },
  };
  return {
    state,
    run: (extra = {}) => inspectClientPoints(reader, 'ordinary', entry, { ...query, ...extra }),
  };
}
const alias = {
  name: 'Readings',
  id: 'conn',
  appName: 'FlowSource',
  dataSourceName: 'FlowSource',
  type: typ,
};
const variable = {
  name: 'DisplayFlow',
  isMap: true,
  isSub: false,
  projectDataSourceId: 'conn',
  dataSourceItem: { appName: 'FlowSource', tagName: 'Feedback' },
};

test('从未绑定的流量控件依次区分连接、单条映射、显式读取与运行观察', async () => {
  const { state, run } = fixture();
  assert.equal((await run()).paths[0].state, 'needsConnection');
  state.alias.push(alias);
  assert.equal((await run()).paths[0].state, 'needsMapping');
  state.variables.push(variable);
  const saved = await run();
  assert.equal(saved.paths[0].state, 'mapped');
  assert.equal(saved.paths[0].subscription, false);
  assert.equal(saved.paths[0].explicitControlRead, false);
  state.links.push({ script: 'FlowLabel.setText($System.DisplayFlow)' });
  const bound = await run();
  assert.equal(bound.paths[0].explicitControlRead, true);
  assert.equal(bound.runtimeVerified, false);
  for (const value of ['North', 'FlowTransmitter', 'FlowSource', 'Readings', 'DisplayFlow'])
    assert.ok(!JSON.stringify(pointProjection(bound)).includes(value));
});
test('两个工程同名点保留两个候选，按设备或工程筛选，仅展示有权对象', async () => {
  const { state, run } = fixture();
  state.points.io2.push({ tagName: 'Feedback', deviceName: 'Pump', regAddress: '31' });
  assert.equal((await run()).status, 'ambiguous');
  assert.deepEqual(
    (await run({ device: 'Pump' })).points.map((p) => p.project),
    ['South'],
  );
  assert.deepEqual(
    (await run({ project: 'North' })).points.map((p) => p.device),
    ['FlowTransmitter'],
  );
  state.allowed.delete('io2');
  state.reads = [];
  assert.equal((await run()).status, 'unique');
  assert.ok(!state.reads.includes('/collect/variables:io2'));
  const unavailable = await run({ device: 'Pump' });
  assert.deepEqual(unavailable.points, []);
  assert.ok(!JSON.stringify(unavailable).includes('South'));
  state.requireDenied = 'io1';
  await assert.rejects(run(), { status: 403 });
});
test('旧的连接标识、禁用映射和重复连接不算已核实映射', async () => {
  const { state, run } = fixture();
  state.alias.push(alias);
  state.variables.push({ ...variable, projectDataSourceId: 'old' });
  assert.equal((await run()).paths[0].state, 'uncertain');
  state.variables[0] = { ...variable, isMap: false };
  assert.equal((await run()).paths[0].state, 'disabled');
  state.alias.push({ ...alias, name: 'other' });
  assert.ok((await run()).paths.every((p) => p.state === 'uncertain'));
});
test('浏览不超过 12 条且截断后不选定唯一对象，格式异常保持未知', async () => {
  const { state, run } = fixture();
  state.points.io1 = Array.from({ length: 16 }, (_, i) => ({ deviceName: 'F' + i, tagName: 'Feedback' }));
  const result = await run();
  assert.equal(result.status, 'limited');
  assert.equal(result.points.length, 12);
  assert.deepEqual(result.paths, []);
  state.variables.push({});
  await assert.rejects(run(), { status: 502 });
});
test('常规对象查询保持无参数，采集点查询仅允许声明的筛选字段', () => {
  assert.equal(readPointQuery('find_objects', {}), undefined);
  assert.deepEqual(readPointQuery('trace_refs', { ...query, device: ' FlowTransmitter ' }), {
    ...query,
    device: 'FlowTransmitter',
  });
  for (const args of [{ tag: 'x' }, { ...query, url: 'not allowed' }, { ...query, tag: [] }])
    assert.throws(() => readPointQuery('find_objects', args));
  assert.throws(() => readPointQuery('read_runtime', query));
  assert.deepEqual(querySchema('find_objects', 'alarm').properties, {});
});
// end
