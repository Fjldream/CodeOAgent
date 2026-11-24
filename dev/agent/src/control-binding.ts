// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import type { Center } from './center.ts';
import { clientVariableRows } from './client-variables.ts';
import { realtimeSource } from './client-points.ts';
import { pageWrites, validControlIdentifier, controlKind, selectedControls } from './page-trace.ts';
import { HttpError, type Context } from './shared.ts';

type Reader = Pick<Center, 'call' | 'allowed' | 'require'>;
export type BindingQuery = { variable?: string };
export const bindingSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    variable: {
      type: 'string',
      maxLength: 160,
      description: '需要消歧时填写当前客户端工程变量的完整名称。省略可查候选。',
    },
  },
};
export function readBindingQuery(input: unknown): BindingQuery {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => k !== 'variable')
  )
    throw new HttpError(400, '绑定查询参数无效');
  if (!('variable' in input)) return {};
  if (
    typeof input.variable !== 'string' ||
    !input.variable.trim() ||
    input.variable.length > 160 ||
    /[\u0000-\u001f]/.test(input.variable)
  )
    throw new HttpError(400, '工程变量名无效');
  return { variable: input.variable.trim() };
}
function list(data: unknown): Record<string, any>[] {
  if (!Array.isArray(data) || data.some((r) => !r || typeof r !== 'object' || Array.isArray(r)))
    throw new HttpError(502, '绑定资料格式待核实，请重新打开工程查询。');
  return data;
}
const identifier = /^[A-Za-z_$][\w$]*$/;
const maxRows = 12;
// Resolve from a client variable through its exact connection, source definition, project and point.
// A point with the same name in another collection cannot satisfy this relation.
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
export async function variableChoices(
// end
  reader: Reader,
  token: string,
  context: Context,
  query: BindingQuery,
  depend: (c: Context) => void,
) {
  const q = { projectId: context.projectId };
  const variables = clientVariableRows(await reader.call(token, '/client/getVariableList', q));
  const mapped = variables.filter(
    (v) => v.isMap === true && (!query.variable || v.name === query.variable),
  );
  const eligible: { name: string; alias: string; tag: string; device: string }[] = [];
  if (!mapped.length) return { eligible, limited: false };
  const aliases = list((await reader.call(token, '/client/getDataSourceList', q)).message);
  const sources = list(await reader.call(token, '/dataSource/getAllDataSource'));
  const pointTables = new Map<string, Record<string, any>[]>();
  const allowed = new Map<string, boolean>();
  async function access(kind: 'datasource' | 'collection', id: unknown) {
    if (typeof id !== 'string' || !id) return false;
    const ctx: Context = { kind, projectId: id, object: '', dirty: false };
    const key = kind + ':' + id;
    if (!allowed.has(key)) allowed.set(key, await reader.allowed(token, ctx));
    if (!allowed.get(key)) return false;
    depend(ctx);
    return true;
  }
  for (const row of mapped.slice(0, maxRows)) {
    if (row.isSub !== true || variables.filter((v) => v.name === row.name).length !== 1) continue;
    const link = aliases.filter((a) => a.id && a.id === row.projectDataSourceId);
    if (link.length !== 1) continue;
    const [alias] = link,
      item = row.dataSourceItem;
    if (
      !alias.name ||
      !alias.appName ||
      alias.appName !== item?.appName ||
      !item.tagName ||
      aliases.filter((a) => a.name === alias.name).length !== 1
    )
      continue;
    const definitions = sources.filter((s) => s.name === (alias.dataSourceName || alias.appName));
    if (definitions.length !== 1) continue;
    const [source] = definitions;
    if (!(await access('datasource', source.guid)) || !realtimeSource(source.type, source.config)) continue;
    const projectId = source.config.engineeringId;
    if (!(await access('collection', projectId))) continue;
    if (!pointTables.has(projectId))
      pointTables.set(
        projectId,
        list(await reader.call(token, '/collect/variables', { projectId, groupId: '-1' })),
      );
    const points = pointTables.get(projectId)!.filter((p) => p.tagName === item.tagName);
    if (
      points.length !== 1 ||
      typeof points[0].deviceName !== 'string' ||
      !points[0].deviceName ||
      ![0, 2, '0', '2'].includes(points[0].accessType)
    )
      continue;
    eligible.push({ name: row.name, alias: alias.name, tag: item.tagName, device: points[0].deviceName });
  }
  return { eligible, limited: mapped.length > maxRows };
}

export async function inspectControlBinding(
  reader: Reader,
  token: string,
  context: Context,
  query: BindingQuery,
  onDependency?: (c: Context) => void,
) {
  if (context.kind !== 'page' || !context.control)
    throw new HttpError(400, '请在二维页面编辑器单选一个控件。');
  await reader.require(token, context);
  const params = { projectId: context.projectId };
  const index = list((await reader.call(token, '/client/getPages', params)).message?.Pages);
  if (index.filter((p) => p.name === context.object).length !== 1)
    throw new HttpError(409, '已保存页面名称不唯一或不存在。');
  const pages = list(
    (
      await reader.call(token, '/client/batchGetPageFile', {
        ...params,
        pageArr: JSON.stringify([context.object]),
      })
    ).success,
  );
  if (pages.length !== 1 || pages[0].pageProperty?.name !== context.object)
    throw new HttpError(409, '返回页面与当前选区不一致。');
  const page = pages[0],
    objects = list(page.objects),
    matches = selectedControls(objects, context);
  if (matches.length !== 1)
    throw new HttpError(409, '当前选区尚未在保存版本中唯一定位，请核对页面保存状态。');
  const [object] = matches,
    kind = controlKind(object);
  const deps = new Map<string, Context>();
  const lines = ['已保存选区 · ' + context.object + ' / ' + object.name];
  if (context.dirty) lines.push('当前编辑器有未保存改动，此次核对以 Center 保存版本为准。');
  async function finish(state: string, guide: string, count = 0) {
    for (const dep of deps.values()) {
      await reader.require(token, dep);
      onDependency?.(dep);
    }
    await reader.require(token, context);
    const at = new Date().toISOString();
    lines.push(guide, '查询时间 · ' + at);
    return {
      lines,
      at,
      projection: {
        kind,
        state,
        eligibleVariables: count,
        guidance: guide,
        runtimeVerified: false as const,
        ...(kind !== 'unknown' && {
          event: '页面连接 → 基本 → 存在时',
          property: kind === 'text' ? 'setText(字符串)' : 'Caption',
          selector: '脚本工具栏 → 变量 → 工程变量 → 所属分组',
          localReference: '[[inspect_control_binding]]',
        }),
      },
    };
  }
  if (
    kind === 'unknown' ||
    typeof object.name !== 'string' ||
    !validControlIdentifier(object.name) ||
    objects.filter((o) => o.name === object.name).length !== 1
  )
    return finish(
      'unsupported',
      '请在属性面板核对控件类型与唯一名称。本版支持文本控件及 Element UI 按钮的动态文字。',
    );
  const sink = kind === 'text' ? 'setText' : 'Caption';
  lines.push(
    kind === 'text'
      ? '文本控件 · 显示接口 setText(字符串)；「属性 → 数据 → 文本」为初始文字。'
      : 'Element UI 按钮 · 动态标题属性 Caption；显示标题时保留按钮原有的点击动作。',
  );
  const links = list(page.linkMng?.linkList);
  const cycles = links.filter((l) => l.linkId === 2);
  if (cycles.length > 1)
    return finish('ambiguous', '当前页面存在多个“存在时”事件，先在连接编辑器核对实际事件。');
  const cycle = cycles[0];
  if (cycle && (typeof cycle.script !== 'string' || typeof cycle.enable !== 'boolean'))
    return finish('unresolved', '“存在时”事件格式需在原生编辑器复核。');
  const writes = pageWrites(cycle?.script ?? '', object.name, sink);
  const otherScripts = [
    ...links.filter((l) => l.linkId !== 2),
    ...list(object.linkMng?.linkList ?? []),
  ].filter((l) => l.enable !== false && l.script);
  const competing = otherScripts.some((link) => {
    if (typeof link.script !== 'string') return true;
    const other = pageWrites(link.script, object.name, sink);
    return other.partial || other.writes > 0;
  });
  const { eligible, limited } = await variableChoices(reader, token, context, query, (dep) =>
    deps.set(dep.kind + ':' + dep.projectId, dep),
  );
  for (const row of eligible)
    lines.push('可选工程变量 · ' + row.name + ' ← ' + row.alias + ' / ' + row.tag + ' · ' + row.device);
  if (limited) lines.push('本轮只核对前 12 个映射，填写完整工程变量名可缩小范围。');
  const known = eligible.filter((v) => writes.tags.includes(v.name));
  if (
    cycle?.enable &&
    writes.writes &&
    !writes.partial &&
    !competing &&
    writes.writes === 1 &&
    writes.tags.length === 1 &&
    known.length === 1
  ) {
    lines.push(
      '已保存绑定 · 页面「存在时」 → ' +
        object.name +
        '.' +
        sink +
        ' ← ' +
        known[0].name +
        ' · 刷新间隔 ' +
        String(cycle.intervalMs ?? '待核实') +
        ' ms',
      '复核或改绑时，点画布空白处 →「连接 → 基本 → 存在时」→ 事件行右侧「…」。在现有写入语句中选中变量引用，用脚本工具栏「变量 → 工程变量」从所属分组选择目标变量。保存后单选原控件重查。',
    );
    return finish(
      'bound',
      '该控件的读取已保存。打开目标客户端 App，在「工程工具 → 核对发布与运行画面」核对事件版本和该控件实际显示。',
      eligible.length,
    );
  }
  if (competing || writes.partial || writes.writes || (cycle && !cycle.enable && cycle.script.trim()))
    return finish(
      'review',
      '打开页面「连接 → 基本 → 存在时」及控件自身的「连接」，核对已有写入、停用脚本或其他事件，再决定修改哪一处。',
      eligible.length,
    );
  if (!eligible.length)
    return finish(
      'no-variable',
      '请先在客户端「工程变量」核对映射、订阅以及源工程读取权限。可从「查采集点与变量映射」定位上游，再回到该控件查询。',
    );
  if (eligible.length !== 1 || limited)
    return finish(
      'choose',
      '按设备和点选择一个目标，在绑定查询中填入对应的完整工程变量名。',
      eligible.length,
    );
  const variable = eligible[0].name;
  if (!identifier.test(variable))
    return finish(
      'selector',
      '请从原生变量选择器插入实际工程变量并核对表达式，当前名称需要编辑器确认。',
      1,
    );
  const ref = '$System.' + variable;
  const expr = 'String(' + ref + ' == null ? "" : ' + ref + ')';
  lines.push(
    '点画布空白处，打开右侧「连接 → 基本 → 存在时」，单击事件行右侧的「…」。',
    '脚本工具栏点「变量 → 工程变量」，在所属分组选择 ' +
      variable +
      '。核对插入的 $System 引用。将本次插入的引用替换为下方完整语句，放在已有脚本末尾的单独一行。',
    kind === 'text' ? object.name + '.setText(' + expr + ');' : object.name + '.Caption = ' + expr + ';',
  );
  return finish(
    'ready',
    '核对“刷新时间间隔(ms)”，勾选“存在时”并点「确认」。按钮被编辑区遮挡时，可用 Tab 移至「确认」后按 Enter。点击页面工具栏「保存」或按 Ctrl+S，再单选原控件重查绑定。',
    1,
  );
}
// end
