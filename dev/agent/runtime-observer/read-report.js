// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// Chrome serializes this function into the paired native runtime document.
export function readReportCell(target) {
  const { origin, userName, report, dataset, field, cell } = target;
  const page = decodeURIComponent(location.hash.slice(1));
  if (
    location.origin !== origin ||
    sessionStorage.user !== userName ||
    !page ||
    window.pageJson?.pageProperty?.name !== page ||
    typeof KMUIFrame === 'undefined'
  )
    return null;
  const model = KMUIFrame.getInstance().pageMng.getPageByName(page);
  if (!model?.thisElement?.isConnected) return null;
  const grids = model.getObjects().filter(
    (o) =>
      o.reportId === report &&
      o.univerAPI &&
      model.thisElement.contains(o.thisElement) &&
      Array.from(o.thisElement.querySelectorAll('canvas')).some((c) => {
        const rect = c.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < innerHeight &&
          rect.left < innerWidth &&
          c.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        );
      }),
  );
  if (grids.length !== 1) return null;
  const grid = grids[0],
    sheet = grid.univerAPI.getActiveWorkbook()?.getActiveSheet();
  if (sheet?.getSheetId() !== cell.sheet) return null;
  const binding = grid.dataSetMap?.get(cell.sheet)?.get(cell.row)?.get(cell.column);
  if (
    binding?.type !== 'dataSet' ||
    binding.id !== dataset ||
    binding.tag !== field ||
    !['1', '2', '3'].includes(binding.expansion || binding.expansionDirection)
  )
    return null;
  const visible = sheet.getVisibleRange?.();
  if (
    !visible ||
    cell.row < visible.startRow ||
    cell.row > visible.endRow ||
    cell.column < visible.startColumn ||
    cell.column > visible.endColumn
  )
    return null;
  const range = sheet.getRange(cell.row, cell.column, 1, 1),
    value = range.getValue();
  const display = range.getDisplayValue?.() ?? range.getDisplayValues?.()?.[0]?.[0];
  if (
    typeof display !== 'string' ||
    display.length > 512 ||
    (value !== null && !['string', 'number', 'boolean'].includes(typeof value))
  )
    return null;
  const requests = performance
    .getEntriesByType('resource')
    .filter((e) => {
      const u = new URL(e.name);
      return u.origin === origin && u.pathname.endsWith('/getReportData') && !u.search && e.responseEnd > 0;
    })
    .slice(-12)
    .map((e) => ({
      url: e.name,
      at: performance.timeOrigin + e.startTime,
      end: performance.timeOrigin + e.responseEnd,
    }));
  const navigation = performance.getEntriesByType('navigation')[0];
  const documentPath = navigation && new URL(navigation.name).pathname;
  return {
    ...target,
    value,
    display,
    requests,
    documentPath,
    documentStart: performance.timeOrigin,
    at: Date.now(),
  };
}
// end
