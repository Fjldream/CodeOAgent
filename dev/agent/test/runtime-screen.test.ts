// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import test from 'node:test';
import assert from 'node:assert/strict';
import { screenTargets, matchBrowserSample, describeScreen } from '../src/runtime-screen.ts';
import { appObservations } from '../src/runtime.ts';
import { Center } from '../src/center.ts';
import type { Context } from '../src/shared.ts';
const context: Context = { kind: 'page', object: 'Room', projectId: 'client1', control: 'c1', dirty: false };
const account = 'operator';
const app = {
  appId: 'a',
  projectId: 'client1',
  projectType: 1,
  canOperate: true,
  appName: 'App',
  port: 3344,
};
const resources = {
  appResource: [app],
  nodeProApp: [{ nodeId: 'n', appPros: [{ appId: 'a' }] }],
  nodeResource: [{ nodeId: 'n', address: 'node-a' }],
};
const apps = [{ appId: 'a', nodeId: 'n', name: 'App', process: '运行中', deployed: '已部署' }];
const targets = screenTargets(resources, context, account);
const file = { pageProperty: { name: 'Room' }, objects: [{ guid: 'c1', text: '0' }] };
const now = Date.now();
const sample = { ...targets[0], at: now, installed: '8', displayed: '8' };
test('逐层对照相同、不同、空文字以及缺失的运行层，显示相同不证明安装包一致', () => {
  assert.equal(describeScreen(context, file, null).status, 'unobserved');
  assert.equal(describeScreen(context, file, sample).status, 'different');
  assert.equal(
    describeScreen(context, file, { ...sample, displayed: '0', installed: null }).status,
    'matches',
  );
  assert.equal(describeScreen(context, { ...file, objects: [] }, sample).status, 'observed');
  const duplicate = { ...file, objects: [...file.objects, ...file.objects] };
  assert.equal(describeScreen(context, duplicate, sample).saved, null);
  assert.equal(
    describeScreen(context, { ...file, objects: [{ guid: 'c1', text: '' }] }, { ...sample, displayed: '' })
      .status,
    'matches',
  );
});
test('同一账号、节点、App、页面、控件与新鲜观察均匹配才接纳', () => {
  assert.ok(matchBrowserSample(sample, targets, apps, now));
  const editor = {
    projectId: context.projectId,
    page: context.object,
    control: context.control,
    at: now,
    text: 'draft',
  };
  assert.equal(describeScreen(context, file, sample, editor).editor?.text, 'draft');
  assert.equal(describeScreen(context, file, sample, { ...editor, control: 'wrong' }).editor, null);
  assert.deepEqual(
    appObservations(
      resources,
      [{ appId: 'a', nodeId: 'wrong', appStatus: 'running', appDeployStatus: 1 }],
      context,
      1,
    ),
    [],
  );

  for (const changed of [
    { userName: 'other' },
    { origin: 'http://node-b:3344' },
    { appId: 'other' },
    { nodeId: 'other' },
    { projectId: 'other' },
    { page: 'other' },
    { control: 'other' },
    { at: now - 45001 },
    { at: now + 2001 },
    { displayed: {} },
    { installed: 12 },
  ])
    assert.equal(matchBrowserSample({ ...sample, ...changed }, targets, apps, now), null);
  assert.equal(matchBrowserSample(sample, [...targets, ...targets], apps, now), null);
  assert.equal(matchBrowserSample(sample, targets, [{ ...apps[0], process: '未运行' }], now), null);
  assert.equal(matchBrowserSample(sample, targets, [{ ...apps[0], deployed: '未部署' }], now), null);
  assert.deepEqual(
    screenTargets({ ...resources, appResource: [{ ...app, canOperate: false }] }, context, account),
    [],
  );
  assert.deepEqual(
    screenTargets(
      { ...resources, nodeProApp: [...resources.nodeProApp, ...resources.nodeProApp] },
      context,
      account,
    ),
    [],
  );
});
test('权限撤回、同显示版本及运行中但旧画面经 Center 正常入口核对', async () => {
  const center = new Center('http://localhost');
  let opsReads = 0,
    revoke = false;
  center.call = async (_token, path) => {
    if (path === '/project/permissions')
      return { items: [{ projectId: context.projectId, projectType: 1, hasProjectPermission: true }] };
    if (path.endsWith('/opsResourceData')) {
      opsReads++;
      return revoke && opsReads > 1 ? { ...resources, appResource: [] } : resources;
    }
    if (path.endsWith('/displayAppListStatus'))
      return [{ appId: 'a', appDeployStatus: 1, appStatus: 'running' }];
    if (path.endsWith('/fileResourceData'))
      return { projectResource: [{ projectId: context.projectId, projectVersion: 'V1', publishTime: 't' }] };
    if (path.endsWith('/batchGetPageFile')) return { success: [file] };
    if (path.endsWith('/userInfo')) return { userName: account };
    throw Error(path);
  };
  const stale = await center.runtime('one', context, sample);
  assert.equal(stale.screen?.status, 'different');
  assert.ok(stale.gaps.some((g) => g.includes('安装摘要')));
  assert.deepEqual(stale.publications, ['V1 · 发布时间 t']);
  revoke = true;
  opsReads = 0;
  const revoked = await center.runtime('one', context, sample);
  assert.equal(revoked.screen?.status, 'unobserved');
  assert.equal(revoked.apps.length, 0);
});
// end
