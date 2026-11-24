// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import assert from 'node:assert/strict';
import test from 'node:test';
import { Center } from '../src/center.ts';
import { calcConfig, readCalcQuery } from '../src/calc-config.ts';
import { readContext } from '../src/shared.ts';
import { projection } from '../src/opencode.ts';
import { querySchema, readQueryArguments, supportedTool } from '../src/query-tools.ts';

const context = readContext({
  kind: 'calculation',
  projectId: 'calc',
  calcMenu: 'calculate-global-variable',
  group: 'area1',
});
const vars = [
  {
    name: 'Power',
    type: 'IO_Number',
    value: 0,
    TagName: 'meter.A',
    dataSourceName: 'Meter',
    dataSourceType: 'KIO',
  },
  { name: 'Latch', type: 'Boolean', value: false },
  { name: 'Memo', type: 'String', value: '' },
];
const aliases = [
  { name: 'Meter', connectName: 'Plant', type: 'KIO', password: 'OMIT', config: { host: 'OMIT' } },
];
test('词典按本组读、跨组查连接；清楚展示初值和映射，模型与页面仅取得各自所需的字段', async () => {
  const paths = [];
  const read = async (path, params) => {
    paths.push([path, params]);
    return params.type === 'dataAccess' ? aliases : vars;
  };
  const result = await calcConfig(read, context, {});
  assert.deepEqual(
    paths.map((p) => p[1]),
    [
      { type: 'globalVars', groupId: 'area1' },
      { type: 'dataAccess', groupId: '-1' },
    ],
  );
  assert.equal(result.summary.resolved, 1);
  assert.match(result.facts[0].value, /初始值 0.*Meter.*meter.A.*Plant/);
  assert.match(result.facts[1].value, /初始值 false/);
  assert.match(result.facts[2].value, /初始值 （空）/);
  const summary = JSON.stringify(
    projection({ calcConfig: result.summary, references: [], facts: result.facts, layer: 'saved' } as any),
  );
  assert.doesNotMatch(summary, /Meter|meter\.A|Plant|OMIT|Latch/);
  assert.doesNotMatch(JSON.stringify(await calcConfig(read, context, { section: 'dataAccess' })), /OMIT/);
});
test('精确查询覆盖截断范围；同名、缺少连接和不一致的类型保留歧义，空结果无需查询连接', async () => {
  for (const sources of [[], [...aliases, ...aliases], [{ ...aliases[0], type: 'SQL' }]]) {
    const r = await calcConfig(async (_, p) => (p.type === 'dataAccess' ? sources : vars), context, {
      exactName: 'Power',
    });
    assert.equal(r.summary.unresolved, 1);
    assert.equal(r.summary.resolved, 0);
  }
  const many = Array.from({ length: 28 }, (_, i) => ({ name: 'v' + i, type: 'Number', value: i }));
  assert.equal((await calcConfig(async () => many, context, {})).summary.shown, 24);
  const duplicate = await calcConfig(async () => [...many, many[27]], context, { exactName: 'v27' });
  assert.equal(duplicate.summary.total, 2);
  assert.match(duplicate.gaps.join(' '), /多个同名/);
  assert.equal(
    (
      await calcConfig(
        async (_, p) => {
          assert.equal(p.type, 'globalVars');
          return many;
        },
        context,
        { exactName: '不存在' },
      )
    ).summary.total,
    0,
  );
});
test('按脚本和依赖菜单选择正确的只读接口，非法类别不能改变工程或读取路径', async () => {
  for (const [suffix, section] of Object.entries({
    'period-script': 'periods',
    'datachange-script': 'dataChanges',
    'system-scripts': 'systemScripts',
    'conditionalevent-script': 'conditions',
    'askcalculate-script': 'APIs',
    'selfdefine-script': 'functions',
    'npm-dependencies': 'npm',
    'normal-dependencies': 'normal',
    'py-dependencies': 'python',
    'data-source-management': 'dataAccess',
  })) {
    const ctx = readContext({ ...context, calcMenu: 'calculate-' + suffix, group: '-1' });
    const result = await calcConfig(
      async (path, p) => {
        assert.equal(p.type, section);
        assert.equal(
          path,
          suffix.endsWith('dependencies')
            ? '/calculation/getDependenceslist'
            : '/calculation/projectJsonData',
        );
        return [];
      },
      ctx,
      {},
    );
    assert.equal(result.summary.section, section);
    assert.equal(result.summary.runtimeVerified, false);
  }
  assert.throws(() => readContext({ ...context, calcMenu: 'constructor' }));
  assert.throws(() => readCalcQuery({ section: '../dataAccess' }));
  assert.throws(() => readCalcQuery({ projectId: 'unrelated' }));
  assert.equal(supportedTool('inspect_calc_config', 'page'), false);
  assert.deepEqual(readQueryArguments('inspect_calc_config', { section: 'periods' }), { section: 'periods' });
  assert.ok(querySchema('inspect_calc_config').properties.section.enum.includes('periods'));
  await assert.rejects(
    calcConfig(async () => ({}), context, {}),
    /格式/,
  );
});
test('菜单取证及对象查询在读完后重新核对权限；历史没有菜单时兼容原周期清单', async () => {
  const center = Object.create(Center.prototype) as Center;
  let allow = true,
    calls = 0;
  center.require = async () => {
    if (!allow) throw Error('撤权');
  };
  center.call = async (_, path, params) => {
    calls++;
    allow = false;
    return [{ name: 'sample', GUID: 'a' }];
  };
  await assert.rejects(center.evidence('ordinary', context), /撤权/);
  assert.equal(calls, 1);
  allow = true;
  await assert.rejects(center.findObjects('ordinary', context), /撤权/);
  assert.equal(calls, 2);
  await assert.rejects(center.calcConfiguration('ordinary', context, {}), /撤权/);
  assert.equal(calls, 2);
  allow = true;
  center.call = async (_, path, params) => {
    assert.equal(params.type, 'periods');
    return [{ name: 'sample', GUID: 'a' }];
  };
  const legacy = readContext({ kind: 'calculation', projectId: 'calc' });
  assert.match((await center.evidence('ordinary', legacy)).title, /周期/);
});
// end
