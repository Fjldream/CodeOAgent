// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { globalFamilies, readRuntimeQuery, runtimeReference } from '../src/calc-runtime.ts';
import { entryTools, readQueryArguments } from '../src/query-tools.ts';
const runtime = new URL(
  '../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/',
  import.meta.url,
);
const file = (path: string) => readFileSync(new URL(path, runtime), 'utf8');
test('管理索引与 Node 初始化加载的全部全局函数模块、直接登记名及源码位置一致', () => {
  const init = file('init/globalFunc.js');
  const modules = [
    ...new Set(Array.from(init.matchAll(/\/globalFuncMng\/(\w+)_global_func\.js/g), (m) => m[1])),
  ].sort();
  assert.deepEqual(Object.keys(globalFamilies).sort(), modules);
  for (const [family, symbols] of Object.entries(globalFamilies)) {
    const code = file('service/globalFuncMng/' + family + '_global_func.js');
    assert.deepEqual(
      [...new Set(Array.from(code.matchAll(/\bglobal\.([\w$]+)\s*=(?!=)/g), (m) => m[1]))].sort(),
      [...symbols],
    );
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    const index = runtimeReference('calculation', { family });
    assert.deepEqual(index.registered, symbols);
    assert.deepEqual(index.cards?.map(card => card.symbol).sort(), [...symbols]);
    // end
  }
  for (const symbol of runtimeReference('calculation', {}).documented!) {
    const entry = runtimeReference('calculation', { symbol });
    assert.equal(entry.state, 'contract');
    assert.ok(file(entry.source!).length);
  }
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  const registrations = Object.values(globalFamilies).flat();
  const added = registrations.map(symbol => runtimeReference('calculation', { symbol }))
    .filter(card => card.verification?.status === 'source-only');
  assert.equal(registrations.length, 77);
  assert.equal(added.length, 62);
  assert.ok(added.every(card => card.signature && card.result && card.effect && card.verification?.check));
  // end
});
test('实际运行模块的均值、空样本、求和与请求宿主边界', () => {
  const scope = vm.createContext({ global: {}, require: () => ({}) });
  vm.runInContext(file('service/globalFuncMng/math_global_func.js'), scope);
  assert.equal(scope.global.Average([2, 4, 6]), 4);
  assert.ok(Number.isNaN(scope.global.Average([])));
  assert.equal(scope.global.Sum([]), 0);
  assert.equal(runtimeReference('period', { symbol: 'endResponse' }).state, 'differentHost');
  assert.equal(runtimeReference('request', { symbol: 'endResponse' }).state, 'contract');
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  const sql = runtimeReference('calculation', { symbol: 'AsynSQLQuery' });
  assert.equal(sql.verification?.status, 'source-only');
  assert.match(sql.result!, /callback\(code, rows\)/);
  assert.match(runtimeReference('calculation', { symbol: 'KHQuerySampleDatas2' }).lines.join('\n'), /七参.*不会触发/);
  // end
  assert.equal(runtimeReference('calculation', { symbol: 'KVQueryDatas' }).state, 'unknown');
  assert.deepEqual(readQueryArguments('lookup_calc_runtime', { symbol: 'global.Average' }), {
    symbol: 'Average',
  });
  assert.throws(() => readRuntimeQuery({ family: '__proto__' }));
  assert.throws(() => runtimeReference('client', {}));
});
test('从同方案各类型入口启动 MCP，公布和接受的工具与该工程能力表一致', () => {
  for (const kind of ['page', 'period', 'request', 'collection', 'alarm', 'datasource', 'general']) {
    const calls = [
      { id: 1, method: 'tools/list' },
      { id: 2, method: 'tools/call', params: { name: 'lookup_calc_runtime', arguments: { symbol: 'Sum' } } },
    ];
    const proc = spawnSync(process.execPath, [fileURLToPath(new URL('../src/mcp.ts', import.meta.url))], {
      env: { KF_ENTRY_KIND: kind },
      encoding: 'utf8',
      input: calls.map((x) => JSON.stringify(x)).join('\n') + '\n',
    });
    assert.equal(proc.status, 0);
    const [list, result] = proc.stdout
      .trim()
      .split('\n')
      .map((x) => JSON.parse(x));
    assert.deepEqual(
      list.result.tools.map((x) => x.name),
      entryTools(kind),
    );
    assert.equal(entryTools(kind).includes('lookup_calc_runtime'), kind === 'period' || kind === 'request');
    assert.ok(entryTools(kind).includes('inspect_calc_results'));
    if (kind !== 'period' && kind !== 'request') assert.equal(result.result.isError, true);
  }
});
// end
