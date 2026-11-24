// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
export function requestObservation(har, capture) {
  if (!Array.isArray(har?.log?.entries)) throw Error('请选择浏览器 Network 导出的含响应内容的 HAR。');
  const matches = har.log.entries.filter(
    (e) =>
      e.request?.method === 'POST' &&
      capture.urls.includes(e.request.url) &&
      Number.isFinite(Date.parse(e.startedDateTime)) &&
      Date.parse(e.startedDateTime) >= capture.start &&
      Date.parse(e.startedDateTime) <= Date.now() + 2000,
  );
  if (matches.length !== 1)
    throw Error('本次窗口内需有且仅有一次目标调用。请清空 Network，重新开始取证并调用一次。');
  const [entry] = matches,
    response = entry.response?.content;
  if (
    !response ||
    typeof response.text !== 'string' ||
    response.text.length > 16384 ||
    typeof entry.request.postData?.text !== 'string' ||
    entry.request.postData.text.length > 32768
  )
    throw Error('HAR 未包含完整的入参和响应正文，或超过单次取证大小。');
  const redact = (key, value) =>
    /(token|password|passwd|cookie|secret|authorization|credential|api[_-]?key)/i.test(key)
      ? undefined
      : value;
  let envelope, output;
  try {
    envelope = JSON.parse(entry.request.postData.text, redact);
    const text =
      response.encoding === 'base64'
        ? new TextDecoder().decode(Uint8Array.from(atob(response.text), (v) => v.charCodeAt(0)))
        : response.text;
    output = JSON.parse(text, redact);
  } catch {
    throw Error('请求或响应正文未能解析为 JSON。');
  }
  return {
    at: entry.startedDateTime,
    url: entry.request.url,
    method: 'POST',
    status: entry.response.status,
    type: envelope.RequestType,
    input: envelope.InParam,
    output,
  };
}
// end
