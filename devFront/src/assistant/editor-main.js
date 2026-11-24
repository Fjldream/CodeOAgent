// modified by jinlong.feng at 2026-11-20 KF开发助手M1
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import { createApp, h, ref } from 'vue';
// end
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import AssistantPanel from './AssistantPanel.vue';
import { onBeforeUnmount } from 'vue';
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import { createEditorSession, readNativePage } from './editor-context.js';
import { readNativeScene } from './scene-editor.js';
// end
// end
const container = document.querySelector('#assistant');
try {
  const native = window.parent.location;
  if (
    window.parent === window ||
    native.origin !== location.origin ||
    native.pathname !== '/kingclient/index.html'
  )
    throw new Error();
  const params = new URLSearchParams(native.search);
  const projectId = params.get('GUID'),
    page = params.get('pageName');
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  const scene = params.get('file3dName');
  if (!projectId || (!page && !scene) || (page && scene)) throw new Error();
  // end
  const token = () => {
    try {
      return JSON.parse(sessionStorage.getItem('userStore') || '{}').loginInfo?.access_token || '';
    } catch {
      return '';
    }
  };
  // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
  createApp({
    setup() {
      // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
      const minimized = ref(false),
        session = createEditorSession();
      const base = {
        kind: page ? 'page' : 'scene',
        projectId,
        object: page || scene,
        label: page || '3D / ' + scene,
      };
      const current = ref(base);
      const update = () => {
        // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
        const selected = page ? readNativePage(window.parent, base) : readNativeScene(window.parent, base);
        if (
          // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
          selected.buttonName === current.value.buttonName &&
          // end
          selected.control === current.value.control &&
          selected.object === current.value.object &&
          JSON.stringify(selected.sceneView) === JSON.stringify(current.value.sceneView)
        )
          return;
        session.sequence++;
        current.value = selected;
        // end
      };
      const readSelection = () => {
        update();
        return { ...current.value, editor: { ...session } };
      };
      update();
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      const sceneTimer = scene
        ? window.setInterval(() => {
            if (!document.hidden && !minimized.value) update();
          }, 700)
        : undefined;
      onBeforeUnmount(() => window.clearInterval(sceneTimer));
      window.parent.addEventListener('pointerup', update);
      // end
      window.parent.addEventListener('keyup', update);
      onBeforeUnmount(() => {
        window.parent.removeEventListener('pointerup', update);
        window.parent.removeEventListener('keyup', update);
      });
      // end
      return () =>
        h(AssistantPanel, {
          embedded: true,
          minimized: minimized.value,
          // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
          context: { ...current.value, readSelection },
          // end
          token,
          onMinimize: () => {
            minimized.value = true;
          },
          onRestore: () => {
            minimized.value = false;
          },
          onClose: () => window.parent.postMessage({ type: 'kf-assistant-close' }, location.origin),
        });
    },
  }).mount(container);
  // end
} catch {
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  container.textContent = '请从 KF 页面或 3D 场景编辑器打开开发助手。';
  // end
}
// end
