// modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
import { HttpError, type Context } from './shared.ts';
import type { Center } from './center.ts';
import { calcList } from './calc-config.ts';
import { realtimeSource } from './client-points.ts';
import { clientVariableRows } from './client-variables.ts';

export const meterRoles = {
  total: '当前累计表底(kWh)',
  baseline: '北京时间零点冻结表底(kWh)',
  day: '冻结日期(北京时间Unix日序)',
  meter: '当前电表编号',
  initialMeter: '零点电表编号',
  resets: '当日累计回零次数',
  valid: '零点冻结有效标志',
  result: '今日用电量(kWh)',
  status: '今日用电量状态码',
} as const;
type Role = keyof typeof meterRoles;
const roles = Object.keys(meterRoles) as Role[];
export const generationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scope: { type: 'string', enum: ['current', 'lastCalculationReceipt'] },
    method: { type: 'string', enum: ['inventory', 'beijing_day_difference'] },
    bindings: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        roles.map((role) => [role, { type: 'string', description: meterRoles[role], maxLength: 160 }]),
      ),
    },
  },
};
export function generationQuery(input: any) {
  if (input != null && (typeof input !== 'object' || Array.isArray(input)))
    throw new HttpError(400, '计算参数格式无效');
  const method = input?.method ?? 'inventory';
  if (!['inventory', 'beijing_day_difference'].includes(method)) throw new HttpError(400, '计算口径无效');
  const bindings = input?.bindings ?? {};
  if (
    !bindings ||
    Array.isArray(bindings) ||
    typeof bindings !== 'object' ||
    Object.entries(bindings).some(
      ([key, value]) =>
        !Object.hasOwn(meterRoles, key) || typeof value !== 'string' || !value.trim() || value.length > 160,
    )
  )
    throw new HttpError(400, '请按业务字段指定准确点名');
  const scope = input?.scope ?? 'current';
  if (!['current', 'lastCalculationReceipt'].includes(scope))
    throw new HttpError(400, '请选当前工程或本对话最近计算回执');
  return { scope, method, bindings: bindings as Partial<Record<Role, string>> };
}

export function buildDayScripts(alias: string, tags: Record<Role, string>) {
  const name = (role: Role) => JSON.stringify(tags[role]);
  const inputs = roles.filter((role) => !['result', 'status'].includes(role));
  const names = inputs.map(name).join(', ');
  const common = `const names = [${names}];
async function readEnergy() {
  const samples = [];
  const rc = await KIOQueryDatas(${JSON.stringify(alias)}, [${names}], samples);
  if (rc !== 0 || samples.length !== names.length) return {status: 'input_unavailable', code: 2};
  const values = [];
  for (const tag of names) {
    const matches = samples.filter(row => row.N === tag);
    const sample = matches[0];
    if (matches.length !== 1 || Number(sample.Q) !== 192) return {status: 'bad_quality', code: 2};
    const raw = sample.V;
    if (typeof raw !== 'number' && !(typeof raw === 'string' && raw.trim())) return {status: 'invalid_input', code: 2};
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return {status: 'invalid_input', code: 2};
    const stamp = typeof sample.T === 'number' ? sample.T : Date.parse(
      /^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?$/.test(sample.T) ? sample.T.replace(' ', 'T') + '+08:00' : sample.T);
    const age = Date.now() - stamp;
    if (!Number.isFinite(age) || age < -2000 || age > 15000) return {status: 'stale_input', code: 2};
    values.push(value);
  }
  const [total, baseline, day, meter, initialMeter, resets, valid] = values;
  if (valid !== 1 || day !== Math.floor((Date.now() + 8 * 3600000) / 86400000))
    return {status: 'missing_day_start', code: 3};
  if (!Number.isSafeInteger(meter) || !Number.isSafeInteger(initialMeter) || !meter || !initialMeter ||
      !Number.isSafeInteger(resets)) return {status: 'invalid_input', code: 2};
  if (meter !== initialMeter) return {status: 'meter_changed', code: 4};
  if (resets !== 0 || total < baseline) return {status: 'meter_reset', code: 5};
  return {status: 'ok', code: 1, kWh: total - baseline};
}`;
  const source = JSON.stringify(alias);
  const marker = '// modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算\n';
  const period =
    marker +
    common +
    `
let result;
try { result = await readEnergy(); } catch (error) { result = {code: 2}; }
const failures = [];
let rc;
if (result.code === 1) {
  rc = await KIOUpdateDatas(${source}, [{N: ${name('result')}, V: result.kWh, Q: 192}, {N: ${name('status')}, V: 1, Q: 192}], failures);
} else {
  rc = await KIOUpdateDatas(${source}, [{N: ${name('status')}, V: result.code, Q: 192}], failures);
}
if (rc !== 0 || failures.some(row => Number(row?.ErrorCode ?? row?.errorCode ?? row) !== 0))
  throw new Error('今日用电量写回失败');
// end`;
  const request =
    marker +
    common +
    `
try {
  const result = await readEnergy();
  OutParam.status = result.status;
  OutParam.kWh = result.code === 1 ? result.kWh : null;
} catch (error) {
  OutParam.status = 'input_unavailable';
  OutParam.kWh = null;
} finally {
  endResponse(RequestID);
}
// end`;
  return { period, request };
}

// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
export async function readCalculationGraph(
  reader: Pick<Center, 'call' | 'allowed' | 'require'>,
  token: string,
  ctx: Context,
) {
  await reader.require(token, ctx);
  const calc = ['calculation', 'period', 'request'].includes(ctx.kind);
  if (!calc && !['client', 'page'].includes(ctx.kind)) throw new HttpError(400, '请从计算工程或客户端进入');
  const read = (path: string, args = {}) => reader.call(token, path, { projectId: ctx.projectId, ...args });
  const aliases = calc
    ? (await calcList(read, 'dataAccess', '-1')).items
    : (await read('/client/getDataSourceList')).message;
  const vars = calc
    ? (await calcList(read, 'globalVars', '-1')).items
    : clientVariableRows(await read('/client/getVariableList'));
  const directory = await reader.call(token, '/dataSource/getAllDataSource');
  const dependencies: Context[] = [ctx];
  const links = [];
  for (const alias of aliases.slice(0, 24)) {
    const target = calc ? alias.connectName : alias.dataSourceName || alias.appName;

    const matches = directory.filter((r: any) => r.name === target && realtimeSource(r.type, r.config));
    if (matches.length !== 1) continue;
    const source = {
      ...ctx,
      kind: 'datasource' as const,
      projectId: matches[0].guid,
      object: '',
      group: undefined,
    };
    if (!(await reader.allowed(token, source))) continue;
    dependencies.push(source);
    const collection = { ...source, kind: 'collection' as const, projectId: matches[0].config.engineeringId };
    if (!(await reader.allowed(token, collection))) continue;
    dependencies.push(collection);
    const all = await reader.call(token, '/collect/variables', {
      projectId: collection.projectId,
      groupId: '-1',
    });
    const points = all.filter((p: any) => typeof p.tagName === 'string' && !p.tagName.startsWith('$'));
    links.push({ alias, target, source, collection, all, points });
  }
  for (const dep of dependencies) await reader.require(token, dep);
  return { calc, aliases, vars, dependencies, links };
}
// end

export async function prepareCalculation(
  reader: Pick<Center, 'call' | 'allowed' | 'require'>,
  token: string,
  ctx: Context,
  method: string,
  bindings: Partial<Record<Role, string>> = {},
) {
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  const { calc, aliases, vars, dependencies, links } = await readCalculationGraph(reader, token, ctx);
  // end
  const lines: string[] = [
    '当前工程变量：' +
      (vars
        .slice(0, 40)
        .map((v) => v.name)
        .join('、') || '无'),
  ];
  const candidates: { alias: string; tags: Record<Role, string> }[] = [];
  const visibleRoles = new Set<Role>();
  let pointCount = 0;
  const gapsByDevice: string[] = [];
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  for (const alias of aliases.slice(0, 24))
    lines.push(
      '工程连接：' + alias.name + ' → ' + (calc ? alias.connectName : alias.dataSourceName || alias.appName),
    );
  for (const { alias, all, points } of links) {
    // end
    pointCount += points.length;
    for (const p of points.slice(0, 40))
      lines.push([alias.name, p.deviceName, p.tagName, p.description].filter(Boolean).join(' · '));
    for (const device of new Set(points.map((p: any) => p.deviceName))) {
      const tags = {} as Record<Role, string>;
      for (const role of roles) {
        const output = role === 'result' || role === 'status';
        const rows = points.filter(
          (p: any) =>
            p.deviceName === device &&
            (bindings[role] ? p.tagName === bindings[role] : p.description === meterRoles[role]) &&
            (output ? ['1', '2'] : ['0', '2']).includes(String(p.accessType)),
        );
        if (rows.length === 1 && all.filter((p: any) => p.tagName === rows[0].tagName).length === 1)
          tags[role] = rows[0].tagName;
      }
      const unresolved = roles.filter((role) => !tags[role]);
      if (unresolved.length && gapsByDevice.length < 24) {
        gapsByDevice.push(
          alias.name + ' / ' + device + ' 待核对：' + unresolved.map((role) => meterRoles[role]).join('、'),
        );
      }
      for (const role of roles) if (tags[role]) visibleRoles.add(role);
      if (
        roles.every((role) => tags[role]) &&
        new Set(Object.values(tags)).size === roles.length &&
        aliases.filter((a: any) => a.name === alias.name).length === 1
      )
        candidates.push({ alias: alias.name, tags });
    }
  }
  if (aliases.length > 24 || vars.length > 40 || pointCount > 40)
    lines.push('目录展示有上限，未展示条目不能判定为不存在。');
  const ready = calc && aliases.length <= 24 && candidates.length === 1;
  let scripts;
  if (method === 'beijing_day_difference') {
    if (ready) {
      scripts = buildDayScripts(candidates[0].alias, candidates[0].tags);
      lines.push(
        '周期性脚本（状态码 1 时用电量有效；其他状态保留上次有效值）',
        scripts.period,
        '请求式脚本',
        scripts.request,
      );
    } else if (!calc) {
      lines.push('当前是客户端。请打开目标计算工程，或在对话中指定沿用最近一次计算验收。');
    } else if (candidates.length > 1) {
      lines.push('有多组完整的输入输出映射。请指定同一台电表的准确点名。');
    } else if (gapsByDevice.length) {
      lines.push(
        ...gapsByDevice,
        '请补充这些字段的点名或点表定义。缺少日初冻结时，需要先确认冻结数据来自哪里。',
      );
    } else {
      lines.push('当前连接范围尚不能唯一定位冻结电表。请核对计算工程的实时源、设备与点表。');
    }
  }
  for (const dep of dependencies) await reader.require(token, dep);
  return {
    dependencies,
    lines,
    scripts,
    summary: {
      method,
      layer: 'saved',
      variableCount: vars.length,
      pointCount,
      ready,
      unconfirmedRoles: roles.filter((role) => !visibleRoles.has(role)).map((role) => meterRoles[role]),
      candidateCount: candidates.length,
      generated: ready && method === 'beijing_day_difference',
    },
  };
}
// end
