// modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
const rotationAxes: Record<string, number> = { x轴旋转: 0, y轴旋转: 1, z轴旋转: 2 };
const operators: Record<string, (x: number, y: number) => boolean> = {
  '==': (x, y) => x === y,
  '!=': (x, y) => x !== y,
  '<': (x, y) => x < y,
  '<=': (x, y) => x <= y,
  '>': (x, y) => x > y,
  '>=': (x, y) => x >= y,
};
type Rotation = { kind: 'rotation'; axis: number; low: number; high: number; begin: number; end: number };
type Brush = { kind: 'brush'; conditions: { operator: string; limit: number; color: string }[] };
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
import {
  describeTiming,
  inspectTiming,
  timingLine,
  timingRule,
  type TimingRule,
  type TimingReading,
} from './scene-timing.ts';
export type AppearanceRule = Rotation | Brush | TimingRule;
// end
const decimal = (v: any) =>
  (typeof v === 'number' ||
    (typeof v === 'string' && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()))) &&
  Number.isFinite(Number(v));
export function solidColor(value: unknown) {
  if (typeof value !== 'string') return null;
  const css = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(css)) return css;
  if (/^#[0-9a-f]{3}$/.test(css)) return '#' + [...css.slice(1)].map((v) => v + v).join('');
  const rgb =
    /^(?:rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)|rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*1(?:\.0+)?\s*\))$/.exec(
      css,
    );
  if (!rgb) return null;
  const channels = rgb.slice(rgb[1] ? 1 : 4, rgb[1] ? 4 : 7).map(Number);
  return channels.every((n) => n <= 255)
    ? '#' + channels.map((n) => n.toString(16).padStart(2, '0')).join('')
    : null;
}
export function appearanceRule(event: any): AppearanceRule | null {
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  const timed = timingRule(event);
  if (timed) return timed;
  const c = event?.connectObj;
  // end
  if (!c) return null;
  if (Object.hasOwn(rotationAxes, event.propertyName) && c.rotateMode === 0) {
    const values = [c.angleBegin, c.angleEnd, c.rotateBegin, c.rotateEnd];
    if (!values.every(decimal)) return null;
    const [low, high, begin, end] = values.map(Number);
    return low < high
      ? { kind: 'rotation', axis: rotationAxes[event.propertyName], low, high, begin, end }
      : null;
  }
  if (
    event.propertyName !== '画刷' ||
    c.expressionType !== 2 ||
    !Array.isArray(c.propertyCon) ||
    !c.propertyCon.length ||
    c.propertyCon.length > 32
  )
    return null;
  const conditions: Brush['conditions'] = [];
  for (const row of c.propertyCon) {
    if (
      typeof row?.Operator !== 'string' ||
      !Object.hasOwn(operators, row.Operator) ||
      !decimal(row.value) ||
      row.brushArr?.length !== 1
    )
      return null;
    const color = solidColor(row.brushArr[0]?.color);
    if (!color) return null;
    conditions.push({ operator: row.Operator, limit: Number(row.value), color });
  }
  return { kind: 'brush', conditions };
}
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
export function describeAppearance(rule: AppearanceRule) {
  if (rule.kind === 'spin' || rule.kind === 'blink') return describeTiming(rule);
  // end
  if (rule.kind === 'rotation')
    return (
      '已保存规则 · 输入 ' +
      rule.low +
      ' 至 ' +
      rule.high +
      ' 线性映射到 ' +
      'XYZ'[rule.axis] +
      ' 轴 ' +
      rule.begin +
      '° 至 ' +
      rule.end +
      '°，超界按端点取值。'
    );
  return (
    '已保存规则 · 按顺序取首个命中条件，' +
    rule.conditions.map((r) => r.operator + ' ' + r.limit + ' → ' + r.color.toUpperCase()).join('，')
  );
}
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
function expectedValue(rule: Rotation | Brush, value: number) {
  // end
  if (rule.kind === 'rotation')
    return (
      rule.begin +
      (rule.end - rule.begin) * Math.max(0, Math.min(1, (value - rule.low) / (rule.high - rule.low)))
    );
  return rule.conditions.find((r) => operators[r.operator](value, r.limit))?.color ?? null;
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-4;
const angleDistance = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
type Shape = { kind: 'rotation'; expected: number; actual: number[]; mask: string };
type Color = { kind: 'brush'; expected: string | null; actual: string | null; pixel: string | null };
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
export type Appearance = Shape | Color | TimingReading;
// end
export function inspectAppearance(
  rule: AppearanceRule,
  view: any,
  input: number,
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
): { appearance: Appearance; matches: boolean } {
  if (rule.kind === 'spin' || rule.kind === 'blink') return inspectTiming(rule, view, input);
  // end
  if (rule.kind === 'rotation') {
    const angles = view.rotation;
    if (
      !Array.isArray(angles) ||
      angles.length !== 3 ||
      !angles.every(Number.isFinite) ||
      typeof view.silhouette !== 'string' ||
      !/^([01x]){32}$/.test(view.silhouette)
    )
      throw Error('缺少可见部件的三个轴角或画面轮廓。');
    const expected = Number(expectedValue(rule, input));
    return {
      appearance: { kind: 'rotation', expected, actual: angles, mask: view.silhouette },
      matches: angleDistance(angles[rule.axis], expected) < 0.05,
    };
  }
  const expected = expectedValue(rule, input) as string | null,
    material = solidColor(view.material?.all),
    shape = solidColor(view.material?.shape);
  const pixel = solidColor(view.renderColor);
  const matches =
    !!expected &&
    material === expected &&
    shape === material &&
    solidColor(view.material?.base) === '#dddddd' &&
    !!pixel &&
    litColorMatches(expected, pixel);
  return { appearance: { kind: 'brush', expected, actual: material, pixel }, matches };
}
const channels = (color: string) => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
function litColorMatches(material: string, rendered: string) {
  // Neutral lighting may scale intensity. Verify the measured chromaticity separately from the material.
  const m = channels(material),
    p = channels(rendered),
    peak = Math.max(...m),
    light = Math.max(...p);
  if (peak < 12) return Math.max(...p) < 18;
  if (light < 22 || light / peak < 0.2 || light / peak > 1.3) return false;
  return m.every((v, i) => Math.abs(p[i] - (light * v) / peak) <= Math.max(6, light * 0.065));
}
export function appearanceChanged(first: Appearance, second: Appearance, axis: number | undefined) {
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  if ((first.kind === 'spin' || first.kind === 'blink') && first.kind === second.kind)
    return first.active !== second.active;
  if (first.kind === 'rotation' && second.kind === 'rotation' && axis !== undefined) {
    // end
    const flips = [...first.mask].some(
      (c, i) => (c === '1' && second.mask[i] === '0') || (c === '0' && second.mask[i] === '1'),
    );
    return (
      angleDistance(first.expected, second.expected) > 0.05 &&
      flips &&
      first.actual.every((v, i) => i === axis || close(v, second.actual[i]))
    );
  }
  if (first.kind === 'brush' && second.kind === 'brush' && first.pixel && second.pixel) {
    const a = channels(first.pixel),
      b = channels(second.pixel);
    return first.expected !== second.expected && Math.max(...a.map((c, i) => Math.abs(c - b[i]))) >= 8;
  }
  return false;
}
// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
export function appearanceLine(sample: Appearance, axis: number | undefined) {
  if ('elapsed' in sample) return timingLine(sample);
  // end
  if (sample.kind === 'rotation')
    return (
      ' · ' +
      'XYZ'[axis!] +
      ' 轴实际 ' +
      sample.actual[axis!].toFixed(2) +
      '° / 预期 ' +
      sample.expected.toFixed(2) +
      '°'
    );
  return (
    ' · 规则颜色 ' +
    (sample.expected?.toUpperCase() || '未命中') +
    ' / 实际材质 ' +
    (sample.actual?.toUpperCase() || '未知') +
    ' / 画面像素 ' +
    (sample.pixel?.toUpperCase() || '未取得')
  );
}
// end
