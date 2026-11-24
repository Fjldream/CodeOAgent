// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { parse } from 'acorn';
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import type { Context } from './shared.ts';
export function controlKind(row: Record<string, any>) {
  if (row.showUiExtendType === 'RichText' && row.uiModelType === 7) return 'text';
  if (
    row.uiModelType === 35 &&
    (row.showUiExtendType === undefined || row.showUiExtendType === 'ElementUI_Button')
  )
    return 'button';
  return 'unknown';
}
// Native ElementUI_Button.jsonToObject drops the specificity level and regenerates its GUID.
// Require a unique typed name on this saved page and reject a conflicting GUID match.
export function selectedControls(rows: Record<string, any>[], context: Context) {
  const direct = rows.filter((row) => row.guid === context.control);
  if (!context.buttonName) return direct;
  const byName = rows.filter((row) => row.name === context.buttonName);
  if (byName.length !== 1 || controlKind(byName[0]) !== 'button') return [];
  if (direct.length && (direct.length !== 1 || direct[0] !== byName[0])) return [];
  return byName;
}
export function validControlIdentifier(name: string) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name) || ['$System', 'String', 'Number'].includes(name)) return false;
  try {
    parse('const ' + name + ' = 0;', { ecmaVersion: 'latest', sourceType: 'module' });
    return true;
  } catch {
    return false;
  }
}
// end

type Binding = { tags: Set<string>; partial: boolean };
const unknown = (): Binding => ({ tags: new Set(), partial: true });

// Supported subset: straight-line page script, const aliases and direct control.setText.
// Keep conditional dependencies, and mark unsupported constructs as unresolved.
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
export function controlInputs(code: string, control: string, sink: 'setText' | 'Caption' = 'setText') {
  const { tags, partial } = pageWrites(code, control, sink);
  return { tags, partial };
}
export function pageWrites(code: string, control: string, sink: 'setText' | 'Caption') {
  let writes = 0;
  // end
  const aliases = new Map<string, Binding>(),
    output = new Set<string>();
  let partial = false;
  let program;
  try {
    program = parse(code, {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch {
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    return { tags: [], partial: true, writes };
    // end
  }
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  const protectedNames = [control, '$System', 'Number', 'String'];
  // end
  const statements = program.body as any[];
  if (
    statements.some(
      (s) =>
        s.type === 'WithStatement' ||
        s.declarations?.some(
          (d: any) => d.id.type !== 'Identifier' || protectedNames.includes(d.id.name),
        ) ||
        protectedNames.includes(s.id?.name),
    )
  )
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    return { tags: [], partial: true, writes };
  // end
  function read(node: any): Binding {
    if (!node) return unknown();
    if (node.type === 'Literal') return { tags: new Set(), partial: false };
    if (node.type === 'Identifier') return aliases.get(node.name) ?? unknown();
    if (
      node.type === 'MemberExpression' &&
      node.object?.type === 'Identifier' &&
      node.object.name === '$System'
    ) {
      const tag = node.computed ? node.property.value : node.property.name;
      return typeof tag === 'string' ? { tags: new Set([tag]), partial: false } : unknown();
    }
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    if (node.type === 'CallExpression') {
      const fn = node.callee;
      if (fn.type === 'Identifier' && ['String', 'Number'].includes(fn.name) && node.arguments.length === 1)
        return read(node.arguments[0]);
      if (
        !fn.computed &&
        fn.object?.name === 'Number' &&
        fn.property?.name === 'isFinite' &&
        node.arguments.length === 1
      )
        return read(node.arguments[0]);
      if (
        !fn.computed &&
        fn.property?.name === 'toFixed' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal'
      )
        return read(fn.object);
    }
    // end
    const children =
      node.type === 'ConditionalExpression'
        ? [node.test, node.consequent, node.alternate]
        : ['LogicalExpression', 'BinaryExpression'].includes(node.type)
          ? [node.left, node.right]
          : node.type === 'TemplateLiteral'
            ? node.expressions
            : node.type === 'UnaryExpression'
              ? [node.argument]
              : null;
    if (!children) return unknown();
    const result: Binding = { tags: new Set(), partial: false };
    for (const child of children) {
      const input = read(child);
      for (const tag of input.tags) result.tags.add(tag);
      result.partial ||= input.partial;
    }
    return result;
  }
  for (const line of statements) {
    if (line.type === 'VariableDeclaration' && line.kind === 'const') {
      for (const decl of line.declarations) aliases.set(decl.id.name, read(decl.init));
      continue;
    }
    const call = line.expression;
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    if (
      call?.type === 'AssignmentExpression' &&
      call.operator === '=' &&
      call.left?.type === 'MemberExpression' &&
      !call.left.computed &&
      call.left.object.type === 'Identifier' &&
      call.left.property.name === 'Caption'
    ) {
      if (call.left.object.name === control && sink === 'Caption') {
        writes++;
        const input = read(call.right);
        for (const tag of input.tags) output.add(tag);
        partial ||= input.partial;
      }
      continue;
    }
    // end
    if (line.type === 'EmptyStatement') continue;
    if (
      call?.type !== 'CallExpression' ||
      call.callee.type !== 'MemberExpression' ||
      call.callee.object.type !== 'Identifier' ||
      call.callee.computed ||
      call.callee.property.name !== 'setText'
    ) {
      partial = true;
      continue;
    }
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    if (sink !== 'setText' || call.callee.object.name !== control) continue;
    writes++;
    // end
    for (const arg of call.arguments) {
      const input = read(arg);
      for (const tag of input.tags) output.add(tag);
      partial ||= input.partial;
    }
  }
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  return { tags: [...output], partial, writes };
  // end
}
// end
