// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import { HttpError } from './shared.ts';
import type { AlarmRoute } from './alarm-route.ts';

export function alarmTargets(route: AlarmRoute) {
  return route.targets.map((t) => ({
    ...t,
    windowName: route.windowName,
    alias: route.alias,
    tag: route.tag,
    alarmProject: route.alarmProject,
  }));
}
function scalar(value: unknown): value is string | number {
  return typeof value === 'string'
    ? value.length > 0 && value.length <= 160 && !/[\x00-\x1f]/.test(value)
    : typeof value === 'number' && Number.isFinite(value);
}
function sourceMillis(time: string, offset: string) {
  const stamp = time.replace(' ', 'T');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)?$/.test(stamp)) return NaN;
  if (/(?:Z|[+-]\d\d:\d\d)$/.test(stamp)) return Date.parse(stamp);
  return /^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset) ? Date.parse(stamp + offset) : NaN;
}
export function correlateAlarm(
  route: AlarmRoute,
  entries: unknown,
  start: number,
  end: number,
  offset: string,
) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 60)
    throw new HttpError(400, '联查需包含 1 至 60 笔观察。');
  const targets = alarmTargets(route),
    phases = new Map<string, { phase: string; source: number; event: number }>();
  let previousAt = start - 1;
  const samples = entries.map((entry) => {
    const { sample, window: screen } = entry || {};
    if (
      !sample?.point ||
      !(['projectId', 'appId', 'nodeId', 'tag'] as const).every((k) => sample.point[k] === route.monitor[k])
    )
      throw new HttpError(409, '采样不属于本次选定的点和实例。');
    if (
      !sample ||
      !scalar(sample.value) ||
      !scalar(sample.quality) ||
      !scalar(sample.time) ||
      typeof sample.time !== 'string' ||
      typeof sample.at !== 'string'
    )
      throw new HttpError(400, '采样字段不完整。');
    const at = Date.parse(sample.at);
    if (!Number.isFinite(at) || at <= previousAt || at > end + 2000)
      throw new HttpError(409, '采样顺序或观察时间无效。');
    previousAt = at;
    const source = sourceMillis(sample.time, offset);
    const basic = {
      value: sample.value,
      quality: sample.quality,
      sourceTime: sample.time,
      readAt: sample.at,
    };
    if (
      !screen ||
      !Number.isSafeInteger(screen.at) ||
      screen.at < start ||
      Math.abs(screen.at - at) > 5000 ||
      screen.at > end + 2000 ||
      !targets.some((t) => Object.entries(t).every(([key, value]) => screen[key] === value)) ||
      !Array.isArray(screen.rows) ||
      screen.rows.length > 16
    )
      return { ...basic, phase: '未取得匹配运行窗' };
    const obs = { ...basic, windowAt: new Date(screen.at).toISOString() };
    if (
      !Number.isFinite(source) ||
      at - source > 10000 ||
      source - at > 2000 ||
      Number(sample.quality) !== 192
    )
      return { ...obs, phase: '采样质量或源时间待核实' };
    if (!screen.rows.length) return { ...obs, phase: '窗内无匹配行' };
    if (screen.rows.length !== 1) return { ...obs, phase: '窗内多条匹配，待消歧' };
    const [row] = screen.rows;
    if (
      !row ||
      ![row.item, row.type, row.group, row.state].every(scalar) ||
      ![row.alarmValue, row.limit].every((v) => v === '' || scalar(v)) ||
      !Number.isSafeInteger(row.onset) ||
      !Number.isSafeInteger(row.time) ||
      row.onset <= 0 ||
      row.time < row.onset ||
      row.time > Math.min(source, screen.at) + 2000 ||
      !['报警', '报警恢复'].includes(row.state)
    )
      return { ...obs, phase: '报警行字段或时序待核实' };
    const key = JSON.stringify([row.item, row.group, row.type, row.onset]);
    const prior = phases.get(key);
    const event = {
      onset: new Date(row.onset).toISOString(),
      eventTime: new Date(row.time).toISOString(),
      item: row.item,
      group: row.group,
      type: row.type,
      alarmValue: row.alarmValue,
      limit: row.limit,
      windowState: row.state,
    };
    if (
      prior &&
      (source <= prior.source ||
        row.time < prior.event ||
        (prior.phase === '报警恢复' && row.state === '报警'))
    )
      return { ...obs, ...event, phase: '重复采样或事件顺序待核实' };
    let phase;
    if (row.state === '报警') phase = prior ? '保持' : row.onset >= start ? '发生' : '观察开始前已发生';
    else phase = prior?.phase === '报警' ? '恢复' : prior ? '已恢复' : '窗内已恢复（未观测发生）';
    phases.set(key, { phase: row.state, source, event: row.time });
    return { ...obs, ...event, phase };
  });
  return {
    tag: route.tag,
    window: route.windowName,
    page: route.context.object,
    alias: route.alias,
    alarm: route.alarmProject,
    node: route.monitor.nodeId,
    collection: route.monitor.appName,
    ruleId: route.ruleId,
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
    ruleSnapshot: route.ruleSnapshot,
// end

    offset,
    samples,
  };
}
export type AlarmBatch = ReturnType<typeof correlateAlarm>;
export function alarmLines(id: string, batch: AlarmBatch) {
  return [
    '现场联查 ' +
      id +
      ' · ' +
      batch.collection +
      ' / ' +
      batch.tag +
      ' → ' +
      batch.page +
      ' / ' +
      batch.window +
      '（' +
      batch.alias +
      '） · 源时间 ' +
      (batch.offset ? 'UTC' + batch.offset : '按采样原文') +
      '，报警时刻 UTC',
    ...batch.samples.map((s) => {
      const event =
        'onset' in s
          ? ' · ' +
            s.type +
            ' / ' +
            s.item +
            ' · 首发 ' +
            s.onset +
            ' · 事件 ' +
            s.eventTime +
            ' · 窗内报警值 ' +
            s.alarmValue +
            ' · 限值 ' +
            s.limit
          : '';
      return (
        '源时间 ' + s.sourceTime + ' · 数采值 ' + s.value + ' · 质量 ' + s.quality + ' · ' + s.phase + event
      );
    }),
  ];
}
// end
