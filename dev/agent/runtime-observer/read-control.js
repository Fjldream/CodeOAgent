// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
// Chrome serializes this function into the selected KF runtime tab.
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
export async function readVisibleControl(target, withCycle = false) {
  // end
  const { origin, page, control, userName } = target;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  function definitionsIn(file) {
    if (!Array.isArray(file?.objects)) return [];
    const direct = file.objects.filter((row) => row.guid === control);
    if (!target.buttonName) return direct;
    const named = file.objects.filter((row) => row.name === target.buttonName);
    return named.length === 1 &&
      (named[0].showUiExtendType === undefined || named[0].showUiExtendType === 'ElementUI_Button') &&
      named[0].uiModelType === 35 &&
      (!direct.length || (direct.length === 1 && direct[0] === named[0]))
      ? named
      : [];
  }
  // end
  function locate() {
    if (
      location.origin !== origin ||
      decodeURIComponent(location.hash.slice(1)) !== page ||
      sessionStorage.user !== userName ||
      typeof KMUIFrame === 'undefined'
    )
      return;
    const loaded = window.pageJson;
    const model = KMUIFrame.getInstance().pageMng.getPageByName(page);
    if (loaded?.pageProperty?.name !== page || !model?.thisElement?.isConnected) return;
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    const definitions = definitionsIn(loaded);
    // end
    if (definitions?.length !== 1 || typeof definitions[0].name !== 'string') return;
    const name = definitions[0].name;
    if (loaded.objects.filter((object) => object.name === name).length !== 1) return;
    const objects = model
      .getObjects()
      .filter((object) => object.name === name || object.getName?.() === name);
    if (objects.length !== 1) return;
    const holder = objects[0].thisElement;
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    if (!holder || !model.thisElement.contains(holder)) return;
    const definition = definitions[0],
      button =
        (definition.showUiExtendType === undefined || definition.showUiExtendType === 'ElementUI_Button') &&
        definition.uiModelType === 35;
    if (!button && !holder.matches('.km-richtext')) return;
    const fields = holder.querySelectorAll(button ? 'button' : 'textarea');
    if (
      fields.length !== 1 ||
      !fields[0].checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ||
      !fields[0].getBoundingClientRect().width
    )
      return;
    const displayed = button ? fields[0].innerText.trim() : fields[0].value;
    if (typeof displayed !== 'string' || displayed.length > 256) return;
    return { model, field: fields[0], displayed, loaded };
    // end
  }
  const before = locate();
  if (!before) return null;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // Only the local extension worker receives this material and hashes it before replying.
  function cycleMaterial(file) {
    const links = file?.linkMng?.linkList;
    if (!Array.isArray(links)) return null;
    const cycles = links.filter((l) => l?.linkId === 2);
    if (!cycles.length) return '[]';
    const c = cycles[0];
    if (
      cycles.length !== 1 ||
      typeof c.enable !== 'boolean' ||
      typeof c.script !== 'string' ||
      c.script.length > 65536
    )
      return null;
    return JSON.stringify([c.enable, String(c.intervalMs ?? ''), c.script]);
  }
  let installedCycle = null;
  // end
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  let installed = null,
    servedPage = null;
  // Executed in the paired tab, so this function must be independent of module scope.
  function pageMaterial(data) {
    if (!withCycle || data?.pageProperty?.name !== page || !Array.isArray(data.objects)) return null;
    try {
      const payload = JSON.stringify({
        pageProperty: data.pageProperty,
        objects: data.objects,
        linkMng: data.linkMng,
        dataSourceMng: data.dataSourceMng,
      });
      return payload.length <= 1000000 ? payload : null;
    } catch {
      return null;
    }
  }
  // end
  try {
    const path =
      '/getProjectFile?' + new URLSearchParams({ projectInfo: JSON.stringify({ type: 3, name: page }) });
    const response = await fetch(path, {
      credentials: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    const file = response.ok && (await response.json());
    // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
    servedPage = pageMaterial(file);
    const matches = file?.pageProperty?.name === page && definitionsIn(file);
    // end
    if (matches?.length === 1 && typeof matches[0].text === 'string' && matches[0].text.length <= 256)
      installed = matches[0].text;
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    if (withCycle && matches?.length === 1) installedCycle = cycleMaterial(file);
    // end
  } catch {
    /* A visible control may still be observable without a node file receipt. */
  }
  const after = locate();
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  if (
    !after ||
    after.field !== before.field ||
    after.model !== before.model ||
    after.loaded !== before.loaded
  )
    return null;
  // end
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  return {
    ...target,
    at: Date.now(),
    // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
    installed,
    ...(withCycle && { pageMaterial: { served: servedPage, loaded: pageMaterial(after.loaded) } }),
    // end
    displayed: after.displayed,
    ...(withCycle && { cycleMaterial: { installed: installedCycle, loaded: cycleMaterial(after.loaded) } }),
  };
  // end
}
// end
