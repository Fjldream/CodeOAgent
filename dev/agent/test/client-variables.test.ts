// modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Center } from '../src/center.ts';
import { Store } from '../src/store.ts';
import { clientVariableEvidence, variableInventoryAnswer } from '../src/client-variables.ts';
import { projection } from '../src/opencode.ts';
import type { Context } from '../src/shared.ts';

const page: Context = { kind: 'page', projectId: 'P1', object: 'Page', control: 'label', dirty: false };

test('按所有变量组统计，区分内置、已配置映射及映射未知，预览不截断总数', () => {
  const groups = [
    { sys: { Variables: [{ name: '$Time', isMap: false }] } },
    {
      measurements: {
        Variables: Array.from({ length: 15 }, (_, i) => ({
          name: 'localTag' + i,
          ...(i === 0 ? {} : { isMap: i === 1 }),
        })),
      },
    },
  ];
  const result = clientVariableEvidence({ message: groups });
  assert.deepEqual(result.variableInventory, { total: 16, builtIn: 1, mapped: 1, unknownMapping: 1 });
  assert.match(variableInventoryAnswer(result), /部分/);
  assert.match(variableInventoryAnswer(result), /映射状态待核实/);
  assert.doesNotMatch(JSON.stringify(projection(result)), /localTag|\$Time/);
  for (const malformed of [
    null,
    {},
    { message: null },
    { message: [{}] },
    { message: [{ group: {} }] },
    { message: [{ group: { Variables: [{}] } }] },
  ])
    assert.throws(() => clientVariableEvidence(malformed), /无法确认变量数量/);
  for (const empty of [{ message: [] }, { message: [{ group: { Variables: [] } }] }])
    assert.equal(clientVariableEvidence(empty).variableInventory?.total, 0);
});

test('工程变量只读当前有权客户端，撤权不返回变量，也不覆盖页面的引用索引', async () => {
  const center = new Center('http://127.0.0.1');
  let dataReads = 0,
    checks = 0;
  center.call = async (_token, path, query) => {
    if (path === '/project/permissions')
      return { items: [{ projectId: 'P1', projectType: 1, hasProjectPermission: ++checks === 1 }] };
    assert.equal(path, '/client/getVariableList');
    assert.deepEqual(query, { projectId: 'P1' });
    dataReads++;
    return { message: [] };
  };
  await assert.rejects(center.clientVariables('test', { ...page, kind: 'period' }), /目标客户端/);
  assert.equal(checks, 0);
  await assert.rejects(center.clientVariables('test', page), (e) => (e as { status: number }).status === 403);
  assert.equal(dataReads, 1);
  await assert.rejects(center.clientVariables('test', page), (e) => (e as { status: number }).status === 403);
  assert.equal(dataReads, 1);
  const store = new Store(':memory:');
  try {
    const { id } = store.createPlan('owner', 'test');
    const old = {
      ...clientVariableEvidence({ message: [] }),
      variableInventory: undefined,
      bindings: [{ source: 'rt', alias: 'source', name: 'T', direction: 'read' as const }],
    };
    store.indexEvidence(id, page, old);
    store.indexEvidence(id, page, clientVariableEvidence({ message: [] }));
    assert.equal(store.db.prepare('select count(*) as n from ref_edges').get()?.n, 1);
    assert.equal(store.db.prepare('select evidence from ref_objects').get()?.evidence, old.id);
  } finally {
    store.db.close();
  }
});
// end
