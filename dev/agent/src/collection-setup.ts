// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
import type { Center } from './center.ts';
import { HttpError, type Context } from './shared.ts';

type Reader = Pick<Center, 'call' | 'require'>;
export type SetupQuery = {
  view: 'drivers' | 'point';
  driver?: string;
  device?: string;
  register?: string;
  tag?: string;
};
export const setupSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    view: {
      type: 'string',
      enum: ['drivers', 'point'],
      description: 'drivers 查平台驱动，point 查设备、寄存器、类型和保存的点。',
    },
    driver: { type: 'string', maxLength: 160, description: '驱动名或设备系列关键词，仅用于 drivers。' },
    device: { type: 'string', maxLength: 160, description: '当前工程内的完整设备名。' },
    register: { type: 'string', maxLength: 160, description: '所选设备下的准确寄存器名称，区别于点地址。' },
    tag: { type: 'string', maxLength: 160, description: '已保存点的完整名称。' },
  },
};

export function readSetupQuery(raw: unknown): SetupQuery {
  const invalid = () => new HttpError(400, '请按查询类型填写驱动关键词，或设备、寄存器及点名。');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw invalid();
  const input = raw as Record<string, unknown>;
  const view = Object.hasOwn(input, 'view')
    ? input.view
    : input.tag || input.device || input.register
      ? 'point'
      : 'drivers';
  if (view !== 'point' && view !== 'drivers') throw invalid();
  const query: SetupQuery = { view };
  for (const [key, value] of Object.entries(input)) {
    if (key === 'view') continue;
    if (key !== 'device' && key !== 'tag' && key !== 'driver' && key !== 'register') throw invalid();
    if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\x00-\x1f]/.test(value))
      throw invalid();
    if ((view === 'drivers') !== (key === 'driver')) throw invalid();
    query[key] = value.trim();
  }
  return query;
}

function field(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : '';
}
const display = (value: unknown) => field(value) || '待核实';
function rows(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value) || value.some((row) => !row || typeof row !== 'object' || Array.isArray(row)))
    throw new HttpError(502, 'KF 返回的配置列表格式待核实。');
  return value;
}
function choices(values: string[], limit = 12) {
  return values.slice(0, limit).join('、') + (values.length > limit ? '（仅列前 ' + limit + ' 项）' : '');
}
function optionLabel(items: Record<string, any>[], value: unknown) {
  const matches = items.filter((item) => field(value) && field(item.id) === field(value));
  return matches.length === 1 ? field(matches[0].text) : '';
}
function sourcePointDevice(point: Record<string, any>, device: Record<string, any>) {
  const name = field(point.deviceName),
    id = field(point.deviceId);
  if (name && name !== field(device.deviceName)) return false;
  if (id && field(device.deviceId) && id !== field(device.deviceId)) return false;
  return Boolean(name || (id && id === field(device.deviceId)));
}
const instructions = {
  platform: '在数采工程属性中核对操作系统与系统平台，保存后再查驱动。',
  drivers:
    '在「数采设备 → 新建设备」打开驱动选择，按厂家提供的型号、通信协议核对驱动名称、系列和版本，再打开该驱动的通信设置。型号或协议尚未确定时，请提供设备铭牌型号及通信协议。',
  noDriver:
    '当前平台和筛选范围内未找到候选。核对工程平台、驱动库中的驱动名称，以及厂家提供的型号与通信协议。',
  device: '在「数采设备」核对已建设备名。尚未建好时，从「新建设备」选择驱动并保存；随后用准确设备名查询。',
  tag: '在「数采变量」核对准确点名与所属设备。新点从「新建」选择已保存设备，查看它支持的寄存器。',
  identity: '请在设备列表和变量列表核对同一设备的名称及标识，确认后再读取该设备的寄存器。',
  register:
    '在「数采变量 → 新建」选择该设备。请按厂家点表核对寄存器名称、地址及地址起算方式，再选一个寄存器查看其允许的数据类型。',
  type: '对照厂家点表的编码、位宽及适用的字序，从当前寄存器的下拉框选择寄存器数据类型。在转换数据类型和换算设置中核对工程单位、倍率与偏差，保存后按准确点名重查。',
  mismatch:
    '在「数采变量」重新打开该点，核对设备、寄存器和类型，并确认设备当前使用的驱动。更换驱动后应重新检查可选项。',
  incomplete: '重新打开「数采变量」中的该点，按待核实字段核对点表和设置，保存后重读。',
  writeOnly: '在「数采变量」核对该点的读写类型；验证采样时，请选用厂家点表中允许读取的测量点。',
  disabled: '先核对设备的激活设置和用途，再到目标节点检查数采 App 与监视结果。',
  monitor:
    '按设备点表核对地址起算、原始值和工程单位的换算关系。随后在「工程工具 → 读取实时点值」选择该工程的数采 App，按点名取得数值、质量与源时间，并与已知输入比对。',
};

export async function inspectCollectionSetup(
  reader: Reader,
  token: string,
  context: Context,
  query: SetupQuery,
) {
  if (context.kind !== 'collection' || !context.projectId) throw new HttpError(400, '请先打开目标数采工程。');
  await reader.require(token, context);
  const project = { projectId: context.projectId };
  const sources: string[] = [];
  async function get(path: string, params: Record<string, string>) {
    sources.push('collect/' + path);
    return reader.call(token, '/collect/' + path, params);
  }
  const properties = await get('getProjectById', project);
  const os = field(properties?.osType),
    platform = field(properties?.sysPlatform);
  const lines = ['工程平台 · ' + display(os) + ' / ' + display(platform)];
  const flags: Record<string, boolean | number> = { platformKnown: Boolean(os && platform) };
  async function finish(status: string, step: keyof typeof instructions) {
    await reader.require(token, context);
    const at = new Date().toISOString();
    const source = sources.join('、');
    lines.push(instructions[step], '配置来源 · ' + source + ' · ' + at);
    return {
      lines,
      at,
      source,
      projection: {
        view: query.view,
        layer: '工程配置及表单选项',
        status,
        ...flags,
        guidance: instructions[step],
        runtimeVerified: false as const,
      },
    };
  }
  if (query.view === 'drivers') {
    if (!os || !platform) return finish('platform-incomplete', 'platform');
    const candidates = rows(await get('getDriverList', { osType: os, sysPlatform: platform }));
    const keyword = (query.driver ?? '').toLowerCase();
    const matches = candidates.filter(
      (row) =>
        field(row.OsType).toLowerCase() === os.toLowerCase() &&
        field(row.SysPlatform).toLowerCase() === platform.toLowerCase() &&
        field(row.DriverName) &&
        [row.DriverName, row.DeviceSeries].some((value) => field(value).toLowerCase().includes(keyword)),
    );
    flags.matchingDrivers = matches.length;
    lines.push('当前平台的驱动候选 ' + matches.length + ' 项（最多显示 12 项）。');
    for (const row of matches.slice(0, 12))
      lines.push(
        [row.DriverName, row.DeviceSeries, row.DriverVersion, row.DriverType].map(display).join(' · '),
      );
    return finish(
      matches.length ? 'driver-options' : 'no-driver-match',
      matches.length ? 'drivers' : 'noDriver',
    );
  }

  const devices = rows(await get('devices', project));
  let deviceMatches = query.device
    ? devices.filter((row) => field(row.deviceName) === query.device)
    : devices;
  let point: Record<string, any> | undefined;
  if (query.tag) {
    const points = rows(await get('variables', { ...project, groupId: '-1' }));
    const named = points.filter((row) => field(row.tagName) === query.tag);
    const matched = query.device
      ? named.filter((row) => deviceMatches.some((device) => sourcePointDevice(row, device)))
      : named;
    if (matched.length !== 1) {
      lines.push(
        '当前筛选内按点名查到 ' + matched.length + ' 项。' + (matched.length > 1 ? '请指定设备。' : ''),
      );
      return finish(matched.length ? 'point-ambiguous' : 'point-not-found', 'tag');
    }
    point = matched[0];
    deviceMatches = deviceMatches.filter((device) => sourcePointDevice(point!, device));
  }
  if (!query.device && !point) {
    lines.push(
      '已建设备 ' + devices.length + ' 项。' + choices(devices.map((row) => display(row.deviceName))),
    );
    return finish('device-list', 'device');
  }
  if (deviceMatches.length !== 1 || !field(deviceMatches[0].deviceName)) {
    lines.push('设备归属未能唯一核实。');
    return finish('device-unresolved', 'identity');
  }
  const device = deviceMatches[0];
  const deviceName = field(device.deviceName);
  // The native register endpoints use the name, so even a unique device ID cannot disambiguate this call.
  if (devices.filter((row) => field(row.deviceName) === deviceName).length !== 1)
    return finish('device-name-ambiguous', 'identity');
  const active = field(device.active);
  lines.push(
    '已保存设备 · ' +
      deviceName +
      ' · 驱动 ' +
      display(device.driverName) +
      ' · 系列 ' +
      display(device.driverSeries) +
      ' · 版本 ' +
      display(device.driverVersion) +
      ' · 激活 ' +
      (active === '1' ? '是' : active === '0' ? '否' : '待核实'),
  );
  const rawRegisters = await get('registers', { ...project, deviceName });
  if (!Array.isArray(rawRegisters) || rawRegisters.some((item) => !field(item)))
    throw new HttpError(502, '设备寄存器列表格式待核实。');
  const registers = [...new Set<string>(rawRegisters.map(field))];
  flags.registerCount = registers.length;
  lines.push('设备可选寄存器（' + registers.length + '）· ' + (choices(registers) || '无'));
  const savedRegister = field(point?.regName);
  if (point)
    lines.push(
      '已保存点 · ' +
        field(point.tagName) +
        ' · 寄存器 ' +
        display(savedRegister) +
        ' · 点地址 ' +
        display(point.regAddress) +
        ' · 寄存器类型编号 ' +
        display(point.regDataType),
    );
  if (point && query.register && query.register !== savedRegister) {
    lines.push('指定寄存器与该点已保存的寄存器不一致。');
    return finish('register-conflict', 'mismatch');
  }
  const register = query.register || savedRegister;
  if (!register || !registers.includes(register)) {
    if (register) lines.push('该寄存器未出现在当前设备的可选项中。');
    return finish(
      register ? 'register-unavailable' : 'register-required',
      register ? 'mismatch' : 'register',
    );
  }
  const types = rows(await get('registerdatatypes', { ...project, deviceName, regName: register }));
  flags.registerTypes = types.length;
  lines.push(
    '寄存器 ' + register + ' 可选类型 · ' + (choices(types.map((row) => display(row.text))) || '无'),
  );
  if (!point)
    return finish(types.length ? 'register-types' : 'no-register-types', types.length ? 'type' : 'mismatch');

  const metadata = await get('getVarsProperty', {});
  const conversionTypes = rows(metadata?.TagDataType?.editor?.options?.data ?? []);
  const registerType = optionLabel(types, point.regDataType),
    conversionType = optionLabel(conversionTypes, point.tagDataType);
  const access = ({ '0': '只读', '1': '只写', '2': '读写' } as Record<string, string>)[
    field(point.accessType)
  ];
  const mode = field(point.dataConvertType);
  lines.push(
    '已保存类型 · 寄存器 ' +
      display(registerType) +
      ' · 转换 ' +
      display(conversionType) +
      ' · 读写 ' +
      display(access),
    '已保存换算 · 模式 ' +
      (mode === '0' ? '无' : mode === '1' ? '线性变换' : '待核实') +
      ' · 系数 ' +
      display(point.dataConvertCoefficient) +
      ' · 偏差 ' +
      display(point.dataConvertDeviation),
  );
  const ranges = [point.minRawValue, point.maxRawValue, point.minValue, point.maxValue];
  if (mode === '1')
    lines.push(
      '线性换算 · 原始下限/上限 ' +
        ranges.slice(0, 2).map(display).join(' / ') +
        ' · 工程下限/上限 ' +
        ranges.slice(2).map(display).join(' / '),
    );
  if (!registerType) return finish('saved-register-type-unverified', 'mismatch');
  if (
    !conversionType ||
    !access ||
    !field(point.regAddress) ||
    !field(point.dataConvertCoefficient) ||
    !field(point.dataConvertDeviation) ||
    !['0', '1'].includes(mode) ||
    (mode === '1' && ranges.some((value) => !field(value))) ||
    !field(device.driverName) ||
    !['0', '1'].includes(active)
  )
    return finish('saved-incomplete', 'incomplete');
  if (active === '0') return finish('device-inactive', 'disabled');
  if (access === '只写') {
    lines.push('该点配置为只写。采样验收需选用允许读取的测量点。');
    return finish('point-write-only', 'writeOnly');
  }
  return finish('saved-readable-point', 'monitor');
}
// end
