// modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
// Shared by the local extension worker and the assistant. Array order affects rendering.
export function canonicalPageDefinition(page, expectedName) {
  if (page?.pageProperty?.name !== expectedName || !Array.isArray(page.objects)) return null;
  const selected = [page.pageProperty, page.objects, page.linkMng ?? null, page.dataSourceMng ?? null];
  let nodes = 0;
  let characters = 0;
  function encode(value, depth) {
    if (++nodes > 80000 || depth > 64) throw new RangeError();
    if (value === null || typeof value !== 'object') {
      if (
        !(value === null || typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value))
      )
        throw new TypeError();
      const literal = JSON.stringify(value);
      characters += literal.length;
      if (characters > 1000000) throw new RangeError();
      return literal;
    }
    if (Array.isArray(value)) return '[' + value.map((item) => encode(item, depth + 1)).join(',') + ']';
    const keys = Object.keys(value).sort();
    return (
      '{' + keys.map((key) => encode(key, depth + 1) + ':' + encode(value[key], depth + 1)).join(',') + '}'
    );
  }
  try {
    const canonical = encode(selected, 0);
    return canonical.length <= 1000000 ? canonical : null;
  } catch {
    return null;
  }
}
export async function observedPageHash(material, name) {
  if (typeof material !== 'string' || material.length > 1000000) return null;
  try {
    const text = canonicalPageDefinition(JSON.parse(material), name);
    if (text === null) return null;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
// end
