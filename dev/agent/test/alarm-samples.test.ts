// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import test from 'node:test';
import assert from 'node:assert/strict';
import { alarmTargets, correlateAlarm } from '../src/alarm-samples.ts';
import type { AlarmRoute } from '../src/alarm-route.ts';
const route = {
  context: { object: '工艺' },
  ruleId: 'R',
  windowName: '温度报警',
  alias: '事件源',
  tag: '温度',
  alarmProject: '事件',
  monitor: { projectId: 'io', appId: 'io1', nodeId: 'node', tag: '温度' },
  targets: [
    {
      appId: 'cl',
      projectId: 'p',
      nodeId: 'node',
      userName: 'user',
      control: 'win',
      origin: 'http://test',
      page: '工艺',
    },
  ],
} as unknown as AlarmRoute;
const start = Date.parse('2026-11-21T00:00:00Z');
function entry(n: number, state = '报警', onset = 1000) {
  const at = start + n * 1000;
  return {
    sample: {
      value: 0,
      quality: 192,
      point: route.monitor,
      time: new Date(at).toISOString(),
      at: new Date(at).toISOString(),
    },
    window: {
      ...alarmTargets(route)[0],
      at,
      rows: [
        {
          onset: start + onset,
          time: state === '报警' ? start + onset : at,
          item: '温度',
          type: '高报警',
          group: 'A',
          state,
          alarmValue: '0',
          limit: '1',
        },
      ],
    },
  };
}
const batch = (entries: any[]) => correlateAlarm(route, entries, start, start + 9000, '+08:00').samples;
test('同一报警以首发时刻、项、类型和组匹配，保持须有较新的好质量样本', () => {
  const rows = batch([entry(1), entry(2), entry(3, '报警恢复'), entry(4, '报警恢复', 4000)]);
  assert.deepEqual(
    rows.map((s) => s.phase),
    ['发生', '保持', '恢复', '窗内已恢复（未观测发生）'],
  );
  assert.equal(rows[0].value, 0);
  const other = entry(2, '报警恢复');
  other.window.rows[0].group = 'B';
  assert.equal(batch([entry(1), other])[1].phase, '窗内已恢复（未观测发生）');
});
test('区分旧事件、旧样本、坏质量、重复行、时间缺失和同名点的实例归属', () => {
  assert.equal(batch([entry(2, '报警', -10000)])[0].phase, '观察开始前已发生');
  const dirty = entry(2);
  dirty.sample.quality = 0;
  assert.match(batch([dirty])[0].phase, /质量/);
  const stale = entry(2);
  stale.sample.time = new Date(start - 11000).toISOString();
  assert.match(batch([stale])[0].phase, /源时间/);
  const duplicate = entry(2);
  duplicate.window.rows.push(duplicate.window.rows[0]);
  assert.match(batch([duplicate])[0].phase, /消歧/);
  const missed = entry(2);
  missed.window.control = 'other';
  assert.match(batch([missed])[0].phase, /未取得/);
  const wrong = entry(2);
  wrong.sample.point = { ...route.monitor, appId: 'other' };
  assert.throws(() => batch([wrong]), /实例/);
  const repeated = entry(2);
  repeated.sample.time = entry(1).sample.time;
  assert.match(batch([entry(1), repeated])[1].phase, /重复/);
  const unknown = entry(2);
  unknown.sample.time = '2026-11-21 08:00:02';
  assert.match(correlateAlarm(route, [unknown], start, start + 9000, '').samples[0].phase, /源时间/);
});
// end
