// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import { assistantJson } from './api.js';
const observerId = 'jfofcbjdlefiophcmdmcfcaibffkjicd';
function askBrowser(message) {
  return new Promise((resolve) => {
    if (!globalThis.chrome?.runtime?.sendMessage) return resolve(null);
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    const timed =
      message.kind === 'observe-scene' &&
      message.targets.some((t) => ['自旋转', '可见性闪烁'].includes(t.property));
    const timer = setTimeout(() => resolve(null), timed ? 12000 : 4000);
    // end
    try {
      chrome.runtime.sendMessage(observerId, message, (value) => {
        clearTimeout(timer);
        resolve(chrome.runtime.lastError ? null : value);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
export async function captureAlarm(targets) {
  const frame = await askBrowser({ kind: 'observe-alarm', targets });
  if (!frame)
    throw new Error('请用同一账号打开目标 App 的报警窗，在 Chrome 工具栏单击 KF 运行画面核对，再开始联查。');
  return frame;
}
// end
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
export async function captureReport(targets) {
  const result = await askBrowser({ kind: 'observe-report', targets });
  if (!result)
    throw Error('请用相同账号在已关联的运行客户端显示目标报表工作表，并确认 Chrome 的 KF 核对扩展已更新。');
  return result;
}
// end
export const observerTab = globalThis.crypto?.randomUUID?.() || '';
export function currentEditorText(context) {
  if (context.kind !== 'page' || !context.control || window.parent === window) return null;
  try {
    const parent = window.parent;
    const params = new URLSearchParams(parent.location.search);
    const view = parent.pageEditor?.graphicViewObj;
    if (
      parent.location.origin !== location.origin ||
      params.get('GUID') !== context.projectId ||
      view?.curPageOrModeName !== context.object ||
      view.selectMng?.selectObj?.length !== 1
    )
      return null;
    const item = view.selectMng.selectObj[0];
    if (item.guid !== context.control || typeof item.text !== 'string' || item.text.length > 256) return null;
    return {
      projectId: context.projectId,
      page: context.object,
      control: item.guid,
      text: item.text,
      at: Date.now(),
    };
  } catch {
    return null;
  }
}
export async function captureRuntime(token, context) {
  if (context.kind !== 'page' || !context.control || !(await askBrowser({ kind: 'paired' }))) return null;
  const targets = await assistantJson(token, 'tools/runtime_targets', { context }).catch(() => []);
  return targets.length ? askBrowser({ kind: 'observe', targets }) : null;
}
// end

// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
export async function captureScene(targets) {
  const sample = await askBrowser({ kind: 'observe-scene', targets });
  if (!sample) throw Error('未命中可见部件。请核对运行账号、页面和标签页关联，并确认部件中心可见。');
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  const guidance = {
    rule: '请核对运行页已加载的动画档位、旋转轴和变量类型。',
    window: '运行文档、点值、镜头或视口在采样中发生变化。请保持运行标签在前台后重试。',
    covered: '部件中心被遮挡。请让目标部件完整显示后重试。',
    pick: '渲染画面与部件显隐状态尚未同步，或其后方有其他模型。请调整视角后重试。',
    canvas: '当前画布不能读取原尺寸像素，请重新加载运行客户端。',
    backdrop: '隐藏状态露出的背景无法核实。请在纯色背景上观察目标部件。',
    opacity: '当前像素有透明度，无法核对该部件的显隐变化。',
    hidden: '采样窗口内没有看到指定部件，请检查运行绑定和部件可见性。',
  };
  if (Object.hasOwn(guidance, sample.sceneIssue)) throw Error(guidance[sample.sceneIssue]);
  // end
  return sample;
}
// end
