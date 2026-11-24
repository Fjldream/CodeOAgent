// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { one, projectContext } from './alarm-rule.ts';
import { appObservations } from './runtime.ts';
import { HttpError, type Context } from './shared.ts';
import type { Center } from './center.ts';

export const scriptEntry = (entry: Context) => entry.kind === 'period' || entry.kind === 'request';
export type Dependency = Context & { runtimeApp: string; runtimeNode: string };
const conflict = (reason: string) => new HttpError(409, reason);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function captureRoute(center: Center, token: string, entry: Context, chosenApp?: string) {
  if (!scriptEntry(entry)) throw conflict('请先在计算工程打开要核对的脚本。');
  const saved = await center.evidence(token, entry);
  if (!saved?.digest) throw conflict('未取得已保存正文的指纹。');
  const resources = await center.call(token, '/opscenter/api/v1/opsResourceData');
  const dependencies: Dependency[] = [];
  const select = async (ctx: Context, type: number, match: (row: any) => boolean) => {
    await center.require(token, ctx);
    const app = one<any>(
      resources.appResource.filter(
        (a: any) =>
          a.canOperate === true && a.projectType === type && a.projectId === ctx.projectId && match(a),
      ),
      '有权目标实例',
    );
    const status = await center.call(
      token,
      '/opscenter/api/v1/displayAppListStatus',
      {},
      { appIds: [app.appId] },
    );
    const instance = one(
      appObservations(resources, status, ctx, type).filter((a) => a.appId === app.appId),
      '实例部署回执',
    );
    if (instance.deployed !== '已部署' || instance.process !== '运行中')
      throw conflict('请核对目标测试 App 的部署和运行状态。');
    if (!dependencies.some((d) => d.runtimeApp === app.appId))
      dependencies.push({
        ...ctx,
        runtimeApp: app.appId,
        runtimeNode: instance.nodeId,
      });
    const node = one<any>(
      resources.nodeResource.filter((r: any) => r.nodeId === instance.nodeId),
      '实例节点',
    );
    return { app, node };
  };
  const { app, node } = await select(entry, 0, (a) => !chosenApp || a.appId === chosenApp);
  const host = String(node.address);
  if (!isIP(host) && !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(host)) throw conflict('实例地址无效。');
  const port = Number(app.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw conflict('实例端口无效。');
  const sameHost = new Set(
    resources.nodeResource.filter((n: any) => n.address === host).map((n: any) => n.nodeId),
  );
  const nearby = new Set(
    resources.nodeProApp
      .filter((n: any) => sameHost.has(n.nodeId))
      .flatMap((n: any) => n.appPros.map((a: any) => a.appId)),
  );
  if (resources.appResource.filter((a: any) => nearby.has(a.appId) && Number(a.port) === port).length !== 1)
    throw conflict('实例地址与端口被多个 App 共用。');
  const authority = (isIP(host) === 6 ? '[' + host + ']' : host) + ':' + port;
  const title = saved.title;
  const name = title.slice(title.indexOf(' / ') + 3);
  const urls = ['http', 'https'].map(
    (protocol) => new URL('/' + encodeURIComponent(name), protocol + '://' + authority).href,
  );
  const monitors = [];
  const bindings = saved.bindings || [];
  if (entry.kind === 'period') {
    if (!bindings.length || bindings.length > 12)
      throw conflict('单次可监视 1 至 12 个已解析点。请先核对脚本中的连接和点名。');
    const definitions = await center.call(token, '/dataSource/getAllDataSource');
    const seen = new Set<string>();
    for (const binding of bindings) {
      const key = JSON.stringify([binding.source, binding.name, binding.direction]);
      if (seen.has(key)) continue;
      seen.add(key);
      const sources = [];
      for (const d of definitions.filter((d: any) => d.name === binding.source))
        if (await center.allowed(token, projectContext('datasource', d.guid))) sources.push(d);
      const source = one<any>(sources, '脚本连接对应的实时源');
      const rt = await select(
        projectContext('datasource', source.guid),
        3,
        (a) => a.appName === binding.source,
      );
      const cfg = source.config;
      if (!cfg?.engineeringId || cfg.getVariableListMethod !== 'restful')
        throw conflict('此数据源未配置可核对的数采工程和 REST 端点。');
      const ioCtx = projectContext('collection', cfg.engineeringId);
      const io = await select(ioCtx, 2, (a) => String(a.port) === String(cfg.restful_port));
      const endpoint = ['localhost', '127.0.0.1', '::1'].includes(cfg.restful_ip)
        ? rt.node.address
        : cfg.restful_ip;
      if (endpoint !== io.node.address) throw conflict('数据源配置地址与数采节点不一致。');
      const point = await center.monitorPoint(token, ioCtx, io.app.appId, binding.name);
      monitors.push({
        direction: binding.direction,
        alias: binding.alias,
        source: binding.source,
        point,
      });
    }
  }
  const signature = hash([
    entry.kind,
    entry.projectId,
    entry.object,
    saved.digest,
    title,
    dependencies.map((d) => [d.projectId, d.runtimeApp, d.runtimeNode]),
    urls,
    monitors,
  ]);
  return {
    entry,
    title,
    appName: String(app.appName),
    digest: saved.digest,
    dependencies,
    monitors,
    urls,
    signature,
  };
}
export type CaptureRoute = Awaited<ReturnType<typeof captureRoute>>;
const scalar = (v: unknown) =>
  typeof v === 'number'
    ? Number.isFinite(v)
    : typeof v === 'boolean' || (typeof v === 'string' && v.length <= 512);
/** Only business JSON enters the local journal. Drop secrets even when nested in report rows. */
export function businessJSON(value: unknown): unknown {
  if (value === undefined || JSON.stringify(value).length > 8192)
    throw conflict('单条业务 JSON 超过可核对范围。');
  function visit(v: any, depth: number): any {
    if (depth > 8) throw conflict('业务 JSON 嵌套过深。');
    if (v === null || scalar(v)) return v;
    if (Array.isArray(v) && v.length <= 64) return v.map((i) => visit(i, depth + 1));
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 64)
      return Object.fromEntries(
        Object.entries(v)
          .filter(
            ([k]) => !/(token|password|passwd|cookie|secret|authorization|credential|api[_-]?key)/i.test(k),
          )
          .map(([k, x]) => [k, visit(x, depth + 1)]),
      );
    throw conflict('业务字段类型或长度超出可核对范围。');
  }
  return visit(value, 0);
}
export function captureResult(route: CaptureRoute, raw: any, start: number, end: number, offset: string) {
  const lines: string[] = [];
  const inWindow = (t: unknown) =>
    typeof t === 'string' &&
    Number.isFinite(Date.parse(t)) &&
    Date.parse(t) >= start &&
    Date.parse(t) <= end + 2000;
  let qualified = true;
  if (route.entry.kind === 'request') {
    if (
      !route.urls.includes(raw?.url) ||
      raw.method !== 'POST' ||
      raw.type !== 'normal' ||
      !inWindow(raw.at) ||
      raw.status !== 200
    )
      throw conflict('没有与本次取证时间、目标脚本地址、normal 请求及 HTTP 200 匹配的回包。');
    const output = businessJSON(raw.output);
    if (output === null || typeof output !== 'object' || Array.isArray(output))
      throw conflict('回包不是 KF OutParam 对象。');
    if (
      ((output as any).code === 20000 && /token/i.test(String((output as any).msg))) ||
      ((output as any).errorCode != null &&
        /^this web server .+ not found$/i.test(String((output as any).message)))
    )
      throw conflict('运行接口返回平台错误，请核对登录和目标脚本。');
    lines.push(
      '开发人员导入的浏览器 HAR · ' + raw.at + ' · POST ' + new URL(raw.url).pathname + ' · HTTP 200',
      raw.input === undefined
        ? '本次调用未提供 InParam。'
        : '本次 InParam = ' + JSON.stringify(businessJSON(raw.input)),
      '实际返回 JSON = ' + JSON.stringify(output),
    );
  } else {
    if (!Array.isArray(raw) || raw.length !== route.monitors.length)
      throw conflict('采样未覆盖本轮已解析的点。');
    for (const { direction, source, point } of route.monitors) {
      const s = one<any>(
        raw.filter(
          (x) =>
            x?.appId === point.appId &&
            x.tag === point.tag &&
            x.direction === direction &&
            x.source === source,
        ),
        '采样点',
      );
      if (
        !scalar(s.value) ||
        !scalar(s.quality) ||
        !inWindow(s.at) ||
        typeof s.time !== 'string' ||
        s.time.length > 64
      )
        throw conflict('采样回执缺少值、质量或本轮时间。');
      const sourceTime = s.time.replace(' ', 'T');
      const ms = Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(sourceTime) ? sourceTime : sourceTime + offset);
      const age = Date.parse(s.at) - ms;
      if (Number(s.quality) !== 192 || !Number.isFinite(age) || age > 10000 || age < -2000) qualified = false;
      lines.push(
        (direction === 'read' ? '输入' : '写回目标') +
          ' ' +
          source +
          ' / ' +
          point.tag +
          ' = ' +
          JSON.stringify(s.value) +
          '，质量 ' +
          s.quality +
          '，源时间 ' +
          s.time +
          '，监视时间 ' +
          s.at,
      );
    }
    lines.push(
      qualified
        ? '上述值来自同一轮点监视；逐次执行顺序及唯一写入者仍需脚本执行记录确认。'
        : '采样存在坏质量或源时间待核对，无法据此确认计算结果。',
    );
  }
  return {
    title: route.title,
    appName: route.appName,
    at: new Date(end).toISOString(),
    digest: route.digest,
    lines,
    qualified,
  };
}
// end
