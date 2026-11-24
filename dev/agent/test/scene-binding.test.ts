// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motionRule, pageBindings, pageSubscribes } from '../src/scene-binding.ts';
import { checkSceneSample, compareSceneSamples } from '../src/scene-journal.ts';
import { SceneJournal } from '../src/scene-journal.ts';
import { Store } from '../src/store.ts';
import { parseSceneObservation } from '../src/shared.ts';
const event = {
  enable: true,
  propertyName: '水平移动',
  variableName: '$$Stroke',
  connectObj: {
    inputflag: false,
    moveMode: 0,
    inputVal1: 0,
    inputVal2: 100,
    moveVal1: 0,
    moveVal2: 100,
  },
};
const rule = motionRule(event)!;
const point = {
  projectId: 'io',
  appId: 'collector',
  nodeId: 'n',
  tag: 'input',
};
const target = {
  projectId: 'client',
  appId: 'screen',
  nodeId: 'n',
  origin: 'http://example.test',
  part: 'slider',
  userName: 'test',
  control: 'layout',
};
const route: any = {
  binding: { property: event.propertyName, variable: event.variableName, rule },
  point,
  targets: [target],
};
const time = Date.now();
function frame(value: number, at: number) {
  const sample = (t: number) => ({
    point,
    value,
    time: new Date(t - 500).toISOString(),
    at: new Date(t).toISOString(),
    quality: 192,
  });
  return {
    before: sample(at - 200),
    after: sample(at + 200),
    view: {
      ...target,
      value,
      at,
      documentStart: time - 5000,
      loaded: event,
      camera: new Array(16).fill(0),
      base: [-50, 20, 0],
      position: [value - 50, 20, 0],
      size: [800, 500],
      pixel: [200 + value, 100],
    },
  };
}
function observe(raw: any) {
  return checkSceneSample(route, raw, time - 3000, time + 7000);
}
test('绑定按相对路径、Tag 和布局区分，同名场景不会串用', () => {
  const layout = (scene: string, id: string, tag: string) => ({
    prototypeName: 'HT3DLayout',
    baseProperty: { name: 'view', guid: id },
    graphicHTObj: {
      htJsonPath: 'storage/scenes/' + scene,
      htModelEventMng: [{ htModelTag: tag, expressionEventMng: [event] }],
    },
  });
  const rows = pageBindings(
    {
      pageProperty: { name: 'page' },
      objects: [
        layout('A/Slide', '1', 'slider'),
        layout('B/Slide', '2', 'slider'),
        layout('A/Slide', '3', 'other'),
        layout('A/Slide', '4', 'slider'),
      ],
    },
    'A/Slide.json',
    'slider',
  );
  assert.deepEqual(
    rows.map((r) => r.guid),
    ['1', '4'],
  );
  assert.notEqual(rows[0].id, rows[1].id);
  assert.equal(
    motionRule({
      ...event,
      connectObj: { ...event.connectObj, inputflag: true },
    }),
    null,
  );
  assert.throws(() =>
    parseSceneObservation({
      document: 'active',
      path: '../Slide.json',
      selected: 1,
      count: 1,
    }),
  );
});
test('两次不同的优质点值、同一镜头下的预期位移与像素变化一致', () => {
  const a = observe(frame(23, time)),
    b = observe(frame(73, time + 2500));
  assert.equal(compareSceneSamples(a, b, 0), true);
  for (const old of [
    { position: a.position },
    { loaded: { ...event, variableName: '$$Other' } },
    { value: 23 },
  ]) {
    const f = frame(73, time + 2500);
    Object.assign(f.view, old);
    assert.equal(compareSceneSamples(a, observe(f), 0), false);
  }
  assert.equal(compareSceneSamples(a, { ...b, pixel: a.pixel }, 0), false);
});
test('拒绝错点、坏质量、陈旧源时间、读数变化和相机改变', () => {
  const a = observe(frame(23, time)),
    b = observe(frame(73, time + 2500));
  for (const bad of [
    { quality: 0 },
    { time: new Date(time - 60000).toISOString() },
    { point: { ...point, appId: 'other' } },
    { value: 42 },
  ]) {
    const f = frame(23, time);
    Object.assign(f.after, bad);
    assert.throws(() => observe(f));
  }
  assert.throws(() => compareSceneSamples(a, a, 0));
  assert.throws(() => compareSceneSamples(a, { ...b, camera: b.camera.map((n) => n + 1) }, 0));
  assert.throws(() => compareSceneSamples(a, { ...b, documentStart: b.documentStart + 1 }, 0));
});
test('工程已映射仍要检查引用页面的实际订阅，排除其他连接和查询项', () => {
  const variable = { id: 11, projectDataSourceId: 'source', type: 'alias' };
  assert.equal(
    pageSubscribes(
      [
        { id: 'other', subscribe: [11] },
        { id: 'source', subscribe: [], query: [11] },
      ],
      variable,
    ),
    false,
  );
  assert.equal(pageSubscribes([{ id: 'source', subscribe: ['11'] }], variable), true);
  assert.equal(pageSubscribes([{ name: 'alias', subscribe: [11] }], variable), true);
  assert.equal(pageSubscribes([], variable), false);
});
test('跨入口回读继承原账号与依赖权限，撤权不显示旧值', async () => {
  const store = new Store(':memory:');
  try {
    store.db.exec(
      "INSERT INTO plans(id,owner,title) VALUES('p','dev','demo'); INSERT INTO chats(id,plan,title) VALUES('c','p','one');",
    );
    const ctx = { kind: 'client', projectId: 'client', object: '', dirty: false } as const;
    store.db
      .prepare('INSERT INTO scene_captures VALUES(?,?,?,?,?)')
      .run('r', 'c', JSON.stringify(ctx), '[]', JSON.stringify({ lines: ['restricted'], matched: true }));
    const journal = new SceneJournal(store, { require: async () => {} } as any);
    await assert.rejects(journal.read('other', 'tok', 'c', ctx, async () => true));
    const report = await journal.read('dev', 'tok', 'c', ctx, async () => false);
    assert.equal(report.summary.receipts, 0);
    assert.ok(!report.lines.join('').includes('restricted'));
  } finally {
    store.db.close();
  }
});
// end
