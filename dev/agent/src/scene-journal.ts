// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { conflict, motionRule, savedScene, sceneRoute, type SceneRoute } from './scene-binding.ts';
import { HttpError, type Context } from './shared.ts';
// modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
import type { Store } from './store.ts';
import {
  appearanceRule,
  describeAppearance,
  inspectAppearance,
  appearanceChanged,
  appearanceLine,
  type Appearance,
} from './scene-appearance.ts';
// end
import type { Center } from './center.ts';

const vector = (v: any, n: number) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const numeric = (v: any) =>
  (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-5;
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
function monitor(s: any, r: SceneRoute, start: number, end: number, timed: boolean) {
  // end
  const { appId, nodeId, projectId, tag } = r.point;
  if (
    !isDeepStrictEqual(s?.point, { appId, nodeId, projectId, tag }) ||
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    !(numeric(s.value) || (timed && typeof s.value === 'boolean')) ||
    // end
    Number(s.quality) !== 192 ||
    typeof s.time !== 'string' ||
    s.time.length > 64
  )
    throw conflict('采样没有来自目标点的有效值、质量和源时间。');
  const local = Date.parse(s.at),
    time = s.time.replace(' ', 'T'),
    source = Date.parse(
      /(?:Z|[+-]\d\d:\d\d)$/.test(time) ? time : time + (process.env.KF_AGENT_SOURCE_UTC_OFFSET || ''),
    );
  if (
    !Number.isFinite(local) ||
    !Number.isFinite(source) ||
    local < start ||
    local > end + 1000 ||
    local - source > 10000 ||
    source - local > 2000
  )
    throw conflict('采样时间过期或节点时区未核实。');
  return {
    value: Number(s.value),
    quality: Number(s.quality),
    time: s.time,
    source,
    local,
  };
}
export function checkSceneSample(r: SceneRoute, raw: any, start: number, end: number) {
  const v = raw?.view,
    t = r.targets.find((t) => Object.entries(t).every(([key, value]) => v?.[key] === value));
  if (
    !t ||
    !Number.isFinite(v.at) ||
    !Number.isFinite(v.documentStart) ||
    v.documentStart > v.at ||
    !vector(v.camera, 16) ||
    !vector(v.position, 3) ||
    !vector(v.base, 3) ||
    !vector(v.pixel, 2) ||
    !vector(v.size, 2) ||
    v.pixel.some((n: number, i: number) => n < 0 || n >= v.size[i])
  )
    throw conflict('运行页面、部件或可见画面的观测信息不完整。');
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  const rule = r.binding.rule!;
  const timed = 'kind' in rule && (rule.kind === 'spin' || rule.kind === 'blink');
  const before = monitor(raw.before, r, start, end, timed),
    // end
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    after = monitor(raw.after, r, start, end, timed);
  // end
  if (
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    (timed && !(v.timing?.start >= before.local && v.timing.start <= v.at)) ||
    before.local > v.at ||
    // end
    v.at > after.local ||
    after.local - before.local > 10000 ||
    before.value !== after.value ||
    after.source < before.source
  )
    throw conflict('画面前后采样未覆盖同一稳定点值，请重试。');
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  const validClient = numeric(v.value) || (timed && typeof v.value === 'boolean');
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  // end
  let expected: number | null = null,
    appearance: Appearance | null = null,
    detailMatch = false;
  const appearanceMode = 'kind' in rule;
  const loadedRule = appearanceMode ? appearanceRule(v.loaded) : motionRule(v.loaded);
  const loaded =
    v.loaded?.variableName === r.binding.variable &&
    v.loaded?.propertyName === r.binding.property &&
    v.loaded?.enable === true &&
    isDeepStrictEqual(loadedRule, rule);
  if (appearanceMode) {
    try {
      const check = inspectAppearance(rule, v, before.value);
      appearance = check.appearance;
      detailMatch = check.matches && (rule.kind !== 'brush' || typeof v.value === 'number');
    } catch {
      // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
      throw conflict(
        timed
          ? '连续观察不足。请让运行标签保持前台、点值稳定，重新记录。'
          : '实际角度、画面轮廓或颜色取证不完整。',
      );
      // end
    }
  } else {
    expected =
      v.base[rule.axis] +
      rule.left +
      (rule.right - rule.left) * Math.max(0, Math.min(1, (before.value - rule.low) / (rule.high - rule.low)));
    detailMatch = near(v.position[rule.axis], expected);
  }
  // end
  return {
    at: v.at,
    app: t.appId,
    node: t.nodeId,
    origin: t.origin,
    documentStart: v.documentStart,
    camera: v.camera as number[],
    base: v.base as number[],
    position: v.position as number[],
    size: v.size as number[],
    pixel: v.pixel as number[],
    before,
    after,
    // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
    expected,
    appearance,
    // end
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    client: validClient ? (typeof v.value === 'boolean' ? v.value : Number(v.value)) : null,
    // end
    loaded,
    aligned:
      r.binding.pageSubscription !== false &&
      loaded &&
      // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
      validClient &&
      // end
      Number(v.value) === before.value &&
      // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
      detailMatch,
    // end
  };
}
type Sample = ReturnType<typeof checkSceneSample>;
// modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
export function compareSceneSamples(first: Sample, second: Sample, axis?: number) {
  // end
  if (
    first.app !== second.app ||
    first.node !== second.node ||
    first.origin !== second.origin ||
    first.documentStart !== second.documentStart ||
    !isDeepStrictEqual(first.base, second.base) ||
    !isDeepStrictEqual(first.size, second.size) ||
    first.camera.some((v, i) => !near(v, second.camera[i]))
  )
    throw conflict('两次观察必须来自同一运行文档、部件原点、相机和视口。');
  if (
    first.after.local >= second.before.local ||
    first.after.source >= second.before.source ||
    first.before.value === second.before.value
  )
    throw conflict('请等待目标点出现新的不同值，再取得第二次观察。');
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  if (first.appearance || second.appearance) {
    return (
      !!first.appearance &&
      !!second.appearance &&
      first.aligned &&
      second.aligned &&
      first.position.every((n, i) => near(n, second.position[i])) &&
      first.pixel.every((n, i) => Math.abs(n - second.pixel[i]) < 0.5) &&
      appearanceChanged(first.appearance, second.appearance, axis)
    );
  }
  if (axis === undefined || first.expected === null || second.expected === null) return false;
  return (
    first.position.every((v, i) => i === axis || near(v, second.position[i])) &&
    // end
    first.aligned &&
    second.aligned &&
    !near(first.expected, second.expected) &&
    !near(first.position[axis], second.position[axis]) &&
    Math.hypot(first.pixel[0] - second.pixel[0], first.pixel[1] - second.pixel[1]) >= 1
  );
}
type Window = {
  owner: string;
  chat: string;
  ctx: Context;
  route: SceneRoute;
  start: number;
  first?: Sample;
};
export class SceneJournal {
  private store: Store;
  private center: Center;
  private pending = new Map<string, Window>();
  constructor(store: Store, center: Center) {
    this.store = store;
    this.center = center;
  }
  async begin(owner: string, token: string, chat: string, ctx: Context, binding: string) {
    this.store.chat(owner, chat);
    if (ctx.dirty || typeof binding !== 'string')
      throw conflict('请先保存所选场景，并选择一个已保存的属性绑定。');
    const route = await sceneRoute(this.center, token, ctx, binding),
      start = Date.now(),
      ticket = randomUUID();
    for (const [id, p] of this.pending)
      if (start - p.start > 600000 || (p.chat === chat && p.owner === owner)) this.pending.delete(id);
    if (this.pending.size >= 128) throw conflict('取证窗口已满。');
    this.pending.set(ticket, { owner, chat, ctx, route, start });
    return { ticket, point: route.point, targets: route.targets };
  }
  async sample(owner: string, token: string, chat: string, ticket: string, raw: any) {
    this.store.chat(owner, chat);
    const p = this.pending.get(ticket);
    if (!p || p.chat !== chat || p.owner !== owner) throw new HttpError(404, '取证窗口不存在。');
    this.pending.delete(ticket);
    if (Date.now() - p.start > 600000) throw conflict('本次观察已过期。');
    const r = await sceneRoute(this.center, token, p.ctx, p.route.binding.id);
    if (
      r.signature !== p.route.signature ||
      !p.route.targets.some((t) => Object.entries(t).every(([k, v]) => raw?.view?.[k] === v))
    )
      throw conflict('保存配置或可见实例已变更，请重新取证。');
    const s = checkSceneSample(r, raw, p.start, Date.now());
    if (!p.first) {
      const next = randomUUID();
      this.pending.set(next, { ...p, first: s });
      return { ticket: next };
    }
    // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
    const rule = r.binding.rule!;
    const axis = 'axis' in rule ? rule.axis : undefined;
    const matched = compareSceneSamples(p.first, s, axis);
    // end
    const lines = [
      r.binding.scene +
        ' / ' +
        r.binding.part +
        ' · ' +
        r.binding.page +
        ' / ' +
        r.binding.layout +
        ' · ' +
        r.binding.property +
        ' ← ' +
        r.binding.variable,
      '实时映射 · ' + r.pointBinding.alias + ' → ' + r.pointBinding.device + ' / ' + r.point.tag,
    ];
    // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
    if ('kind' in rule) lines.push(describeAppearance(rule));
    for (const item of [p.first, s]) {
      const detail = item.appearance
        ? appearanceLine(item.appearance, axis)
        : ' · ' +
          'XYZ'[axis!] +
          ' 实际 ' +
          item.position[axis!].toFixed(2) +
          ' / 预期 ' +
          item.expected!.toFixed(2);
      lines.push(
        '源时间 ' +
          item.before.time +
          ' · ' +
          r.point.tag +
          ' = ' +
          item.before.value +
          ' · 质量 ' +
          item.before.quality +
          ' · 客户端变量 ' +
          (item.client ?? '未读取') +
          detail +
          (item.appearance ? ' · 画布坐标 (' : ' · 画面像素 (') +
          item.pixel.map((v) => v.toFixed(1)).join(', ') +
          ')' +
          (item.loaded ? '' : ' · 运行绑定与保存版本不同'),
      );
    }
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    const property =
      'kind' in rule
        ? {
            brush: '材质及渲染颜色',
            rotation: '角度及可见轮廓',
            spin: '实测转速及轮廓变化',
            blink: '可见性及实测闪烁周期',
          }[rule.kind]
        : '位移';
    // end
    lines.push(
      matched
        ? '两次画面均命中同一可见部件，' + property + '与已保存绑定及实时点值一致。'
        : '取得两次观察，尚未验证' + property + '与保存绑定一致。',
    );
    // end
    const deps = [{ ...p.ctx, runtimeApp: s.app, runtimeNode: s.node }, ...r.dependencies];
    const result = {
      matched,
      id: r.binding.id,
      surface: r.signature,
      at: new Date(s.at).toISOString(),
      lines,
    };
    const id = randomUUID();
    this.store.transaction(() => {
      this.store.db
        .prepare('INSERT INTO scene_captures VALUES(?,?,?,?,?)')
        .run(id, chat, JSON.stringify(p.ctx), JSON.stringify(deps), JSON.stringify(result));
      this.store.db
        .prepare(
          'DELETE FROM scene_captures WHERE chat=? AND rowid NOT IN (SELECT rowid FROM scene_captures WHERE chat=? ORDER BY rowid DESC LIMIT 16)',
        )
        .run(chat, chat);
    });
    return { id, lines, matched };
  }
  async read(
    owner: string,
    token: string,
    chat: string,
    ctx: Context,
    permitted: (row: any) => Promise<boolean>,
  ) {
    this.store.chat(owner, chat);
    await this.center.require(token, ctx);
    const saved = ctx.kind === 'scene' ? await savedScene(this.center, token, ctx) : null,
      lines = [...(saved?.lines || [])],
      dependencies: Context[] = [];
    if (ctx.dirty) lines.push('当前有未保存编辑，页面绑定来自已保存版本。');
    let receipts = 0,
      matched = 0,
      prior = 0;
    for (const row of this.store.db
      .prepare('SELECT * FROM scene_captures WHERE chat=? ORDER BY rowid DESC LIMIT 16')
      .all(chat)) {
      const source = JSON.parse(String(row.context));
      if (
        ctx.kind === 'scene' &&
        (source.projectId !== ctx.projectId ||
          source.sceneView.path !== ctx.sceneView?.path ||
          source.sceneView.item.tag !== ctx.sceneView?.item?.tag)
      )
        continue;
      if (!(await permitted(row))) continue;
      const result = JSON.parse(String(row.result));
      let same = false;
      try {
        same = (await sceneRoute(this.center, token, source, result.id)).signature === result.surface;
      } catch (e) {
        if (!(e instanceof HttpError) || ![404, 409].includes(e.status)) throw e;
      }
      if (!same) prior++;
      lines.push('运行观察 · ' + result.at + (same ? '' : ' · 当前配置或运行路由已变更'), ...result.lines);
      dependencies.push(...JSON.parse(String(row.dependencies)));
      receipts++;
      if (result.matched && same) matched++;
      if (receipts === 3) break;
    }
    if (!receipts)
      lines.push(
        '本段对话尚无可见的三维部件运行记录。在 3D 编辑器单选部件，打开「工程工具 → 三维部件绑定回读」，核对两次画面。',
      );
    return {
      lines,
      dependencies,
      choices: (saved?.rows || [])
        .filter(
          (b) =>
            b.enabled &&
            b.rule &&
            b.variable.startsWith('$$') &&
            saved!.rows.filter((row) => row.id === b.id).length === 1,
        )
        .map((b) => ({
          id: b.id,
          label: b.page + ' / ' + b.layout + ' · ' + b.property + ' ← ' + b.variable,
        })),
      summary: { bindings: saved?.rows.length || 0, receipts, matched, prior },
    };
  }
}
// end
