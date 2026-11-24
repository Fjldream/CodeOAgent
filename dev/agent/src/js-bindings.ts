// modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
import { analyze } from 'eslint-scope';

type Ast = any;

// Acorn supplies ESTree nodes. eslint-scope resolves declarations, shadowing and
// every write, including destructuring, updates and writes captured by closures.
export function scriptBindings(ast: Ast, parent: WeakMap<Ast, Ast>) {
  const scopes = analyze(ast, {ecmaVersion: 2024, sourceType: 'script', nodejsScope: true,
    fallback: 'iteration', impliedStrict: true});
  const references = new WeakMap();
  for (const scope of scopes.scopes)
    for (const reference of scope.references) references.set(reference.identifier, reference);

  function resolve(node: Ast, seen = new Set()) : Ast {
    if (node?.type !== 'Identifier') return node;
    const variable = references.get(node)?.resolved;
    if (!variable || seen.has(variable) || variable.defs.length !== 1) return;
    seen.add(variable);
    const writes = variable.references.filter(ref => ref.isWrite());
    if (writes.length !== 1 || variable.defs[0].type !== 'Variable') return;
    const write = writes[0];
    const expr = write.writeExpr;
    if (!expr || expr.end > node.start) return;
    const owner = parent.get(write.identifier);
    const initialized = owner?.type === 'VariableDeclarator' && owner.id === write.identifier;
    const assigned = owner?.type === 'AssignmentExpression' && owner.operator === '=' &&
      owner.left === write.identifier && parent.get(owner)?.type === 'ExpressionStatement';
    if (!initialized && !assigned) return;
    // A conditional or loop initialization cannot establish a value outside its block.
    const statement = parent.get(owner);
    const block = parent.get(statement);
    const loopInitializer = block?.type === 'ForStatement' && block.init === statement;
    if (!loopInitializer && !['Program', 'BlockStatement', 'StaticBlock'].includes(block?.type)) return;
    let ancestor = node;
    while (ancestor && ancestor !== block) ancestor = parent.get(ancestor);
    return ancestor ? resolve(expr, seen) : undefined;
  }
  function reason(node: Ast) {
    if (node?.type !== 'Identifier') return '参数没有解析为已授权的匿名引用';
    const variable = references.get(node)?.resolved;
    if (!variable) return '此处的 ' + node.name + ' 在当前作用域没有声明';
    const writes = variable.references.filter(ref => ref.isWrite());
    if (writes.length > 1) return node.name + ' 在 L' + writes.map(r => r.identifier.loc.start.line).join('、L') + ' 有多处写入';
    return node.name + ' 在当前作用域未能追溯到使用前唯一、确定的引用值';
  }
// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  // A local table that only receives property assignments can never supply a business value.
  // Ask the author to revise it, so evaluating keys or RHS side effects is never silently removed.
  function unusedTables() {
    const unused: Ast[] = [];
    for (const scope of scopes.scopes) for (const variable of scope.variables) {
      const init = variable.defs[0]?.node?.init;
      if (variable.defs.length !== 1 || !init || !(['ObjectExpression','ArrayExpression'].includes(init.type) ||
          (init.type === 'NewExpression' && ['Map','Set'].includes(init.callee.name) && !references.get(init.callee)?.resolved))) continue;
      const onlyPopulates = variable.references.every(ref => {
        if (ref.init) return true;
        const member = parent.get(ref.identifier);
        if (member?.type !== 'MemberExpression' || member.object !== ref.identifier) return false;
        const use = parent.get(member);
        if (use?.type === 'AssignmentExpression' && use.left === member && use.operator === '=') return true;
        return init.type === 'NewExpression' && !member.computed && ['set','add'].includes(member.property.name)
          && use?.type === 'CallExpression' && use.callee === member && parent.get(use)?.type === 'ExpressionStatement';
      });
      if (onlyPopulates) unused.push(variable.defs[0].name);
    }
    return unused;
  }
  return {resolve, reason, unusedTables, declared: (node: Ast) => Boolean(references.get(node)?.resolved)};
// end
}
// end
