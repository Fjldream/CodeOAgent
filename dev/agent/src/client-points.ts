// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
import { randomUUID } from 'node:crypto';
import type { Center } from './center.ts';
import { clientVariableRows } from './client-variables.ts';
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import { controlKind, selectedControls } from './page-trace.ts';
// end
import { controlInputs } from './page-trace.ts';
import type { PointQuery } from './query-tools.ts';
import { HttpError, type Context } from './shared.ts';

type Reader = Pick<Center, 'call' | 'allowed' | 'require'>;
type Project = { context: Context; name: string; type?: string; upstream?: string };
type Point = { projectId: string; project: string; device: string; tag: string; address: string };
const candidateLimit = 12;
const projectLimit = 24;
const projectGuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function rows(value: unknown, source: string): any[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object'))
    throw new HttpError(502, source + '返回格式待核实。');
  return value;
}

// Follow the same group-scoped directories as the development UI. Check each project
// separately before following any of its relations or showing its name.
async function projects(reader: Reader, token: string, kind: 'collection' | 'datasource', filter?: string) {
  const result = new Map<string, Project>();
  const groups = rows(
    await reader.call(token, '/projectGroup', { projectType: kind === 'collection' ? '2' : '3' }),
    '工程组',
  );
  for (const group of groups) {
    if (typeof group.guid !== 'string') throw new HttpError(502, '工程组标识待核实。');
    let listing;
    try {
      listing = await reader.call(token, kind === 'collection' ? '/collect/project' : '/dataSource/project', {
        projectGroupId: group.guid,
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 403) continue;
      throw error;
    }
    for (const row of rows(listing, '工程目录')) {
      if (typeof row.guid !== 'string' || typeof row.name !== 'string')
        throw new HttpError(502, '工程标识待核实。');
      if (filter && row.guid !== filter && row.name !== filter) continue;
      const context: Context = { kind, group: group.guid, projectId: row.guid, object: '', dirty: false };
      if (!result.has(row.guid) && (await reader.allowed(token, context))) {
        const config = row.projectData?.config;
        // KF's network industrial adapter distinguishes realtime (1), history (2) and events (3).
        if (kind === 'datasource' && !realtimeSource(row.projectData?.type, config)) continue;
        result.set(row.guid, {
          context,
          name: row.name,
          type: row.projectData?.type,
          upstream: config?.engineeringId,
        });
      }
    }
  }
  return [...result.values()];
}

// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
export function realtimeSource(type: unknown, config: any) {
// end
  if (type === '工业数据源_网络模式' && !/^KingIOServer/i.test(config?.newWorkDateType ?? '')) return false;
  return (
    typeof type === 'string' &&
    /KingIOServer|工业数据源_网络模式/i.test(type) &&
    typeof config?.engineeringId === 'string' &&
    Array.isArray(config.dataType) &&
    config.dataType.some((value: unknown) => String(value) === '1')
  );
}

async function sharedCollection(reader: Reader, token: string, guid: string): Promise<Project | undefined> {
  const context: Context = { kind: 'collection', projectId: guid, object: '', dirty: false };
  if (!(await reader.allowed(token, context))) return;
  // KF can share a project without making its group visible. The permission
  // receipt identifies the project; the source's configured instance name does not.
  return { context, name: guid };
}

export async function inspectClientPoints(
  reader: Reader,
  token: string,
  entry: Context,
  query: PointQuery,
  onDependency?: (context: Context) => void,
) {
  if (!['client', 'page'].includes(entry.kind))
    throw new HttpError(400, '请从客户端工程或二维页面查采集点。');
  await reader.require(token, entry);
  const deps = new Map<string, Context>();
  const depend = (ctx: Context) => deps.set(ctx.kind + ':' + ctx.projectId, ctx);
  depend(entry);
  const evidenceId = randomUUID();
  const clientRead = (path: string, extra = {}) =>
    reader.call(token, path, { projectId: entry.projectId, ...extra });
  const aliases = rows((await clientRead('/client/getDataSourceList')).message, '客户端连接');
  const variables = clientVariableRows(await clientRead('/client/getVariableList'));
  let controlName = '';
  const controlTags = new Set<string>();
  if (entry.kind === 'page' && entry.control) {
    const pagesIndex = rows((await clientRead('/client/getPages')).message?.Pages, '页面目录');
    if (pagesIndex.filter((p) => p.name === entry.object).length !== 1)
      throw new HttpError(409, '当前工程无法唯一定位已保存页面。');
    const pages = rows(
      (await clientRead('/client/batchGetPageFile', { pageArr: JSON.stringify([entry.object]) })).success,
      '页面',
    );
    const controls =
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      pages.length === 1 && selectedControls(rows(pages[0].objects, '控件'), entry);
      // end
    if (!controls || controls.length !== 1)
      throw new HttpError(409, '已保存页面无法定位当前选区，请核对保存状态并重新选择控件。');
    controlName = controls[0].name;
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    const sink = controlKind(controls[0]) === 'button' ? 'Caption' : 'setText';
    // end
    for (const link of rows(pages[0].linkMng?.linkList ?? [], '页面脚本')) {
      if (link.enable !== false && typeof link.script === 'string')
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        for (const tag of controlInputs(link.script, controlName, sink).tags) controlTags.add(tag);
        // end
    }
  }
  const clientAt = new Date().toISOString();
  const sourceProjects = await projects(reader, token, 'datasource');
  const linkedNames = new Set(
    aliases
      .filter((a) => !a.type || /KingIOServer|工业数据源_网络模式/i.test(a.type))
      .map((alias) => alias.dataSourceName || alias.appName)
      .filter(Boolean),
  );
  // A directly shared source may live outside the user's development menu groups.
  const usedSourceDirectory = [...linkedNames].some((name) => !sourceProjects.some((p) => p.name === name));
  if (usedSourceDirectory) {
    const directory = rows(await reader.call(token, '/dataSource/getAllDataSource'), '数据源目录');
    for (const row of directory) {
      if (
        !linkedNames.has(row.name) ||
        !realtimeSource(row.type, row.config) ||
        typeof row.guid !== 'string' ||
        sourceProjects.some((p) => p.context.projectId === row.guid)
      )
        continue;
      const ctx: Context = { kind: 'datasource', projectId: row.guid, object: '', dirty: false };
      if (await reader.allowed(token, ctx))
        sourceProjects.push({
          context: ctx,
          name: row.name,
          type: row.type,
          upstream: row.config.engineeringId,
        });
    }
  }
  const sourceAt = new Date().toISOString();
  const collections = await projects(reader, token, 'collection', query.project);
  const linkedIds = new Set(sourceProjects.filter((p) => linkedNames.has(p.name)).map((p) => p.upstream!));
  const extraIds = query.project && projectGuid.test(query.project) ? [query.project] : linkedIds;
  for (const guid of extraIds) {
    if (collections.some((p) => p.context.projectId === guid)) continue;
    const shared = await sharedCollection(reader, token, guid);
    if (shared && (!query.project || [guid, shared.name].includes(query.project))) collections.push(shared);
  }
  collections.sort(
    (a, b) => Number(linkedIds.has(b.context.projectId)) - Number(linkedIds.has(a.context.projectId)),
  );
  const points: Point[] = [];
  let limited = collections.length > projectLimit;
  for (const project of collections.slice(0, projectLimit)) {
    const listing = rows(
      await reader.call(token, '/collect/variables', { projectId: project.context.projectId, groupId: '-1' }),
      '数采点表',
    );
    for (const item of listing) {
      if (typeof item.tagName !== 'string' || typeof item.deviceName !== 'string')
        throw new HttpError(502, '采集点字段待核实。');
      if ((query.tag && item.tagName !== query.tag) || (query.device && item.deviceName !== query.device))
        continue;
      if (points.length >= candidateLimit) {
        limited = true;
        break;
      }
      depend(project.context);
      points.push({
        projectId: project.context.projectId,
        project: project.name,
        device: item.deviceName,
        tag: item.tagName,
        address: String(item.regAddress ?? ''),
      });
    }
    if (points.length >= candidateLimit && limited) break;
  }
  const pointAt = new Date().toISOString();
  const status = limited
    ? 'limited'
    : points.length === 0
      ? 'unverified'
      : points.length === 1
        ? 'unique'
        : 'ambiguous';
  const paths: {
    source: string;
    alias?: string;
    variable?: string;
    state: string;
    subscription?: boolean;
    explicitControlRead?: boolean;
  }[] = [];
  if (status === 'unique') {
    const point = points[0];
    for (const source of sourceProjects.filter((item) => item.upstream === point.projectId)) {
      depend(source.context);
      if (paths.length >= candidateLimit) {
        limited = true;
        break;
      }
      const connections = aliases.filter((alias) => (alias.dataSourceName || alias.appName) === source.name);
      if (!connections.length) paths.push({ source: source.name, state: 'needsConnection' });
      for (const conn of connections) {
        if (paths.length >= candidateLimit) {
          limited = true;
          break;
        }
        const base = { source: source.name, alias: conn.name };
        if (
          !conn.id ||
          !conn.appName ||
          aliases.filter((row) => row.id === conn.id || row.name === conn.name).length !== 1 ||
          sourceProjects.filter((row) => row.name === source.name).length !== 1
        ) {
          paths.push({ ...base, state: 'uncertain' });
          continue;
        }
        const related = variables.filter(
          (row) =>
            row.dataSourceItem?.tagName === point.tag &&
            (row.projectDataSourceId === conn.id || row.dataSourceItem?.appName === conn.appName),
        );
        const mappings = related.filter(
          (row) => row.projectDataSourceId === conn.id && row.dataSourceItem?.appName === conn.appName,
        );
        if (!mappings.length) paths.push({ ...base, state: related.length ? 'uncertain' : 'needsMapping' });
        for (const row of mappings) {
          if (paths.length >= candidateLimit) {
            limited = true;
            break;
          }
          paths.push({
            ...base,
            variable: row.name,
            state:
              variables.filter((v) => v.name === row.name).length !== 1
                ? 'uncertain'
                : row.isMap === true
                  ? 'mapped'
                  : row.isMap === false
                    ? 'disabled'
                    : 'uncertain',
            subscription: typeof row.isSub === 'boolean' ? row.isSub : undefined,
            explicitControlRead: controlName ? controlTags.has(row.name) : undefined,
          });
        }
      }
    }
  }
  for (const ctx of deps.values()) {
    await reader.require(token, ctx);
    onDependency?.(ctx);
  }
  const lines = [
    '已保存配置 · 证据 ' + evidenceId,
    ...(entry.dirty ? ['当前标签有未保存修改，下列关系来自 Center 保存版本。'] : []),
    ...(controlName ? ['当前选区：' + entry.object + ' / ' + controlName] : []),
    ...points.map(
      (p) =>
        p.project +
        (points.some((v) => v.project === p.project && v.projectId !== p.projectId)
          ? '（' + p.projectId + '）'
          : '') +
        ' / ' +
        p.device +
        ' / ' +
        p.tag +
        (p.address ? ' · 地址 ' + p.address : ''),
    ),
  ];
  if (status === 'unverified') lines.push('当前账号及筛选范围内未能核实目标点。请核对点名、设备或数采工程。');
  if (status === 'ambiguous' || status === 'limited')
    lines.push('请用完整点名、设备名或数采工程缩小范围后查询。');
  if (status === 'unique' && !paths.length)
    lines.push('尚未核实指向此工程的有权实时数据源。请核对数据源关联的数采工程。');
  for (const row of paths) {
    const prefix = [row.source, row.alias, row.variable].filter(Boolean).join(' → ');
    const labels: Record<string, string> = {
      needsConnection: '客户端尚缺这条连接，在「数据源管理」添加此源。',
      needsMapping: '尚无匹配映射，打开「工程变量 → 快速添加」选择该连接和点。',
      mapped: '已保存映射，可在控件中使用该工程变量。',
      disabled: '映射未启用。',
      uncertain: '连接或映射标识需核实。',
    };
    lines.push(
      prefix +
        ' · ' +
        labels[row.state] +
        (row.subscription === undefined ? '' : row.subscription ? ' 已启用订阅配置。' : ' 未启用订阅配置。') +
        (row.explicitControlRead === undefined
          ? ''
          : row.explicitControlRead
            ? ' 已识别当前控件的显式读取。'
            : ' 在支持的写法中未识别当前控件的显式读取。'),
    );
  }
  if (limited) lines.push('已达到本次查询上限，展示范围有限。');
  lines.push('运行画面待验证：核对目标客户端 App 的发布与部署，再在运行页观察同一控件的新读数。');
  const sources = [
    {
      source:
        'client/getDataSourceList · client/getVariableList' +
        (controlName ? ' · client/batchGetPageFile' : ''),
      at: clientAt,
    },
    {
      source:
        'projectGroup · dataSource/project' + (usedSourceDirectory ? ' · dataSource/getAllDataSource' : ''),
      at: sourceAt,
    },
    {
      source:
        'project/permissions · projectGroup · collect/project' +
        (collections.length ? ' · collect/variables' : ''),
      at: pointAt,
    },
  ];
  lines.push(...sources.map((item) => item.at + ' · ' + item.source));
  return {
    id: evidenceId,
    layer: 'saved',
    status,
    limited,
    points,
    paths,
    sources,
    lines,
    runtimeVerified: false,
  };
}

export type PointResult = Awaited<ReturnType<typeof inspectClientPoints>>;
export function pointProjection(result: PointResult) {
  return {
    objectType: 'collectionPoint',
    id: result.id,
    layer: result.layer,
    status: result.status,
    limited: result.limited,
    candidates: result.points.map((_, i) => ({ ref: i + 1 })),
    paths: result.paths.map((p) => ({
      state: p.state,
      subscribed: p.subscription,
      explicitControlRead: p.explicitControlRead,
    })),
    runtimeVerified: false,
    at: result.sources.at(-1)?.at,
  };
}
// end
