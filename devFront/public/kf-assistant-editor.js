// modified by jinlong.feng at 2026-11-20 KF开发助手M1
(() => {
  if (location.pathname !== '/kingclient/index.html' || document.getElementById('kf-assistant-launcher'))
    return;
  const query = new URLSearchParams(location.search);
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  if (!query.get('GUID') || !(query.get('pageName') || query.get('file3dName'))) return;
// end
  const launcher = document.createElement('button');
  launcher.id = 'kf-assistant-launcher';
  launcher.type = 'button';
  // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
  const mark = document.createElement('span');
  mark.textContent = 'KF';
  mark.setAttribute('aria-hidden', 'true');
  launcher.append(mark, document.createTextNode('开发助手'));
  launcher.setAttribute('aria-haspopup', 'dialog');
  // end
  launcher.setAttribute('aria-expanded', 'false');
  // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
  const style = document.createElement('style');
  style.textContent = `
    #kf-assistant-launcher{position:fixed;right:20px;bottom:20px;z-index:12000;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:42px;padding:0 17px;border:1px solid #cbd3da;border-radius:24px;background:#fbfcfd;color:#213345;box-shadow:0 4px 14px #18304226;cursor:pointer;font:600 13px/1 system-ui,sans-serif}
    #kf-assistant-launcher[hidden]{display:none}
    #kf-assistant-launcher span{border-radius:7px;background:#243747;color:#fff;padding:6px 4px;font:700 11px/1 monospace}
    #kf-assistant-launcher:focus-visible{outline:2px solid #3474c7;outline-offset:2px}
    @media(max-width:559px){#kf-assistant-launcher{right:6px;bottom:6px}}`;
  document.head.append(style);
  // end
  document.body.append(launcher);
  let frame;
  function close() {
    frame?.remove();
    frame = null;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }
  launcher.addEventListener('click', () => {
    if (frame) return;
    frame = document.createElement('iframe');
    frame.title = 'KF 开发助手';
    frame.src = '/assistant.html';
    // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
    frame.style.cssText =
      'position:fixed;right:20px;bottom:20px;width:min(504px,96vw);height:min(634px,96vh);border:0;border-radius:16px;z-index:12000;background:white;box-shadow:0 16px 52px #1e334133,0 2px 8px #122c411a;transform-origin:top left';
    // end
    document.body.append(frame);
    launcher.hidden = true;
    launcher.setAttribute('aria-expanded', 'true');
    frame.focus();
  });
  window.addEventListener('message', (event) => {
    if (
      frame &&
      event.origin === location.origin &&
      event.source === frame.contentWindow &&
      event.data?.type === 'kf-assistant-close'
    )
      close();
  });
})();
// end
