// modified by jinlong.feng at 2026-11-22 KF报警规则回读
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectAlarmRule, ruleSnapshot, describeRuleBatch, readRuleQuery } from '../src/alarm-rule.ts';
import { Store } from '../src/store.ts';
const term = {
  ID: 'r1',
  Name: 'Reading',
  Type: 2,
  DataSourceName: 'local',
  groupId: 'root',
  AlarmEnable: true,
  AlarmItem: {
    ID: 'r1',
    AlarmEnable: true,
    LimitEnable: true,
    HiEnable: true,
    HiLimit: 80,
    HiHiEnable: false,
    LoEnable: false,
    LoLoEnable: false,
    LoLoLimit: 0,
    LimitAlarmDeadEnable: true,
    LimitAlarmDead: 4,
    LimitAlarmDelayEnable: false,
  },
};
const direct = { kind: 'alarm' as const, projectId: 'alarmP', group: 'root', object: 'r1', dirty: false };
const window = { kind: 'page' as const, projectId: 'p', object: 'view', control: 'c', dirty: false };
function reader() {
  const rows: Record<string, any> = {
    '/client/batchGetPageFile': {
      success: [
        {
          pageProperty: { name: 'view' },
          objects: [{ guid: 'c', name: 'win', prototypeName: 'AlarmWindow', dateSource: 'Events' }],
        },
      ],
    },
    '/client/getDataSourceList': {
      message: [{ name: 'Events', type: 'AlarmEngineering', dataSourceName: 'source' }],
    },
    '/dataSource/getAllDataSource': [
      { type: 'AlarmEngineering', name: 'source', guid: 'ds', config: { alarmProject: 'Alarm' } },
    ],
    '/alarm/allProjects': [{ name: 'Alarm', guid: 'alarmP' }],
    '/alarm/group': { groupId: 'root', children: [] },
    '/alarm/tags': [structuredClone(term)],
  };
  const hidden = new Set<string>();
  return {
    rows,
    hidden,
    async call(_t: string, path: string) {
      assert.ok(path in rows, path);
      return rows[path];
    },
    async allowed(_t: string, c: any) {
      return !hidden.has(c.projectId);
    },
    async require(_t: string, c: any) {
      if (hidden.has(c.projectId)) throw Error('无权');
    },
  };
}
test('从单选词条和未运行的客户端报警窗取得同一条保存配置，歧义和撤权阻断', async () => {
  const r = reader();
  const a = await inspectAlarmRule(r, 't', direct, {});
  const b = await inspectAlarmRule(r, 't', window, { tag: 'Reading' });
  assert.deepEqual(a.rule, b.rule);
  assert.match(a.lines.join('\n'), /≥ 76 保持，值 < 76/);
  r.rows['/alarm/tags'].push({ ...term, ID: 'r2' });
  await assert.rejects(inspectAlarmRule(r, 't', window, {}), /唯一/);
  assert.deepEqual((await inspectAlarmRule(r, 't', direct, {})).rule, a.rule);
  r.hidden.add('ds');
  await assert.rejects(inspectAlarmRule(r, 't', window, {}), /可见事件源/);
  r.hidden.add('alarmP');
  await assert.rejects(inspectAlarmRule(r, 't', direct, {}), /无权/);
  assert.throws(() => readRuleQuery({ projectId: 'foreign' }));
});
test('只用采样时的规则解释当时的事件，保存版本变化、等号、窗内不同限值和旧批次分别处理', () => {
  const original = ruleSnapshot('P', term),
    current = ruleSnapshot('P', { ...term, AlarmItem: { ...term.AlarmItem, HiLimit: 90 } });
  const sample = {
    item: 'Reading',
    onset: 'event1',
    sourceTime: 'time',
    type: '高报警',
    quality: 192,
    limit: 80,
  };
  const batch: any = {
    ruleId: 'r1',
    tag: 'Reading',
    ruleSnapshot: original,
    samples: [
      { ...sample, value: 80, phase: '发生' },
      { ...sample, value: 76, phase: '保持' },
      { ...sample, value: 75, phase: '恢复' },
    ],
  };
  let lines = describeRuleBatch(current, batch).join('\n');
  assert.match(lines, /与当前规则不同/);
  assert.match(lines, /数采值 76.*符合 >= 76/);
  assert.match(lines, /数采值 75.*符合 < 76/);
  batch.samples[1].limit = 99;
  assert.match(describeRuleBatch(current, batch).join('\n'), /限值与联查时的保存配置不同/);
  assert.deepEqual(describeRuleBatch({ ...current, projectId: 'other' }, batch), []);
  delete batch.ruleSnapshot;
  assert.deepEqual(describeRuleBatch(current, batch), []);
});
test('保存条件保留有效零值、开关和延时，缺字段时避免套用单高规则', async () => {
  const r = reader(),
    row = r.rows['/alarm/tags'][0],
    a = row.AlarmItem;
  a.HiLimit = 0;
  a.LimitAlarmDead = 0;
  a.LimitAlarmDelayEnable = true;
  a.LimitAlarmDelay = 900;
  assert.match((await inspectAlarmRule(r, 't', direct, {})).lines.join('\n'), /等待 900 ms/);
  a.LimitEnable = false;
  assert.equal((await inspectAlarmRule(r, 't', direct, {})).rule.state, 'disabled');
  a.LimitEnable = true;
  delete a.LimitAlarmDead;
  assert.equal((await inspectAlarmRule(r, 't', direct, {})).rule.state, 'unknown');
});
test('分别说明布尔词条与多级限值的已保存条件', async () => {
  const r = reader(),
    row = r.rows['/alarm/tags'][0];
  row.Type = 1;
  Object.assign(row.AlarmItem, { DiscEnable: true, DiscAlarmGenType: 1, DiscAlarmDelayEnable: false });
  assert.match((await inspectAlarmRule(r, 't', direct, {})).lines.join('\n'), /变为假时恢复/);
  row.Type = 2;
  Object.assign(row.AlarmItem, { HiHiEnable: true, HiHiLimit: 95 });
  assert.match((await inspectAlarmRule(r, 't', direct, {})).lines.join('\n'), /≥ 80 且 < 95.*< 76 或 > 91/);
});
test('每段对话独立保留最近四批含规则快照的现场数据，旧批次维持旧记录', () => {
  const store = new Store(':memory:');
  try {
    const a = store.createPlan('a', 'one').chatId,
      b = store.createPlan('b', 'two').chatId;
    const put = (chat: string, id: string, snap: boolean) =>
      store.db
        .prepare('INSERT OR REPLACE INTO alarm_captures VALUES(?,?,?,?,?)')
        .run(chat, id, '{}', '[]', JSON.stringify(snap ? { ruleSnapshot: {} } : {}));
    put(b, 'second', true);
    put(a, 'legacy', false);
    for (let i = 0; i < 6; i++) put(a, 'a' + i, true);
    const rows = store.db.prepare('SELECT id FROM alarm_rule_captures WHERE chat=? ORDER BY rowid');
    assert.deepEqual(
      rows.all(a).map((v) => v.id),
      ['a2', 'a3', 'a4', 'a5'],
    );
    assert.equal(rows.all(b)[0].id, 'second');
  } finally {
    store.db.close();
  }
});
// end
