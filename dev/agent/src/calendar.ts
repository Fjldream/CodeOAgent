// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
// Wall dates are expressed in the target process's local calendar. UTC methods below
// implement calendar arithmetic without inheriting the assistant server's timezone.
type Row = Record<string, unknown>;
export function validDay(day: string) {
  const stamp = Date.parse(day + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(stamp) && new Date(stamp).toISOString().startsWith(day);
}
export function validOffset(offset: string) {
  return /^[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00)$/.test(offset);
}
const weekNames = ['日', '一', '二', '三', '四', '五', '六', '日'];
function integer(value: unknown, minimum: number, maximum: number) {
  const n = Number(value);
  return (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) &&
    Number.isInteger(n) && n >= minimum && n <= maximum ? n : NaN;
}
function ruleFor(row: Row, date?: Date) {
  const weekday = date?.getUTCDay(), day = date?.getUTCDate() ?? 0, month = (date?.getUTCMonth() ?? -1) + 1;
  if (row.pattern === 'day') return {label: '每天', matches: true};
  if (row.pattern === 'week') {
    if (!Array.isArray(row.week) || !row.week.length) return;
    const days = row.week.map(v => integer(v, 1, 7));
    if (days.some(Number.isNaN)) return;
    return {label: '每周' + days.map(d => '星期' + weekNames[d]).join('、'), matches: days.some(d => d === weekday),
      note: days.includes(7) ? '界面周日保存为 7，当前节点源码按 0 比较，周日项不会命中。' : ''};
  }
  if (row.pattern !== 'month' && row.pattern !== 'year') return;
  const spec = row[row.pattern] as Row | undefined;
  if (!spec || typeof spec !== 'object') return;
  const annual = row.pattern === 'year';
  const targetMonth = annual ? integer(spec.month, 1, 12) : month;
  if (annual && !Number.isInteger(targetMonth)) return;
  const prefix = annual ? '每年' + targetMonth + '月' : '每月';
  if (spec.type === 'type1') {
    const target = integer(spec.day, 1, 31);
    if (Number.isInteger(target)) return {label: prefix + target + '日', matches: targetMonth === month && day === target};
    return;
  }
  if (spec.type !== 'type2') return;
  const index = integer(spec.weekIndex, 0, 4), target = integer(spec.week, 1, 7);
  if (!Number.isInteger(index) || !Number.isInteger(target)) return;
  // periodScript.js uses day >= 25 even in 30-day months, and global % 400 in its February branch.
  const lastStart = month === 2 ? ((date?.getUTCFullYear() ?? 0) % 4 === 0 ? 23 : 22) : 25;
  return {label: prefix + (index ? '第' + index + '个' : '最后一个') + '星期' + weekNames[target],
    matches: weekday === target && (index ? month === targetMonth && Math.ceil(day / 7) === index : day >= lastStart),
    note: [target === 7 && '编辑器周日值 7 与节点周日值 0 不一致。',
      !index && '节点末周起点为 25 日，二月按年份除以 4 的余数取 22 或 23 日。开发态模型的 weekIndex 校验还可能拒绝保存 0。',
      !index && annual && '年度末周分支未再校验月份，其他月也可能命中。'].filter(Boolean).join(' ')};
}
function wallBound(value: unknown, offset?: string) {
  if (typeof value !== 'string') return;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ]((?:[01]\d|2[0-3]):[0-5]\d)(:[0-5]\d)?(\.\d{1,3})?(Z|[+-]\d\d:\d\d)?)?$/.exec(value);
  if (!match || !validDay(match[1])) return;
  if (match[2] && !match[5]) return Date.parse(value.replace(' ', 'T') + 'Z');
  if (!offset) return;
  const millis = Date.parse(value.replace(' ', 'T'));
  const minutes = Number(offset.slice(1,3)) * 60 + Number(offset.slice(4));
  return millis + (offset[0] === '-' ? -1 : 1) * minutes * 60000;
}
export function calendarReport(row: Row, day?: string, offset?: string): string[] {
  const date = day ? new Date(day + 'T00:00:00Z') : undefined;
  const rule = ruleFor(row, date);
  const time = typeof row.triggerTime === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(row.triggerTime)
    ? row.triggerTime.padEnd(8, ':00') : '';
  if (!rule || !time || !['是','否'].includes(String(row.whetherenable))) return ['日历规则字段不完整，无法预计触发。'];
  const lines = ['节点本地时间 ' + rule.label + ' ' + time, rule.note].filter((v): v is string => !!v);
  if (row.whetherenable === '否') return [...lines, '脚本未启用，预计 0 次。'];
  if (date && day) {
    const start = wallBound(row.startTime, offset), end = row.endTime === '' ? Infinity : wallBound(row.endTime, offset);
    const at = Math.max(Date.parse(day + 'T' + time + 'Z'), start ?? -Infinity);
    if (!rule.matches) lines.push(day + ' 日期条件不符，预计 0 次。');
    else if (!Number.isFinite(start) || end === undefined || Number.isNaN(end)) lines.push(day + ' 日期命中；有效期的格式或节点 UTC 偏移待核对，无法确定执行时间。');
    else if (at > end || at >= date.getTime() + 86400000) lines.push(day + ' 在有效期外，预计 0 次。');
    else lines.push('预计 ' + new Date(at).toISOString().slice(0,23).replace('T',' ') + ' 节点本地时间起，持续运行且当日尚未执行时 1 次。');
  }
  lines.push('节点约每 500 ms 检查，到点后首个满足条件的轮询执行，当日同一进程最多一次。晚于触发时刻启动时，源码用当时的宿主时钟标记当天，通常不补跑；重启与有效期边界需以实例记录核对。');
  return lines;
}
// end
