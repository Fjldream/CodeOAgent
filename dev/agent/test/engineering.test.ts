// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { controlInputs } from '../src/page-trace.ts';
import { readContext, type Evidence } from '../src/shared.ts';
import { catalog, cellAddress } from '../src/catalog.ts';
import { appObservations } from '../src/runtime.ts';
import { validateScript } from '../src/candidate.ts';
import { scriptExample } from '../src/examples.ts';
import { Store } from '../src/store.ts';
import { supportedTool } from '../src/query-tools.ts';

test('控件脚本只选中该控件的依赖，保留动态缺项', () => {
  const code = 'const p=$System.P, avg=$System.A; PText.setText(p==null?"--":p); AText.setText(avg);';
  assert.deepEqual(controlInputs(code, 'PText'), { tags: ['P'], partial: false });
  assert.deepEqual(controlInputs(code, 'AText'), { tags: ['A'], partial: false });
  assert.deepEqual(controlInputs('PText.setText($System[key]);', 'PText'), { tags: [], partial: true });
  assert.deepEqual(controlInputs('const $System=other; PText.setText($System.P);', 'PText'), {
    tags: [],
    partial: true,
  });
});

test('单元格按工作表与坐标匹配，场景名必须唯一', async () => {
  const ctx = readContext({
    kind: 'report',
    projectId: 'pr',
    object: 'report1',
    cell: { sheet: 'sheet2', row: 3, column: 1 },
  });
  const read = async (path: string) =>
    path.endsWith('Manager')
      ? [{ id: 'report1', name: '月报' }]
      : JSON.stringify({
          workbookData: { sheets: { sheet1: { name: '一月' }, sheet2: { name: '二月' } } },
          dataSet: { sheet2: { 3: { 1: { name: '压力', tag: 'P' } } } },
        });
  const result = await catalog(ctx, read);
  assert.deepEqual(
    result.facts.map((f) => f.value),
    ['二月 / B4', '压力', 'P'],
  );
  assert.equal(cellAddress(0, 26), 'AA1');
  assert.throws(() => readContext({ ...ctx, cell: { ...ctx.cell, row: -1 } }));
  await assert.rejects(() =>
    catalog(readContext({ kind: 'scene', projectId: 'pr', object: 's.json' }), async () => [
      { filename: 's.json' },
      { filename: 's.json' },
    ]),
  );
});

test('节点和 App 分别取证，未知状态、有歧义的归属和无权实例不参与', () => {
  const context = readContext({ kind: 'calculation', projectId: 'p' });
  const nodes = ['a', 'b', 'c'].map((id, i) => ({ nodeId: 'n' + i, appPros: [{ appId: id }] }));
  const data = {
    nodeProApp: nodes,
    appResource: ['a', 'b', 'c'].map((id) => ({
      appId: id,
      projectId: 'p',
      projectType: 0,
      appName: '相同实例名',
      canOperate: id !== 'c',
    })),
  };
  const status = [
    { appId: 'a', appDeployStatus: 1, appStatus: 'running' },
    { appId: 'b', appDeployStatus: 0 },
    { appId: 'c', appStatus: 'running' },
  ];
  assert.deepEqual(
    appObservations(data, status, context, 0).map((a) => [a.nodeId, a.deployed, a.process]),
    [
      ['n0', '已部署', '运行中'],
      ['n1', '未部署', '未知'],
    ],
  );
  assert.equal(appObservations(data, [{ appId: 'a', appStatus: 0 }], context, 0)[0].process, '未运行');
  assert.equal(
    appObservations(
      { ...data, nodeProApp: [...nodes, { nodeId: 'ambiguous', appPros: [{ appId: 'a' }] }] },
      status,
      context,
      0,
    ).length,
    1,
  );
});

test('方案引用索引事务替换，两段对话共享，其他账号不可取', () => {
  const store = new Store(':memory:');
  try {
    const plan = store.createPlan('a', 'plan'),
      chat = store.createChat('a', plan.id, 'two');
    const context = readContext({ kind: 'page', projectId: 'p', object: 'page', control: 'ctl' });
    const evidence: Evidence = {
      id: randomUUID(),
      at: '2026-11-20T01:00:00Z',
      layer: 'saved',
      title: 'view',
      facts: [],
      gaps: [],
      references: [],
      bindings: [{ source: 'rt', alias: 'a', name: 'P', direction: 'read' }],
    };
    store.transaction(() => store.indexEvidence(plan.id, context, evidence));
    assert.equal(store.referenceScope('a', chat, evidence.bindings!)[0].control, 'ctl');
    assert.throws(() => store.referenceScope('b', chat, []));
    store.transaction(() =>
      store.indexEvidence(plan.id, context, { ...evidence, at: '2026-11-20T02:00:00Z', bindings: [] }),
    );
    store.transaction(() => store.indexEvidence(plan.id, context, evidence));
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM ref_edges').get()?.n, 0);
  } finally {
    store.db.close();
  }
});

test('候选只做静态检查，宿主、参数、别名与动态引用分别处理', () => {
  const period = readContext({ kind: 'period', projectId: 'p', object: 's' });
  const request = readContext({ ...period, kind: 'request' });
  assert.equal(supportedTool('validate_candidate', 'report'), false);
  assert.throws(() => validateScript({ ...period, kind: 'alarm' }, 'return;', []));
  assert.match(
    validateScript(period, 'KIOQueryDatas("missing",["T"]);', []).issues.join(' '),
    /别名.*三个参数/,
  );
  assert.match(validateScript(period, 'endResponse(RequestID);', []).issues.join(' '), /请求式/);
  assert.equal(validateScript(request, scriptExample('request').code, []).issues.length, 0);
  assert.equal(validateScript(period, scriptExample('period').code, ['Rt']).executed, false);
});

test('只在测试中复算随包固定样例，周期的时间与质量影响有效样本数', async () => {
  // Only repository-owned examples enter this test executor.
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const request = new AsyncFunction(
    'InParam',
    'OutParam',
    'RequestID',
    'endResponse',
    scriptExample('request').code,
  );
  const good = (v: number) => ({ V: v, Q: 192 });
  async function compute(samples: any[]) {
    const out: Record<string, unknown> = {};
    await request({ samples }, out, 1, (id: number) => assert.equal(id, 1));
    return out;
  }
  assert.deepEqual(await compute([480, 500, 520, 540, 560].map(good)), { status: 'ok', mean: 520 });
  assert.deepEqual(await compute([500, 520, 540, 560, 560].map(good)), { status: 'ok', mean: 536 });
  assert.deepEqual(await compute([]), { status: 'need_five_samples' });
  assert.deepEqual(await compute([...Array(4).fill(good(500)), { Q: 0, V: 500 }]), { status: 'bad_sample' });
  const period = new AsyncFunction(
    'global',
    'Date',
    'KIOQueryDatas',
    'KIOUpdateDatas',
    scriptExample('period').code,
  );
  const memory = {},
    writes: string[] = [];
  let now = Date.UTC(2026, 0, 1, 0, 0, 30);
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  async function sample(v: number, q: number, age: number) {
    await period(
      memory,
      Clock,
      async (_: string, _tags: string[], rows: any[]) => {
        rows.push({ N: 'P_OUT', V: v, Q: q, T: now - age });
        return 0;
      },
      async (_: string, points: any[]) => {
        writes.push(points[0].V);
        return 0;
      },
    );
    now += 60000;
  }
  for (const v of [480, 500, 520, 540, 560, 560]) await sample(v, 192, 1000);
  assert.match(writes[4], /AVG5=520.0/);
  assert.match(writes[5], /AVG5=536.0/);
  await sample(500, 0, 1000);
  assert.match(writes[6], /WAIT 4\/5/);
  await sample(500, 192, 60000);
  assert.match(writes[7], /WAIT 3\/5/);
});
// end
