// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readNativeScene } from '../../../devFront/src/assistant/scene-editor.js';
import { readContext, type Evidence } from '../src/shared.ts';
import { describeScene } from '../src/scene-observation.ts';
import { reportReference } from '../src/report-reference.ts';
import { scriptExample } from '../src/examples.ts';
import { runInNewContext } from 'node:vm';
import { catalog } from '../src/catalog.ts';
import type { Center } from '../src/center.ts';

test('报表专用示例使用请求式宿主、可直接填写的查询条件及数据行回包', () => {
  assert.throws(() => scriptExample('period', 'report'));
  assert.throws(() => scriptExample('request', 'unknown'));
  const sample = scriptExample('request', 'report');
  const query = JSON.parse(sample.samples[0]);
  assert.equal(query.RequestType, 'normal');
  for (const [input, expected, status] of [
    [query.InParam.samples, [{ mean: 520 }], 'ok'],
    [[], [], 'need_five_samples'],
    [[...query.InParam.samples.slice(0, 4), { V: 560, Q: 0 }], [], 'bad_sample'],
  ]) {
    const out = {};
    let sent = 0;
    runInNewContext(sample.code, {
      InParam: { samples: input },
      OutParam: out,
      RequestID: 7,
      endResponse(id: number) {
        assert.equal(id, 7);
        sent++;
      },
    });
    assert.equal(sent, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(out)), { type: 'relation', data: expected, status });
  }
});

test('3D 只读提问时同工程的当前文档和单选，区分入口、空白稿和多选', () => {
  const base = { kind: 'scene', projectId: 'p', object: 'launch.json' };
  let count = 1;
  const item = { getName: () => 'test', getClassName: () => 'ht.Node', p3: () => [10, 0, -1] };
  const dm = { size: () => 2, sm: () => ({ size: () => count, ld: () => item }) };
  const child = {
    location: new URL('https://kf.test/kingclient3d/index3d.html?ProjectInfo=p'),
    editor3d: { url: 'scenes/current.json', dm, g3d: {} },
  };
  const host = {
    location: new URL('https://kf.test'),
    ht3DIframeEditor: { iframeElement3d: { thisElement: { contentWindow: child } } },
  };
  const current = readContext(readNativeScene(host, base));
  assert.equal(current.object, 'current.json');
  assert.deepEqual(current.sceneView?.item?.position, [10, 0, -1]);
  assert.match(describeScene(current.sceneView), /编辑器现场/);
  count = 2;
  child.editor3d.url = '';
  const blank = readContext(readNativeScene(host, base));
  assert.equal(blank.sceneView?.document, 'untitled');
  assert.equal(blank.sceneView?.item, undefined);
  child.location.search = '?ProjectInfo=another';
  assert.equal(readNativeScene(host, base), base);
  assert.throws(() => readContext({ ...base, sceneView: { ...current.sceneView, selected: 2 } }));
});

test('报表按本报告的数据集 ID、成员及目标脚本 ID 追踪；悬空、同名与撤权均不会给出目标路径', async () => {
  const context = readContext({
    kind: 'report',
    projectId: 'p',
    object: 'report',
    cell: { sheet: 'sh', row: 3, column: 1 },
  });
  const cell = { type: 'dataSet', id: 'set', name: '压力', tag: 'mean' };
  const fields = await catalog(context, async (path) =>
    path.endsWith('Manager')
      ? [{ id: 'report', name: '报表' }]
      : { workbookData: { sheets: { sh: { name: 'Sheet1' } } }, dataSet: { sh: { 3: { 1: cell } } } },
  );
  const evidence: Evidence = { ...fields, id: 'e', at: '', layer: 'saved', references: [] };
  let allowed = true;
  let scriptsRead = 0;
  const ds = {
    reportId: 'report',
    id: 'set',
    name: '压力',
    type: 'custom',
    tagList: ['mean'],
    calculateId: 'calc',
    calculateName: '运算',
    calculateScriptId: 'req',
    calculateScript: '计算均压',
    searchCriteria: '{"RequestType":"normal"}',
  };
  const center = {
    allowed: async () => allowed,
    call: async (_token: string, path: string) =>
      path.endsWith('getDataSet')
        ? [ds, { ...ds, reportId: 'other', id: 'set', calculateScriptId: 'wrong' }]
        : (scriptsRead++,
          [
            { GUID: 'req', name: '计算均压' },
            { GUID: 'wrong', name: '同名副本' },
          ]),
  } as unknown as Center;
  const inspect = () => reportReference(center, 'token', context, evidence);
  const r = await inspect();
  assert.equal(r.depends[0].projectId, 'calc');
  assert.match(r.trails[1].path, /Sheet1 \/ B4.*压力.*mean.*计算均压/);
  allowed = false;
  assert.equal((await inspect()).trails.length, 1);
  assert.equal(scriptsRead, 1);
  allowed = true;
  ds.tagList = ['temp'];
  assert.equal((await inspect()).depends.length, 0);
  assert.equal(scriptsRead, 1);
  ds.tagList = ['mean'];
  ds.calculateScript = '旧名称';
  ds.searchCriteria = '{"samples":[]}';
  const outdated = await inspect();
  assert.match(outdated.gaps.join(' '), /调用名.*不一致/);
  assert.match(outdated.gaps.join(' '), /RequestType/);
  ds.searchCriteria = '{';
  assert.match((await inspect()).gaps.join(' '), /无法解析为 JSON/);
});
// end
