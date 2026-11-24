// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// Panels register only while mounted. The native test stays usable without a panel.
const listeners = new Set();
export function listenForConnectionTests(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export async function beginNativeObservation(projectId, alias, source) {
  for (const listener of listeners) {
    const open = listener(projectId);
    if (!open) continue;
    const bytes = new TextEncoder().encode(JSON.stringify(canonical(source.config)));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const configStamp = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
    return open(alias, source.guid, configStamp);
  }
}
// end
