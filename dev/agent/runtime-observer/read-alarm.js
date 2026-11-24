// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
// Only inspect the visible grid owned by the selected native AlarmWindow.
export function readAlarmWindow(target) {
  const { page, control, userName, origin, tag, alias, alarmProject, windowName } = target;
  if (
    location.origin !== origin ||
    sessionStorage.user !== userName ||
    decodeURIComponent(location.hash.slice(1)) !== page ||
    typeof KMUIFrame === 'undefined' ||
    window.pageJson?.pageProperty?.name !== page
  )
    return null;
  const definitions = window.pageJson.objects.filter(
    (o) =>
      o.guid === control &&
      o.name === windowName &&
      o.prototypeName === 'AlarmWindow' &&
      o.dateSource === alias,
  );
  if (definitions.length !== 1 || window.pageJson.objects.filter((o) => o.name === windowName).length !== 1)
    return null;
  const view = KMUIFrame.getInstance().pageMng.getPageByName(page);
  const matched = view?.getObjects().filter((o) => o.name === windowName || o.getName?.() === windowName);
  const host = matched?.length === 1 && matched[0].thisElement;
  if (
    !host?.isConnected ||
    !host.getBoundingClientRect().width ||
    !host.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
  )
    return null;
  const headers = new Set(
    Array.from(host.querySelectorAll('.datagrid-header td[field]'), (e) => e.getAttribute('field')),
  );
  if (
    ![
      '报警日期',
      '报警时间',
      '事件日期',
      '事件时间',
      '数据源名称',
      '变量',
      '报警项',
      '报警工程',
      '报警类型',
      '事件类型',
    ].every((k) => headers.has(k))
  )
    return null;
  const result = [];
  for (const tr of host.querySelectorAll('tr.datagrid-row')) {
    if (!tr.getBoundingClientRect().height) continue;
    const fields = Object.fromEntries(
      Array.from(tr.querySelectorAll('td[field]'), (c) => [c.getAttribute('field'), c.innerText.trim()]),
    );
    if (fields['变量'] !== tag || fields['数据源名称'] !== alias || fields['报警工程'] !== alarmProject)
      continue;
    const stamp = (d, t) => Date.parse(d + ' ' + t);
    const onset = stamp(fields['报警日期'], fields['报警时间']),
      time = stamp(fields['事件日期'], fields['事件时间']);
    result.push({
      onset,
      time,
      item: fields['报警项'],
      type: fields['报警类型'],
      group: fields['报警组'] || '',
      state: fields['事件类型'],
      alarmValue: fields['报警值'] ?? '',
      limit: fields['限值'] ?? '',
    });
    if (result.length > 16) return null;
  }
  return { ...target, at: Date.now(), rows: result };
}
// end
