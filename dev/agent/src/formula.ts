// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { HttpError, type Context } from './shared.ts';
import type { Center } from './center.ts';
import { readCalculationGraph } from './calc-generation.ts';
import { validateScript } from './candidate.ts';

type Reader = Pick<Center, 'call' | 'allowed' | 'require'>;
const problem = (reason: string) => new HttpError(400, reason);
const idRule = /^p[a-f0-9]{12}$/;
const refSchema = { type: 'string', pattern: '^p[a-f0-9]{12}$' };
const scopeSchema = { type: 'string', enum: ['current', 'lastCalculationReceipt'] };
const missingFields = {
  input: '请指出参与计算的输入，可以使用上方点位引用或工程变量名。',
  output: '结果需要写入哪个点？已有有效标志时也请指定。',
  formula: '请说明输入如何换算成结果，也可以给一组输入和预期结果。',
  reference: '请确认这个比率的分母或比较基准。',
  unit: '输入和输出分别采用什么单位或倍率？',
  rounding: '结果写入前采用什么精度或取整规则？',
  invalid: '输入无效时，结果点、有效标志和请求回包分别应怎样处理？',
  window: '计算使用哪段时间的数据，按什么时间边界取样？',
} as const;
export const clarificationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['missing'],
  properties: {
    scope: scopeSchema,
    missing: {
      type: 'array',
      description:
        '只选缺失部分。reference=分母或基准，formula=整体计算关系，input/output=点位，unit=单位，rounding=舍入，invalid=异常处置，window=统计时段。',
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
      items: { type: 'string', enum: Object.keys(missingFields) },
    },
  },
};
export function clarificationQuery(input: any) {
  const missing = input?.missing;
  if (
    !Array.isArray(missing) ||
    missing.length < 1 ||
    missing.length > 3 ||
    missing.some((k) => typeof k !== 'string' || !Object.hasOwn(missingFields, k))
  )
    throw problem('请指定仍需确认的业务字段');
  return { ...formulaScope(input), missing: [...new Set(missing)] as (keyof typeof missingFields)[] };
}
export function clarifyFormula(input: unknown) {
  const { missing } = clarificationQuery(input);
  return { lines: missing.map((k) => missingFields[k]), summary: { generated: false, missing } };
}
export const formulaInventorySchema = {
  type: 'object',
  additionalProperties: false,
  properties: { scope: scopeSchema },
};
export const formulaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['expression', 'output'],
  properties: {
    scope: scopeSchema,
    expression: {
      type: 'string',
      maxLength: 1200,
      description:
        '实名由本机替换。用已查到的 p 引用写数值表达式；可用 + - * / %、比较、三元、abs/min/max/round/floor/ceil/sqrt。',
    },
    when: { type: 'string', maxLength: 1200, description: '可选，输入有效的业务条件，如 p引用 > 0。' },
    output: { ...refSchema, description: '数值结果的可写点引用' },
    validity: { ...refSchema, description: '可选，有效标志点，1 有效、0 无效' },
    maxAgeSeconds: { type: 'integer', minimum: 1, maximum: 86400, description: '输入最大允许年龄，默认15秒' },
  },
};
export function formulaScope(input: any) {
  const scope = input?.scope ?? 'current';
  if (!['current', 'lastCalculationReceipt'].includes(scope)) throw problem('计算工程来源无效');
  return { scope };
}
export function formulaQuery(input: any) {
  const scope = formulaScope(input);
  if (
    !input ||
    typeof input.expression !== 'string' ||
    !input.expression.trim() ||
    input.expression.length > 1200 ||
    (input.when !== undefined &&
      (typeof input.when !== 'string' || !input.when.trim() || input.when.length > 1200)) ||
    !idRule.test(String(input.output)) ||
    (input.validity !== undefined && !idRule.test(String(input.validity)))
  )
    throw problem('需要表达式和本工程已核实的输出引用');
  const maxAgeSeconds = input.maxAgeSeconds ?? 15;
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 1 || maxAgeSeconds > 86400)
    throw problem('输入时效范围无效');
  return {
    ...scope,
    expression: input.expression as string,
    when: input.when as string | undefined,
    output: input.output as string,
    validity: input.validity as string | undefined,
    maxAgeSeconds,
  };
}
const limits: Record<string, [number, number, boolean]> = {
  byte: [0, 255, true],
  short: [-32768, 32767, true],
  ushort: [0, 65535, true],
  long: [-2147483648, 2147483647, true],
  ulong: [0, 4294967295, true],
  float: [-3.4028234663852886e38, 3.4028234663852886e38, false],
  double: [-Number.MAX_VALUE, Number.MAX_VALUE, false],
};
type Point = {
  ref: string;
  alias: string;
  name: string;
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  physical: string;
  canRead:boolean;
  canWrite:boolean;
  // end
  read: boolean;
  write: boolean;
  type: string;
};
export async function formulaInventory(
  reader: Reader,
  token: string,
  ctx: Context,
  question = '',
  previousQuestions: string[] = [],
) {
  const graph = await readCalculationGraph(reader, token, ctx);
  const fields = await reader.call(token, '/collect/getVarsProperty');
  const types = fields?.TagDataType?.editor?.options?.data;
  if (!Array.isArray(types)) throw new HttpError(502, '无法核对点数据类型');
  const points: Point[] = [],
    lines: string[] = [],
    mentions: { ref: string; offset: number }[] = [];
  const historyMatches = previousQuestions
    .slice(-2)
    .reverse()
    .map(() => [] as { ref: string; offset: number }[]);
  const variables = graph.vars;
  lines.push(
    '已有工程变量（' +
      variables.length +
      '）：' +
      variables
        .slice(0, 40)
        .map((v) => v.name)
        .join('、'),
  );
  for (const alias of graph.aliases.slice(0, 24)) {
    const link = graph.links.find((l) => l.alias === alias);
    lines.push(
      '工程连接 ' +
        alias.name +
        ' → ' +
        (graph.calc ? alias.connectName : alias.dataSourceName || alias.appName),
    );
    if (!link || graph.aliases.filter((a) => a.name === alias.name).length !== 1) {
      lines.push('关联实时源或数采工程未能唯一核实');
      continue;
    }
    const counts = new Map<string, number>();
    for (const item of link.all) counts.set(item.tagName, (counts.get(item.tagName) ?? 0) + 1);
    const duplicates = new Set<string>();
    for (const p of link.points) {
      if (points.length >= 48) break;
      const matches = types.filter((v) => String(v.id) === String(p.tagDataType));
      const type = matches.length === 1 ? String(matches[0].text).toLowerCase() : '';
      if (counts.get(p.tagName) !== 1) {
        if (!duplicates.has(p.tagName) && duplicates.size < 8) lines.push('同名点需消歧：' + p.tagName);
        duplicates.add(p.tagName);
        continue;
      }
      const physical = JSON.stringify([link.collection.projectId, p.tagName]);
      const ref =
        'p' +
        createHash('sha256')
          .update(
            JSON.stringify([
              ctx.projectId,
              alias.name,
              link.source.projectId,
              physical,
              p.deviceName,
              p.regAddress,
              p.tagDataType,
              p.regDataType,
              p.accessType,
              p.description,
              p.dataConvertCoefficient,
              p.dataConvertDeviation,
              p.minRawValue,
              p.maxRawValue,
              p.minValue,
              p.maxValue,
              p.dataConvertMode,
            ]),
          )
          .digest('hex')
          .slice(0, 12);
      const numeric = Object.hasOwn(limits, type);
      const point = {
        ref,
        physical,
        alias: alias.name,
        name: p.tagName,
        type,
        read: numeric && ['0', '2'].includes(String(p.accessType)),
        // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
        write: numeric && ['1', '2'].includes(String(p.accessType)),
        canRead:['0','2'].includes(String(p.accessType)),canWrite:['1','2'].includes(String(p.accessType)),
        // end
      };
      const mapped = variables.filter((v) =>
        graph.calc
          ? v.dataSourceName === alias.name && v.TagName === p.tagName && v.dataSourceType === alias.type
          : v.isMap === true &&
            v.projectDataSourceId === alias.id &&
            v.dataSourceItem?.appName === alias.appName &&
            v.dataSourceItem?.tagName === p.tagName,
      );
      const terms = [p.tagName, p.description, ...mapped.map((v) => v.name)].filter(
        (t) => typeof t === 'string' && t.length >= 2,
      );
      const offsets = terms.map((t) => question.indexOf(t)).filter((i) => i >= 0);
      for (let i = 0; i < historyMatches.length; i++) {
        const previous = previousQuestions[previousQuestions.length - 1 - i];
        const positions = terms.map((t) => previous.indexOf(t)).filter((offset) => offset >= 0);
        if (positions.length) historyMatches[i].push({ ref, offset: Math.min(...positions) });
      }
      if (offsets.length) mentions.push({ ref, offset: Math.min(...offsets) });
      points.push(point);
      lines.push(
        ref +
          ' · ' +
          [alias.name, p.deviceName, p.tagName, p.description, type].filter(Boolean).join(' / ') +
          (mapped.length ? ' · 映射变量 ' + mapped.map((v) => v.name).join('、') : '') +
          ' · ' +
          (point.read ? '可读 ' : '') +
          (point.write ? '可写' : ''),
      );
    }
  }
  if (graph.aliases.length > 24 || graph.links.reduce((n, l) => n + l.points.length, 0) > 48)
    lines.push('本轮目录已截断，未显示的点不能据此判定不存在。');
  for (const ctx of graph.dependencies) await reader.require(token, ctx);
  return {
    points,
    lines,
    // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
    dependencies: graph.dependencies,
    projectAliases:graph.aliases,projectVariables:graph.vars,
    // end
    calc: graph.calc,
    summary: {
      layer: 'saved',
      variableCount: variables.length,
      refs: points.map(({ ref, read, write }) => ({ ref, read, write })),
      previousQuestionMatches: historyMatches.map((matches, i) => ({ previous: i + 1, matches })),
      matchedQuestionOffsets: mentions.sort((a, b) => a.offset - b.offset),
    },
  };
}
const mathFns: Record<string, [number, number]> = {
  abs: [1, 1],
  sqrt: [1, 1],
  min: [2, 8],
  max: [2, 8],
  round: [1, 1],
  floor: [1, 1],
  ceil: [1, 1],
};
function expression(
  source: string,
  kind: 'number' | 'boolean',
  refs: Map<string, Point>,
  inputs: Set<string>,
) {
  let ast: any;
  try {
    ast = parse('(' + source + '\n)', { ecmaVersion: 'latest' });
  } catch {
    throw problem('表达式语法无效');
  }
  if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') throw problem('需要单个表达式');
  let count = 0;
  function emit(n: any, want: 'number' | 'boolean'): string {
    if (++count > 100) throw problem('表达式超过100个节点');
    const num = (n: any) => emit(n, 'number'),
      bool = (n: any) => emit(n, 'boolean');
    if (want === 'number') {
      if (n.type === 'Literal' && typeof n.value === 'number' && Number.isFinite(n.value))
        return JSON.stringify(n.value);
      if (n.type === 'Identifier' && refs.get(n.name)?.read) {
        inputs.add(n.name);
        return n.name;
      }
      if (n.type === 'UnaryExpression' && ['+', '-'].includes(n.operator))
        return '(' + n.operator + num(n.argument) + ')';
      if (n.type === 'BinaryExpression' && ['+', '-', '*', '/', '%'].includes(n.operator))
        return 'finite(' + num(n.left) + ' ' + n.operator + ' ' + num(n.right) + ')';
      if (
        n.type === 'CallExpression' &&
        n.callee.type === 'Identifier' &&
        Object.hasOwn(mathFns, n.callee.name)
      ) {
        const [min, max] = mathFns[n.callee.name];
        if (n.arguments.length >= min && n.arguments.length <= max)
          return 'finite(Math.' + n.callee.name + '(' + n.arguments.map(num).join(', ') + '))';
      }
    } else {
      if (
        n.type === 'BinaryExpression' &&
        ['>', '>=', '<', '<=', '===', '!==', '==', '!='].includes(n.operator)
      )
        return '(' + num(n.left) + ' ' + n.operator + ' ' + num(n.right) + ')';
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(n.operator))
        return '(' + bool(n.left) + ' ' + n.operator + ' ' + bool(n.right) + ')';
      if (n.type === 'UnaryExpression' && n.operator === '!') return '(!' + bool(n.argument) + ')';
    }
    if (n.type === 'ConditionalExpression')
      return '(' + bool(n.test) + ' ? ' + emit(n.consequent, want) + ' : ' + emit(n.alternate, want) + ')';
    throw problem('公式含未核实的输入、函数或不支持的表达式');
  }
  return emit(ast.body[0].expression, kind);
}
export function compileFormula(
  ctx: Context,
  inventory: Awaited<ReturnType<typeof formulaInventory>>,
  spec: ReturnType<typeof formulaQuery>,
) {
  if (!inventory.calc) throw problem('请打开有目标输出连接的计算工程，或选本对话的计算回执');
  const refs = new Map(inventory.points.map((p) => [p.ref, p]));
  const output = refs.get(spec.output),
    flag = refs.get(spec.validity ?? '');
  if (
    !output?.write ||
    (spec.validity && (!flag?.write || flag.alias !== output.alias || flag.physical === output.physical))
  )
    throw problem('结果与可选有效标志须是已核实的独立可写点，并使用同一工程连接');
  const used = new Set<string>(),
    math = expression(spec.expression, 'number', refs, used),
    when = spec.when ? expression(spec.when, 'boolean', refs, used) : 'true';
  const inputs = Array.from(used, (ref) => refs.get(ref)!);
  if (
    !inputs.length ||
    inputs.length > 12 ||
    inputs.some((p) => p.physical === output.physical || p.physical === flag?.physical)
  )
    throw problem('需要1至12个可读输入，输出不能回接输入');
  const q = JSON.stringify;
  const reads = [];
  for (const alias of new Set(inputs.map((p) => p.alias))) {
    const group = inputs.filter((p) => p.alias === alias),
      idx = reads.length;
    reads.push(`  const rows${idx} = [];
  if (await KIOQueryDatas(${q(alias)}, [${group.map((p) => q(p.name)).join(', ')}], rows${idx}) !== 0) throw Error('input_unavailable');
${group.map((p) => '  const ' + p.ref + ' = sample(rows' + idx + ', ' + q(p.name) + ');').join('\n')}`);
  }
  const [min, max, integer] = limits[output.type];
  const offset = process.env.KF_AGENT_SOURCE_UTC_OFFSET || '';
  if (offset && !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(offset)) throw problem('配置的 KF 源时间偏移无效');
  const common = `function finite(value) {
  if (!Number.isFinite(value)) throw Error('invalid_result');
  return value;
}
function sample(rows, tag) {
  const found = rows.filter(row => row.N === tag);
  if (found.length !== 1 || Number(found[0].Q) !== 192) throw Error('bad_sample');
  const {V, T} = found[0];
  if (typeof V !== 'number' && !(typeof V === 'string' && V.trim())) throw Error('bad_sample');
  const value = Number(V);
  if (!Number.isFinite(value)) throw Error('bad_sample');
  const text = String(T).replace(' ', 'T');
  const zone = /(?:Z|[+-]\\d{2}:\\d{2})$/i.test(text) ? '' : ${q(offset)};
  const timestamp = typeof T === 'number' ? T : (zone || /(?:Z|[+-]\\d{2}:\\d{2})$/i.test(text) ? Date.parse(text + zone) : NaN);
  const age = Date.now() - timestamp;
  if (!Number.isFinite(age) || age < -2000 || age > ${spec.maxAgeSeconds * 1000}) throw Error('stale_sample');
  return value;
}
async function calculate() {
${reads.join('\n')}
  if (!(${when})) throw Error('condition_failed');
  const value = finite(${math});
  if (value < ${min} || value > ${max}${integer ? ' || !Number.isInteger(value)' : ''}) throw Error('output_range');
  return value;
}`;
  const header = '// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成\n';
  const set = (p: Point, v: string) => '{N: ' + q(p.name) + ', V: ' + v + ', Q: 192}';
  const write = (items: string[]) =>
    'if (await KIOUpdateDatas(' +
    q(output.alias) +
    ', [' +
    items.join(', ') +
    "], []) !== 0) throw Error('write_failed');";
  const period =
    header +
    common +
    `
let value;
try { value = await calculate(); } catch (error) {
  ${flag ? write([set(flag, '0')]) : '// 输入无效，本周期保留上次写回。'}
  return;
}
${write([set(output, 'value'), ...(flag ? [set(flag, '1')] : [])])}
// end`;
  const request =
    header +
    common +
    `
try {
  OutParam.value = await calculate();
  OutParam.status = 'ok';
} catch (error) {
  OutParam.value = null;
  const known = ['bad_sample','stale_sample','condition_failed','invalid_result','output_range'];
  OutParam.status = known.includes(error.message) ? error.message : 'input_unavailable';
} finally { endResponse(RequestID); }
// end`;
  const scripts = { period, request };
  for (const kind of ['period', 'request'] as const) {
    const check = validateScript({ ...ctx, kind }, scripts[kind], [
      ...new Set(inventory.points.map((p) => p.alias)),
    ]);
    if (check.issues.length) throw problem('宿主检查未通过：' + check.issues.join('、'));
  }
  const lines = [
    '计算表达式：' + spec.expression,
    '计算条件：' + (spec.when ?? '仅核对采样质量、时效与计算范围'),
    ...inputs.map((p) => '输入 ' + p.ref + ' → ' + p.alias + ' / ' + p.name),
    '写回 ' + output.alias + ' / ' + output.name,
    ...(flag ? ['有效标志 ' + flag.alias + ' / ' + flag.name] : []),
    '周期性脚本',
    period,
    '请求式脚本',
    request,
  ];
  return {
    scripts,
    lines,
    summary: { generated: true, layer: 'candidate', inputCount: inputs.length, hasValidity: !!flag },
  };
}
// end
