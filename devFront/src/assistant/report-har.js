// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
const secret = /token|password|passwd|cookie|secret|authorization|credential|api[_-]?key/i;
function decode(entry) {
  const content = entry.response?.content;
  if (
    !content ||
    typeof content.text !== 'string' ||
    content.text.length > 2_000_000 ||
    !entry.request.postData?.text ||
    entry.request.postData.text.length > 32768
  )
    throw Error('HAR 缺少完整的请求或响应正文。');
  const text =
    content.encoding === 'base64'
      ? new TextDecoder().decode(Uint8Array.from(atob(content.text), (c) => c.charCodeAt(0)))
      : content.text;
  const post = entry.request.postData;
  const form =
    String(post.mimeType || '')
      .split(';')[0]
      .trim() === 'application/x-www-form-urlencoded';
  const request = form
    ? { dataSetIds: new URLSearchParams(post.text).getAll('dataSetIds[]') }
    : JSON.parse(post.text);
  return {
    request,
    response: JSON.parse(text),
  };
}
function matching(har, capture, predicate) {
  if (!Array.isArray(har?.log?.entries)) throw Error('请选择包含响应正文的 HAR。');
  return har.log.entries.filter(
    (e) =>
      e?.request?.method === 'POST' &&
      e.response?.status === 200 &&
      Date.parse(e.startedDateTime) >= capture.start &&
      Date.parse(e.startedDateTime) <= Date.now() + 1000 &&
      predicate(e.request.url),
  );
}
export function reportObservation(har, capture, view, correlationField = '', receiptHar = null) {
  const entries = matching(har, capture, (url) => {
    const u = new URL(url);
    return u.origin === view.origin && u.pathname.endsWith('/getReportData') && !u.search;
  })
    .map((entry) => ({ entry, ...decode(entry) }))
    .filter((r) => Array.isArray(r.request.dataSetIds) && r.request.dataSetIds.includes(view.dataset));
  if (entries.length !== 1) throw Error('请在本次窗口内仅加载一次目标报表，重新导出 HAR。');
  const { entry, response } = entries[0],
    cols = response?.data?.[view.dataset];
  if (
    (response.errorCode ?? response.code ?? 0) !== 0 ||
    !cols ||
    !Array.isArray(cols[view.field]) ||
    !cols[view.field].length ||
    secret.test(view.field)
  )
    throw Error('回包中未取得所选数据集字段的首行。');
  const http = {
    method: 'POST',
    url: entry.request.url,
    status: entry.response.status,
    at: Date.parse(entry.startedDateTime),
    dataset: view.dataset,
    field: view.field,
    value: cols[view.field][0],
  };
  // The large native runtime can exhaust Chrome's default resource timing buffer.
  // Join the HAR page reference to the actual top-level document, never just to a tab title.
  if (entry.pageref && Number.isFinite(view.documentStart)) {
    const documents = har.log.entries.filter((e) => {
      if (
        e.request?.method !== 'GET' ||
        !(e.response?.status === 200 || e.response?.status === 304) ||
        !/text\/html/i.test(e.response.content?.mimeType || '') ||
        !URL.canParse(e.request.url)
      )
        return false;
      const u = new URL(e.request.url);
      return (
        u.origin === view.origin &&
        u.pathname === view.documentPath &&
        Math.abs(Date.parse(e.startedDateTime) - view.documentStart) <= 8
      );
    });
    if (documents.length === 1 && documents[0].pageref === entry.pageref) {
      http.document = { at: Date.parse(documents[0].startedDateTime), path: view.documentPath };
    }
  }
  if (!receiptHar) return { http, view };
  if (!correlationField || secret.test(correlationField) || !Array.isArray(cols[correlationField]))
    throw Error('请指定数据集回包中真实的逐次调用标识字段。');
  const correlation = cols[correlationField][0];
  if (typeof correlation !== 'string' || cols[correlationField].filter((v) => v === correlation).length !== 1)
    throw Error('调用标识缺失或重复。');
  const candidates = matching(receiptHar, capture, (url) => capture.scriptUrls.includes(url))
    .map((e) => {
      const { request, response } = decode(e);
      if (request.RequestType !== 'normal') return null;
      // A normal caller trace, or a script-owned diagnostic lookup returning the captured execution.
      const record =
        response.type === 'relation'
          ? {
              invocation: correlation,
              input: request.InParam,
              output: response,
            }
          : request.InParam?.receiptFor === correlation
            ? response.receipt
            : null;
      if (record?.invocation !== correlation || record.output?.data?.[0]?.[correlationField] !== correlation)
        return null;
      const selectedRows = record.output.data.map((row) => ({
        [correlationField]: row[correlationField],
        [view.field]: row[view.field],
      }));
      if (
        JSON.stringify(record.input, (key, value) => {
          if (secret.test(key)) throw Error('查询含敏感字段。');
          return value;
        }) === undefined
      )
        throw Error('缺少原始查询。');
      return {
        url: e.request.url,
        status: e.response.status,
        method: 'POST',
        at: Date.parse(e.startedDateTime),
        invocation: correlation,
        input: record.input,
        output: { type: record.output.type, data: selectedRows },
      };
    })
    .filter(Boolean);
  if (candidates.length !== 1) throw Error('未找到与报表调用标识唯一匹配的脚本执行回执。');
  return {
    view,
    http: { ...http, correlationField, correlation },
    receipt: candidates[0],
  };
}
// end
