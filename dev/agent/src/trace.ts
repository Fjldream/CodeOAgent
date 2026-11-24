// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { randomUUID } from 'node:crypto';
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import { Center } from './center.ts';
import { reportReference } from './report-reference.ts';
// end
import { type Context, type Evidence, HttpError, identifier } from './shared.ts';

type Binding = NonNullable<Evidence['bindings']>[number];
type Trail = { path: string; source: string; status: string };
function key(context: Context) {
  return JSON.stringify([context.kind, context.projectId, context.object, context.control || '']);
}
const endpoint = (b: Binding) =>
  JSON.stringify([b.source, b.name, b.direction === 'event' ? 'event' : 'point']);
const directions = { read: '读取', write: '写回', event: '事件源' };
function project(kind: Context['kind'], id: string): Context {
  return { kind, projectId: identifier(id), object: '', dirty: false };
}

// A query rebuilds its bounded index from authorized saved objects. Old turns supply locators only.
export async function traceReferences(
  center: Center,
  token: string,
  current: Context,
  scope: (bindings: Binding[]) => Context[],
  reverse: boolean,
  refresh?: (context: Context, evidence: Evidence) => void,
  recordAccess?: (context: Context) => void,
) {
  await center.require(token, current);
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  if (!['page', 'period', 'request', 'report'].includes(current.kind))
    throw new HttpError(400, '请打开二维页面、计算脚本或报表单元格');
  if (current.kind === 'report' && reverse) throw new HttpError(400, '报表单元格当前支持追踪上游');
  // end
  const selected = await center.evidence(token, current);
  if (!selected) throw new HttpError(404, '当前对象缺少已保存证据');
  const trails: Trail[] = [],
    gaps = new Set<string>(),
    dependencies: Context[] = [current];
  const inputs = selected.bindings ?? [];
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  if (!inputs.length && current.kind !== 'report') gaps.add('当前范围没有可唯一定位的静态连接。');
  refresh?.(current, selected);
  if (current.kind === 'report') {
    const report = await reportReference(center, token, current, selected);
    trails.push(...report.trails);
    report.gaps.forEach((item) => gaps.add(item));
    dependencies.push(...report.depends);
  } else if (reverse) {
    // end
    const visited = new Set([key(current)]);
    let remaining = 16;
    for (const other of scope(inputs)) {
      if (!['page', 'period', 'request'].includes(other.kind) || visited.has(key(other))) continue;
      visited.add(key(other));
      if (!(await center.allowed(token, other))) continue;
      if (!remaining--) {
        gaps.add('本次最多复核 16 个可见对象。');
        break;
      }
      let result;
      try {
        result = await center.evidence(token, other);
      } catch (error) {
        if (error instanceof HttpError && [403, 404].includes(error.status)) continue;
        throw error;
      }
      if (!result) continue;
      refresh?.(other, result);
      const matches = (result.bindings ?? []).filter((candidate) =>
        inputs.some(
          (input) =>
            endpoint(input) === endpoint(candidate) &&
            (!input.definition || !candidate.definition || input.definition === candidate.definition),
        ),
      );
      if (matches.length) dependencies.push(other);
      for (const b of matches)
        trails.push({
          path: b.source + ' / ' + b.name + ' ← ' + result.title + '（' + directions[b.direction] + '）',
          source: result.id,
          status: '已保存配置',
        });
    }
    gaps.add('反查范围为本方案各段对话已访问的页面、单选控件和计算脚本。目标实例的部署归属需另外核对。');
  } else if (inputs.length) {
    const definitions = await center.call(token, '/dataSource/getAllDataSource');
    if (!Array.isArray(definitions)) throw new HttpError(502, '数据源目录格式未适配');
    const targets = new Map<string, any[]>();
    for (const name of new Set(inputs.map((b) => b.definition || b.source))) {
      const visible = [];
      for (const row of definitions.filter((item) => item.name === name && typeof item.guid === 'string')) {
        const ctx = project('datasource', row.guid);
        if (await center.allowed(token, ctx)) {
          visible.push(row);
          dependencies.push(ctx);
        }
      }
      targets.set(name, visible);
    }
    const points = new Map<string, any[]>();
    for (const b of inputs) {
      const head = selected.title + ' → ' + b.alias + ' → ' + b.source + (b.name ? ' / ' + b.name : '');
      const rows = targets.get(b.definition || b.source) ?? [];
      trails.push({ path: head, source: selected.id, status: directions[b.direction] + '配置' });
      if (rows.length !== 1) {
        gaps.add('目标数据源无法在当前权限范围内唯一核实。');
        continue;
      }
      const target = rows[0],
        conf = target.config;
      if (b.direction === 'event') {
        if (target.type === 'AlarmEngineering' && typeof conf?.alarmProject === 'string' && conf.alarmProject)
          trails.push({
            path: head + ' → ' + conf.alarmProject,
            source: 'dataSource.config.alarmProject',
            status: '报警工程配置名',
          });
        continue;
      }
      if (!conf?.engineeringId || !b.name) {
        gaps.add('缺少可核对的数采工程 ID 或点名。');
        continue;
      }
      const io = project('collection', conf.engineeringId);
      if (!(await center.allowed(token, io))) {
        gaps.add('上游点表未核实。');
        continue;
      }
      dependencies.push(io);
      if (!points.has(io.projectId)) {
        const result = await center.call(token, '/collect/variables', {
          projectId: io.projectId,
          groupId: '-1',
        });
        if (!Array.isArray(result)) throw new HttpError(502, '点表格式未适配');
        points.set(io.projectId, result);
      }
      const matches = points.get(io.projectId)!.filter((p) => p.tagName === b.name);
      if (matches.length !== 1) {
        gaps.add('上游点表未唯一匹配。');
        continue;
      }
      const p = matches[0];
      trails.push({
        path:
          head +
          ' → ' +
          (conf.engineeringName || io.projectId) +
          ' / ' +
          p.deviceName +
          ' / ' +
          p.tagName +
          '（地址 ' +
          p.regAddress +
          '）',
        source: 'dataSource.config.engineeringId → collect/variables.tagName',
        status: '已保存上游',
      });
      if (!b.definition) gaps.add('脚本连接按可见同名数据源关联，实例与工程的部署对应仍需核验。');
    }
  }
  for (const ctx of dependencies) {
    await center.require(token, ctx);
    recordAccess?.(ctx);
  }
  return { id: randomUUID(), at: new Date().toISOString(), layer: 'saved', trails, gaps: [...gaps] };
}
// end
