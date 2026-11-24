// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCollectionSetup, readSetupQuery } from '../src/collection-setup.ts';
import { HttpError, type Context } from '../src/shared.ts';
import { querySchema, readQueryArguments, supportedTool } from '../src/query-tools.ts';

const entry: Context = { kind: 'collection', projectId: 'station', object: '', dirty: false };
function fixture() {
  const device = {
    deviceId: 2,
    deviceName: 'Probe',
    driverName: 'Thermal',
    driverSeries: 'T',
    driverVersion: '4',
    active: 1,
  };
  const point: Record<string, any> = {
    tagName: 'Raw',
    deviceName: 'Probe',
    deviceId: 2,
    regName: 'Input',
    regAddress: 0,
    regDataType: 16,
    tagDataType: 32,
    accessType: 0,
    dataConvertType: 1,
    dataConvertCoefficient: 0.25,
    dataConvertDeviation: 0,
    minRawValue: 0,
    maxRawValue: 4095,
    minValue: -20,
    maxValue: 100,
  };
  const data: Record<string, any> = {
    getProjectById: { osType: 'Linux', sysPlatform: 'ARM' },
    getDriverList: [
      {
        DriverName: 'Thermal',
        DeviceSeries: 'T100',
        DriverVersion: '4',
        OsType: 'Linux',
        SysPlatform: 'ARM',
      },
      {
        DriverName: 'Thermal',
        DeviceSeries: 'T100',
        DriverVersion: '3',
        OsType: 'Windows',
        SysPlatform: 'X86',
      },
    ],
    devices: [device],
    variables: [point],
    registers: ['Input', 'Status'],
    registerdatatypes: [{ id: 16, text: 'Short' }],
    getVarsProperty: { TagDataType: { editor: { options: { data: [{ id: 32, text: 'Float' }] } } } },
  };
  const calls: { path: string; params: Record<string, string> }[] = [];
  let checks = 0;
  const reader = {
    async require() {
      checks++;
    },
    async call(_token: string, path: string, params: Record<string, string> = {}) {
      const name = path.replace('/collect/', '');
      calls.push({ path: name, params });
      assert.ok(Object.hasOwn(data, name));
      return data[name];
    },
  };
  const run = (input: unknown) => inspectCollectionSetup(reader, 'ordinary', entry, readSetupQuery(input));
  return { data, device, point, reader, run, calls, checks: () => checks };
}
test('驱动按工程 OS 和架构过滤，空平台停止查询，候选保留版本和系列', async () => {
  const f = fixture();
  const result = await f.run({ driver: 't100' });
  assert.equal(result.projection.status, 'driver-options');
  assert.match(result.lines.join('\n'), /Thermal · T100 · 4/);
  assert.doesNotMatch(result.lines.join('\n'), /T100 · 3/);
  assert.deepEqual(f.calls.at(-1)?.params, { osType: 'Linux', sysPlatform: 'ARM' });
  assert.equal(f.checks(), 2);
  assert.doesNotMatch(JSON.stringify(result.projection), /Thermal|T100|Linux|ARM/);
  f.data.getProjectById.sysPlatform = '';
  assert.equal((await f.run({})).projection.status, 'platform-incomplete');
  assert.equal(f.calls.filter((item) => item.path === 'getDriverList').length, 1);
});
test('按设备再按寄存器查询；按保存点独立还原两种类型、地址零和非默认线性换算', async () => {
  const f = fixture();
  assert.equal((await f.run({ view: 'point' })).projection.status, 'device-list');
  assert.equal((await f.run({ device: 'Probe' })).projection.status, 'register-required');
  assert.equal((await f.run({ device: 'Probe', register: 'Input' })).projection.status, 'register-types');
  assert.equal(
    f.calls.some((item) => item.path === 'variables'),
    false,
  );
  const result = await f.run({ tag: 'Raw' });
  assert.equal(result.projection.status, 'saved-readable-point');
  assert.match(result.lines.join('\n'), /点地址 0/);
  assert.match(result.lines.join('\n'), /寄存器 Short · 转换 Float · 读写 只读/);
  assert.match(result.lines.join('\n'), /系数 0.25 · 偏差 0/);
  assert.match(result.lines.join('\n'), /0 \/ 4095 · 工程下限\/上限 -20 \/ 100/);
  assert.equal(result.projection.runtimeVerified, false);
  assert.doesNotMatch(JSON.stringify(result.projection), /Probe|Thermal|Short|0.25|4095/);
  assert.deepEqual(f.calls.find((row) => row.path === 'registerdatatypes')?.params, {
    projectId: 'station',
    deviceName: 'Probe',
    regName: 'Input',
  });
});
test('重复点、过期设备标识、错误寄存器和重名设备均不借用其他设备的选项', async () => {
  const f = fixture();
  f.data.devices.push({ ...f.device, deviceId: 3, deviceName: 'Second' });
  f.data.variables.push({ ...f.point, deviceId: 3, deviceName: 'Second' });
  assert.equal((await f.run({ tag: 'Raw' })).projection.status, 'point-ambiguous');
  assert.equal(
    (await f.run({ device: 'Probe', tag: 'Raw', register: 'Status' })).projection.status,
    'register-conflict',
  );
  assert.equal(
    (await f.run({ device: 'Probe', register: 'Missing' })).projection.status,
    'register-unavailable',
  );
  f.point.deviceId = 3;
  assert.equal((await f.run({ device: 'Probe', tag: 'Raw' })).projection.status, 'point-not-found');
  f.data.devices.push({ ...f.device, deviceId: 9 });
  f.point.deviceId = 2;
  assert.equal((await f.run({ device: 'Probe', tag: 'Raw' })).projection.status, 'device-name-ambiguous');
  assert.equal(
    f.calls.some((call) => call.path === 'registerdatatypes'),
    false,
  );
});
test('保存项缺字段、驱动已改、设备未激活或点只写，均不能报为可采样', async () => {
  const f = fixture();
  f.point.dataConvertCoefficient = '';
  assert.equal((await f.run({ tag: 'Raw' })).projection.status, 'saved-incomplete');
  f.point.dataConvertCoefficient = 1;
  f.device.active = 0;
  assert.equal((await f.run({ tag: 'Raw' })).projection.status, 'device-inactive');
  f.device.active = 1;
  f.point.accessType = 1;
  assert.equal((await f.run({ tag: 'Raw' })).projection.status, 'point-write-only');
  f.point.regDataType = 99;
  assert.equal((await f.run({ tag: 'Raw' })).projection.status, 'saved-register-type-unverified');
});
test('工具仅供数采入口，拒绝外来工程和无效参数，权限撤回后不返回部分结果', async () => {
  const f = fixture();
  for (const raw of [
    null,
    [],
    { projectId: 'foreign' },
    { device: 'Probe', driver: 'Any' },
    { device: '  ' },
    { device: 'a\nb' },
  ])
    assert.throws(() => readSetupQuery(raw), /查询类型/);
  assert.deepEqual(readQueryArguments('inspect_collection_setup', { tag: ' Raw ' }), {
    view: 'point',
    tag: 'Raw',
  });
  assert.equal(supportedTool('inspect_collection_setup', 'page'), false);
  assert.ok('register' in querySchema('inspect_collection_setup').properties);
  await assert.rejects(
    inspectCollectionSetup(f.reader, 'token', { ...entry, kind: 'client' }, readSetupQuery({})),
    /数采工程/,
  );
  assert.equal(f.calls.length, 0);
  let checks = 0;
  f.reader.require = async () => {
    if (++checks === 2) throw new HttpError(403, '已撤权');
  };
  await assert.rejects(f.run({ tag: 'Raw' }), /已撤权/);
  f.data.registers = { error: true };
  await assert.rejects(f.run({ device: 'Probe' }), /格式待核实/);
});
// end
