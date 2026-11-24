// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
// modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
import { createHash } from 'node:crypto';
import { appearanceRule, describeAppearance } from './scene-appearance.ts';
// end
import type { Center } from './center.ts';
import { clientVariableRows } from './client-variables.ts';
import { variableChoices } from './control-binding.ts';
import { HttpError, type Context } from './shared.ts';
import { appObservations } from './runtime.ts';
import { screenTargets } from './runtime-screen.ts';

export const sceneHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const conflict = (message: string) => new HttpError(409, message);
const axes: Record<string, number> = { 水平移动: 0, 垂直移动: 1, 进深移动: 2 };
export function motionRule(event: any) {
  const c = event?.connectObj;
  if (!Object.hasOwn(axes, event?.propertyName) || !c || c.moveMode !== 0 || c.inputflag !== false)
    return null;
  const fields = [c.inputVal1, c.inputVal2, c.moveVal1, c.moveVal2];
  if (
    !fields.every(
      (v) =>
        (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)),
    )
  )
    return null;
  const [low, high, left, right] = fields.map(Number);
  return high > low
    ? {
        axis: axes[event.propertyName],
        low,
        high,
        left: -Math.abs(left),
        right,
      }
    : null;
}
type Binding = {
  id: string;
  page: string;
  layout: string;
  guid: string;
  part: string;
  scene: string;
  property: string;
  variable: string;
  enabled: boolean;
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  rule: ReturnType<typeof motionRule> | ReturnType<typeof appearanceRule>;
  // end
  pageSubscription?: boolean;
};
export function pageBindings(file: any, scene: string, tag: string) {
  const result: Binding[] = [];
  const page = file.pageProperty.name;
  function visit(objects: any[]) {
    for (const obj of objects) {
      const graphic = obj?.graphicHTObj;
      if (
        obj?.prototypeName === 'HT3DLayout' &&
        graphic?.htJsonPath === 'storage/scenes/' + scene.slice(0, -5) &&
        Array.isArray(graphic.htModelEventMng)
      ) {
        for (const target of graphic.htModelEventMng.filter((x: any) => x?.htModelTag === tag)) {
          for (const e of Array.isArray(target.expressionEventMng) ? target.expressionEventMng : []) {
            if (typeof e?.variableName !== 'string' || typeof e.propertyName !== 'string') continue;
            const guid = obj.baseProperty?.guid;
            result.push({
              id: sceneHash([page, guid, tag, e.propertyName]),
              page,
              layout: String(obj.baseProperty?.name || ''),
              guid,
              part: tag,
              scene,
              property: e.propertyName,
              variable: e.variableName,
              enabled: e.enable === true,
              // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
              rule: appearanceRule(e) || motionRule(e),
              // end
            });
          }
        }
      }
      if (Array.isArray(obj?.objects)) visit(obj.objects);
    }
  }
  visit(file.objects);
  return result;
}
export function pageSubscribes(entries: any, variable: Record<string, any>) {
  if (!Array.isArray(entries) || variable.id == null || !variable.projectDataSourceId) return undefined;
  return entries.some(
    (source) =>
      (source?.id === variable.projectDataSourceId || (!source?.id && source?.name === variable.type)) &&
      Array.isArray(source.subscribe) &&
      source.subscribe.some((id: unknown) => String(id) === String(variable.id)),
  );
}
export async function savedScene(center: Center, token: string, ctx: Context) {
  const selection = ctx.sceneView,
    tag = selection?.item?.tag,
    scene = selection?.path || ctx.object;
  await center.require(token, ctx);
  const rows: Binding[] = [],
    lines: string[] = [];
  if (
    ctx.kind !== 'scene' ||
    selection?.document !== 'active' ||
    !selection.path ||
    selection.selected !== 1 ||
    !tag
  ) {
    lines.push('打开已保存的场景，在原生编辑器单选一个具有唯一 Tag 的模型部件。名称和编辑坐标可用于定位。');
    return { rows, lines, complete: false };
  }
  await center.evidence(token, ctx);
  lines.push('当前选区 · ' + scene + ' / ' + (selection.item?.name || '未命名部件') + ' · Tag ' + tag);
  const index = await center.call(token, '/client/getPages', {
    projectId: ctx.projectId,
  });
  const pages = index.message?.Pages;
  if (!Array.isArray(pages)) throw conflict('页面目录格式待核对。');
  const names = pages.map((p: any) => p?.name);
  if (names.some((n: any) => typeof n !== 'string' || !n) || new Set(names).size !== names.length)
    throw conflict('保存页面名缺失或重复。');
  let variableTable: ReturnType<typeof clientVariableRows> | undefined;
  const limit = 96;
  let complete = names.length <= limit;
  for (let i = 0; i < Math.min(names.length, limit); i += 8) {
    const batch = names.slice(i, Math.min(i + 8, limit));
    const data = await center.call(token, '/client/batchGetPageFile', {
      projectId: ctx.projectId,
      pageArr: JSON.stringify(batch),
    });
    if (!Array.isArray(data.success)) throw conflict('页面文件格式待核对。');
    for (const name of batch) {
      const matches = data.success.filter((p: any) => p?.pageProperty?.name === name);
      if (matches.length !== 1 || !Array.isArray(matches[0].objects)) {
        complete = false;
        continue;
      }
      const file = matches[0],
        bindings = pageBindings(file, scene, tag);
      if (bindings.some((b) => b.variable.startsWith('$$'))) {
        variableTable ??= clientVariableRows(
          await center.call(token, '/client/getVariableList', { projectId: ctx.projectId }),
        );
        for (const b of bindings) {
          const variables = variableTable.filter((v) => b.variable === '$$' + v.name);
          if (variables.length === 1) b.pageSubscription = pageSubscribes(file.dataSourceMng, variables[0]);
        }
      }
      rows.push(...bindings);
    }
  }
  for (const b of rows)
    lines.push(
      '已保存绑定 · ' +
        b.page +
        ' / ' +
        b.layout +
        ' → ' +
        b.property +
        ' ← ' +
        b.variable +
        '（' +
        (b.enabled ? '启用' : '停用') +
        '）' +
        (b.pageSubscription === false
          ? ' · 页面订阅清单缺少该变量。请在引用场景的客户端页面核对工程变量订阅，重新保存并验看运行值。'
          : b.pageSubscription === true
            ? ' · 页面已登记该变量订阅'
            : ''),
    );
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  for (const b of rows)
    if (b.rule && 'kind' in b.rule)
      lines.push(b.page + ' / ' + b.layout + ' · ' + describeAppearance(b.rule));
  if (rows.some((b) => !b.rule && b.enabled))
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    lines.push(
      '自动核对覆盖正向线性位移、线性轴旋转、自旋转、可见性闪烁和数值条件纯色画刷；其他模式可回读保存事件。',
    );
  // end
  // end
  if (rows.some((b) => rows.filter((row) => row.id === b.id).length > 1))
    lines.push('同一布局与属性有重复事件，需在原生页面确认唯一绑定。');
  if (!rows.length)
    lines.push(
      '已读页面中未找到该场景和 Tag 的原生 3D 布局表达式绑定。请在引用场景的页面选择 3D 布局，核对部件属性事件并保存页面。',
    );
  if (!complete) lines.push('本次仅覆盖成功读取的前 96 个页面范围。');
  await center.require(token, ctx);
  return { rows, lines, complete };
}
export async function sceneRoute(center: Center, token: string, ctx: Context, id: string) {
  const saved = await savedScene(center, token, ctx);
  const matches = saved.rows.filter((b) => b.id === id);
  if (matches.length !== 1) throw conflict('请从当前选区的已保存事件选择唯一的页面、布局和属性。');
  const binding = matches[0],
    variable = binding.variable.slice(2);
  if (!binding.guid || !binding.enabled || !binding.rule || !binding.variable.startsWith('$$') || !variable)
    // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    throw conflict('请选择已启用且直接绑定工程变量的线性位移、轴旋转、自旋转、可见性闪烁或数值条件画刷。');
  // end
  // end
  const deps = new Map<string, Context>();
  const mapping = await variableChoices(center, token, ctx, { variable }, (c) => deps.set(c.kind, c));
  const io = deps.get('collection'),
    rt = deps.get('datasource');
  if (mapping.eligible.length !== 1 || !io || !rt)
    throw conflict('工程变量的订阅、连接和有权限的采集点尚未唯一核实。');
  const pointBinding = mapping.eligible[0];
  const definitions = await center.call(token, '/dataSource/getAllDataSource');
  const ds = definitions.filter((d: any) => d.guid === rt.projectId);
  if (
    ds.length !== 1 ||
    ds[0].config?.engineeringId !== io.projectId ||
    ds[0].config?.getVariableListMethod !== 'restful'
  )
    throw conflict('实时源与数采实例之间的运行连接待核对。');
  const resources = await center.call(token, '/opscenter/api/v1/opsResourceData');
  async function instances(c: Context, type: number, match: (a: any) => boolean) {
    const apps = resources.appResource.filter(
      (a: any) => a.projectId === c.projectId && a.projectType === type && a.canOperate === true && match(a),
    );
    if (!apps.length) throw conflict('关联工程没有可核对的运行 App。');
    const ids = apps.map((a: any) => a.appId);
    const status = await center.call(token, '/opscenter/api/v1/displayAppListStatus', {}, { appIds: ids });
    return appObservations(resources, status, c, type).filter(
      (a) => ids.includes(a.appId) && a.deployed === '已部署' && a.process === '运行中',
    );
  }
  const rtApps = await instances(rt, 3, (a) => a.appName === ds[0].name);
  if (rtApps.length !== 1) throw conflict('实时源实例归属不唯一。');
  const cfg = ds[0].config;
  const address = (id: string) => resources.nodeResource.find((n: any) => n.nodeId === id)?.address;
  const endpoint = ['localhost', '127.0.0.1', '::1'].includes(cfg.restful_ip)
    ? address(rtApps[0].nodeId)
    : cfg.restful_ip;
  const ios = (await instances(io, 2, (a) => String(a.port) === String(cfg.restful_port))).filter(
    (a) => endpoint && address(a.nodeId) === endpoint,
  );
  if (ios.length !== 1) throw conflict('实时源配置与数采运行端点未唯一匹配。');
  const point = await center.monitorPoint(token, io, ios[0].appId, pointBinding.tag);
  const client = await instances(ctx, 1, () => true),
    user = await center.call(token, '/user/userInfo');
  const page: Context = {
    kind: 'page',
    projectId: ctx.projectId,
    object: binding.page,
    control: binding.guid,
    dirty: false,
  };
  const targets = screenTargets(resources, page, user.userName)
    .filter((t) => client.some((a) => a.appId === t.appId && a.nodeId === t.nodeId))
    .map((t) => ({
      ...t,
      scene: binding.scene,
      part: binding.part,
      variable,
      property: binding.property,
    }));
  if (!targets.length) throw conflict('没有唯一归属且在运行的客户端地址。');
  const dependencies = [
    { ...rt, runtimeApp: rtApps[0].appId, runtimeNode: rtApps[0].nodeId },
    { ...io, runtimeApp: point.appId, runtimeNode: point.nodeId },
  ];
  return {
    binding,
    point,
    pointBinding,
    targets,
    dependencies,
    signature: sceneHash([binding, point, pointBinding, dependencies]),
  };
}
export type SceneRoute = Awaited<ReturnType<typeof sceneRoute>>;
// end
