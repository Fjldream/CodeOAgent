// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { parse } from 'acorn';
import { scriptReferences, type Center } from './center.ts';
import { isBuiltin } from 'node:module';
import { HttpError, type Context } from './shared.ts';
export function validateScript(context: Context, code: unknown, aliases: string[]) {
  if (!['period', 'request'].includes(context.kind)) throw new HttpError(400, '请从计算脚本编辑器验证候选');
  if (typeof code !== 'string' || !code.trim() || code.length > 64000)
    throw new HttpError(400, '脚本为空或超过 64000 字符');
  const issues: string[] = [];
  const dependencies = new Set<string>();
  let ast;
  try {
    ast = parse(code, {
      ecmaVersion: 'latest',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch (error) {
    return {
      scope: '静态语法检查',
      issues: [error instanceof Error ? error.message : '语法错误'],
      dependencies: [],
      edges: [],
      executed: false,
    };
  }
  const { edges, partial } = scriptReferences(code);
  for (const edge of edges) {
    const matches = aliases.filter((alias) => alias === edge.alias);
    if (matches.length !== 1) issues.push('数据源别名未唯一匹配：' + edge.alias);
  }
  if (partial) issues.push('有动态调用或参数未解析。');
  const pending: any[] = [ast];
  let requestFields = false;
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    for (const child of Object.values(node)) if (child && typeof child === 'object') pending.push(child);
    if (node.type === 'MemberExpression' && ['InParam', 'OutParam'].includes(node.object?.name))
      requestFields = true;
    if (node.type !== 'CallExpression') continue;
    const name = node.callee?.name;
    if (name === 'require') {
      const module = node.arguments[0]?.value;
      if (typeof module !== 'string' || module.startsWith('.') || module.startsWith('/'))
        issues.push('动态或文件依赖需在 KF 工程中核对。');
      else if (!isBuiltin(module))
        dependencies.add(
          module
            .split('/')
            .slice(0, module.startsWith('@') ? 2 : 1)
            .join('/'),
        );
    }
    if (['KIOQueryDatas', 'KIOUpdateDatas'].includes(name) && node.arguments.length !== 3)
      issues.push(name + ' 需要三个参数。');
    if (name === 'endResponse' && (context.kind !== 'request' || node.arguments.length !== 1))
      issues.push('endResponse(RequestID) 适用于请求式计算。');
  }
  if (requestFields && context.kind !== 'request') issues.push('请核对 InParam、OutParam 所属的请求式宿主。');
  if (!edges.length && !(requestFields && context.kind === 'request'))
    issues.push('未识别到受支持的显式点读写调用。');
  return {
    scope: '计算脚本语法与显式 KIO 引用',
    edges,
    issues: [...new Set(issues)],
    dependencies: [...dependencies],
    executed: false,
  };
}
export async function checkCandidate(center: Center, token: string, context: Context, code: unknown) {
  const sources = await center.call(token, '/calculation/projectJsonData', {
    projectId: context.projectId,
    type: 'dataAccess',
    groupId: '-1',
  });
  if (!Array.isArray(sources)) throw new HttpError(502, '无法核对工程数据源');
  const result = validateScript(
    context,
    code,
    sources.map((row) => row.name),
  );
  if (result.dependencies.length) {
    const packages = await center.call(token, '/calculation/getDependenceslist', {
      projectId: context.projectId,
      type: 'npm',
    });
    if (!Array.isArray(packages)) throw new HttpError(502, '无法核对工程 npm 依赖');
    for (const dep of result.dependencies)
      if (!packages.some((row) => row.name === dep)) result.issues.push('当前工程 npm 清单未找到 ' + dep);
  }
  await center.require(token, context);
  return result;
}
// end
