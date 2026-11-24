// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
// modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
import { createHash } from 'node:crypto';
import { canonicalPageDefinition } from '../runtime-observer/page-definition.js';
// end
import { pageWrites } from './page-trace.ts';
import { controlKind, selectedControls } from './page-trace.ts';
// end
import { isIP } from 'node:net';
import type { Context } from './shared.ts';
import type { AppObservation } from './runtime.ts';

export type ScreenTarget = {
  origin: string;
  appId: string;
  nodeId: string;
  projectId: string;
  page: string;
  control: string;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  buttonName?: string;
  // end
  userName: string;
};
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
type BrowserSample = ScreenTarget & {
  at: number;
  displayed: string;
  installed: string | null;
  installedCycle?: string | null;
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  loadedCycle?: string | null;
  pageDefinition?: { schema: 1; served: string | null; loaded: string | null };
  // end
};
// end
export function screenTargets(data: any, context: Context, userName: string): ScreenTarget[] {
  // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
  if (
    context.kind === 'report'
      ? !context.cell || !userName
      : context.kind !== 'page' || !context.control || !userName
  )
    return [];
  // end
  const result: ScreenTarget[] = [];
  for (const app of data?.appResource || []) {
    if (app.projectId !== context.projectId || app.projectType !== 1 || app.canOperate !== true) continue;
    const bindings = (data.nodeProApp || []).filter((n: any) =>
      n.appPros?.some((a: any) => a.appId === app.appId),
    );
    if (bindings.length !== 1) continue;
    const nodes = (data.nodeResource || []).filter((n: any) => n.nodeId === bindings[0].nodeId);
    if (nodes.length !== 1) continue;
    const host = nodes[0].address,
      port = Number(app.port);
    if (
      typeof host !== 'string' ||
      (!isIP(host) && !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(host)) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    )
      continue;
    const authority = (isIP(host) === 6 ? '[' + host + ']' : host) + ':' + port;
    for (const protocol of ['http:', 'https:']) {
      result.push({
        origin: new URL(protocol + '//' + authority).origin,
        projectId: context.projectId,
        appId: app.appId,
        nodeId: nodes[0].nodeId,
        page: context.object,
        // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
        control: context.control || '',
        // end
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        ...(context.buttonName && { buttonName: context.buttonName }),
        // end
        userName,
      });
    }
  }
  return result.filter((target) => {
    // App addresses may be reused across projects. Do not attribute a shared endpoint to either App.
    const hostNodes = new Set(
      data.nodeResource
        .filter((n: any) => {
          const host = String(n.address || '').toLowerCase();
          return host === new URL(target.origin).hostname.replace(/^\[|\]$/g, '');
        })
        .map((n: any) => n.nodeId),
    );
    const ids = new Set(
      (data.nodeProApp || [])
        .filter((n: any) => hostNodes.has(n.nodeId))
        .flatMap((n: any) => (n.appPros || []).map((a: any) => a.appId)),
    );
    const port = Number(new URL(target.origin).port || (target.origin.startsWith('https:') ? 443 : 80));
    return data.appResource.filter((a: any) => ids.has(a.appId) && Number(a.port) === port).length === 1;
  });
}
export function matchBrowserSample(
  value: any,
  targets: ScreenTarget[],
  apps: AppObservation[],
  now: number,
): BrowserSample | null {
  if (
    !value ||
    !Number.isSafeInteger(value.at) ||
    value.at > now + 2000 ||
    now - value.at > 45000 ||
    typeof value.displayed !== 'string' ||
    value.displayed.length > 256 ||
    (value.installed !== null && (typeof value.installed !== 'string' || value.installed.length > 256))
  )
    return null;
  const candidates = targets.filter((target) => target.origin === value.origin);
  if (candidates.length !== 1 || !Object.entries(candidates[0]).every(([k, v]) => value[k] === v))
    return null;
  const app = apps.find((a) => a.appId === value.appId && a.nodeId === value.nodeId);
  if (!app || app.process !== '运行中' || app.deployed !== '已部署') return null;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  const digest = (v: unknown) => (typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? v : null);
  return {
    ...candidates[0],
    at: value.at,
    // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
    displayed: value.displayed,
    ...(value.pageDefinition?.schema === 1 && {
      pageDefinition: {
        schema: 1 as const,
        served: digest(value.pageDefinition.served),
        loaded: digest(value.pageDefinition.loaded),
      },
    }),
    // end
    installed: value.installed,
    ...(value.installedCycle !== undefined && { installedCycle: digest(value.installedCycle) }),
    ...(value.loadedCycle !== undefined && { loadedCycle: digest(value.loadedCycle) }),
  };
  // end
}
export function describeScreen(
  context: Context,
  savedFile: any,
  sample: BrowserSample | null,
  editorObservation?: unknown,
) {
  const fields =
    savedFile?.pageProperty?.name === context.object &&
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    Array.isArray(savedFile.objects) &&
    selectedControls(savedFile.objects, context);
  // end
  const saved =
    fields?.length === 1 && typeof fields[0].text === 'string' && fields[0].text.length <= 256
      ? fields[0].text
      : null;
  const at = new Date().toISOString();
  const input = editorObservation as Record<string, unknown> | null | undefined;
  const editor =
    input?.projectId === context.projectId &&
    input?.page === context.object &&
    input.control === context.control &&
    typeof input.text === 'string' &&
    input.text.length <= 256 &&
    typeof input.at === 'number' &&
    Number.isSafeInteger(input.at) &&
    Date.now() - input.at <= 45000 &&
    input.at <= Date.now() + 2000
      ? { text: input.text, at: new Date(input.at).toISOString() }
      : null;
  const lines = [
    '编辑器 · ' +
      (editor
        ? JSON.stringify(editor.text) + ' · ' + editor.at
        : context.dirty
          ? '本标签报告有未保存改动。'
          : '已定位本标签选区，草稿文字未取样。'),
    'Center 保存 · ' + (saved === null ? '缺少所选控件的文字回读。' : JSON.stringify(saved)) + ' · ' + at,
  ];
  if (!sample || (context.buttonName && fields?.length !== 1)) {
    lines.push('运行画面待核实。在同账号的目标 App 打开该页，单击浏览器的“KF 运行画面核对”，再查询。');
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    return { status: 'unobserved', editor, saved, at, lines, bindingCycle: undefined };
    // end
  }
  const observedAt = new Date(sample.at).toISOString();
  lines.push(
    '目标节点 / App · ' + sample.nodeId + ' / ' + sample.appId,
    '运行 App 页面文件 · ' +
      (sample.installed === null ? '未取得' : JSON.stringify(sample.installed)) +
      ' · ' +
      observedAt,
    '普通账号浏览器 · 运行控件显示 ' + JSON.stringify(sample.displayed) + ' · ' + observedAt,
  );
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  const pageComparison = comparePageDefinition(context.object, savedFile, sample.pageDefinition);
  lines.push(...pageComparison.lines);
  const selected = fields?.length === 1 ? fields[0] : undefined;
  // end
  const kind = selected ? controlKind(selected) : 'unknown';
  const cycles = Array.isArray(savedFile?.linkMng?.linkList)
    ? savedFile.linkMng.linkList.filter((l: any) => l?.linkId === 2)
    : [];
  const cycle = cycles.length === 1 ? cycles[0] : null;
  const dynamic =
    kind !== 'unknown' &&
    cycle?.enable === true &&
    typeof cycle.script === 'string' &&
    cycle.script.length <= 65536 &&
    pageWrites(cycle.script, selected.name, kind === 'text' ? 'setText' : 'Caption').writes > 0;
  const savedHash = dynamic
    ? createHash('sha256')
        .update(JSON.stringify([cycle.enable, String(cycle.intervalMs ?? ''), cycle.script]))
        .digest('hex')
    : null;
  const compare = (hash?: string | null) =>
    !hash || !savedHash ? 'unknown' : hash === savedHash ? 'matches' : 'different';
  const installedCycle = compare(sample.installedCycle),
    loadedCycle = compare(sample.loadedCycle);
  if (dynamic) {
    const label = { unknown: '未取到', matches: '一致', different: '不同' };
    lines.push(
      '页面“存在时”事件与 Center 保存版本比对 · App 文件 ' +
        label[installedCycle] +
        ' · 运行标签已加载 ' +
        label[loadedCycle] +
        '。',
    );
    if (installedCycle === 'different')
      lines.push('先核对该客户端的发布记录与目标 App 部署，再重新打开运行页复查。');
    else if (installedCycle === 'matches' && loadedCycle === 'different')
      lines.push('目标 App 文件已匹配，重新打开这个运行页后复查。');
    else if (loadedCycle === 'matches')
      lines.push('运行标签的事件已匹配，请按点的实际输入与换算核对动态显示。');
  }
  const status =
    dynamic || saved === null ? 'observed' : sample.displayed !== saved ? 'different' : 'matches';
  // end
  if (status === 'different')
    lines.push('当前显示与保存文字不同。核对发布记录、目标 App 更新部署和控件的动态绑定。');
  if (status === 'matches') lines.push('本次观察中，同一控件的显示与保存文字一致。');
  if (sample.installed !== null && saved !== null && sample.installed !== saved)
    lines.push('目标 App 返回的页面文件与 Center 保存文字不同。');
  return {
    status,
    editor,
    saved,
    at,
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    ...(dynamic && { bindingCycle: { installed: installedCycle, loaded: loadedCycle } }),
    // end
    // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
    pageComparison: pageComparison.states,
    sampleAt: observedAt,
    // end
    installed: sample.installed,
    displayed: sample.displayed,
    lines,
  };
}
// end

// modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
function comparePageDefinition(name: string, file: any, fingerprint: BrowserSample['pageDefinition']) {
  const saved = fingerprint && canonicalPageDefinition(file, name);
  const savedHash = saved ? createHash('sha256').update(saved).digest('hex') : null;
  const served = fingerprint?.served,
    loaded = fingerprint?.loaded;
  const compare = (a?: string | null, b?: string | null) =>
    !a || !b ? 'unknown' : a === b ? 'matches' : 'different';
  const states = {
    savedToApp: compare(savedHash, served),
    appToTab: compare(served, loaded),
    savedToTab: compare(savedHash, loaded),
  };
  const label = { unknown: '缺少回读', matches: '一致', different: '不同' };
  const lines = [
    '页面内容（页面属性、控件、页面事件及数据源订阅） · 保存与 App 文件' +
      label[states.savedToApp] +
      ' · App 文件与当前标签' +
      label[states.appToTab] +
      ' · 保存与当前标签' +
      label[states.savedToTab] +
      '。',
  ];
  if (states.savedToApp === 'different')
    lines.push(
      '目标 App 提供的页面与已保存页面不同。核对本次更新时间、所选节点和 App 的工程版本，再检查部署。',
    );
  if (states.appToTab === 'different')
    lines.push('当前标签已加载的页面与该 App 现在提供的页面不同。重新打开同一 App 的这一页再核对。');
  if (states.savedToApp === 'matches' && states.appToTab === 'matches')
    lines.push('三处页面内容一致。若业务显示仍有差异，下一步核对控件绑定、订阅与实际点值。');
  if (!served || !loaded)
    lines.push(
      '缺少页面内容摘要。确认已重新加载运行核对扩展，并在同账号、同 App 的运行标签重新关联。较大或无法读取的页面会保留缺项。',
    );
  return { states, lines };
}
// end
