// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
// Chrome executes this function in the paired runtime document.
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
export async function readScenePart(target) {
  // end
  const { origin, page, control, part, scene, property, variable, userName } = target;
  if (
    location.origin !== origin ||
    sessionStorage.user !== userName ||
    decodeURIComponent(location.hash.slice(1)) !== page ||
    window.pageJson?.pageProperty?.name !== page ||
    typeof KMUIFrame === 'undefined' ||
    typeof KMProjectVariableMng === 'undefined'
  )
    return null;
  const pageModel = KMUIFrame.getInstance().pageMng.getPageByName(page);
  const layouts = pageModel?.getObjects()?.filter((o) => o.guid === control && o.htLayoutView);
  if (layouts?.length !== 1 || !pageModel.thisElement?.isConnected) return null;
  const layout = layouts[0].htLayoutView,
    graphic = layout.graphicHTObj,
    view = layout.graphView;
  const model = graphic?.htDataModel,
    element = view?.getView();
  if (
    graphic?.htJsonPath !== 'storage/scenes/' + scene.slice(0, -5) ||
    !model ||
    model.size() > 10000 ||
    !pageModel.thisElement.contains(element) ||
    !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  )
    return null;
  const node = model.getDataByTag(part);
  let copies = 0;
  model.each((item) => {
    if (item.getTag?.() === part) copies++;
  });
  if (copies !== 1 || !node?.p3) return null;
  const events = graphic.htModelEventMng
    .objectToJson()
    .filter((group) => group.htModelTag === part)
    .flatMap((group) => group.expressionEventMng)
    .filter((e) => e.propertyName === property);
  const event = events.length === 1 ? events[0] : null;
  const loaded = event && {
    variableName: event.variableName,
    propertyName: event.propertyName,
    enable: event.enable,
    connectObj: {},
  };
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  // end
  for (const key of [
    'moveMode',
    'inputflag',
    'inputVal1',
    'inputVal2',
    'moveVal1',
    'moveVal2',
    'rotateMode',
    'angleBegin',
    'angleEnd',
    'rotateBegin',
    'rotateEnd',
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    'expressionType',
    'rotateSpeed',
    'rotateAxis',
    'rotateDirection',
    'blinkSpeed',
    // end
  ])
    if (event?.connectObj && Object.hasOwn(event.connectObj, key))
      loaded.connectObj[key] = event.connectObj[key];
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  const conditions = event?.connectObj?.propertyCon;
  if (property === '画刷' && Array.isArray(conditions) && conditions.length <= 32) {
    loaded.connectObj.propertyCon = conditions.map((row) => ({
      Operator: row?.Operator,
      value: row?.value,
      brushArr:
        Array.isArray(row?.brushArr) && row.brushArr.length === 1 ? [{ color: row.brushArr[0]?.color }] : [],
    }));
  }
  const position = Array.from(node.p3()),
    // end
    base = node.a('originRect')?.position;
  const pixel = view.toViewPosition(position),
    width = view.getWidth(),
    height = view.getHeight(),
    rect = element.getBoundingClientRect();
  if (
    !base ||
    !pixel ||
    pixel.z < -1 ||
    pixel.z > 1 ||
    pixel.x < 0 ||
    pixel.x >= width ||
    pixel.y < 0 ||
    pixel.y >= height ||
    !element.contains(
      document.elementFromPoint(
        rect.left + (pixel.x * rect.width) / width,
        rect.top + (pixel.y * rect.height) / height,
      ),
    ) ||
    // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
    (property !== '可见性闪烁' && view.getDataAt(pixel) !== node)
    // end
  )
    return null;
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  const visual = {};
  if (['x轴旋转', 'y轴旋转', 'z轴旋转'].includes(property)) {
    visual.rotation = [node.getRotationX(), node.getRotationY(), node.getRotationZ()].map(
      (a) => (a * 180) / Math.PI,
    );
    // Compare a fixed set of screen rays around the same visible centre at both input levels.
    let silhouette = '';
    for (const radius of [8, 16, 32, 64]) {
      for (let ray = 0; ray < 8; ray++) {
        const a = (ray * Math.PI) / 4,
          x = pixel.x + radius * Math.cos(a),
          y = pixel.y + radius * Math.sin(a);
        const visible =
          x >= 0 &&
          y >= 0 &&
          x < width &&
          y < height &&
          element.contains(
            document.elementFromPoint(
              rect.left + (x * rect.width) / width,
              rect.top + (y * rect.height) / height,
            ),
          );
        if (!visible) {
          silhouette += 'x';
          continue;
        }
        const hit = view.getDataAt({ x, y });
        silhouette += hit === node ? '1' : hit ? 'x' : '0';
      }
    }
    visual.silhouette = silhouette;
  } else if (property === '画刷') {
    if (typeof view.toCanvas !== 'function' || width * height > 4194304) return null;
    const image = view.toCanvas(),
      surface = image?.getContext('2d');
    if (!surface || image.width !== width || image.height !== height) return null;
    const rgba = surface.getImageData(Math.floor(pixel.x), Math.floor(pixel.y), 1, 1).data;
    if (rgba[3] !== 255) return null;
    visual.renderColor = '#' + Array.from(rgba.slice(0, 3), (n) => n.toString(16).padStart(2, '0')).join('');
    visual.material = { all: node.s('all.blend'), shape: node.s('shape3d.blend'), base: node.s('all.color') };
  }
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  const variableObject = KMProjectVariableMng.getInstance().getProjectVariableByName(variable);
  const value = variableObject?.getValue?.();
  if (property === '自旋转' || property === '可见性闪烁') {
    const spin = property === '自旋转',
      cfg = loaded?.connectObj;
    const camera = Array.from(view.getPVMatrix());
    const duration = spin ? 3300 : [1000, 600, 300][cfg?.blinkSpeed] * 6.6;
    if (
      !Number.isFinite(duration) ||
      !cfg ||
      (spin && ![0, 1, 2].includes(cfg.rotateAxis)) ||
      (!spin && (typeof value !== 'boolean' || width * height > 4194304))
    )
      return { sceneIssue: 'rule' };
    const frames = [];
    let epoch,
      initial,
      visibleSeen = false,
      lastColorAt = -Infinity;
    do {
      if (
        document.hidden ||
        !element.isConnected ||
        sessionStorage.user !== userName ||
        location.origin !== origin ||
        decodeURIComponent(location.hash.slice(1)) !== page ||
        variableObject.getValue() !== value ||
        view.getWidth() !== width ||
        view.getHeight() !== height ||
        !camera.every((v, i) => Math.abs(v - view.getPVMatrix()[i]) < 1e-6) ||
        !position.every((v, i) => Math.abs(v - node.p3()[i]) < 1e-6)
      )
        return { sceneIssue: 'window' };
      const currentRect = element.getBoundingClientRect();
      const exposed = (x, y) =>
        x >= 0 &&
        x < width &&
        y >= 0 &&
        y < height &&
        element.contains(
          document.elementFromPoint(
            currentRect.left + (x * currentRect.width) / width,
            currentRect.top + (y * currentRect.height) / height,
          ),
        );
      if (!exposed(pixel.x, pixel.y)) return { sceneIssue: 'covered' };
      const hit = view.getDataAt(pixel);
      const now = performance.now();
      if (initial === undefined) {
        initial = now;
        epoch = Date.now();
      }
      const frame = { ms: Math.round((now - initial) * 10) / 10 };
      if (spin) {
        if (hit !== node) return { sceneIssue: 'covered' };
        frame.angle =
          ([node.getRotationX(), node.getRotationY(), node.getRotationZ()][cfg.rotateAxis] * 180) / Math.PI;
        let mask = '';
        for (const radius of [8, 16, 32, 64]) {
          for (let ray = 0; ray < 8; ray++) {
            const x = pixel.x + radius * Math.cos((ray * Math.PI) / 4),
              y = pixel.y + radius * Math.sin((ray * Math.PI) / 4);
            if (!exposed(x, y)) {
              mask += 'x';
              continue;
            }
            const picked = view.getDataAt({ x, y });
            mask += picked === node ? '1' : picked ? 'x' : '0';
          }
        }
        frame.mask = mask;
      } else {
        const visible = node.s('3d.visible') !== false;
        if (visible ? hit !== node : !!hit) return { sceneIssue: 'pick' };
        visibleSeen ||= visible;
        frame.visible = visible;
        if (!frames.length || frames.at(-1).visible !== visible || frame.ms - lastColorAt >= 900) {
          const image = view.toCanvas();
          if (image?.width !== width || image.height !== height) return { sceneIssue: 'canvas' };
          const rgba = image
            .getContext('2d')
            .getImageData(Math.floor(pixel.x), Math.floor(pixel.y), 1, 1).data;
          let rgb = rgba.slice(0, 3);
          if (rgba[3] === 0 && !visible) {
            // A cleared WebGL pixel reveals the page. Resolve only a plain opaque CSS backdrop.
            let backdrop = null;
            const stack = document.elementsFromPoint(
              currentRect.left + (pixel.x * currentRect.width) / width,
              currentRect.top + (pixel.y * currentRect.height) / height,
            );
            for (const layer of stack) {
              const css = getComputedStyle(layer);
              if (
                css.backgroundImage !== 'none' ||
                css.opacity !== '1' ||
                css.mixBlendMode !== 'normal' ||
                css.filter !== 'none' ||
                ['IMG', 'VIDEO', 'IFRAME', 'SVG'].includes(layer.tagName.toUpperCase()) ||
                (layer.tagName === 'CANVAS' && !element.contains(layer))
              )
                return { sceneIssue: 'backdrop' };
              if (
                /^rgba\(\d+,\s*\d+,\s*\d+,\s*0\)$/.test(css.backgroundColor) ||
                css.backgroundColor === 'transparent'
              )
                continue;
              const match = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(css.backgroundColor);
              if (!match) return { sceneIssue: 'backdrop' };
              backdrop = match.slice(1).map(Number);
              break;
            }
            if (!backdrop) {
              if (
                !stack.includes(document.documentElement) ||
                getComputedStyle(document.documentElement).colorScheme !== 'normal' ||
                matchMedia('(forced-colors: active)').matches
              )
                return { sceneIssue: 'backdrop' };
              const canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d');
              ctx.fillStyle = 'Canvas';
              ctx.fillRect(0, 0, 1, 1);
              backdrop = ctx.getImageData(0, 0, 1, 1).data.slice(0, 3);
            }
            rgb = backdrop;
          } else if (rgba[3] !== 255) return { sceneIssue: 'opacity' };
          frame.color = '#' + Array.from(rgb, (v) => v.toString(16).padStart(2, '0')).join('');
          lastColorAt = frame.ms;
        }
      }
      frames.push(frame);
      if (frame.ms >= duration) break;
      await new Promise((r) => setTimeout(r, 55));
    } while (frames.length < 220);
    if (!spin && !visibleSeen) return { sceneIssue: 'hidden' };
    visual.timing = { start: epoch, frames };
  }
  // end
  // end
  return {
    // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
    ...target,
    ...visual,
    // end
    loaded,
    value,
    base: Array.from(base),
    position,
    pixel: [pixel.x, pixel.y],
    size: [width, height],
    camera: Array.from(view.getPVMatrix()),
    documentStart: performance.timeOrigin,
    at: Date.now(),
  };
}
// end
