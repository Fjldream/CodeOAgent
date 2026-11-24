// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// Snapshot the sending tab before awaiting network or hashing.
export function createEditorSession() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return { session: Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''), sequence: 0 };
}
export async function snapshotContext(entry) {
  const current = entry.readSelection ? entry.readSelection() : entry;
  const { readSelection, scriptText, label, ...snapshot } = current;
  if (snapshot.editor) snapshot.editor = { ...snapshot.editor };
  if (snapshot.cell) snapshot.cell = { ...snapshot.cell };
  if (typeof scriptText === 'string' && snapshot.editor && crypto.subtle) {
    const hash = async (text) => {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
    };
    const normalized = scriptText.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    snapshot.editor.digest = await hash(scriptText);
    snapshot.editor.lineDigest =
      normalized === scriptText ? snapshot.editor.digest : await hash(normalized);
  }
  return snapshot;
}
export function editorCell(sheet, row, column) {
  return typeof sheet === 'string' &&
    Number.isInteger(row) &&
    row >= 0 &&
    Number.isInteger(column) &&
    column >= 0
    ? { sheet, row, column }
    : undefined;
}
export function readNativePage(host, base) {
  const view = host.pageEditor?.graphicViewObj;
  const selected = view?.selectMng?.selectObj;
  if (view?.curPageOrModeName !== base.object || !Array.isArray(selected) || selected.length !== 1)
    return base;
  const item = selected[0];
  if (typeof item?.guid !== 'string' || !item.guid) return base;
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  const buttonName =
    item.showUiExtendType === 'ElementUI_Button' &&
    item.uiModelType === 35 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    item.name.length <= 160
      ? item.name
      : undefined;
  if (buttonName && view.page?.getObjects?.().filter((obj) => obj.name === buttonName).length !== 1)
    return base;
  return {
    ...base,
    control: item.guid,
    ...(buttonName && { buttonName }),
    label: base.object + ' / ' + (item.name || item.guid),
  };
  // end
}
// end
