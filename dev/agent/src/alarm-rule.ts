// modified by jinlong.feng at 2026-11-22 KF报警规则回读
import type { Center } from './center.ts';
import { HttpError, type Context } from './shared.ts';
import type { AlarmBatch } from './alarm-samples.ts';
type Reader = Pick<Center, 'call' | 'require' | 'allowed'>;
type Row = Record<string, any>;
export const alarmRuleSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tag: {
      type: 'string',
      maxLength: 160,
      description: '需要区分多个词条时填写完整点名；已经在词典单选可省略。',
    },
  },
};
export type RuleQuery = { tag?: string };
export function readRuleQuery(value: unknown): RuleQuery {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => k !== 'tag')
  )
    throw new HttpError(400, '报警规则查询条件无效。');
  if (!('tag' in value)) return {};
  if (
    typeof value.tag !== 'string' ||
    !value.tag.trim() ||
    value.tag.length > 160 ||
    /[\x00-\x1f]/.test(value.tag)
  )
    throw new HttpError(400, '请输入完整报警点名。');
  return { tag: value.tag.trim() };
}
export function one<T>(rows: T[], label: string): T {
  if (rows.length !== 1) throw new HttpError(409, label + '在当前权限和配置范围内无法唯一核对。');
  return rows[0];
}
export const projectContext = (kind: Context['kind'], projectId: string): Context => ({
  kind,
  projectId,
  object: '',
  dirty: false,
});
export async function windowAlarmSource(reader: Reader, token: string, entry: Context) {
  await reader.require(token, entry);
  const [files, aliases] = await Promise.all([
    reader.call(token, '/client/batchGetPageFile', {
      projectId: entry.projectId,
      pageArr: JSON.stringify([entry.object]),
    }),
    reader.call(token, '/client/getDataSourceList', { projectId: entry.projectId }),
  ]);
  const page = one<Row>(files.success || [], '选中页面');
  const control = one<Row>(
    (page.objects || []).filter((r: Row) => r.guid === entry.control),
    '选中控件',
  );
  if (
    page.pageProperty?.name !== entry.object ||
    control.prototypeName !== 'AlarmWindow' ||
    !control.dateSource
  )
    throw new HttpError(409, '请单选配置了事件源的实时报警窗。');
  const alias = one<Row>(
    (aliases.message || []).filter(
      (r: Row) => r.name === control.dateSource && r.type === 'AlarmEngineering',
    ),
    '报警窗事件源',
  );
  const definitions: Row[] = await reader.call(token, '/dataSource/getAllDataSource');
  const candidates = [];
  for (const d of definitions.filter(
    (d) => d.type === 'AlarmEngineering' && d.name === alias.dataSourceName,
  ))
    if (await reader.allowed(token, projectContext('datasource', d.guid))) candidates.push(d);
  const eventSource = one(candidates, '可见事件源');
  const name = eventSource.config?.alarmProject;
  if (typeof name !== 'string' || !name.trim()) throw new HttpError(409, '事件源缺少关联报警工程。');
  const projects: Row[] = await reader.call(token, '/alarm/allProjects');
  const alarm = one(
    projects.filter((p) => p.name === name),
    '事件源关联的报警工程',
  );
  const alarmCtx = projectContext('alarm', alarm.guid);
  await reader.require(token, alarmCtx);
  return { control, alias, definitions, eventSource, alarmCtx };
}
export async function findRule(reader: Reader, token: string, context: Context, tag?: string) {
  await reader.require(token, context);
  const guid = context.projectId;
  const groups = new Set<string>();
  function visit(n: Row) {
    if (typeof n?.groupId !== 'string' || groups.has(n.groupId) || groups.size >= 24)
      throw new HttpError(409, '词典分组超出本次读取范围，请在词典中单选目标词条。');
    groups.add(n.groupId);
    for (const child of n.children || []) visit(child);
  }
  if (context.group) groups.add(context.group);
  else {
    const tree = await reader.call(token, '/alarm/group', { guid });
    for (const root of Array.isArray(tree) ? tree : [tree]) visit(root);
  }
  const matches: Row[] = [];
  for (const groupId of groups) {
    const rows = await reader.call(token, '/alarm/tags', { guid, groupId });
    if (!Array.isArray(rows)) throw new HttpError(502, '词典读取格式待核实。');
    matches.push(
      ...rows.filter(
        (r) =>
          (!context.object || r.ID === context.object) &&
          (!tag || r.Name === tag) &&
          (!r.groupId || r.groupId === groupId),
      ),
    );
  }
  if (matches.length !== 1)
    throw new HttpError(
      409,
      '未定位到唯一报警词条。请在词典勾选一行，或在报警窗填写完整点名；同名词条请在所属分组选择。',
    );
  return matches[0];
}
const grades = { HiHi: '高高报警', Hi: '高报警', LoLo: '低低报警', Lo: '低报警' } as const;
type Grade = keyof typeof grades;
const numeric = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && v.trim() && Number.isFinite(Number(v))
      ? Number(v)
      : null;
function parameter(item: Row, flag: string, key: string) {
  if (item[flag] === false) return 0;
  const n = numeric(item[key]);
  return item[flag] === true && n !== null && n >= 0 ? n : null;
}
export function ruleSnapshot(projectId: string, row: Row) {
  const a = row.AlarmItem || {};
  const levels = (Object.keys(grades) as Grade[]).map((key) => ({
    key,
    label: grades[key],
    enabled: a[key + 'Enable'] === true,
    limit: numeric(a[key + 'Limit']),
  }));
  const dead = parameter(a, 'LimitAlarmDeadEnable', 'LimitAlarmDead'),
    delay = parameter(a, 'LimitAlarmDelayEnable', 'LimitAlarmDelay');
  const known =
    typeof row.ID === 'string' &&
    typeof row.Name === 'string' &&
    typeof a.ID === 'string' &&
    (Array.isArray(a.Tags) ? a.Tags.includes(row.ID) : row.ID === a.ID) &&
    typeof row.AlarmEnable === 'boolean' &&
    row.AlarmEnable === a.AlarmEnable &&
    typeof a.LimitEnable === 'boolean' &&
    levels.every((l) => typeof a[l.key + 'Enable'] === 'boolean' && (!l.enabled || l.limit !== null));
  const state =
    row.Type === 1
      ? 'discrete'
      : ![2, 3, 4].includes(row.Type)
        ? 'other'
        : !known
          ? 'unknown'
          : !row.AlarmEnable || !a.LimitEnable || !levels.some((l) => l.enabled)
            ? 'disabled'
            : dead === null || delay === null
              ? 'unknown'
              : levels.filter((l) => l.enabled).length !== 1
                ? 'multiple'
                : 'single';
  const discrete =
    row.Type === 1
      ? {
          enabled: a.DiscEnable,
          mode: numeric(a.DiscAlarmGenType),
          delay: parameter(a, 'DiscAlarmDelayEnable', 'DiscAlarmDelay'),
        }
      : undefined;
  return {
    projectId,
    ...(discrete && { discrete }),
    id: String(row.ID),
    name: String(row.Name),
    itemName: String(a.Name ?? row.Name),
    group: String(row.groupId ?? ''),
    alias: String(row.DataSourceName ?? ''),
    state,
    master: row.AlarmEnable,
    limitEnabled: a.LimitEnable,
    levels,
    dead,
    delay,
    deadEnabled: a.LimitAlarmDeadEnable,
    delayEnabled: a.LimitAlarmDelayEnable,
    lowLowLimit: numeric(a.LoLoLimit),
  };
}
type Snapshot = ReturnType<typeof ruleSnapshot>;
function formula(rule: Snapshot) {
  const level = rule.levels.find((l) => l.enabled);
  if (rule.state !== 'single' || !level || level.limit === null || rule.dead === null) return;
  // The native Lo recovery also consults a configured nonzero LoLoLimit even when that level is disabled.
  if (level.key === 'Lo' && rule.lowLowLimit !== 0) return;
  const high = level.key.startsWith('Hi'),
    boundary = high ? level.limit - rule.dead : level.limit + rule.dead;
  return { level, high, boundary };
}
function savedLines(rule: Snapshot) {
  const yes = (n: unknown) => (n === true ? '启用' : n === false ? '关闭' : '未取得');
  const lines = [
    '已保存报警词条 · ' + rule.name + ' · 词典连接 ' + rule.alias,
    '报警使能 ' + yes(rule.master) + ' · 限值报警 ' + yes(rule.limitEnabled),
  ];
  if (rule.discrete) {
    const { enabled, mode, delay } = rule.discrete;
    const conditions = [
      '值为假时发生，保持假值期间保持，变为真时恢复。',
      '值为真时发生，保持真值期间保持，变为假时恢复。',
      '按布尔状态的上升沿或下降沿触发，需结合前后状态核对。',
    ];
    lines.push('离散报警 ' + yes(enabled) + ' · 发生延时 ' + (delay ?? '未取得') + ' ms。');
    if (rule.master === true && enabled === true && mode !== null && conditions[mode])
      lines.push(conditions[mode]);
    return lines;
  }
  if (rule.state === 'other')
    return [...lines, '该词条属于其他数据类型，请在原生报警属性中核对离散或自定义规则。'];
  for (const l of rule.levels.filter((l) => l.enabled))
    lines.push(l.label + ' · 限值 ' + (l.limit ?? '未取得'));
  lines.push(
    '死区 ' +
      yes(rule.deadEnabled) +
      ' · 有效值 ' +
      (rule.dead ?? '未取得') +
      '；延时 ' +
      yes(rule.delayEnabled) +
      ' · 有效值 ' +
      (rule.delay ?? '未取得') +
      ' ms。数值沿用词条原始量纲。',
  );
  if (rule.state === 'disabled') return [...lines, '当前保存配置不会生成该限值报警。'];
  const f = formula(rule);
  if (!f && (rule.state === 'multiple' || rule.state === 'single') && rule.dead !== null) {
    for (const level of rule.levels.filter((l) => l.enabled && l.limit !== null)) {
      const high = level.key.startsWith('Hi'),
        boundary = high ? level.limit! - rule.dead : level.limit! + rule.dead;
      let trigger = (high ? '≥ ' : '≤ ') + level.limit,
        recover = (high ? '< ' : '> ') + boundary;
      const outer = rule.levels.find((l) => l.key === (high ? 'HiHi' : 'LoLo'));
      if (level.key === 'Hi' && outer?.enabled && outer.limit !== null) {
        trigger += ' 且 < ' + outer.limit;
        recover += ' 或 > ' + (outer.limit - rule.dead);
      }
      if (level.key === 'Lo' && outer?.enabled && outer.limit !== null) trigger += ' 且 > ' + outer.limit;
      if (level.key === 'Lo' && rule.lowLowLimit) recover += ' 或 < ' + (rule.lowLowLimit + rule.dead);
      lines.push(
        level.label + ' · 发生候选条件 ' + trigger + '，该级已发生时，恢复候选条件 ' + recover + '。',
      );
    }
    lines.push('已有事件未满足恢复条件时保持。多级切换还要核对前一级状态和事件顺序。');
    if (rule.delay) lines.push('满足相应条件后还需延时 ' + rule.delay + ' ms，并收到后续更新。');
    return lines;
  }
  if (!f)
    return [...lines, '当前配置涉及多级切换、附加恢复条件或字段不全，需在报警属性核对各级组合与实际事件。'];
  lines.push(
    '发生条件：值 ' +
      (f.high ? '≥' : '≤') +
      ' ' +
      f.level.limit +
      '。已有该报警时，值 ' +
      (f.high ? '≥' : '≤') +
      ' ' +
      f.boundary +
      ' 保持，值 ' +
      (f.high ? '<' : '>') +
      ' ' +
      f.boundary +
      ' 满足恢复条件。',
  );
  if (rule.delay)
    lines.push('发生和恢复均须在相应条件下等待 ' + rule.delay + ' ms，并由后续输入更新完成判定。');
  return lines;
}
export function compareRuleBatch(current: Snapshot, batch: AlarmBatch) {
  const rule = batch.ruleSnapshot;
  if (
    !rule ||
    rule.projectId !== current.projectId ||
    rule.id !== current.id ||
    rule.name !== batch.tag ||
    batch.ruleId !== rule.id
  )
    return;
  const f = formula(rule);
  if (!f) return;
  const same = JSON.stringify(rule) === JSON.stringify(current);
  const lines = [
    '联查时的保存配置 · ' +
      (same ? '与当前规则一致' : '与当前规则不同') +
      ' · ' +
      f.level.label +
      ' ' +
      f.level.limit +
      ' · 死区 ' +
      rule.dead +
      ' · 延时 ' +
      rule.delay +
      ' ms',
  ];
  let conflict = false;
  const phases = new Map<string, Set<string>>();
  for (const s of batch.samples) {
    if (
      !['发生', '保持', '恢复'].includes(s.phase) ||
      !('onset' in s) ||
      s.type !== f.level.label ||
      s.item !== (rule.itemName ?? rule.name) ||
      numeric(s.quality) !== 192
    )
      continue;
    const n = numeric(s.value);
    if (n === null) continue;
    if (numeric(s.limit) !== f.level.limit) {
      conflict = true;
      lines.push(
        s.sourceTime +
          ' · ' +
          s.phase +
          ' · 数采值 ' +
          n +
          ' · 质量 ' +
          s.quality +
          ' · 运行窗限值与联查时的保存配置不同（窗内 ' +
          s.limit +
          '，保存 ' +
          f.level.limit +
          '）。请核对目标报警 App 的发布、部署与同次事件。',
      );
      continue;
    }
    const limit = f.level.limit!;
    const cmp =
      s.phase === '发生'
        ? f.high
          ? '>='
          : '<='
        : s.phase === '保持'
          ? f.high
            ? '>='
            : '<='
          : f.high
            ? '<'
            : '>';
    const b = s.phase === '发生' ? limit : f.boundary;
    const consistent = cmp === '>=' ? n >= b : cmp === '<=' ? n <= b : cmp === '<' ? n < b : n > b;
    if (!consistent) conflict = true;
    const seen = phases.get(s.onset!) ?? new Set<string>();
    seen.add(s.phase);
    phases.set(s.onset!, seen);
    lines.push(
      s.sourceTime +
        ' · ' +
        s.phase +
        ' · 数采值 ' +
        n +
        ' · 质量 ' +
        s.quality +
        ' · ' +
        (consistent ? '符合 ' + cmp + ' ' + b : '样本与边界不一致，需复核两端时序') +
        ' · 同条报警首发 ' +
        s.onset,
    );
  }
  if (lines.length === 1) return;
  if (rule.delay) lines.push('这些离散采样无法单独证明整个延时期间条件持续成立。');
  const complete = [...phases.values()].some((seen) =>
    ['发生', '保持', '恢复'].every((phase) => seen.has(phase)),
  );
  const comparison = conflict ? 'conflict' : complete ? 'consistent' : 'partial';
  return { lines, comparison, priorVersion: !same };
}
export function describeRuleBatch(current: Snapshot, batch: AlarmBatch) {
  return compareRuleBatch(current, batch)?.lines ?? [];
}
export async function inspectAlarmRule(reader: Reader, token: string, entry: Context, query: RuleQuery) {
  if (entry.kind !== 'alarm' && !(entry.kind === 'page' && entry.control))
    throw new HttpError(400, '请在报警词典或选中实时报警窗后查询。');
  const window = entry.kind === 'page' ? await windowAlarmSource(reader, token, entry) : undefined;
  const ctx = window?.alarmCtx ?? entry;
  const dependencies = window ? [projectContext('datasource', window.eventSource.guid), ctx] : [ctx];
  const row = await findRule(reader, token, ctx, query.tag);
  const rule = ruleSnapshot(ctx.projectId, row);
  for (const dep of [entry, ...dependencies]) await reader.require(token, dep);
  return {
    rule,
    dependencies,
    lines: [
      ...(window
        ? [
            '客户端报警窗 ' +
              window.control.name +
              ' → ' +
              window.alias.name +
              ' → ' +
              window.eventSource.config.alarmProject,
          ]
        : []),
      ...savedLines(rule),
    ],
    at: new Date().toISOString(),
  };
}
// end
