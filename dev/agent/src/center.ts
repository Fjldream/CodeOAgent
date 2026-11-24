// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { parse } from 'acorn';
import { catalog } from './catalog.ts';
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import { controlKind, selectedControls } from './page-trace.ts';
// end
import { controlInputs } from './page-trace.ts';
// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import { appObservations, permittedInstances } from './runtime.ts';
// end
const projectTypes = {
  period: 0,
  request: 0,
  calculation: 0,
  page: 1,
  client: 1,
  report: 1,
  scene: 1,
  collection: 2,
  datasource: 3,
  alarm: 4,
} as const;
// end
import { HttpError, type Context, type Evidence } from './shared.ts';
// modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
import { clientVariableEvidence } from './client-variables.ts';
import { supportedTool } from './query-tools.ts';
// end

// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import { screenTargets, matchBrowserSample, describeScreen } from './runtime-screen.ts';
// end
function pinnedAgent(fingerprint: string) {
  const pin = fingerprint.replaceAll(':', '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(pin)) throw Error('证书指纹格式无效');
  const agent = new https.Agent({ keepAlive: true });
  function createConnection(
    options: https.RequestOptions,
    callback: (error: Error | null, socket: tls.TLSSocket | null) => void,
  ) {
    const socket = tls.connect({
      host: options.hostname || options.host,
      port: Number(options.port) || 443,
      servername: options.servername,
      rejectUnauthorized: false,
    });
    function failed(error: Error) {
      socket.destroy();
      callback(error, null);
    }
    const timedOut = () => socket.destroy(Error('Center TLS 握手超时'));
    socket.once('error', failed);
    socket.setTimeout(15000, timedOut);
    socket.once('secureConnect', () => {
      socket.setTimeout(0);
      socket.removeListener('timeout', timedOut);
      socket.removeListener('error', failed);
      const certificate = socket.getPeerCertificate()?.raw;
      if (!certificate) return failed(Error('Center 未提供证书'));
      const actual = createHash('sha256').update(certificate).digest('hex');
      if (actual !== pin) return failed(Error('Center 证书指纹不匹配'));
      callback(null, socket);
    });
    // The HTTP request receives its socket only after the pin has matched.
  }
  // Node accepts an asynchronous createConnection hook via the callback.
  return Object.assign(agent, { createConnection });
}
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
import { calcConfig, calcList, calcScope, type CalcQuery } from './calc-config.ts';
import { calcSourceChoices } from './calc-sources.ts';
// end
// end
export class Center {
  origin: URL;
  agent?: https.Agent;
  constructor(origin: string, ca?: string, pin?: string) {
    this.origin = new URL(origin);
    if (
      this.origin.protocol !== 'https:' &&
      !(
        this.origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(this.origin.hostname)
      )
    )
      throw Error('Center 需要 HTTPS');
    if (this.origin.username || this.origin.password) throw Error('Center 地址不得携带凭据');
    if (this.origin.protocol === 'https:')
      this.agent = pin
        ? pinnedAgent(pin)
        : new https.Agent({ keepAlive: true, ...(ca ? { ca: readFileSync(ca) } : {}) });
  }
  async call(token: string, path: string, query: Record<string, string> = {}, body?: unknown): Promise<any> {
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    // The two fixed operations routes use the same pinned Center and current KF bearer.
    const ops = [
      '/opscenter/api/v1/opsResourceData',
      '/opscenter/api/v1/displayAppListStatus',
      '/opscenter/api/v1/fileResourceData',
    ].includes(path);
    const url = new URL(ops ? path : '/api' + path, this.origin);
    // end
    url.search = new URLSearchParams(query).toString();
    const client = url.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const req = client.request(
        url,
        {
          agent: this.agent,
          method: body ? 'POST' : 'GET',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk) => {
            size += chunk.length;
            if (size > 12_000_000) req.destroy(Error('response limit'));
            else chunks.push(chunk);
          });
          res.on('error', () => reject(new HttpError(502, 'KF 查询中断')));
          res.on('end', () => {
            let data;
            try {
              data = JSON.parse(Buffer.concat(chunks).toString());
            } catch {
              return reject(new HttpError(502, 'KF 未返回可读取的结果'));
            }
            const status = res.statusCode || 502;
            if (status === 401 || data.errorCode === -103) return reject(new HttpError(401, 'KF 登录已过期'));
            if (status === 403) return reject(new HttpError(403, '没有工程读取权限'));
            if (status !== 200 || Number(data.errorCode ?? data.code ?? 0) !== 0)
              return reject(new HttpError(502, 'KF 查询失败或当前版本不支持此接口'));
            resolve(data.data ?? data);
          });
        },
      );
      req.setTimeout(15000, () => req.destroy(Error('timeout')));
      req.on('error', () => reject(new HttpError(502, '无法验证或连接 KF Center')));
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  async identity(token: string) {
    const user = await this.call(token, '/user/userInfo');
    if (user.tenantId == null || !Number.isSafeInteger(Number(user.userId)) || Number(user.userId) <= 0)
      throw new HttpError(401, '无法核实 KF 身份');
    return JSON.stringify([String(user.tenantId), String(user.userId)]);
  }
  async allowed(token: string, context: Context) {
    if (context.kind === 'general') return true;
    const project = {
      projectId: context.projectId,
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      projectType: projectTypes[context.kind],
      // end
    };
    const result = await this.call(token, '/project/permissions', {}, { projects: [project] });
    return (
      result.items?.some(
        (item: any) =>
          item.projectId === project.projectId &&
          Number(item.projectType) === project.projectType &&
          item.hasProjectPermission === true,
      ) === true
    );
  }
  async require(token: string, context: Context) {
    if (!(await this.allowed(token, context))) throw new HttpError(403, '没有此工程的读取权限');
  }
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
  async runtimeAccess(token: string, context: Context) {
    if (context.kind === 'general') return [];
    await this.require(token, context);
    return permittedInstances(
      await this.call(token, '/opscenter/api/v1/opsResourceData'),
      context,
      projectTypes[context.kind],
    );
  }
  async runtimeTargets(token: string, context: Context) {
    await this.require(token, context);
    if (context.kind !== 'page' || !context.control) return [];
    const [data, user] = await Promise.all([
      this.call(token, '/opscenter/api/v1/opsResourceData'),
      this.call(token, '/user/userInfo'),
    ]);
    await this.require(token, context);
    return screenTargets(data, context, user.userName);
  }
  async runtime(token: string, context: Context, browserObservation?: unknown, editorObservation?: unknown) {
    // end
    await this.require(token, context);
    if (context.kind === 'general') throw new HttpError(400, '请先选择工程');
    const data = await this.call(token, '/opscenter/api/v1/opsResourceData');
    const type = projectTypes[context.kind];
    const matches = Array.isArray(data?.appResource)
      ? data.appResource.filter(
          (app: any) =>
            app.projectId === context.projectId && app.projectType === type && app.canOperate === true,
        )
      : [];
    const appIds = matches.slice(0, 24).map((app: any) => app.appId);
    const status = appIds.length
      ? await this.call(token, '/opscenter/api/v1/displayAppListStatus', {}, { appIds })
      : [];
    const files = await this.call(token, '/opscenter/api/v1/fileResourceData').catch((error) => {
      if (error instanceof HttpError && [403, 502].includes(error.status)) return null;
      throw error;
    });
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    const publications = new Set<string>();
    // end
    const versions = new Set<string>();
    walk(files?.projectResource, (row) => {
      if (
        row.projectId === context.projectId &&
        (row.projectType == null || Number(row.projectType) === type)
      ) {
        const version = row.projectVersion || row.version;
        // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
        if (row.canOperate === false) return;
        if (typeof version === 'string') {
          versions.add(version);
          publications.add(
            version + (typeof row.publishTime === 'string' ? ' · 发布时间 ' + row.publishTime : ''),
          );
        }
        // end
      }
    });
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    let apps = appObservations(data, status, context, type);
    let screen, sample;
    if (context.kind === 'page' && context.control) {
      const file = await this.call(token, '/client/batchGetPageFile', {
        projectId: context.projectId,
        pageArr: JSON.stringify([context.object]),
      });
      if (browserObservation) {
        const freshTargets = await this.runtimeTargets(token, context);
        apps = apps.filter((app) =>
          freshTargets.some((t) => t.appId === app.appId && t.nodeId === app.nodeId),
        );
        sample = matchBrowserSample(browserObservation, freshTargets, apps, Date.now());
      }
      screen = describeScreen(
        context,
        file?.success?.length === 1 ? file.success[0] : null,
        sample || null,
        editorObservation,
      );
    }
    if (apps.length && !(browserObservation && context.kind === 'page' && context.control)) {
      const permitted = await this.runtimeAccess(token, context);
      apps = apps.filter((app) =>
        permitted.some((row) => row.appId === app.appId && row.nodeId === app.nodeId),
      );
    }
    // end
    const result = {
      id: randomUUID(),
      at: new Date().toISOString(),
      source: 'fileResourceData / opsResourceData / displayAppListStatus',
      publishedVersions: [...versions],
      // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
      publications: [...publications],
      apps,
      screen,
      gaps: [
        '尚无发布制品与节点安装摘要的对应回执。',
        screen ? '数采样本的质量和源时间另行核对。' : '业务点值、质量和运行画面需单独取证。',
      ],
      // end
    };
    if (matches.length > 24) result.gaps.push('本次最多核对 24 个有权 App。');
    if (!result.apps.length) result.gaps.push('没有可匹配的目标实例状态回执。');
    await this.require(token, context);
    return result;
  }
  async monitorPoint(token: string, context: Context, appId: string, tag: string) {
    if (context.kind !== 'collection') throw new HttpError(400, '请从数采工程查询监视点');
    await this.require(token, context);
    const resources = await this.call(token, '/opscenter/api/v1/opsResourceData');
    const permitted = resources?.appResource?.filter(
      (app: any) =>
        app.appId === appId &&
        app.projectId === context.projectId &&
        app.projectType === projectTypes.collection &&
        app.canOperate === true,
    );
    if (permitted?.length !== 1) throw new HttpError(404, '未找到有权的目标实例');
    const [app] = permitted;
    const owners = resources.nodeProApp?.filter((node: any) =>
      node.appPros?.some((row: any) => row.appId === appId),
    );
    if (owners?.length !== 1) throw new HttpError(409, '目标实例的节点归属待核对');
    const nodes = resources.nodeResource?.filter((node: any) => node.nodeId === owners[0].nodeId);
    const port = Number(app.wsPort);
    if (nodes?.length !== 1 || !nodes[0].address || !Number.isInteger(port) || port < 1 || port > 65535)
      throw new HttpError(409, '节点监视参数不完整');
    const pointList = await this.call(token, '/collect/getMonitorVariables', {
      projectId: context.projectId,
      groupId: 'tagRoot',
    });
    if (!Array.isArray(pointList) || pointList.filter((row) => row.variableName === tag).length !== 1)
      throw new HttpError(404, '点名未在目标工程中唯一匹配');
    const project = await this.call(token, '/collect/getProjectById', { projectId: context.projectId });
    if (!project?.osType) throw new HttpError(409, '目标数采工程的运行平台未知');
    await this.require(token, context);
    return {
      projectId: context.projectId,
      appId,
      nodeId: nodes[0].nodeId,
      tag,
      appName: app.appName,
      ip: nodes[0].address,
      port: String(port),
      osType: project.osType,
    };
  }
  async findObjects(token: string, context: Context, term = '') {
    await this.require(token, context);
    if (context.kind === 'general') return [];
    const read = (path: string, params: Record<string, string> = {}) =>
      this.call(token, path, { projectId: context.projectId, ...params });
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    if (context.kind === 'calculation' && context.calcMenu) {
      const { section, groupId } = calcScope(context);
      const { items } = await calcList(read, section, groupId);
      await this.require(token, context);
      return items
        .filter((row) => String(row.name).toLowerCase().includes(term.toLowerCase()))
        .slice(0, 12)
        .map((row) => ({
          id: String(row.GUID ?? row.id ?? row.fileName ?? row.name),
          name: String(row.name),
          kind: section,
        }));
    }
    // end
    let items: any[], key: string, name: string, kind: string;
    switch (context.kind) {
      case 'report':
        items = await read('/client/getReportManager');
        key = 'id';
        name = 'name';
        kind = 'report';
        break;
      case 'scene':
        items = await read('/client/getSceneInfo');
        key = 'filename';
        name = 'filename';
        kind = 'scene';
        break;
      case 'page':
      case 'client':
        items = (await read('/client/getPages')).message?.Pages;
        key = 'name';
        name = 'name';
        kind = 'page';
        break;
      case 'request':
      case 'period':
      case 'calculation':
        kind = context.kind === 'request' ? 'request' : 'period';
        items = await read('/calculation/projectJsonData', {
          type: kind === 'request' ? 'APIs' : 'periods',
          groupId: '-1',
        });
        key = 'GUID';
        name = 'name';
        break;
      case 'collection':
        items = await read('/collect/devices');
        key = 'deviceId';
        name = 'deviceName';
        kind = 'device';
        break;
      case 'alarm': {
        const connections = await read('/alarm/dataSource', { guid: context.projectId });
        if (!connections || typeof connections !== 'object') throw new HttpError(502, '数据源清单格式未适配');
        items = Object.values(connections);
        key = 'name';
        name = 'name';
        kind = 'connection';
        break;
      }
      case 'datasource':
        items = await read('/dataSource/project', { projectGroupId: context.group! });
        if (Array.isArray(items)) items = items.filter((item) => item?.guid === context.projectId);
        key = 'guid';
        name = 'name';
        kind = 'datasource';
        break;
      default:
        throw new HttpError(400, '未知工程入口');
    }
    if (!Array.isArray(items)) throw new HttpError(502, '对象清单格式未适配');
    return items
      .filter(
        (item) =>
          typeof item?.[name] === 'string' &&
          item[key] != null &&
          item[name].toLocaleLowerCase().includes(term.toLocaleLowerCase()),
      )
      .slice(0, 12)
      .map((item) => ({ id: String(item[key]), name: item[name], kind }));
  }
  // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
  async clientVariables(token: string, context: Context) {
    if (!supportedTool('read_client_variables', context.kind))
      throw new HttpError(400, '请先打开目标客户端工程。');
    await this.require(token, context);
    const result = await this.call(token, '/client/getVariableList', { projectId: context.projectId });
    await this.require(token, context);
    return clientVariableEvidence(result);
  }
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
  async calcConfiguration(token: string, context: Context, query: CalcQuery, onDependency?: (dep: Context) => void, focusText?: string): Promise<Evidence> {
// end

    await this.require(token, context);
    if (query.sourceChoices && calcScope(context, query.section ?? 'dataAccess').section !== 'dataAccess')
      throw new HttpError(400, '可选平台源仅适用于数据源管理');
    const result = query.sourceChoices ? await calcSourceChoices(this, token, context, query.exactName) : await calcConfig(
// end
      (path, params) => this.call(token, path, { projectId: context.projectId, ...params }),
      context,
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF计算菜单对话依据
      query, focusText,
// end

    );
    await this.require(token, context);
    if ('dependencies' in result) for (const dep of result.dependencies) onDependency?.(dep);
// end
    return {
      id: randomUUID(),
      at: new Date().toISOString(),
      layer: 'saved',
      title: result.title,
      source: result.source,
      facts: result.facts,
      references: [],
      digest: fingerprint(result.facts),
      gaps: [...result.gaps, '本次读取的是已保存配置，运行状态需在目标计算 App 核对。'],
      calcConfig: result.summary,
    };
  }
  // end
  async evidence(token: string, context: Context): Promise<Evidence | null> {
    // end
    await this.require(token, context);
    if (context.kind === 'general') return null;
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    if (context.kind === 'calculation' && context.calcMenu) return this.calcConfiguration(token, context, {});
    // end
    const result: Evidence = {
      id: randomUUID(),
      layer: 'saved',
      at: new Date().toISOString(),
      title: '当前工程',
      facts: [],
      gaps: ['尚无目标 App 的部署和运行读数。'],
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      references: [],
      bindings: [],
      // end
    };
    const read = (route: string, params: Record<string, string> = {}) =>
      this.call(token, route, { projectId: context.projectId, ...params });
    if (context.kind === 'page') {
      const listing = await read('/client/getPages');
      if (listing.message?.Pages?.filter((p: any) => p.name === context.object).length !== 1)
        throw new HttpError(404, '当前工程中未找到唯一的已保存页面');
      const data = await read('/client/batchGetPageFile', { pageArr: JSON.stringify([context.object]) });
      const pages = data.success;
      if (!Array.isArray(pages) || pages.length !== 1) throw new HttpError(404, '未读到唯一的已保存页面');
      const page = pages[0];
      result.title = context.object;
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      result.source = 'client/batchGetPageFile';
      let selectedControl: any;
      if (context.control) {
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        const matches = selectedControls(page.objects ?? [], context);
        // end
        if (matches.length !== 1) throw new HttpError(404, '已保存页面中未找到唯一的选中控件');
        const control = matches[0];
        selectedControl = control;
        result.title += ' / ' + control.name;
        for (const [key, label] of [
          ['name', '控件名称'],
          ['type', '控件类型'],
          ['dateSource', '报警事件源别名'],
        ])
          if (typeof control[key] === 'string') result.facts.push({ label, value: control[key] });
        if (control.dateSource) {
          const sources = await read('/client/getDataSourceList');
          const candidates = (sources.message ?? []).filter((s: any) => s.name === control.dateSource);
          if (candidates.length === 1 && candidates[0].appName) {
            const source = candidates[0];
            result.bindings!.push({
              source: source.appName,
              definition: source.dataSourceName,
              alias: source.name,
              name: '',
              direction: 'event',
            });
            result.facts.push({
              label: '报警窗 → 本地连接 → 事件源',
              value: control.name + ' → ' + control.dateSource + ' → ' + source.appName,
            });
          } else result.gaps.push('未找到唯一的报警事件源连接。');
        }
      }
      const tags = new Set<string>();
      // end
      let unsupported = false;
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      const sink = selectedControl && controlKind(selectedControl) === 'button' ? 'Caption' : 'setText';
      // end
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      for (const [index, link] of (page.linkMng?.linkList ?? []).entries()) {
        if (typeof link.script !== 'string' || link.enable === false) continue;
        const read = selectedControl
          ? // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
            controlInputs(link.script, selectedControl.name, sink)
          : // end
            pageInputs(link.script);
        if (selectedControl && read.tags.length)
          result.facts.push({
            label: '控件脚本来源',
            // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
            value: 'linkMng.linkList[' + index + '].script → ' + selectedControl.name + '.' + sink,
            // end
          });
        // end
        for (const tag of read.tags) tags.add(tag);
        unsupported ||= read.partial;
      }
      result.facts.push({
        label: '页面脚本中显式的 $System 引用',
        value: [...tags].slice(0, 32).join('、') || '未找到',
      });
      if (tags.size) {
        const vars = await read('/client/getVariableList'),
          sources = await read('/client/getDataSourceList');
        const mapped: any[] = [];
        walk(vars, (row) => {
          if (tags.has(row.name) && row.dataSourceItem) mapped.push(row);
        });
        if ([...tags].some((tag) => mapped.filter((row) => row.name === tag).length !== 1))
          unsupported = true;
        for (const tag of mapped.slice(0, 32)) {
          if (mapped.filter((row) => row.name === tag.name).length !== 1) continue;
          const matches = (sources.message ?? []).filter(
            // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
            (s: any) =>
              !!tag.projectDataSourceId &&
              !!tag.dataSourceItem.appName &&
              s.id === tag.projectDataSourceId &&
              s.appName === tag.dataSourceItem.appName,
            // end
          );
          if (matches.length !== 1 || !tag.dataSourceItem.tagName) {
            unsupported = true;
            continue;
          }
          const source = matches[0],
            name = tag.dataSourceItem.tagName;
          result.facts.push({
            label: String(tag.name),
            value:
              source.name + ' → ' + source.appName + ' / ' + name + (tag.isSub ? '（已订阅）' : '（未订阅）'),
          });
          // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
          result.references.push(reference(source.appName, name));
          result.bindings!.push({
            source: source.appName,
            definition: source.dataSourceName,
            alias: source.name,
            name,
            direction: 'read',
          });
          // end
        }
      }
      if (unsupported) result.gaps.push('部分脚本或连接无法静态核对。');
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      result.gaps.push(
        selectedControl ? '读取范围为选中控件和已支持的页面脚本写法。' : '读取范围为整个已保存页面。',
      );
      // end
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    } else if (context.kind === 'period' || context.kind === 'request') {
      const type = context.kind === 'period' ? 'periods' : 'APIs';
      const listing = await read('/calculation/projectJsonData', { type, groupId: '-1' });
      // end
      const matches = Array.isArray(listing) ? listing.filter((p: any) => p.GUID === context.object) : [];
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      if (matches.length !== 1) throw new HttpError(404, '当前工程中未找到唯一的已保存脚本');
      // end
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      const data = await read('/calculation/scriptData', { type, scriptId: context.object });
      if (typeof data.context !== 'string') throw new HttpError(404, '未读到已保存脚本');
      // end
      const script = scriptReferences(data.context),
        inputs = script.edges;
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      result.title = (type === 'periods' ? '周期脚本 / ' : '请求式脚本 / ') + matches[0].name;
      result.source = 'calculation/scriptData';
      result.digest = createHash('sha256').update(data.context).digest('hex');
      if (context.editor && !context.editor.digest)
        result.gaps.push('编辑器未提供文本指纹，编辑稿一致性未知。');
      if (context.editor?.digest) {
        const lineDigest = createHash('sha256')
          .update(data.context.replace(/\r\n?/g, '\n').replace(/\n+$/, ''))
          .digest('hex');
        result.editorComparison =
          context.editor.digest === result.digest
            ? 'equal'
            : context.editor.lineDigest === lineDigest
              ? 'lineEndings'
              : 'different';
        result.gaps.push(
          {
            equal: '提问时的编辑文本与 Center 读回一致。',
            different: '提问时的编辑文本与 Center 读回不同。',
            lineEndings: '已保存正文与提问时的文本仅换行格式或文末空行不同。',
          }[result.editorComparison],
        );
      }
      // end
      const sources = await read('/calculation/projectJsonData', { type: 'dataAccess', groupId: '-1' });
      for (const edge of inputs) {
        const candidates = Array.isArray(sources) ? sources.filter((s) => s.name === edge.alias) : [];
        const instance = candidates.length === 1 ? candidates[0].serverName : '';
        result.facts.push({
          label: edge.direction,
          value: edge.alias + ' → ' + (instance || '连接待核对') + ' / ' + edge.tag,
        });
        // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
        if (instance) {
          const reading = edge.direction === '读取点';
          if (reading) result.references.push(reference(instance, edge.tag));
          result.bindings!.push({
            source: instance,
            alias: edge.alias,
            name: edge.tag,
            direction: reading ? 'read' : 'write',
          });
        }
        // end
      }
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      if (script.partial)
        result.gaps.push('部分调用或点名无法按已支持的常量写法核对；只能确认已列出的引用。');
      else if (!inputs.length) result.gaps.push('在已支持的写法中没有找到显式的 KF 点位读写调用。');
      // end
      result.gaps.push('静态识别的调用仅描述脚本配置。');
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    } else {
      const fields = await catalog(context, read);
      result.title = fields.title;
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      result.source = fields.source;
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      if (fields.reportMember) result.reportMember = fields.reportMember;
      if (context.kind === 'scene' && context.sceneView) result.sceneView = context.sceneView;
      // end
      // end
      result.facts = fields.facts;
      result.gaps.push(...fields.gaps);
    }
    result.digest ??= fingerprint(result.facts);
    // end
    if (context.dirty) result.gaps.push('编辑器有未保存修改，本次依据为 Center 中的已保存版本。');
    return result;
  }
}
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
function fingerprint(facts: Evidence['facts']) {
  return createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}
function reference(source: string, tag: string) {
  // end
  return createHash('sha256')
    .update(JSON.stringify([source, tag]))
    .digest('hex')
    .slice(0, 20);
}
function walk(value: any, visit: (node: any) => void) {
  const pending = [value];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    visit(node);
    for (const child of Object.values(node)) if (child && typeof child === 'object') pending.push(child);
  }
}
export function pageInputs(code: string) {
  const tags = new Set<string>(),
    ignored = new WeakSet<object>();
  let partial = false,
    shadowed = false;
  try {
    const ast = parse(code, {
      ecmaVersion: 'latest',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
    walk(ast, (node) => {
      const bindings = [node.id, node.param, ...(node.params ?? [])];
      for (const binding of bindings)
        walk(binding, (p) => {
          if (p.type === 'Identifier' && p.name === '$System') shadowed = true;
        });
      if (node.type === 'AssignmentExpression') walk(node.left, (p) => ignored.add(p));
      if (node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && node.operator === 'delete'))
        walk(node.argument, (p) => ignored.add(p));
      if (node.type !== 'MemberExpression' || node.object?.name !== '$System' || ignored.has(node)) return;
      const key = node.computed ? node.property?.value : node.property?.name;
      if (typeof key === 'string' && tags.size < 32) tags.add(key);
      else partial = true;
    });
  } catch {
    partial = true;
  }
  return { tags: shadowed ? [] : [...tags], partial: partial || shadowed };
}
// Recognize only unambiguously bound string constants and literal I/O arguments.
export function scriptReferences(code: string) {
  const edges: { alias: string; tag: string; direction: string }[] = [];
  let partial = false;
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
  } catch {
    return { edges, partial: true };
  }
  const constants = new Map<string, any>();
  const names = new Map<string, number>();
  const parents = new WeakMap<object, any>();
  const declare = (name: string) => names.set(name, (names.get(name) ?? 0) + 1);
  walk(ast, (node) => {
    for (const child of Object.values(node)) if (child && typeof child === 'object') parents.set(child, node);
    if (
      node.type === 'VariableDeclarator' ||
      node.type?.startsWith('Function') ||
      node.type?.startsWith('Class')
    )
      walk(node.id, (p) => {
        if (p.type === 'Identifier') declare(p.name);
      });
    for (const param of node.params ?? (node.param ? [node.param] : []))
      walk(param, (p) => {
        if (p.type === 'Identifier') declare(p.name);
      });
    if (node.type === 'VariableDeclaration' && node.kind === 'const')
      for (const d of node.declarations)
        if (d.id.type === 'Identifier' && typeof d.init?.value === 'string') constants.set(d.id.name, d);
  });
  function scope(node: any) {
    let n = node;
    while (n && !['Program', 'BlockStatement', 'ForStatement', 'SwitchStatement'].includes(n.type))
      n = parents.get(n);
    return n;
  }
  function literal(node: any) {
    if (typeof node?.value === 'string') return node.value;
    const binding = constants.get(node?.name);
    if (!binding || names.get(node.name) !== 1 || binding.end > node.start) return;
    const declaredIn = scope(binding);
    for (let p = node; p; p = parents.get(p)) if (p === declaredIn) return binding.init.value;
  }
  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const fn = node.callee?.name;
    // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
    const reads = fn === 'KIOQueryDatas' || fn === 'AsynKIOQueryDatas';
    if (!reads && fn !== 'KIOUpdateDatas' && fn !== 'AsynKIOUpdateDatas') return;
    // end
    if (names.has(fn)) {
      partial = true;
      return;
    }
    const alias = literal(node.arguments[0]);
    if (!alias || node.arguments[1]?.type !== 'ArrayExpression') {
      partial = true;
      return;
    }
    for (const arg of node.arguments[1]?.elements ?? []) {
      const props = arg?.properties ?? [],
        keys = props.filter((p: any) => !p.computed && (p.key?.name ?? p.key?.value) === 'N');
      const certainKey =
        keys.length === 1 &&
        props.every((p: any) => p.type === 'Property' && !p.computed) &&
        keys[0].kind === 'init';
      // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
      const tag = reads ? literal(arg) : certainKey ? literal(keys[0].value) : undefined;
      if (tag && edges.length < 32) edges.push({ alias, tag, direction: reads ? '读取点' : '写回点' });
      else partial = true;
      // end
    }
  });
  return { edges, partial };
}
// end
