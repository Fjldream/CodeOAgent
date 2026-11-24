// modified by jinlong.feng at 2026-11-20 KF开发助手M1
export const assistantEnabled = import.meta.env.VITE_KF_ASSISTANT_ENABLED !== 'false';
export async function assistantRequest(token, path, payload, signal) {
  if (!token) throw new Error('请先登录 KF 开发中心，再从工程打开助手。');
  const result = await fetch('/api/assistant/' + path, {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (!result.ok) {
    const data = await result.json().catch(() => ({}));
    throw new Error(data.message || '助手服务暂不可用');
  }
  return result;
}
export async function assistantJson(token, path, payload, signal) {
  const response = await assistantRequest(token, path, payload, signal);
  return response.json();
}
export async function consumeEvents(response, receive) {
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let rest = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      rest += value;
      let newline;
      while ((newline = rest.indexOf('\n')) >= 0) {
        const line = rest.slice(0, newline);
        rest = rest.slice(newline + 1);
        if (line) receive(JSON.parse(line));
      }
    }
  } finally {
    reader.releaseLock();
  }
}
// end
