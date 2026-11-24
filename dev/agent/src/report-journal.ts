// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { businessJSON, captureRoute } from './calc-result.ts';
import { reportReference } from './report-reference.ts';
import { screenTargets } from './runtime-screen.ts';
import { appObservations } from './runtime.ts';
import { HttpError, type Context } from './shared.ts';
import type { Center } from './center.ts';
import type { Store } from './store.ts';

const conflict = (message: string) => new HttpError(409, message);
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scalar = (v: unknown) => v === null || ['number', 'boolean', 'string'].includes(typeof v);
const sensitive = /token|password|passwd|cookie|secret|authorization|credential|api[_-]?key/i;
function safeJSON(input: any) {
  const value = businessJSON(input);
  if (!isDeepStrictEqual(value, input)) throw conflict('业务数据含敏感字段，无法完整核对。');
  return value;
}
async function binding(center: Center, token: string, ctx: Context) {
  const saved = await center.evidence(token, ctx);
  if (!saved) throw conflict('无法读取所选报表。');
  const definition: { value?: { ds: any; target: Context; script: string } } = {};
  const refs = await reportReference(center, token, ctx, saved, (ds, target, script) => {
    definition.value = { ds, target, script };
  });
  const lines = [saved.title, ...refs.trails.map((r) => r.path)];
  const def = definition.value;
  let query,
    valid = false;
  if (def) {
    try {
      const parsed = JSON.parse(def.ds.searchCriteria);
      if (parsed.RequestType === 'normal' && Object.hasOwn(parsed, 'InParam')) {
        query = safeJSON(parsed.InParam);
        valid = true;
      }
    } catch {}
  }
  if (valid) lines.push('已保存查询 InParam · ' + JSON.stringify(query));
  else lines.push(...refs.gaps, '未核实可比较的 normal 请求参数。');
  return {
    member: saved.reportMember,
    lines,
    def,
    valid,
    query,
    dependencies: refs.depends,
  };
}
async function route(center: Center, token: string, ctx: Context) {
  if (ctx.kind !== 'report' || !ctx.cell || ctx.dirty) throw conflict('请先保存报表并选中绑定字段的单元格。');
  const b = await binding(center, token, ctx);
  if (!b.def || !b.member || !b.valid || sensitive.test(b.member.member))
    throw conflict('所选单元格缺少可核对的自定义数据集、查询参数或请求式脚本。');
  const resources = await center.call(token, '/opscenter/api/v1/opsResourceData');
  const user = await center.call(token, '/user/userInfo');
  const matches = resources.appResource.filter(
    (a: any) =>
      a.canOperate === true &&
      a.projectId === b.def!.target.projectId &&
      a.projectType === 0 &&
      a.appName === b.def!.ds.calculateName,
  );
  if (matches.length !== 1) throw conflict('配置的计算服务名须对应唯一可见运行实例。');
  const calc = await captureRoute(center, token, b.def.target, matches[0].appId);
  const targets = screenTargets(resources, ctx, user.userName);
  const ids = [...new Set(targets.map((t) => t.appId))];
  if (!ids.length) throw conflict('当前账号没有可核对的客户端实例。');
  const status = await center.call(token, '/opscenter/api/v1/displayAppListStatus', {}, { appIds: ids });
  const running = appObservations(resources, status, ctx, 1).filter(
    (a) => a.process === '运行中' && a.deployed === '已部署',
  );
  const active = targets
    .filter((t) => running.some((a) => a.appId === t.appId && a.nodeId === t.nodeId))
    .map((t) => ({
      origin: t.origin,
      appId: t.appId,
      nodeId: t.nodeId,
      userName: t.userName,
      report: ctx.object,
      cell: ctx.cell!,
      dataset: b.member!.datasetId,
      field: b.member!.member,
    }));
  if (!active.length) throw conflict('客户端尚无可核对的已部署运行实例。');
  const key = digest([
    ctx.projectId,
    ctx.object,
    ctx.cell,
    b.member,
    b.def.target,
    b.def.script,
    b.query,
    calc.signature,
  ]);
  return { ctx, b, calc, targets: active, key };
}
type Route = Awaited<ReturnType<typeof route>>;
export function compareReport(r: Route, raw: any, start: number, end: number) {
  const view = raw?.view,
    http = raw?.http;
  const target = r.targets.find(
    (t) => t.origin === view?.origin && t.appId === view.appId && t.nodeId === view.nodeId,
  );
  if (
    !target ||
    view.report !== target.report ||
    !isDeepStrictEqual(view.cell, target.cell) ||
    view.userName !== target.userName ||
    view.dataset !== target.dataset ||
    view.field !== target.field ||
    !scalar(view.value) ||
    typeof view.display !== 'string' ||
    view.display.length > 512 ||
    !Number.isFinite(view.at) ||
    view.at < start ||
    view.at > end + 1000
  )
    throw conflict('运行画面身份、报表绑定、选区或观察时间不一致。');
  if (typeof http?.url !== 'string' || !URL.canParse(http.url)) throw conflict('报表查询地址无效。');
  const url = new URL(http.url);
  const requests = Array.isArray(view.requests)
    ? view.requests.filter((v: any) => v?.url === http.url && v.at >= start)
    : null;
  const sameDocument =
    requests &&
    (requests.length === 1
      ? Math.abs(requests[0].at - http.at) <= 5 && requests[0].end <= view.at + 2
      : requests.length === 0 &&
        typeof view.documentPath === 'string' &&
        http.document?.path === view.documentPath &&
        Number.isFinite(view.documentStart) &&
        view.documentStart >= start &&
        http.document.at <= http.at &&
        Math.abs(view.documentStart - http.document.at) <= 8);
  if (
    url.origin !== target.origin ||
    !url.pathname.endsWith('/getReportData') ||
    url.search ||
    url.hash ||
    http.method !== 'POST' ||
    http.status !== 200 ||
    http.dataset !== target.dataset ||
    http.field !== target.field ||
    !Number.isFinite(http.at) ||
    http.at < start ||
    http.at > view.at ||
    !sameDocument ||
    !scalar(http.value)
  )
    throw conflict('无法把数据集 HTTP 回包唯一关联到此次运行画面。请清空 Network 后重新采集一次。');
  const cellMatch = isDeepStrictEqual(view.value, http.value);
  const lines = [
    ...r.b.lines,
    '报表客户端 HTTP 200 · ' + target.field + '[0] = ' + JSON.stringify(safeJSON(http.value)),
    '运行工作表 · 原值 ' +
      JSON.stringify(safeJSON(view.value)) +
      ' · 显示文本 ' +
      JSON.stringify(view.display),
    '数据集字段与单元格原值' + (cellMatch ? '一致。' : '不一致。'),
  ];
  let queryMatch: boolean | null = null,
    outputMatch: boolean | null = null;
  if (raw.receipt != null) {
    const proof = raw.receipt;
    if (
      !r.calc.urls.includes(proof.url) ||
      proof.method !== 'POST' ||
      proof.status !== 200 ||
      !Number.isFinite(proof.at) ||
      proof.at < start ||
      proof.at > end + 1000 ||
      !/^[\w-]{1,100}$/.test(http.correlationField || '') ||
      sensitive.test(http.correlationField) ||
      typeof http.correlation !== 'string' ||
      http.correlation.length < 8 ||
      http.correlation.length > 128 ||
      proof.invocation !== http.correlation ||
      proof.output?.type !== 'relation' ||
      !Array.isArray(proof.output.data) ||
      proof.output.data[0]?.[http.correlationField] !== http.correlation ||
      proof.output.data.filter((row: any) => row?.[http.correlationField] === http.correlation).length !==
        1 ||
      !Object.hasOwn(proof.output.data[0], target.field)
    )
      throw conflict('脚本执行回执与报表回包缺少同一次调用的唯一关联标识。');
    const input = safeJSON(proof.input),
      value = safeJSON(proof.output.data[0][target.field]);
    queryMatch = isDeepStrictEqual(r.b.query, input);
    outputMatch = isDeepStrictEqual(value, http.value);
    lines.push(
      '同次脚本执行回执 · ' + http.correlationField + ' = ' + http.correlation,
      '实际 InParam · ' + JSON.stringify(input) + ' · 与保存参数' + (queryMatch ? '一致' : '不一致'),
      '实际 OutParam · relation · ' +
        target.field +
        '[0] = ' +
        JSON.stringify(value) +
        ' · 与数据集回包' +
        (outputMatch ? '一致' : '不一致'),
    );
  } else lines.push('尚缺脚本端同次执行回执，实际 InParam 和原始 OutParam 待核对。');
  const matched = cellMatch && queryMatch === true && outputMatch === true;
  return {
    at: new Date(view.at).toISOString(),
    lines,
    matched,
    cellMatch,
    queryMatch,
    outputMatch,
    key: r.key,
    surface: digest([r.b.member, r.b.def!.target, r.b.def!.script, r.b.query]),
    dependencies: [
      {
        ...r.ctx,
        runtimeApp: target.appId,
        runtimeNode: target.nodeId,
      },
      ...r.calc.dependencies,
    ],
  };
}
export class ReportJournal {
  private pending = new Map<
    string,
    { owner: string; chat: string; ctx: Context; route: Route; start: number }
  >();
  constructor(store: Store, center: Center) {
    this.store = store;
    this.center = center;
  }
  private store: Store;
  private center: Center;
  async begin(owner: string, token: string, chat: string, ctx: Context) {
    this.store.chat(owner, chat);
    const result = await route(this.center, token, ctx),
      start = Date.now(),
      ticket = randomUUID();
    for (const [id, p] of this.pending)
      if (start - p.start > 600000 || (p.owner === owner && p.chat === chat)) this.pending.delete(id);
    if (this.pending.size >= 128) throw conflict('取证窗口已满，请稍后再试。');
    this.pending.set(ticket, { owner, chat, ctx, route: result, start });
    return {
      ticket,
      start,
      targets: result.targets,
      scriptUrls: result.calc.urls,
    };
  }
  async finish(owner: string, token: string, chat: string, ticket: string, raw: any) {
    this.store.chat(owner, chat);
    const p = this.pending.get(ticket);
    if (!p || p.chat !== chat || p.owner !== owner) throw new HttpError(404, '取证窗口不存在。');
    this.pending.delete(ticket);
    if (Date.now() - p.start > 600000) throw conflict('取证窗口已过期。');
    const fresh = await route(this.center, token, p.ctx);
    if (
      fresh.key !== p.route.key ||
      !p.route.targets.some(
        (t) => t.origin === raw?.view?.origin && t.appId === raw.view.appId && t.nodeId === raw.view.nodeId,
      )
    )
      throw conflict('查询配置或实例已变更，请重新取证。');
    const { dependencies, ...result } = compareReport(fresh, raw, p.start, Date.now());
    const id = randomUUID();
    this.store.transaction(() => {
      this.store.db
        .prepare('INSERT INTO report_captures VALUES(?,?,?,?,?)')
        .run(id, chat, JSON.stringify(p.ctx), JSON.stringify(dependencies), JSON.stringify(result));
      this.store.db
        .prepare(
          'DELETE FROM report_captures WHERE chat=? AND rowid NOT IN (SELECT rowid FROM report_captures WHERE chat=? ORDER BY rowid DESC LIMIT 16)',
        )
        .run(chat, chat);
    });
    return { id, lines: result.lines, matched: result.matched };
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
    const b = ctx.kind === 'report' ? await binding(this.center, token, ctx) : null;
    const lines = b ? [...b.lines] : [],
      dependencies: Context[] = [...(b?.dependencies || [])];
    if (ctx.dirty) lines.push('编辑器有未保存修改，以上绑定来自 Center 保存版本。');
    let receipts = 0,
      matched = 0,
      prior = 0;
    for (const row of this.store.db
      .prepare('SELECT * FROM report_captures WHERE chat=? ORDER BY rowid DESC LIMIT 16')
      .all(chat)) {
      const source = JSON.parse(String(row.context));
      if (
        ctx.kind === 'report' &&
        (source.projectId !== ctx.projectId ||
          source.object !== ctx.object ||
          !isDeepStrictEqual(source.cell, ctx.cell))
      )
        continue;
      if (!(await permitted(row))) continue;
      const result = JSON.parse(String(row.result));
      const current = b || (await binding(this.center, token, source));
      const same =
        current.def &&
        digest([current.member, current.def.target, current.def.script, current.query]) === result.surface;
      if (!same) prior++;
      lines.push('运行观察 · ' + result.at + (same ? '' : ' · 观察后保存配置已变更'), ...result.lines);
      dependencies.push(...JSON.parse(String(row.dependencies)));
      receipts++;
      if (result.matched) matched++;
      if (receipts === 3) break;
    }
    if (!receipts)
      lines.push(
        '未找到本段对话可见的报表运行记录。在报表编辑器选中绑定单元格，打开「工程工具 → 报表数据集回读」采集。',
      );
    return {
      lines,
      dependencies,
      summary: { binding: !!b?.def, receipts, matched, prior },
    };
  }
}
// end
