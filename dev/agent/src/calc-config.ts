// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { HttpError, type Context, type Fact } from './shared.ts';

// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
import { calendarReport, validDay, validOffset } from './calendar.ts';
// end
const menus = {
  'calculate-global-variable': 'globalVars',
  'calculate-data-source-management': 'dataAccess',
  'calculate-system-scripts': 'systemScripts',
  'calculate-period-script': 'periods',
  'calculate-datachange-script': 'dataChanges',
  'calculate-conditionalevent-script': 'conditions',
  'calculate-askcalculate-script': 'APIs',
  'calculate-selfdefine-script': 'functions',
  'calculate-npm-dependencies': 'npm',
  'calculate-normal-dependencies': 'normal',
  'calculate-py-dependencies': 'python',
} as const;
export type CalcSection = (typeof menus)[keyof typeof menus];
export function sectionForMenu(menu?: string): CalcSection | undefined {
  if (menu && Object.hasOwn(menus, menu)) return menus[menu as keyof typeof menus];
}
const guide: Record<CalcSection, [string, string]> = {
  globalVars: [
    '数据词典',
    '在计算工程的数据词典选择目标分组并点「新建变量」。内存变量填写名称、类型和初值。数据源变量先选工程内连接，再从点选择框选择点并核对类型。保存后按名称重查映射。',
  ],
  dataAccess: [
    '数据源管理',
    '在计算工程的「数据源管理」点「新建」，选择已建立的平台数据源，确认自动带出的类型并填写工程内名称。保存后重开列表，核对名称与关联数据源。连接可用性由开发人员在该行测试连接。',
  ],
  periods: [
    '周期性脚本',
    '打开「脚本 → 周期性脚本」，在属性中核对固定间隔或日历触发、有效时段和生效开关。双击脚本打开正文，再用目标实例的采样核对读入与写回。',
  ],
  APIs: [
    '请求式计算脚本',
    '打开请求式计算脚本，核对函数名和生效状态。用约定入参向独立测试 App 调用一次，对照实际业务回包。',
  ],
  systemScripts: [
    '系统脚本',
    '打开系统脚本，按原生事件选择相应行，双击查看正文。事件实际发生时另取目标实例回执。',
  ],
  dataChanges: ['数据变化脚本', '打开数据变化脚本，核对数据项和生效状态。分别以同值与变化值测试触发。'],
  conditions: [
    '条件事件脚本',
    '核对表达式、生效状态和执行间隔。分别查看进入时、存在时和离开时的正文并按三种状态取证。',
  ],
  functions: ['自定义函数', '核对函数名、参数列表及调用方。使用已知入参从调用方核对结果。'],
  npm: ['npm 依赖', '在脚本依赖的 JavaScript 分支打开 npm 依赖。核对登记项并在目标计算 App 核实加载。'],
  normal: ['普通依赖', '在脚本依赖的 JavaScript 分支打开普通依赖，核对登记的文件及运行时加载结果。'],
  python: ['Python 依赖', '打开脚本依赖的 Python 分支，核对登记项，并在目标环境验证依赖与解释器兼容性。'],
};
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
export function calcMenuGuide(menu?: string) {
  const section = sectionForMenu(menu);
  return section ? guide[section] : undefined;
}
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
export type CalcQuery = { calendarDate?: string; nodeOffset?: string; member?:string; section?: CalcSection; exactName?: string; connectionReceipt?: boolean; sourceChoices?: boolean };
// end

// end
// end
// end
export const calcSchema = {
  type: 'object',
  additionalProperties: false,
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
  properties: {
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
    calendarDate: {type:'string', description:'按节点本地日期 YYYY-MM-DD 预计周期日历触发。'},
    nodeOffset: {type:'string', description:'目标日期已知的节点 UTC 偏移，如 +08:00，用于换算带时区的有效期。'},
// end
    member:{type:'string',maxLength:128,description:'核对普通文件或 Python 归档中的其他文件，可选相对文件名。'},
    section: {
// end
      type: 'string',
      enum: Object.values(menus),
      description: '省略时取当前计算菜单。globalVars 为词典，dataAccess 为工程内连接。',
    },
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
    exactName: { type: 'string', maxLength: 200, description: '可选，已知的完整名称。' },
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
    connectionReceipt: {type:'boolean', description:'核对开发态测试结果与指定计算 App 实际读数时设为 true，exactName 必须是完整工程别名。'},
    sourceChoices: {type:'boolean', description:'从空工程选择平台数据源或核对已有别名时设为 true，仅适用于 dataAccess。exactName 可填写平台源名或工程别名。'},
// end
// end
  },
};
export function readCalcQuery(raw: unknown): CalcQuery {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, '计算查询参数无效');
  const query: CalcQuery = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'section' && typeof value === 'string' && Object.hasOwn(guide, value))
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
      query.section = value as CalcSection;
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
    else if (key === 'calendarDate' && typeof value === 'string' && validDay(value)) query.calendarDate = value;
    else if (key === 'nodeOffset' && typeof value === 'string' && validOffset(value)) query.nodeOffset = value;
// end
    else if(key==='member' && typeof value==='string' && value.length<=128 && !/[\x00-\x1f]/.test(value)) query.member=value;
    else if (key === 'sourceChoices' && typeof value === 'boolean') query.sourceChoices = value;
// end
    else if (key === 'connectionReceipt' && typeof value === 'boolean') query.connectionReceipt = value;
// end
// end
    else if (
      key === 'exactName' &&
      typeof value === 'string' &&
      value.trim() &&
      value.length <= 200 &&
      !/[\x00-\x1f]/.test(value)
    )
      query.exactName = value.trim();
    else throw new HttpError(400, '计算配置类别或名称无效');
  }
  // modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
  if (query.connectionReceipt && (!query.exactName || query.sourceChoices || (query.section && query.section !== 'dataAccess')))
    throw new HttpError(400, '连接回执须单独按完整工程别名查询。');
  // end
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
  if (query.nodeOffset && !query.calendarDate || query.calendarDate && (query.section && query.section !== 'periods' || query.connectionReceipt || query.sourceChoices || query.member))
    throw new HttpError(400, '日历查询需要周期脚本和目标节点日期');
  if (query.calendarDate) query.section = 'periods';
// end
  return query;
}
type Read = (path: string, params: Record<string, string>) => Promise<unknown>;
type Row = Record<string, unknown>;
function rows(value: unknown): Row[] {
  if (
    !Array.isArray(value) ||
    value.some((row) => !row || typeof row !== 'object' || typeof row.name !== 'string' || !row.name)
  )
    throw new HttpError(502, '当前 KF 构建的计算配置清单格式待核对');
  return value;
}
function valueOf(value: unknown) {
  if (value === '') return '（空）';
  if (['string', 'boolean', 'number'].includes(typeof value)) return String(value).slice(0, 1000);
  return '待核对';
}
const fields: Partial<Record<CalcSection, Record<string, string>>> = {
  dataAccess: { connectName: '关联数据源', type: '类型' },
  periods: { whetherenable: '生效', startTime: '开始时间', endTime: '结束时间' },
  APIs: { whetherenable: '生效', functionName: '函数名' },
  functions: { functionName: '函数名', paramlist: '参数列表' },
  conditions: { whetherenable: '生效', expression: '表达式', interval: '间隔', unit: '单位' },
  dataChanges: { whetherenable: '生效', expression: '数据项' },
  npm: { type: '类型', fileName: '文件名' },
  normal: { type: '类型', fileName: '文件名' },
  python: { type: '类型', fileName: '文件名' },
};
export function calcScope(context: Context, requested?: CalcSection) {
  if (!['calculation', 'period', 'request'].includes(context.kind))
    throw new HttpError(400, '请从计算工程或计算脚本打开');
  const current =
    context.kind === 'period'
      ? 'periods'
      : context.kind === 'request'
        ? 'APIs'
        : sectionForMenu(context.calcMenu);
  const section = requested ?? current;
  if (!section) throw new HttpError(400, '请指定计算配置类别或打开相应菜单');
  return {
    section,
    groupId: context.kind === 'calculation' && section === current ? context.group || '-1' : '-1',
  };
}
export async function calcList(read: Read, section: CalcSection, groupId: string) {
  const dependency = ['normal', 'npm', 'python'].includes(section);
  const source = dependency ? 'calculation/getDependenceslist' : 'calculation/projectJsonData';
  const params: Record<string, string> = { type: section };
  if (!dependency) params.groupId = groupId;
  return { source, items: rows(await read('/' + source, params)) };
}
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
export async function calcConfig(read: Read, context: Context, query: CalcQuery, focusText?: string) {
// end

  const { section, groupId } = calcScope(context, query.section);
  const { source, items } = await calcList(read, section, groupId);
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
  const selected = section==='globalVars' && context.kind==='calculation' && context.calcMenu==='calculate-global-variable' && context.object && !query.exactName
    ? items.filter(row=>String(row.id)===context.object) : items;
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
  const scoped = context.kind === 'period' && context.object && section === 'periods' && !query.exactName
    ? selected.filter(row => row.GUID === context.object) : selected;
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  const namedRows = focusText ? scoped.filter(row => row.name === focusText.trim()) : [];
  const matched = query.exactName ? scoped.filter(row => row.name === query.exactName) : namedRows.length ? namedRows : scoped;
// end

// end

// end
  const visible = matched.slice(0, 24);
  const [title, guidance] = guide[section];
  const facts: Fact[] = [],
    gaps: string[] = [];
  const mapped = (row: Row) => ['IO_Number', 'IO_Boolean', 'IO_String'].includes(String(row.type));
  const needsAliases = section === 'globalVars' && visible.some(mapped);
  const aliases = needsAliases ? (await calcList(read, 'dataAccess', '-1')).items : [];
  let resolved = 0,
    unresolved = 0;
  for (const row of visible) {
    const parts = [valueOf(row.name)];
    for (const [key, label] of Object.entries(fields[section] ?? {}))
      parts.push(label + ' ' + valueOf(row[key]));
    if (section === 'globalVars') {
      parts.push('类型 ' + valueOf(row.type), '初始值 ' + valueOf(row.value));
      if (mapped(row)) {
        const matches = aliases.filter((alias) => alias.name === row.dataSourceName);
        parts.push('工程别名 ' + valueOf(row.dataSourceName), '点 ' + valueOf(row.TagName));
        const alias = matches.length === 1 ? matches[0] : undefined;
        if (
          alias &&
          typeof alias.connectName === 'string' &&
          alias.connectName &&
          typeof row.TagName === 'string' &&
          row.TagName &&
          row.dataSourceType &&
          row.dataSourceType === alias.type
        ) {
          parts.push('关联数据源 ' + valueOf(alias.connectName));
          resolved++;
        } else {
          parts.push('连接缺失、不唯一或关联字段待核对');
          unresolved++;
        }
        if (row.ReadWreiteProperty) parts.push('读写属性 ' + valueOf(row.ReadWreiteProperty));
      }
    }
    if (section === 'periods') {
      if (row.periodType === 'interval')
        parts.push(
          '固定间隔 ' + valueOf(row.interval) + ' ' + valueOf(row.unit),
          '执行次数 ' + valueOf(row.times),
        );
      else if (row.periodType === 'calendar')
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
        parts.push(...calendarReport(row, query.calendarDate, query.nodeOffset));
// end
      else parts.push('触发模式待核对');
    }
    facts.push({ label: title, value: parts.join(' · ') });
  }
  if (!matched.length)
    gaps.push(query.exactName ? '当前分组范围未找到这个完整名称。' : '当前查询范围的已保存清单为空。');
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  if ((query.exactName || namedRows.length) && matched.length > 1) gaps.push('当前范围有多个同名项，请从对应分组核对。');
// end
  if (visible.length < matched.length) gaps.push('仅展示前 24 项，可以完整名称查询其余项。');
  return {
    title: '计算工程 · ' + title,
    source: needsAliases ? source + '（globalVars、dataAccess）' : source + '（' + section + '）',
    facts,
    gaps,
    guidance,
    summary: {
      section,
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
      ...(focusText !== undefined && {exactNameMatches: namedRows.length}),
// end
      scopedGroup: groupId !== '-1',
      total: matched.length,
      shown: visible.length,
      resolved,
      unresolved,
      guidance,
      runtimeVerified: false as const,
    },
  };
}
// end
