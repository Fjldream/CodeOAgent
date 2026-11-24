// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import { readAlarmWindow } from './read-alarm.js';
// end
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
import { readReportCell } from './read-report.js';
import { readScenePart } from './read-scene.js';
// end
// end
// modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
import { readVisibleControl } from './read-control.js';
import { observedPageHash } from './page-definition.js';
// end
const developmentOrigins = new Set(
  [5179, 5175, 4175].flatMap((port) =>
    ['127.0.0.1', 'localhost'].map((host) => 'http://' + host + ':' + port),
  ),
);
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const live = await chrome.tabs.get(tab.id);
  if (!live.url || !/^https?:\/\//.test(live.url)) return;
  const current = (await chrome.storage.session.get('runtimeTab')).runtimeTab;
  if (current) await chrome.action.setBadgeText({ tabId: current.id, text: '' }).catch(() => {});
  await chrome.storage.session.remove('runtimeTab');
  if (current?.id === tab.id) return;
  await chrome.storage.session.set({ runtimeTab: { id: tab.id, origin: new URL(live.url).origin } });
  await chrome.action.setBadgeText({ tabId: tab.id, text: 'KF' });
});
chrome.runtime.onMessageExternal.addListener((request, sender, reply) => {
  // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
  if (
    !developmentOrigins.has(sender.origin) ||
    // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    !['paired', 'observe', 'observe-alarm', 'observe-report', 'observe-scene'].includes(request?.kind)
    // end
    // end
  )
    return;
  // end
  (async () => {
    const tab = (await chrome.storage.session.get('runtimeTab')).runtimeTab;
    if (!tab) return null;
    const live = await chrome.tabs.get(tab.id);
    if (!live.url || new URL(live.url).origin !== tab.origin) return null;
    if (request.kind === 'paired') return true;
    const targets = request.targets.filter((t) => t.origin === tab.origin);
    if (targets.length !== 1) return null;
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    const timed = request.kind === 'observe-scene' && ['自旋转', '可见性闪烁'].includes(targets[0].property);
    const returnTab =
      timed && !live.active && sender.tab?.windowId === live.windowId && sender.tab.active
        ? sender.tab.id
        : null;
    if (timed && !live.active && !returnTab) return null;
    if (returnTab) await chrome.tabs.update(tab.id, { active: true });
    let results;
    try {
      results = await chrome.scripting.executeScript({
        // end
        target: { tabId: tab.id },
        world: 'MAIN',
        // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
        // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
        // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
        func:
          request.kind === 'observe-scene'
            ? readScenePart
            : request.kind === 'observe-report'
              ? readReportCell
              : request.kind === 'observe-alarm'
                ? readAlarmWindow
                : readVisibleControl,
        // end
        // end
        // end
        // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
        args: request.kind === 'observe' ? [targets[0], true] : [targets[0]],
        // end
      });
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    } finally {
      if (returnTab && (await chrome.tabs.get(tab.id).catch(() => null))?.active)
        await chrome.tabs.update(returnTab, { active: true }).catch(() => {});
    }
    const observation = results[0]?.result;
    // end
    if (request.kind === 'observe' && observation?.cycleMaterial) {
      // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
      const { cycleMaterial, pageMaterial, ...sample } = observation;
      const [servedPage, loadedPage] = await Promise.all([
        observedPageHash(pageMaterial?.served, targets[0].page),
        observedPageHash(pageMaterial?.loaded, targets[0].page),
      ]);
      // end
      async function hash(value) {
        if (typeof value !== 'string' || value.length > 400000) return null;
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
        return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
      }
      return {
        ...sample,
        // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
        pageDefinition: { schema: 1, served: servedPage, loaded: loadedPage },
        installedCycle: await hash(cycleMaterial.installed),
        // end
        loadedCycle: await hash(cycleMaterial.loaded),
      };
    }
    return observation || null;
    // end
  })().then(reply, () => reply(null));
  return true;
});
// end
