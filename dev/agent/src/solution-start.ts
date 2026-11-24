// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
import type { Center } from './center.ts';
import { HttpError, type Context } from './shared.ts';

const inputs = ['unknown', 'device', 'point', 'realtime', 'events', 'history', 'database', 'static'] as const;
const goals = ['monitor', 'screen', 'calculate', 'alarm', 'alarmWindow', 'report', 'scene'] as const;
const directories = {
  collection: { label: '数采管理', type: '2', path: '/collect/project' },
  datasource: { label: '数据源管理', type: '3', path: '/dataSource/project' },
  calculation: { label: '计算管理', type: '0', path: '/calculation/project' },
  alarm: { label: '报警管理', type: '4', path: '/alarm/project' },
  client: { label: '客户端管理', type: '1', path: '/client/projectList' },
} as const;
type ProjectKind = keyof typeof directories;
export type StartQuery = {
  input: (typeof inputs)[number];
  goals: (typeof goals)[number][];
  directory?: ProjectKind;
};
export const startSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    input: {
      type: 'string',
      enum: inputs,
      description:
        '已知输入。device 为尚待接入设备；point 为已有采集点；realtime 为已有实时数据源；events 为已有报警事件源；static 为纯静态。未知用 unknown。',
    },
    goals: {
      type: 'array',
      uniqueItems: true,
      maxItems: goals.length,
      items: { type: 'string', enum: goals },
      description:
        '用户明确的交付物。monitor 仅核对数采点，alarm 是产生报警，alarmWindow 是在客户端展示报警。未明确时留空。',
    },
    directory: {
      type: 'string',
      enum: Object.keys(directories),
      description: '仅当要寻找可复用工程时，选择本次核对的一类。候选不证明已绑定或适用。',
    },
  },
};
export function readStartQuery(raw: unknown): StartQuery {
  const invalid = () => new HttpError(400, '方案起步的输入、交付目标或工程类型无效。');
  if (
    !raw ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    Object.keys(raw).some((k) => !Object.hasOwn(startSchema.properties, k))
  )
    throw invalid();
  const { input = 'unknown', goals: selected = [], directory } = raw as StartQuery;
  if (
    !inputs.includes(input) ||
    !Array.isArray(selected) ||
    selected.length > goals.length ||
    new Set(selected).size !== selected.length ||
    selected.some((g) => !goals.includes(g)) ||
    (directory !== undefined && (typeof directory !== 'string' || !Object.hasOwn(directories, directory)))
  )
    throw invalid();
  return { input, goals: [...selected], ...(directory && { directory }) };
}
// Each item corresponds to a development menu and an observable completion criterion.
const stages = {
  acquire: [
    'collection',
    '数采管理',
    '在有权工程组选择数采工程。需新建时点「新建工程」，填写名称，平台选目标节点的 Windows 或 Linux。在「数采设备」按协议和点表配置设备，再到「数采变量」建点。',
    '重新打开工程，在设备、变量列表核对驱动、点名、设备及地址。',
  ],
  point: [
    'collection',
    '已有采集点',
    '进入该点所属的数采工程，在「数采变量」核对来源设备、点名和地址。',
    '重开该词条，对照目标设备和测量项，确认是本次输入。',
  ],
  monitor: [
    'collection',
    '数采监视',
    '打开目标节点上运行的数采 App，在「监视」输入完整点名。新建或修改的数采工程须先发布或更新，由有权人员在目标节点部署并启动测试 App。',
    '至少间隔一个采样周期，核对两笔值、质量及源时间。',
  ],
  realtime: [
    'datasource',
    '数据源管理',
    '选择已有工业实时数据源。需新增时在有权分组点「新建工程」，选现场支持的工业适配器，按目标数采工程与实例配置。',
    '重开源配置，核对目标工程与实例，再用消费端读点确认。',
  ],
  reuseRealtime: [
    'datasource',
    '已有实时源',
    '在「数据源管理」核对用户指定的实时源及要使用的点；在消费工程中使用对应的工程内连接名称。',
    '确认源与点的对应关系，记录实际值、质量和源时间。',
  ],
  history: [
    'datasource',
    '历史数据源',
    '在「数据源管理」核对目标历史数据源；准备历史点、时间范围与期望样本。',
    '以固定时间窗独立核对可读记录，再配置报表数据集。',
  ],
  database: [
    'datasource',
    '关系数据源',
    '在「数据源管理」核对目标关系库适配器与连接；准备结果字段、筛选条件和一条可核对的记录。',
    '用约定条件核对数据集字段及行数，连接凭据保留在现场。',
  ],
  calculate: [
    'calculation',
    '计算管理',
    '在「计算管理」的有权工程组打开目标工程，或点「新建工程」填写名称。关联实时源，按触发方式选择周期性或请求式脚本。需要写回时先确认结果点可写。',
    '保存后重读输入、输出和连接；用已知输入复算，最终从目标实例读回结果。',
  ],
  alarm: [
    'alarm',
    '报警管理',
    '在「报警管理」的有权工程组打开目标工程，或点「新建工程」填写名称。在工程内的「数据源管理」关联实时源，在「数据词典 → 快速添加」选择点，再在「编辑 → 报警属性」配置业务阈值与恢复条件。',
    '重开词条核对启用、限值、死区和延时。',
  ],
  eventSource: [
    'datasource',
    '报警事件源',
    '在「数据源管理」复用或新建报警工程类型的数据源，指向目标报警实例。',
    '重开源配置核对目标报警实例，记下客户端要使用的事件源。',
  ],
  reuseEvents: [
    'datasource',
    '已有报警事件源',
    '核对已有事件源指向的报警工程和实例，再从客户端关联。',
    '确认目标报警工程、点及事件类型。',
  ],
  client: [
    'client',
    '客户端管理',
    '在有权工程组打开目标客户端工程；需要空工程时点「新建工程」并填写名称。',
    '空工程先到「页面管理 → 新建页面」，填写页面名称；勾选入口页，在「设为首页」选「PC端首页」。确认首页标记和运行账号的页面访问权限，再发布客户端。',
  ],
  mapping: [
    'client',
    '客户端变量映射',
    '在客户端「数据源管理」配置工程内连接，使用「工程变量 → 快速添加」选择目标点。',
    '重新按变量名检查关联数据源名称与映射 Tag 名称。',
  ],
  screen: [
    'client',
    '二维画面',
    '在「页面管理」打开页面的独立编辑标签，选中目标控件；对动态值核对所用工程变量和该控件支持的绑定方式。',
    '保存并重开同一页面，核对选区、引用及单位。',
  ],
  staticReport: [
    'client',
    '静态报表',
    '在客户端「报表库」选择报表及工作表，填写固定单元格并保存。',
    '重开报表，核对单元格坐标和内容。',
  ],
  staticScreen: [
    'client',
    '静态画面',
    '在客户端「页面管理」打开页面，在独立编辑标签设置静态控件内容并保存。',
    '重开同一页面，核对控件名称和内容。',
  ],
  window: [
    'client',
    '客户端报警窗',
    '在客户端工程关联事件源，打开目标页面，给原生实时报警窗选定该事件源。',
    '运行客户端核对同一报警的首发、持续与恢复，保留点名和事件时间。',
  ],
  report: [
    'client',
    '报表库',
    '在客户端「报表库」选择报表分组，打开或创建报表，确定工作表与单元格，核对所用数据集、字段和查询条件。自定义请求数据集才需进一步核对请求式计算脚本。',
    '用约定查询条件核对结果行和目标格显示值。',
  ],
  scene: [
    'client',
    '3D 资源管理',
    '从客户端「3D资源管理」双击场景，在独立标签选择模型，核对文件、对象和所需绑定。',
    '重开场景核对对象，在目标客户端复核运行显示；模型绑定细节需按对象核实。',
  ],
  release: [
    null,
    '发布与联调',
    '在各本次变更的工程列表执行发布或更新，再在运维中心按节点和 App 核对部署、启动。',
    '使用目标账号打开运行 App，以约定输入检查实际交付结果，记录实例、时间和差异。',
  ],
} as const;
type Stage = keyof typeof stages;
export function solutionRoute(query: StartQuery) {
  const { input, goals } = query;
  const route = new Set<Stage>(),
    missing: string[] = [];
  const has = (g: StartQuery['goals'][number]) => goals.includes(g);
  if (!goals.length)
    missing.push('本次要交付哪种结果，例如只监视采集点、显示实时值、派生计算、报警、报表或 3D？');
  if (input === 'unknown')
    missing.push('输入来自新设备、已建采集点、已有实时或事件源、历史库、关系库，还是纯静态内容？');
  if (missing.length) return { route: [...route], missing };
  const live = ['device', 'point', 'realtime'].includes(input);
  if (has('monitor') && !['device', 'point'].includes(input))
    missing.push('数采监视需要定位目标数采 App 中的点。已知输入是否关联到某个采集点？');
  if (!live && (has('calculate') || has('alarm')))
    missing.push(
      '请确认这项计算或报警读取哪个工程的输入，以及由周期、请求还是数据变化触发，以核对对应接口。',
    );
  if (!live && input !== 'events' && has('alarmWindow'))
    missing.push('报警窗使用哪个已有事件源，或应依据哪个实时点产生报警？');
  if (
    (['database', 'history'].includes(input) && (has('screen') || has('scene'))) ||
    (input === 'events' && (has('scene') || (has('screen') && !has('alarmWindow')))) ||
    (input === 'events' && has('report'))
  )
    missing.push('请确认显示对象如何取得这类数据：报表数据集、实时变量、报警窗或其他已核实的接口。');
  if (missing.length) return { route: [...route], missing };
  if (input === 'device') route.add('acquire');
  if (input === 'point') route.add('point');
  if (has('monitor') || input === 'device') route.add('monitor');
  if (live && goals.some((goal) => goal !== 'monitor'))
    route.add(input === 'realtime' ? 'reuseRealtime' : 'realtime');
  if (input === 'history' || input === 'database') route.add(input);
  if (has('calculate')) route.add('calculate');
  if (has('alarm') || (has('alarmWindow') && input !== 'events')) route.add('alarm');
  if (has('alarmWindow')) route.add(input === 'events' ? 'reuseEvents' : 'eventSource');
  if (has('screen') || has('scene') || has('report') || has('alarmWindow')) route.add('client');
  if (live && (has('screen') || has('scene'))) route.add('mapping');
  if (has('screen') && input !== 'events') route.add(input === 'static' ? 'staticScreen' : 'screen');
  if (has('alarmWindow')) route.add('window');
  if (has('report')) route.add(input === 'static' ? 'staticReport' : 'report');
  if (has('scene')) route.add('scene');
  if (goals.some((goal) => goal !== 'monitor')) route.add('release');
  return { route: [...route], missing };
}

type Reader = Pick<Center, 'call' | 'allowed' | 'require'>;
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
export async function visibleProjects(reader: Reader, token: string, kind: ProjectKind) {
  const directory = directories[kind];
  const candidates: { context: Context; name: string }[] = [];
  const groups = await reader.call(token, '/projectGroup', { projectType: directory.type });
  if (!Array.isArray(groups)) throw new HttpError(502, '工程组目录格式待核实。');
  const seen = new Set<string>();
  let inspected = 0;
  const listings: { groupId: string; projects: any[] }[] = [];
  for (const group of groups.slice(0, 8)) {
    const groupId = group?.guid ?? group?.GUID ?? group?.id;
    if (typeof groupId !== 'string' || !groupId) throw new HttpError(502, '工程组标识待核实。');
    let projects;
    try {
      projects = await reader.call(token, directory.path, { projectGroupId: groupId });
    } catch (error) {
      if (error instanceof HttpError && error.status === 403) continue;
      throw error;
    }
    if (!Array.isArray(projects)) throw new HttpError(502, '工程列表格式待核实。');
    // An inaccessible default group can have more rows than the whole permission-check budget.
    // Keep every visible group in the search and recheck even positively marked rows with Center.
    listings.push({
      groupId,
      projects: projects.filter((p) => p?.hasProjectPermission !== false).slice(0, 32),
    });
  }
  for (let index = 0; index < 32; index++) {
    for (const { groupId, projects } of listings) {
      if (inspected >= 32 || candidates.length >= 8) return candidates;
      if (index >= projects.length) continue;
      const project = projects[index];
      if (
        !project ||
        typeof project.guid !== 'string' ||
        !project.guid ||
        typeof project.name !== 'string' ||
        !project.name
      )
        throw new HttpError(502, '工程目录字段待核实。');
      if (seen.has(project.guid)) continue;
      seen.add(project.guid);
      inspected++;
      const context: Context = { kind, projectId: project.guid, group: groupId, object: '', dirty: false };
      if (await reader.allowed(token, context)) candidates.push({ context, name: project.name });
    }
  }
  return candidates;
}
// end

export async function startSolution(
  reader: Reader,
  token: string,
  entry: Context,
  query: StartQuery,
  onDependency?: (ctx: Context) => void,
) {
  await reader.require(token, entry);
  const { route, missing } = solutionRoute(query);
  const guidance = route.map((key, index) => {
    const [, name, action, check] = stages[key];
    return index + 1 + '. ' + name + '。' + action + ' 验证：' + check;
  });
  const entryRole =
    entry.kind === 'page' || entry.kind === 'scene' || entry.kind === 'report'
      ? 'client'
      : entry.kind === 'period' || entry.kind === 'request'
        ? 'calculation'
        : entry.kind;
  const entryHint =
    entryRole === 'general'
      ? ''
      : '当前入口属于「' + directories[entryRole].label + '」。可沿用当前工程，先核对它在方案中的用途。';
  const roles = [
    ...new Set(route.flatMap((key) => (stages[key][0] ? [directories[stages[key][0]!].label] : []))),
  ];
  const lines = [
    ...(entryHint ? [entryHint] : []),
    ...missing,
    ...(roles.length ? ['涉及的工程入口：' + roles.join('、') + '。优先核对能否复用已有工程。'] : []),
    ...guidance,
  ];
  let candidateCount: number | undefined;
  if (query.directory) {
    const kind = query.directory;
    const directory = directories[kind];
    let candidates: Awaited<ReturnType<typeof visibleProjects>> = [];
    let readable = true;
    try {
      candidates = await visibleProjects(reader, token, kind);
    } catch (error) {
      if (!(error instanceof HttpError) || ![403, 502].includes(error.status)) throw error;
      readable = false;
    }
    for (const { context } of candidates) {
      await reader.require(token, context);
      onDependency?.(context);
    }
    if (readable) candidateCount = candidates.length;
    const at = new Date().toISOString();
    lines.push(
      directory.label + ' · 当前账号可见分组中的候选（' + at + '；最多查看 8 组、核查 32 项、显示 8 项）。',
    );
    lines.push(...candidates.map(({ name, context }) => name + ' · ' + context.projectId));
    lines.push(
      !readable
        ? '工程目录暂时无法核实。可在该类型管理菜单核对可见分组与访问权限，方案步骤仍可使用。'
        : candidates.length
          ? '请按工程标识打开候选，核对数据源、用途和点，再决定复用。'
          : '本次目录范围未检出有权候选；如有直接共享工程，请从已知入口核对，确认没有可复用工程后，可在有权分组点「新建工程」。看不到目标组时请负责人核对该组权限。',
    );
  }
  await reader.require(token, entry);
  return {
    lines,
    projection: {
      layer: 'KF 3.6 操作指引',
      input: query.input,
      goals: query.goals,
      entryRole,
      roles,
      guidance,
      missing,
      ...(query.directory && {
        directory: query.directory,
        directoryStatus: candidateCount === undefined ? 'unverified' : 'checked',
        visibleCandidates: candidateCount,
        candidateScope: '当前账号的有限分组目录；候选仅说明有权读工程，展开本地引用可见名称。',
      }),
    },
  };
}
// end

// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { traceReferences } from './trace.ts';

// Only trace the saved object that anchors the question. Visiting a common data source
// does not establish that its other consumers belong to the developer's solution.
export async function planFromEntry(
  center: Center,
  token: string,
  entry: Context,
  query: StartQuery,
  onDependency?: (ctx: Context) => void,
) {
  const result = await startSolution(center, token, entry, query, onDependency);
  if (!query.goals.includes('calculate') || !['period', 'request', 'page', 'report'].includes(entry.kind))
    return result;
  if ((entry.kind === 'page' && !entry.control) || (entry.kind === 'report' && !entry.cell)) return result;
  let traced: Awaited<ReturnType<typeof traceReferences>>;
  try {
    traced = await traceReferences(center, token, entry, () => [], false, undefined, onDependency);
  } catch (error) {
    if (!(error instanceof HttpError) || ![404, 502].includes(error.status)) throw error;
    await center.require(token, entry);
    const gap = '当前选区的已保存引用尚无法回读。请核对选区和保存状态，已知的业务目标仍可继续整理。';
    return {
      lines: [gap, ...result.lines],
      projection: { ...result.projection, calculationScope: { layer: 'unknown', guidance: gap } },
    };
  }
  const directions = [...new Set(traced.trails.map((edge) => edge.status))];
  const limit = 16;
  const scope = {
    layer: traced.layer,
    observedAt: traced.at,
    evidenceId: traced.id,
    relations: traced.trails.length,
    displayed: Math.min(traced.trails.length, limit),
    directions,
    gaps: traced.gaps.length,
    membershipConfirmed: false,
    runtimeVerified: false,
    guidance:
      '先依据当前对象的已保存关系定位输入和输出。开发人员确认业务用途、单位、触发时机及异常处理后，再选计算宿主与验算样本。',
  };
  const lines = [
    '当前对象的已保存引用 · ' + traced.at + ' · ' + traced.id,
    ...traced.trails.slice(0, limit).map((edge) => edge.status + ' · ' + edge.path),
    ...(traced.trails.length > limit ? ['当前仅展开前 16 条关系。'] : []),
    ...traced.gaps,
    '关联工程可作为方案候选或外部依赖，归属由开发人员确认。',
    ...result.lines,
  ];
  return { lines, projection: { ...result.projection, calculationScope: scope } };
}
// end
