// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
import { createHash, randomUUID } from 'node:crypto';
import type { Center } from './center.ts';
import type { Store } from './store.ts';
import { businessJSON, captureResult, captureRoute, type CaptureRoute } from './calc-result.ts';
import { parse } from 'acorn';
import { scriptBindings } from './js-bindings.ts';
import { globalFamilies } from './calc-runtime.ts';
import { HttpError, type Context } from './shared.ts';

const conflict = (message: string) => new HttpError(409, message);
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export const stamp = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
function aliasName(input: unknown) {
  if (typeof input !== 'string' || !input.trim() || input.length > 200)
    throw new HttpError(400, '请提供完整工程连接别名');
  return input.trim();
}
async function binding(center: Center, token: string, ctx: Context, alias: string) {
  if (!['request', 'calculation', 'period'].includes(ctx.kind)) throw new HttpError(400, '请从计算工程打开');
  await center.require(token, ctx);
  const saved = await center.call(token, '/calculation/projectJsonData', {
    projectId: ctx.projectId,
    type: 'dataAccess',
    groupId: '-1',
  });
  const links = saved.filter((v: any) => v.name === alias);
  if (links.length !== 1) throw conflict('工程别名缺失或不唯一，先核对已保存连接。');
  const link = links[0];
  const directory = await center.call(token, '/dataSource/getAllDataSource');
  const matches = directory.filter((v: any) => v.name === link.connectName);
  if (matches.length !== 1 || matches[0].type !== link.type || !matches[0].guid)
    throw conflict('平台源或类型已变化，请核对连接。');
  const source = matches[0];
  const dependency: Context = { kind: 'datasource', projectId: source.guid, dirty: false, object: '' };
  await center.require(token, dependency);
  return {
    dependency,
    config: stamp(source.config),
    signature: stamp([ctx.projectId, link, source.guid, source.type, source.config]),
  };
}
const readSymbols = new Set(
  Object.values(globalFamilies)
    .flat()
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    .filter((name) => /Query|GetCurrentValue|^redis(?:Exists|Get|Hget)$/.test(name)),
    // end
);
export function readsAlias(code: string, alias: string) {
  const calls: any[] = [],
    parents = new WeakMap();
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      ranges: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch {
    return false;
  }
  function visit(node: any, parent?: any) {
    if (!node?.type) return;
    if (parent) parents.set(node, parent);
    if (node.type === 'CallExpression') calls.push(node);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach((item) => visit(item, node));
      else if (typeof child === 'object') visit(child, node);
    }
  }
  visit(ast);
  const { resolve, declared } = scriptBindings(ast, parents);
  return calls.some(({ callee, arguments: args }) => {
    const symbol =
      callee.type === 'Identifier' && !declared(callee)
        ? callee.name
        : callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.object.name === 'global' &&
            !declared(callee.object)
          ? callee.property.name
          : null;
    return readSymbols.has(symbol) && resolve(args[0])?.value === alias;
  });
}
type Window = {
  owner: string;
  chat: string;
  ctx: Context;
  alias: string;
  start: number;
  signature: string;
  route?: CaptureRoute;
};
export class ConnectionJournal {
  private pending = new Map<string, Window>();
  private store: Store;
  private center: Center;
  constructor(store: Store, center: Center) {
    this.store = store;
    this.center = center;
  }
  private async version(token: string, chat: string, ctx: Context, alias: string) {
    const target = await binding(this.center, token, ctx, alias);
    const row = this.store.db
      .prepare(
        `INSERT INTO connection_versions(chat,project,alias,signature,revision) VALUES(?,?,?,?,1)
      ON CONFLICT(chat,project,alias) DO UPDATE SET revision=revision+(signature<>excluded.signature),signature=excluded.signature RETURNING revision`,
      )
      .get(chat, ctx.projectId, alias, target.signature);
    return { ...target, signature: target.signature + ':' + row!.revision };
  }
  async begin(owner: string, token: string, chat: string, ctx: Context, input: any) {
    this.store.chat(owner, chat);
    const alias = aliasName(input.alias);
    const target = await this.version(token, chat, ctx, alias);
    let route: CaptureRoute | undefined;
    if (input.mode === 'runtime' && ctx.kind === 'request') {
      route = await captureRoute(this.center, token, ctx, input.appId);
      const saved = await this.center.call(token, '/calculation/scriptData', {
        projectId: ctx.projectId,
        type: 'APIs',
        scriptId: ctx.object,
      });
      if (
        typeof saved.context !== 'string' ||
        createHash('sha256').update(saved.context).digest('hex') !== route.digest ||
        !readsAlias(saved.context, alias)
      )
        throw conflict('已保存请求脚本中未核对到使用该别名的 KC 读取调用，请核对实际读数来源。');
    } else if (
      input.mode !== 'development' ||
      ctx.kind !== 'calculation' ||
      input.sourceId !== target.dependency.projectId ||
      input.configStamp !== target.config
    )
      throw conflict('所选原生测试配置与 Center 当前连接不一致，请刷新。');
    const start = Date.now();
    for (const [key, p] of this.pending) if (start - p.start > 600000) this.pending.delete(key);
    if (this.pending.size >= 128) throw new HttpError(429, '连接取证窗口已满');
    const ticket = randomUUID();
    this.pending.set(ticket, { owner, chat, ctx, alias, start, signature: target.signature, route });
    return { ticket, start, urls: route?.urls };
  }
  async finish(owner: string, token: string, chat: string, ticket: string, observation: any) {
    this.store.chat(owner, chat);
    const p = this.pending.get(ticket);
    if (!p || p.chat !== chat || p.owner !== owner) throw new HttpError(404, '没有匹配的连接取证窗口');
    this.pending.delete(ticket);
    const end = Date.now();
    if (end - p.start > 600000) throw conflict('取证超时，请重试');
    const target = await this.version(token, chat, p.ctx, p.alias);
    if (target.signature !== p.signature) throw conflict('取证期间连接已变更，请按新配置重测');
    const deps: Context[] = [target.dependency];
    let detail: string,
      ok: boolean | null,
      appId = '',
      appName = '',
      routeSignature = '',
      at = end,
      rowCount = 0;
    if (p.route) {
      const route = await captureRoute(this.center, token, p.ctx, p.route.dependencies[0].runtimeApp);
      if (route.signature !== p.route.signature) throw conflict('请求脚本或目标实例已变化');
      captureResult(route, observation, p.start, end, '');
      const read = observation.output?.connectionRead;
      if (read?.alias !== p.alias || !Number.isSafeInteger(read?.code) || !Array.isArray(read?.rows))
        throw conflict('本次回包缺少匹配的 connectionRead.alias、数值 code 或 rows 数组，不能归到该别名。');
      ok = read.code === 0;
      rowCount = ok ? read.rows.length : 0;
      detail =
        'App 回包自报读取码 ' +
        read.code +
        (ok ? ' · 实际返回行 ' + JSON.stringify(businessJSON(read.rows)) : ' · 没有已确认读数');
      appId = route.dependencies[0].runtimeApp;
      appName = route.appName;
      routeSignature = route.signature;
      deps.push(...route.dependencies);
      at = Date.parse(observation.at);
    } else {
      const code = observation?.errorCode;
      if (!Number.isSafeInteger(code) && !['network error', 'ECONNABORTED', 'unsupported'].includes(code))
        throw conflict('未取得可识别的原生测试回执');
      ok = Number.isSafeInteger(code) && code !== -103 ? code === 0 : null;
      detail = ok === null ? '连接状态未验证 · ' + code : (ok ? '成功' : '失败') + ' · KF 返回码 ' + code;
    }
    await this.center.require(token, p.ctx);
    await this.center.require(token, target.dependency);
    const record = {
      signature: p.signature,
      detail,
      ok,
      rowCount,
      appId,
      appName,
      routeSignature,
      at,
      start: p.start,
    };
    this.store.transaction(() => {
      this.store.db
        .prepare(
          'INSERT INTO connection_receipts(chat,project,alias,context,dependencies,result) VALUES(?,?,?,?,?,?)',
        )
        .run(
          chat,
          p.ctx.projectId,
          p.alias,
          JSON.stringify(p.ctx),
          JSON.stringify(deps),
          JSON.stringify(record),
        );
      this.store.db
        .prepare(
          'DELETE FROM connection_receipts WHERE chat=? AND rowid NOT IN (SELECT rowid FROM connection_receipts WHERE chat=? ORDER BY rowid DESC LIMIT 96)',
        )
        .run(chat, chat);
    });
    return { lines: [(appName || '开发态测试连接') + ' · ' + detail] };
  }
  async report(
    owner: string,
    token: string,
    chat: string,
    ctx: Context,
    name: unknown,
    permitted: (row: any) => Promise<boolean>,
  ) {
    this.store.chat(owner, chat);
    const alias = aliasName(name);
    const target = await this.version(token, chat, ctx, alias);
    const dependencies: Context[] = [target.dependency],
      lines: string[] = ['工程连接 ' + alias];
    const rows = this.store.db
      .prepare(
        "SELECT * FROM connection_receipts WHERE chat=? AND project=? AND alias=? ORDER BY json_extract(result,'$.start') DESC,rowid DESC",
      )
      .all(chat, ctx.projectId, alias);
    const observations: { mode: string; ok: boolean | null; rowCount: number; at: number }[] = [];
    const latest = new Set<string>(),
      dev = { current: 0, historical: 0 },
      runtime = { current: 0, historical: 0 };
    for (const row of rows) {
      if (!(await permitted(row))) continue;
      const r = JSON.parse(String(row.result)),
        script = JSON.parse(String(row.context));
      let same = target.signature === r.signature && !latest.has(r.appId);
      latest.add(r.appId);
      if (same && r.appId) {
        try {
          same = (await captureRoute(this.center, token, script, r.appId)).signature === r.routeSignature;
        } catch (e) {
          if (!(e instanceof HttpError) || ![403, 404, 409].includes(e.status)) throw e;
          same = false;
        }
      }
      const counter = r.appId ? runtime : dev;
      if (!same && counter.historical >= 4) continue;
      counter[same ? 'current' : 'historical']++;
      if (same)
        observations.push({
          mode: r.appId ? 'runtime' : 'development',
          ok: r.ok,
          rowCount: r.rowCount,
          at: r.at,
        });
      dependencies.push(...JSON.parse(String(row.dependencies)));
      lines.push(
        (r.appId ? '运行态 · ' + r.appName : '开发态 · 测试连接') +
          ' · ' +
          (same ? '当前保存配置最近一次' : '历史回执') +
          ' · ' +
          new Date(r.at).toISOString() +
          ' · ' +
          r.detail,
      );
    }
    if (!dev.current) lines.push('当前配置没有开发态测试回执，请在本对话打开时点该行「测试连接」。');
    if (!runtime.current)
      lines.push('当前配置没有匹配的 App 读取回执，请在请求式脚本「计算脚本回读」填工程别名并关联实际调用。');
    lines.push(
      '运行结果取自指定实例的回包。配置指纹核对的是采样时的已保存连接；实例加载的配置版本需另行核实。',
    );
    await this.center.require(token, ctx);
    return { lines, dependencies, summary: { development: dev, runtime, observations } };
  }
}
// end
