// modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCalculation, meterRoles, generationQuery, buildDayScripts } from '../src/calc-generation.ts';
import { validateScript } from '../src/candidate.ts';
import { supportedTool } from '../src/query-tools.ts';
const ctx = { kind: 'calculation' as const, projectId: 'p', object: '', dirty: false };
const names = Object.fromEntries(Object.keys(meterRoles).map((k, i) => [k, 'X_' + i])) as Record<
  keyof typeof meterRoles,
  string
>;
function fixture(duplicate = false, revoked = false) {
  const points = Object.entries(meterRoles).map(([role, label]) => ({
    tagName: names[role],
    description: label,
    deviceName: 'A',
    accessType: ['result', 'status'].includes(role) ? 2 : 0,
  }));
  return {
    require: async (_t, c) => {
      if (revoked && c.kind === 'collection') throw Error('撤权');
    },
    allowed: async () => true,
    call: async (_t, path, args) => {
      if (path === '/calculation/projectJsonData')
        return args.type === 'dataAccess' ? [{ name: 'Alias', connectName: 'Source' }] : [];
      if (path === '/dataSource/getAllDataSource')
        return [
          {
            name: 'Source',
            guid: 's',
            type: 'KingIOServerLinux',
            config: { engineeringId: 'io', dataType: ['1'] },
          },
        ];
      if (path === '/collect/variables') return duplicate ? [...points, points[0]] : points;
      throw Error(path);
    },
  };
}
test('生成前检查权限、点名唯一性、口径及数据源，实名正文保留在本地', async () => {
  const inv = await prepareCalculation(fixture(), 't', ctx, 'inventory');
  assert.ok(inv.summary.ready);
  assert.ok(!inv.scripts);
  const good = await prepareCalculation(fixture(), 't', ctx, 'beijing_day_difference');
  assert.deepEqual(good.scripts, buildDayScripts('Alias', names));
  assert.ok(!JSON.stringify(good.summary).includes('Alias'));
  const bad = await prepareCalculation(fixture(true), 't', ctx, 'beijing_day_difference');
  assert.ok(!bad.scripts);
  await assert.rejects(prepareCalculation(fixture(false, true), 't', ctx, 'inventory'), /撤权/);
  assert.ok(!supportedTool('prepare_calculation', 'alarm'));
  assert.throws(() => generationQuery({ bindings: { result: 5 } }));
  const code = good.scripts!;
  for (const kind of ['period', 'request'] as const) {
    const report = validateScript({ ...ctx, kind }, code[kind], ['Alias']);
    assert.deepEqual(report.issues, []);
    assert.equal(report.edges.filter((e) => e.direction === '读取点').length, 7);
  }
});
test('北京时间换日、坏质量、过期样本、失败读取及写回错误使用真实候选正文回归', async () => {
  const scripts = buildDayScripts('Alias', names);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const now = Date.parse('2026-11-23T16:00:00.000Z');
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const day = Math.floor((now + 28800000) / 86400000);
  for (const [when, quality, date, expected] of [
    [now, 192, day, 'ok'],
    [now, 192, day - 1, 'missing_day_start'],
    [now, 0, day, 'bad_quality'],
    [now - 16000, 192, day, 'stale_input'],
  ] as const) {
    const values = [901.5, 900, date, 2, 2, 0, 1];
    const read = async (alias, tags, out) => {
      assert.equal(alias, 'Alias');
      out.push(...tags.map((N, i) => ({ N, V: values[i], T: when, Q: quality })));
      return 0;
    };
    const out: any = {};
    let ended = 0;
    await new AsyncFunction('KIOQueryDatas', 'Date', 'OutParam', 'RequestID', 'endResponse', scripts.request)(
      read,
      Clock,
      out,
      'r',
      (id) => {
        assert.equal(id, 'r');
        ended++;
      },
    );
    assert.equal(ended, 1);
    assert.deepEqual(out, { status: expected, kWh: expected === 'ok' ? 1.5 : null });
  }
  const run = new AsyncFunction('KIOQueryDatas', 'KIOUpdateDatas', 'Date', scripts.period);
  let writes;
  await run(
    async () => {
      throw Error('离线');
    },
    async (_alias, changes) => {
      writes = changes;
      return 0;
    },
    Clock,
  );
  assert.deepEqual(writes, [{ N: names.status, V: 2, Q: 192 }]);
  await assert.rejects(
    run(
      async () => 3,
      async () => 1,
      Clock,
    ),
    /写回失败/,
  );
});
// end
