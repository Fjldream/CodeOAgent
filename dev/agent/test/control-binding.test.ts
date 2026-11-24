// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { inspectControlBinding, readBindingQuery } from '../src/control-binding.ts';
import { selectedControls } from '../src/page-trace.ts';
import { describeScreen, matchBrowserSample } from '../src/runtime-screen.ts';
import { HttpError, type Context } from '../src/shared.ts';

const ctx: Context = { kind: 'page', projectId: 'client', object: 'View', control: 'uuid', dirty: false };
function fixture(button = false) {
  const object = {
    guid: 'uuid',
    name: 'Display',
    showUiExtendType: button ? 'ElementUI_Button' : 'RichText',
    uiModelType: button ? 35 : 7,
    text: '27',
    linkMng: { linkList: [] as any[] },
  };
  const cycle = { linkId: 2, enable: true, script: '', intervalMs: 1000 };
  const page = { pageProperty: { name: 'View' }, objects: [object], linkMng: { linkList: [cycle] } };
  const variable = {
    name: 'RoomTemp',
    projectDataSourceId: 'connection',
    isMap: true,
    isSub: true,
    dataSourceItem: { appName: 'source-app', tagName: 'Reading' },
  };
  const data: Record<string, any> = {
    '/client/getPages': { message: { Pages: [{ name: 'View' }] } },
    '/client/batchGetPageFile': { success: [page] },
    '/client/getVariableList': { message: [{ g: { Variables: [variable] } }] },
    '/client/getDataSourceList': {
      message: [{ id: 'connection', name: 'RT', appName: 'source-app', dataSourceName: 'Source' }],
    },
    '/dataSource/getAllDataSource': [
      {
        guid: 'ds',
        name: 'Source',
        type: '工业数据源_网络模式',
        config: { newWorkDateType: 'KingIOServerLinux', dataType: ['1'], engineeringId: 'upstream' },
      },
    ],
    '/collect/variables': [{ tagName: 'Reading', deviceName: 'Probe', accessType: 0 }],
  };
  const reader = {
    async require(_token: string, _ctx: Context) {},
    async allowed(_token: string, _ctx: Context) {
      return true;
    },
    async call(_token: string, path: string, params?: Record<string, string>) {
      if (path === '/collect/variables') assert.equal(params?.projectId, 'upstream');
      assert.ok(Object.hasOwn(data, path));
      return data[path];
    },
  };
  return {
    data,
    page,
    object,
    cycle,
    variable,
    reader,
    run: (q = {}) => inspectControlBinding(reader, 'token', ctx, q),
  };
}
test('两个控件类型由选区类型字段决定，示例引用已验证的客户端变量，读回同一绑定后转运行核对', async () => {
  for (const button of [false, true]) {
    const f = fixture(button);
    const guide = await f.run();
    assert.equal(guide.projection.state, 'ready');
    assert.doesNotMatch(JSON.stringify(guide.projection), /RoomTemp|Probe|Display\.|Reading/);
    const line = guide.lines.find((l) => l.startsWith('Display.'))!;
    assert.match(line, button ? /^Display\.Caption = String/ : /^Display\.setText\(String/);
    f.cycle.script = line;
    const saved = await f.run();
    assert.equal(saved.projection.state, 'bound');
    assert.ok(saved.lines.some((l) => l.includes('刷新间隔 1000')));
    f.cycle.enable = false;
    assert.equal((await f.run()).projection.state, 'review');
  }
});
test('重名、断开订阅、重复设备点和权限撤回均不推荐变量；无关数据名不能经云端投影流出', async () => {
  const f = fixture();
  f.reader.allowed = async (_token, c) => c.projectId !== 'ds';
  let result = await f.run();
  assert.equal(result.projection.state, 'no-variable');
  assert.doesNotMatch(result.lines.join(' '), /RoomTemp|Probe/);
  f.reader.allowed = async () => true;
  f.variable.isSub = false;
  assert.equal((await f.run()).projection.state, 'no-variable');
  f.variable.isSub = true;
  const vars = f.data['/client/getVariableList'].message[0].g.Variables;
  vars.push({ ...f.variable });
  assert.equal((await f.run()).projection.state, 'no-variable');
  vars.pop();
  vars.push({ ...f.variable, name: 'Copy' });
  assert.equal((await f.run()).projection.state, 'choose');
  assert.equal((await f.run({ variable: 'RoomTemp' })).projection.state, 'ready');
  f.data['/collect/variables'].push({ tagName: 'Reading', deviceName: 'Another', accessType: 0 });
  assert.equal((await f.run()).projection.state, 'no-variable');
  f.data['/collect/variables'].pop();
  f.reader.require = async (_token, c) => {
    if (c.projectId === 'upstream') throw new HttpError(403, '撤权');
  };
  await assert.rejects(f.run(), /撤权/);
  assert.throws(() => readBindingQuery({ projectId: 'elsewhere' }), /参数/);
});
test('控件命名相似、选区失效、重复写入、未知脚本和已有其他事件都不能推断为唯一绑定', async () => {
  const f = fixture();
  f.object.showUiExtendType = 'unknown';
  assert.equal((await f.run()).projection.state, 'unsupported');
  f.object.showUiExtendType = 'RichText';
  for (const script of [
    'const Display = someObject; Display.setText($System.RoomTemp);',
    'if (changed) Display.setText($System.RoomTemp);',
    'Display.setText($System.RoomTemp);Display.setText("x");',
    'Display.setText($System[key]);',
  ]) {
    f.cycle.script = script;
    assert.equal((await f.run()).projection.state, 'review');
  }
  f.cycle.script = '';
  f.object.linkMng.linkList.push({ linkId: 4, enable: true, script: 'Display.setText("fixed");' });
  assert.equal((await f.run()).projection.state, 'review');
  f.object.guid = 'other';
  await assert.rejects(f.run(), /选区/);
});
test('原生按钮重新打开会更换编辑 GUID，仅按当前页唯一同类型名称恢复，重名或 GUID 冲突停止', () => {
  const f = fixture(true);
  const selected = { ...ctx, control: 'live', buttonName: 'Display' };
  assert.deepEqual(selectedControls([f.object], selected), [f.object]);
  const nativeSaved = { ...f.object, showUiExtendType: undefined };
  assert.deepEqual(selectedControls([nativeSaved], selected), [nativeSaved]);
  assert.deepEqual(selectedControls([f.object, { ...f.object, guid: 'copy' }], selected), []);
  assert.deepEqual(
    selectedControls([f.object, { ...f.object, name: 'Another', guid: 'live' }], selected),
    [],
  );
  assert.deepEqual(selectedControls([{ ...f.object, uiModelType: 7 }], selected), []);
});
test('动态控件初始文字和浏览器读数相同仍可检出旧事件；旧标签、旧扩展和无运行观察单独处理', () => {
  const f = fixture();
  f.cycle.script = 'Display.setText(String($System.RoomTemp));';
  const target = {
    origin: 'http://127.0.0.1:9991',
    projectId: 'client',
    page: 'View',
    control: 'uuid',
    userName: 'user',
    appId: 'app',
    nodeId: 'node',
  };
  const digest = (s: string) => createHash('sha256').update(s).digest('hex');
  const old = digest('[]'),
    current = digest(JSON.stringify([true, '1000', f.cycle.script]));
  const sample = {
    ...target,
    at: Date.now(),
    installed: '27',
    displayed: '27',
    installedCycle: old,
    loadedCycle: old,
  };
  const before = describeScreen(ctx, f.page, sample);
  assert.equal(before.status, 'observed');
  assert.deepEqual(before.bindingCycle, { installed: 'different', loaded: 'different' });
  const opened = describeScreen(ctx, f.page, { ...sample, installedCycle: current });
  assert.deepEqual(opened.bindingCycle, { installed: 'matches', loaded: 'different' });
  const apps = [{ appId: 'app', nodeId: 'node', name: 'name', process: '运行中', deployed: '已部署' }];
  const legacy = matchBrowserSample(
    { ...sample, installedCycle: 'bad', loadedCycle: undefined },
    [target],
    apps,
    sample.at,
  );
  assert.deepEqual(describeScreen(ctx, f.page, legacy).bindingCycle, {
    installed: 'unknown',
    loaded: 'unknown',
  });
  assert.equal(describeScreen(ctx, f.page, null).status, 'unobserved');
});
// end
