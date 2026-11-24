// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
// Use the same opaque token the script checker will resolve locally. Never emit a second model-facing name.
export function projectText(names: ReadonlyMap<string, string>) {
  const ordered = [...names.keys()].filter(Boolean).sort((a,b) => b.length-a.length);
  if (!ordered.length) return (text: string) => text;
  const escaped = ordered.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp('@(?:variable|point|source|function):[a-z0-9]+|(?<![A-Za-z0-9_$])(?:'+escaped.join('|')+')(?![A-Za-z0-9_$])','gu');
  return (text: string) => text.replace(pattern, match => names.get(match) ?? match);
}
// end
