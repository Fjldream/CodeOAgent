// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timingRule, inspectTiming, describeTiming } from '../src/scene-timing.ts';
import { appearanceChanged } from '../src/scene-appearance.ts';
const spin = { kind: 'spin', axis: 2, speed: 1, direction: 0 } as const;
const blink = { kind: 'blink', speed: 1 } as const;
const mask = '1'.repeat(16) + '0'.repeat(16),
  alt = '0'.repeat(16) + '1'.repeat(16);
const window = (sample: (ms: number, i: number) => object, active = true) => ({
  at: 6000,
  value: active,
  timing: {
    start: 1800,
    frames: Array.from({ length: 85 }, (_, i) => ({ ms: i * 50, ...sample(i * 50, i) })),
  },
});
test('原生自旋转固定速度随离散量启停；方向、角度跨零、轮廓和持续时间独立核对', () => {
  assert.deepEqual(
    timingRule({ propertyName: '自旋转', connectObj: { rotateAxis: 2, rotateSpeed: 1, rotateDirection: 0 } }),
    spin,
  );
  assert.equal(
    timingRule({ propertyName: '自旋转', connectObj: { rotateAxis: 2, rotateSpeed: 3, rotateDirection: 0 } }),
    null,
  );
  assert.match(describeTiming(spin), /100.00°\/s/);
  const sample = (rate: number, visible = true) =>
    window((ms, i) => ({
      angle: (350 + (ms * rate) / 1000) % 360,
      mask: visible && i % 4 === 1 ? alt : mask,
    }));
  const active = inspectTiming(spin, sample(100), 1);
  const stopped = inspectTiming(
    spin,
    window(() => ({ angle: 205, mask }), false),
    0,
  );
  assert.ok(active.matches && stopped.matches && appearanceChanged(active.appearance, stopped.appearance, 2));
  assert.equal(inspectTiming(spin, sample(-100), 1).matches, false);
  assert.equal(inspectTiming(spin, sample(60), 1).matches, false);
  assert.equal(inspectTiming(spin, sample(100, false), 1).matches, false);
  assert.equal(inspectTiming(spin, sample(100), 0).matches, false);
  assert.ok(inspectTiming({ ...spin, direction: 1 }, sample(-100), 1).matches);
  const interrupted = sample(100);
  interrupted.timing.frames.splice(10, 8);
  assert.throws(() => inspectTiming(spin, interrupted, 1));
});
test('显隐需要渲染像素随同一相位重复，半周期不能充当完整周期，关闭须保持可见', () => {
  const frames = (half: number, pixel = true) =>
    window((ms) => {
      const visible = Math.floor(ms / half) % 2 === 0;
      return { visible, color: visible || !pixel ? '#bbaaaa' : '#ffffff' };
    });
  const result = inspectTiming(blink, frames(600), 1);
  assert.ok(result.matches);
  assert.equal(result.appearance.measured, 1200);
  assert.ok(result.appearance.cycles >= 2);
  assert.equal(inspectTiming(blink, frames(300), 1).matches, false);
  assert.equal(inspectTiming(blink, frames(600, false), 1).matches, false);
  assert.throws(() => inspectTiming(blink, { ...frames(600), value: 1 }, 1));
  const stillBlinking = inspectTiming(blink, { ...frames(600), value: false }, 0);
  assert.equal(stillBlinking.matches, false);
  assert.equal(stillBlinking.appearance.measured, 1200);
  const sparse = window((ms) => ({ visible: true, ...(ms % 900 === 0 ? { color: '#cccccc' } : {}) }), false);
  assert.ok(inspectTiming(blink, sparse, 0).matches);
  const missingEdge = window((ms) => ({
    visible: Math.floor(ms / 600) % 2 === 0,
    ...(ms === 600 ? {} : { color: '#aabbcc' }),
  }));
  assert.throws(() => inspectTiming(blink, missingEdge, 1));
  for (const visible of [true, false]) {
    const stopped = inspectTiming(
      blink,
      window(() => ({ visible, color: '#ffffff' }), false),
      0,
    );
    assert.equal(stopped.matches, visible);
    assert.equal(stopped.appearance.measured, null);
  }
});
// end
