// modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appearanceRule, appearanceChanged, inspectAppearance, solidColor } from '../src/scene-appearance.ts';
import { checkSceneSample, compareSceneSamples } from '../src/scene-journal.ts';

const rotate = {
  enable: true,
  variableName: '$$Sensor',
  propertyName: 'z轴旋转',
  connectObj: { rotateMode: 0, angleBegin: 0, angleEnd: 100, rotateBegin: -20, rotateEnd: 80 },
};
const condition = (op: string, value: number, color: string) => ({
  Operator: op,
  value,
  brushArr: [{ color }],
});
const brush = {
  enable: true,
  variableName: '$$Sensor',
  propertyName: '画刷',
  connectObj: {
    expressionType: 2,
    propertyCon: [condition('<', 50, '#2288EE'), condition('>=', 50, '#ee5522')],
  },
};
const lamp = (material: string, pixel: string) => ({
  material: { all: material, shape: material, base: '#ddd' },
  renderColor: pixel,
});
const mask = '1'.repeat(8) + '0'.repeat(24);
test('轴旋转限幅、角度单位和周期归一，圆形部件原地旋转须有可见轮廓变化', () => {
  const rule = appearanceRule(rotate)!;
  const read = (v: number, deg: number, silhouette = mask) =>
    inspectAppearance(rule, { rotation: [0, 0, deg], silhouette }, v);
  const a = read(-1, 340),
    b = read(105, 80, mask.split('').reverse().join(''));
  assert.ok(a.matches && b.matches);
  assert.ok(appearanceChanged(a.appearance, b.appearance, 2));
  assert.equal(read(23, 23).matches, false);
  assert.equal(read(23, 3).matches, true);
  assert.equal(appearanceChanged(a.appearance, read(100, 80).appearance, 2), false);
  assert.throws(() => read(20, 30, ''));
  assert.equal(appearanceRule({ ...rotate, connectObj: { ...rotate.connectObj, angleEnd: 0 } }), null);
  assert.equal(appearanceRule({ ...rotate, connectObj: { ...rotate.connectObj, rotateMode: 1 } }), null);
});
test('数值画刷按条件顺序命中，分别验证材质及受光照影响的像素', () => {
  const r = appearanceRule(brush)!;
  const a = inspectAppearance(r, lamp('#2288ee', '#1d74cc'), 23);
  const b = inspectAppearance(r, lamp('#ee5522', '#cc491d'), 50);
  assert.ok(a.matches && b.matches && appearanceChanged(a.appearance, b.appearance, undefined));
  assert.equal(inspectAppearance(r, lamp('#ee5522', '#1d74cc'), 73).matches, false);
  assert.equal(inspectAppearance(r, lamp('#2288ee', '#cc491d'), 73).matches, false);
  assert.equal(
    inspectAppearance(
      r,
      { ...lamp('#ee5522', '#cc491d'), material: { base: '#ddd', all: '#ee5522', shape: '#2288ee' } },
      73,
    ).matches,
    false,
  );
  const overlapping = appearanceRule({
    ...brush,
    connectObj: {
      expressionType: 2,
      propertyCon: [condition('>=', 0, '#abc'), ...brush.connectObj.propertyCon],
    },
  })!;
  assert.equal(inspectAppearance(overlapping, lamp('#abc', '#aabbcc'), 73).matches, true);
  const partial = appearanceRule({
    ...brush,
    connectObj: { expressionType: 2, propertyCon: [condition('==', 73, '#abc')] },
  })!;
  assert.equal(inspectAppearance(partial, lamp('#abc', '#aabbcc'), 23).matches, false);
  assert.equal(solidColor('rgba(34,136,238,1)'), '#2288ee');
  assert.equal(solidColor('rgba(34,136,238,0.5)'), null);
});
test('不同点值不能掩盖旧规则、冻结颜色、相机变化和无效质量', () => {
  const point = { projectId: 'io', appId: 'a', nodeId: 'n', tag: 'value' },
    target = {
      origin: 'http://test.invalid',
      appId: 'screen',
      nodeId: 'n',
      scene: 'file.json',
      part: 'part',
      userName: 'tester',
    };
  const route: any = {
    point,
    targets: [target],
    binding: { variable: '$$Sensor', property: '画刷', pageSubscription: true, rule: appearanceRule(brush) },
  };
  const start = Date.now();
  function frame(value: number, at: number, material: string, pixel: string) {
    const monitor = (t: number) => ({
      at: new Date(t).toISOString(),
      time: new Date(t - 500).toISOString(),
      value,
      quality: 192,
      point,
    });
    return {
      before: monitor(at - 100),
      after: monitor(at + 100),
      view: {
        ...target,
        at,
        documentStart: start - 5000,
        camera: Array(16).fill(0),
        base: [0, 0, 0],
        position: [0, 0, 0],
        size: [300, 200],
        pixel: [100, 75],
        value,
        loaded: brush,
        ...lamp(material, pixel),
      },
    };
  }
  const check = (f: any) => checkSceneSample(route, f, start - 1000, start + 5000);
  const a = check(frame(23, start, '#2288ee', '#1d74cc')),
    f = frame(73, start + 2500, '#ee5522', '#cc491d');
  assert.ok(compareSceneSamples(a, check(f)));
  assert.equal(compareSceneSamples(a, check({ ...f, view: { ...f.view, renderColor: '#1d74cc' } })), false);
  assert.equal(
    compareSceneSamples(
      a,
      check({
        ...f,
        view: {
          ...f.view,
          loaded: {
            ...brush,
            connectObj: { expressionType: 2, propertyCon: [condition('>=', 0, '#ee5522')] },
          },
        },
      }),
    ),
    false,
  );
  assert.equal(compareSceneSamples(a, check({ ...f, view: { ...f.view, value: '73' } })), false);
  assert.throws(() =>
    compareSceneSamples(a, check({ ...f, view: { ...f.view, camera: Array(16).fill(1) } })),
  );
  assert.throws(() => check({ ...f, after: { ...f.after, quality: 0 } }));
});
// end
