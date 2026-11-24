// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { globalFamilies } from '../../../dev/agent/src/calc-runtime.ts';
const { parse } = createRequire(new URL('../../../dev/agent/package.json', import.meta.url))('acorn');
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const value of Object.values(node)) walk(value, fn);
}
const families = {};
for (const [family, expected] of Object.entries(globalFamilies)) {
  const source = 'service/globalFuncMng/' + family + '_global_func.js';
  const text = await readFile(
    new URL(
      '../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/' + source,
      import.meta.url,
    ),
    'utf8',
  );
  const symbols = {};
  walk(parse(text, { ecmaVersion: 'latest', allowReturnOutsideFunction: true }), (node) => {
    if (node.type !== 'AssignmentExpression' || node.left?.object?.name !== 'global') return;
    const name = node.left.property.name;
    if (!expected.includes(name)) return;
    const rhs = node.right;
    // Parameter counts describe the wrapper, not the adapter's business semantics.
    symbols[name] = rhs.params
      ? {
          formals: rhs.params.length,
          requiredFormals: rhs.params.filter((x) => x.type !== 'AssignmentPattern').length,
          async: !!rhs.async,
        }
      : { delegated: true };
  });
  if (expected.some((name) => !symbols[name])) throw Error('登记未覆盖 ' + family);
  families[family] = { source, sha256: createHash('sha256').update(text).digest('hex'), symbols };
}
const code =
  '// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发\n// 按 Node 运行态注册源码生成。复核入口见 index-source.mjs。\nexport const kcRegistrations = ' +
  JSON.stringify(families, null, 2) +
  ' as const;\n// end\n';
const target = new URL('../../../dev/agent/src/kc-registrations.ts', import.meta.url);
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== code) throw Error('运行态索引已漂移');
} else await writeFile(target, code);
// end
