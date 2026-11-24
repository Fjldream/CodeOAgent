// modified by jinlong.feng at 2026-11-20 KF开发助手M1
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import type { SceneObservation } from './scene-observation.ts';
export function parseSceneObservation(value: any): SceneObservation {
  const invalid = () => new HttpError(400, '3D 编辑现场信息无效');
  if (
    !value ||
    !['active', 'unlocated', 'untitled'].includes(value.document) ||
    ![value.count, value.selected].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    value.selected > value.count
  )
    throw invalid();
  const scene: SceneObservation = { document: value.document, count: value.count, selected: value.selected };
  // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  if (value.path !== undefined) {
    if (
      scene.document !== 'active' ||
      typeof value.path !== 'string' ||
      value.path.length > 500 ||
      !value.path.toLowerCase().endsWith('.json') ||
      /[\\?#\x00-\x1f]/.test(value.path) ||
      value.path.split('/').some((p: string) => !p || p === '..' || p === '.')
    )
      throw invalid();
    scene.path = value.path;
  }
  // end
  if (value.item) {
    const { name, kind, position } = value.item;
    if (
      value.selected !== 1 ||
      ![name, kind].every((s) => typeof s === 'string' && s.length <= 160 && !/[\u0000-\u001f]/.test(s))
    )
      throw invalid();
    if (
      position !== undefined &&
      (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite))
    )
      throw invalid();
    scene.item = { name, kind, ...(position ? { position: [...position] } : {}) };
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    if (value.item.tag !== undefined) {
      if (
        typeof value.item.tag !== 'string' ||
        !value.item.tag ||
        value.item.tag.length > 160 ||
        /[\x00-\x1f]/.test(value.item.tag)
      )
        throw invalid();
      scene.item.tag = value.item.tag;
    }
    // end
  }
  return scene;
}
// end
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { sectionForMenu, type calcConfig } from './calc-config.ts';
// end
export type Context = {
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  kind:
    | 'general'
    | 'page'
    | 'period'
    | 'request'
    | 'client'
    | 'calculation'
    | 'collection'
    | 'alarm'
    | 'datasource'
    | 'scene'
    | 'report';
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
  scriptPhase?: 'in'|'exist'|'out';
// end
  calcMenu?: string;
  // end
  group?: string;
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  control?: string;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  buttonName?: string;
  // end
  sceneView?: SceneObservation;
  // end
  cell?: { sheet: string; row: number; column: number };
  editor?: { session: string; sequence: number; digest?: string; lineDigest?: string };
  // end
  projectId: string;
  object: string;
  dirty: boolean;
};
export function textField(value: unknown, max: number, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new HttpError(400, label + '无效');
  return value.trim();
}
export function identifier(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value))
    throw new HttpError(400, '标识无效');
  return value;
}
export function readContext(value: any): Context {
  if (!value || value.kind === 'general') return { kind: 'general', projectId: '', object: '', dirty: false };
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  if (
    ![
      'page',
      'period',
      'request',
      'client',
      'calculation',
      'collection',
      'alarm',
      'datasource',
      'scene',
      'report',
    ].includes(value.kind)
  )
    // end
    throw new HttpError(400, '未知工程入口');
  const projectId = identifier(value.projectId);
  let object = '';
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  if (value.kind === 'page' || value.kind === 'scene') {
    // end
    object = textField(value.object, 160, '页面名');
    if (/[\\/:\x00-\x1f]/.test(object) || object.includes('..')) throw new HttpError(400, '页面名无效');
  }
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  if (['period', 'request', 'report'].includes(value.kind)) object = identifier(value.object);
  const context: Context = { kind: value.kind, projectId, object, dirty: value.dirty === true };
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  if (value.kind === 'calculation' && value.calcMenu !== undefined) {
    if (typeof value.calcMenu !== 'string' || !sectionForMenu(value.calcMenu))
      throw new HttpError(400, '未知计算菜单');
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
    context.calcMenu = value.calcMenu;
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
    if (value.object && ['calculate-global-variable','calculate-system-scripts','calculate-conditionalevent-script','calculate-datachange-script','calculate-selfdefine-script'].includes(value.calcMenu)) context.object=identifier(value.object);
    if (value.scriptPhase!==undefined) {
      if (value.calcMenu!=='calculate-conditionalevent-script' || !['in','exist','out'].includes(value.scriptPhase)) throw new HttpError(400,'条件事件子页无效');
      context.scriptPhase=value.scriptPhase;
    }
// end
// end
    if (value.group !== undefined) context.group = identifier(value.group);
  }
  // end
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  if (value.kind === 'alarm') {
    if (value.group) context.group = identifier(value.group);
    if (value.object) context.object = identifier(value.object);
  }
  // end
  if (value.kind === 'datasource') context.group = identifier(value.group);
  if (value.kind === 'page' && value.control) context.control = identifier(value.control);
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  if (context.control && value.buttonName !== undefined)
    context.buttonName = textField(value.buttonName, 160, '按钮名');
  // end
  if (value.kind === 'report' && value.cell) {
    const { sheet, row, column } = value.cell;
    if (![row, column].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1048575))
      throw new HttpError(400, '报表选区无效');
    context.cell = { sheet: identifier(sheet), row, column };
  }
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  if (context.kind === 'scene' && value.sceneView) context.sceneView = parseSceneObservation(value.sceneView);
  // end
  if (value.editor) {
    const { session, sequence, digest, lineDigest } = value.editor;
    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 0 ||
      [digest, lineDigest].some(
        (hash) => hash != null && (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)),
      )
    )
      throw new HttpError(400, '编辑快照无效');
    context.editor = {
      session: identifier(session),
      sequence,
      ...(digest ? { digest } : {}),
      ...(lineDigest ? { lineDigest } : {}),
    };
  }
  return context;
  // end
}
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
export type ReportMember = { datasetId: string; name: string; member: string; address: string };
export type Fact = { label: string; value: string };
// end
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
export type Evidence = {
  // modified by jinlong.feng at 2026-11-23 KF方案级业务总览
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  solutionScript?: import('./solution-script.ts').Checkpoint;
// end
  scope?: "solution";
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  calcConfig?: Awaited<ReturnType<typeof calcConfig>>['summary'];
  // end
  // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  alarmRule?: {
    state: string;
    captures: number;
    conflicts?: number;
    complete?: number;
    priorVersions?: number;
  };
  // end
  controlBinding?: {
    kind: string;
    state: string;
    eligibleVariables: number;
    guidance: string;
    runtimeVerified: false;
  };
  // end
  collectionSetup?: { view: 'drivers' | 'point'; status: string; guidance: string; runtimeVerified: false };
  // end
  pointLookup?: {
    tool: 'find_objects' | 'trace_refs';
    status: string;
    limited: boolean;
    states: string[];
    runtimeVerified: false;
  };
  // end
  // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
  variableInventory?: { total: number; builtIn: number; mapped: number; unknownMapping: number };
  // end
  id: string;
  at: string;
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  layer: 'saved';
  // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
  reportMember?: ReportMember;
  sceneView?: SceneObservation;
  // end
  digest?: string;
  editorComparison?: 'equal' | 'lineEndings' | 'different';
  source?: string;
  bindings?: {
    source: string;
    alias: string;
    name: string;
    direction: 'read' | 'write' | 'event';
    definition?: string;
  }[];
  // end
  title: string;
  facts: Fact[];
  gaps: string[];
  references: string[];
};
export function missing() {
  return new HttpError(404, '记录不存在或无访问权限');
}
// end
