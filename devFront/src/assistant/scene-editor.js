// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
// Read only the active HT document and its single selection in the authorized editor tab.
export function readNativeScene(host, base) {
  try {
    const frame = host.ht3DIframeEditor?.iframeElement3d?.thisElement;
    const child = frame?.contentWindow;
    if (
      !child ||
      child.location.origin !== host.location.origin ||
      child.location.pathname !== '/kingclient3d/index3d.html' ||
      new URLSearchParams(child.location.search).get('ProjectInfo') !== base.projectId
    )
      return base;
    const editor = child.editor3d,
      model = editor?.dm;
    if (!model || !editor.g3d || typeof model.size !== 'function') return base;
    const selection = model.sm(),
      selected = selection.size();
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    const match = typeof editor.url === 'string' && /^scenes\/([^\\?#]+\.json)$/i.exec(editor.url);
    const path = match && match[1].length <= 500 && match[1].split('/').every(v=>v && v!=='.' && v!=='..') ? match[1] : '';
// end
    const sceneView = {
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
      document: path ? 'active' : editor.url ? 'unlocated' : 'untitled',
      ...(path && {path}),
// end
      count: model.size(),
      selected,
    };
    if (selected === 1) {
      const item = selection.ld();
      if (item) {
        const clip = (value) => (typeof value === 'string' ? value.slice(0, 160) : '');
        sceneView.item = { name: clip(item.getName?.()), kind: clip(item.getClassName?.()) };
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
        const tag = item.getTag?.();
        if (typeof tag === 'string' && tag && tag.length<=160 && model.size()<=10000 && typeof model.each==='function') {
          let matches=0;
          model.each(node=>{if(node.getTag?.()===tag)matches++;});
          if(matches===1)sceneView.item.tag=tag;
        }
// end
        const pos = item.p3?.();
        if (Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite))
          sceneView.item.position = pos.slice();
      }
    }
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    const object = path ? path.split('/').at(-1) : base.object;
// end
    const title = match ? object : sceneView.document === 'untitled' ? '未命名画布' : '当前画布';
    return {
      ...base,
      object,
      label: '3D / ' + title + (sceneView.item?.name ? ' / ' + sceneView.item.name : ''),
      sceneView,
    };
  } catch {
    return base;
  }
}
// end
