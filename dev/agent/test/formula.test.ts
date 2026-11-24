// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
import test from 'node:test';
import assert from 'node:assert/strict';
import { formulaInventory, formulaQuery, compileFormula, clarifyFormula } from '../src/formula.ts';
const ctx = { kind: 'calculation' as const, projectId: 'one', object: '', dirty: false };
function reader(options: { revoked?: boolean; duplicate?: boolean; rename?: boolean } = {}) {
  const defs = [
    ['TmpIn', 0],
    ['TmpOut', 2],
    ['Flag', 2],
    ['Unknown', 2],
  ].map(([tagName, accessType], i) => ({
    tagName,
    accessType,
    tagDataType: i === 3 ? 12 : 8,
    deviceName: 'Probe',
    description: '点' + i,
    regAddress: i,
  }));
  if (options.duplicate) defs.push({ ...defs[0] });
  return {
    require: async (_, c) => {
      if (options.revoked && c.kind === 'collection') throw Error('撤权');
    },
    allowed: async () => true,
    call: async (_, path, args) => {
      if (path === '/calculation/projectJsonData')
        return args.type === 'dataAccess'
          ? [{ name: options.rename ? 'Other' : 'Rt', connectName: 'Visible', type: 'IO' }]
          : [{ name: 'DictionaryInput', dataSourceName: 'Rt', TagName: 'TmpIn', dataSourceType: 'IO' }];
      if (path === '/collect/getVarsProperty')
        return {
          TagDataType: {
            editor: {
              options: {
                data: [
                  { id: 8, text: 'Ushort' },
                  { id: 12, text: 'String' },
                ],
              },
            },
          },
        };
      if (path === '/dataSource/getAllDataSource')
        return [
          {
            name: 'Visible',
            guid: 'ds',
            type: 'KingIOServerLinux',
            config: { engineeringId: 'io', dataType: ['1'] },
          },
        ];
      if (path === '/collect/variables') return defs;
      throw Error(path);
    },
  };
}
test('实名与词典映射留本地，按有权工程生成引用，后续只补业务口径', async () => {
  const inv = await formulaInventory(reader(), 't', ctx, '下一步', ['输入用 DictionaryInput，写入 TmpOut']);
  assert.equal(inv.summary.variableCount, 1);
  assert.equal(inv.summary.previousQuestionMatches[0].matches.length, 2);
  assert.doesNotMatch(JSON.stringify(inv.summary), /TmpIn|Rt|Probe|DictionaryInput/);
  assert.match(inv.lines.join(' '), /映射变量 DictionaryInput/);
  assert.deepEqual(clarifyFormula({ missing: ['reference'] }).lines, ['请确认这个比率的分母或比较基准。']);
  await assert.rejects(formulaInventory(reader({ revoked: true }), 't', ctx), /撤权/);
  const dup = await formulaInventory(reader({ duplicate: true }), 't', ctx);
  assert.ok(!dup.points.some((p) => p.name === 'TmpIn'));
  const [input, output] = inv.points;
  const spec = formulaQuery({ expression: input.ref, output: output.ref });
  for (const other of [
    await formulaInventory(reader(), 't', { ...ctx, projectId: 'two' }),
    await formulaInventory(reader({ rename: true }), 't', ctx),
  ])
    assert.throws(() => compileFormula(ctx, other, spec), /可写点/);
});
test('组合新公式、条件和数学函数；拒绝未知点、字符串、反馈、非法目标与任意代码', async () => {
  const inv = await formulaInventory(reader(), 't', ctx);
  const [i, o, f, s] = inv.points.map((p) => p.ref);
  const make = (expression, extra = {}) =>
    compileFormula(ctx, inv, formulaQuery({ expression, output: o, validity: f, ...extra }));
  for (const expr of ['global.x', 'process.exit()', 'x => x', s, o, 'max(2)', i + ';return 0'])
    assert.throws(() => make(expr));
  for (const out of [i, s, f]) assert.throws(() => make(i, { output: out }));
  assert.throws(() => make(i, { when: '5' }));
  const scripts = make('min(65535, round(sqrt(' + i + ') * 3))', { when: i + ' >= 0' }).scripts;
  const run = Object.getPrototypeOf(async function () {}).constructor;
  for (const [V, Q, T, want] of [
    [16, 192, Date.now(), 12],
    [0, 192, Date.now(), 0],
    ['', 192, Date.now(), null],
    [16, 0, Date.now(), null],
    [16, 192, Date.now() - 60000, null],
  ]) {
    const get = async (alias, tags, rows) => {
      assert.equal(alias, 'Rt');
      rows.push({ N: 'TmpIn', V, Q, T });
      return 0;
    };
    const reply: any = {};
    let ended = 0;
    await new run('KIOQueryDatas', 'OutParam', 'RequestID', 'endResponse', scripts.request)(
      get,
      reply,
      17,
      (id) => {
        assert.equal(id, 17);
        ended++;
      },
    );
    assert.equal(ended, 1);
    assert.equal(reply.value, want);
    let changes = [];
    await new run('KIOQueryDatas', 'KIOUpdateDatas', scripts.period)(get, async (_, items) => {
      changes = items;
      return 0;
    });
    assert.deepEqual(
      changes.map((x) => x.V),
      want === null ? [0] : [want, 1],
    );
  }
});
test('拒绝小数溢出和非有限中间值；失效时不写数值结果', async () => {
  const inv = await formulaInventory(reader(), 't', ctx);
  const [i, o] = inv.points.map((p) => p.ref);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const expr of [i + '/2', i + '*65536', 'min(0,' + i + '/0)']) {
    const scripts = compileFormula(ctx, inv, formulaQuery({ expression: expr, output: o })).scripts;
    const get = async (_, tags, rows) => {
      rows.push({ N: 'TmpIn', V: 3, Q: 192, T: Date.now() });
      return 0;
    };
    const out: any = {};
    await new AsyncFunction('KIOQueryDatas', 'OutParam', 'RequestID', 'endResponse', scripts.request)(
      get,
      out,
      1,
      () => {},
    );
    assert.equal(out.value, null);
    await new AsyncFunction('KIOQueryDatas', 'KIOUpdateDatas', scripts.period)(get, () =>
      assert.fail('不应写入结果'),
    );
  }
});
// end
