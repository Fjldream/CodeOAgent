// modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
type Speed = 0 | 1 | 2;
export type TimingRule =
  | { kind: 'spin'; axis: Speed; speed: Speed; direction: 0 | 1 }
  | { kind: 'blink'; speed: Speed };
type Frame = { ms: number; angle?: number; mask?: string; visible?: boolean; color?: string };
export type TimingReading = {
  kind: 'spin' | 'blink';
  active: boolean;
  expected: number | null;
  measured: number | null;
  elapsed: number;
  transitions: number;
  cycles: number;
};
const speedLevel = (v: unknown): v is Speed => v === 0 || v === 1 || v === 2;
export function timingRule(event: any): TimingRule | null {
  const c = event?.connectObj;
  if (!c) return null;
  if (
    event.propertyName === '自旋转' &&
    speedLevel(c.rotateSpeed) &&
    speedLevel(c.rotateAxis) &&
    (c.rotateDirection === 0 || c.rotateDirection === 1)
  )
    return { kind: 'spin', axis: c.rotateAxis, speed: c.rotateSpeed, direction: c.rotateDirection };
  if (event.propertyName === '可见性闪烁' && speedLevel(c.blinkSpeed))
    return { kind: 'blink', speed: c.blinkSpeed };
  return null;
}
const halfPeriod = (speed: Speed) => [1000, 600, 300][speed];
function degreesPerSecond(rule: Extract<TimingRule, { kind: 'spin' }>) {
  return ((rule.direction === 0 ? 1 : -1) * (rule.speed + 3) * 1000) / [110, 40, 22][rule.speed];
}
export function describeTiming(rule: TimingRule) {
  const grade = ['低速', '中速', '高速'][rule.speed];
  return rule.kind === 'spin'
    ? '已保存规则 · 自旋转，' +
        'XYZ'[rule.axis] +
        ' 轴' +
        (rule.direction === 0 ? '顺时针' : '逆时针') +
        '，' +
        grade +
        '，标称 ' +
        degreesPerSecond(rule).toFixed(2) +
        '°/s。零值停止，非零数值或布尔真启动。'
    : '已保存规则 · 可见性闪烁，' +
        grade +
        '，每 ' +
        halfPeriod(rule.speed) +
        ' ms 切换可见性，一个完整周期 ' +
        2 * halfPeriod(rule.speed) +
        ' ms。布尔真启动，假时保持可见。';
}
const channel = (color: string, start: number) => parseInt(color.slice(start, start + 2), 16);
function distinctColor(a: string, b: string) {
  return [1, 3, 5].some((i) => Math.abs(channel(a, i) - channel(b, i)) >= 12);
}
export function inspectTiming(rule: TimingRule, view: any, value: number) {
  const frames: Frame[] = view.timing?.frames;
  const start = view.timing?.start;
  const client = view.value;
  if (
    !Array.isArray(frames) ||
    frames.length < 12 ||
    frames.length > 220 ||
    !Number.isFinite(start) ||
    !Number.isFinite(view.at) ||
    !(
      typeof client === 'boolean' ||
      (rule.kind === 'spin' && typeof client === 'number' && Number.isFinite(client))
    )
  )
    throw Error('缺少连续画面或变量类型不匹配。');
  const maxGap = rule.kind === 'spin' ? 240 : Math.min(240, halfPeriod(rule.speed) / 2);
  for (const [i, frame] of frames.entries()) {
    if (
      !Number.isFinite(frame?.ms) ||
      (i === 0 ? frame.ms !== 0 : frame.ms <= frames[i - 1].ms || frame.ms - frames[i - 1].ms > maxGap)
    )
      throw Error('连续画面采样中断。');
  }
  const elapsed = frames.at(-1)!.ms;
  if (
    Math.abs(view.at - start - elapsed) > 100 ||
    elapsed > 8500 ||
    elapsed < (rule.kind === 'spin' ? 2800 : halfPeriod(rule.speed) * 5.8)
  )
    throw Error('观察时间不足或时间戳不一致。');
  const active = Boolean(client);
  let transitions = 0,
    cycles = 0,
    measured: number | null = null,
    expected: number | null = null,
    matches = false;
  if (rule.kind === 'spin') {
    expected = active ? degreesPerSecond(rule) : 0;
    let travel = 0,
      reverse = false;
    const flippedBins = new Set<number>();
    const bins = [0, 0, 0];
    for (const [i, frame] of frames.entries()) {
      if (
        !Number.isFinite(frame.angle) ||
        typeof frame.mask !== 'string' ||
        !/^[01x]{32}$/.test(frame.mask) ||
        !frame.mask.includes('1')
      )
        throw Error('缺少实际角度或可见轮廓。');
      if (!i) continue;
      const prev = frames[i - 1];
      const delta = ((((frame.angle! - prev.angle! + 180) % 360) + 360) % 360) - 180;
      if (Math.abs(delta) > 0.02 && delta * (rule.direction === 0 ? 1 : -1) < 0) reverse = true;
      travel += delta;
      const bin = Math.min(2, Math.floor((frame.ms / elapsed) * 3));
      bins[bin] += delta;
      if ([...frame.mask].some((v, j) => v !== 'x' && prev.mask![j] !== 'x' && v !== prev.mask![j])) {
        transitions++;
        flippedBins.add(bin);
      }
    }
    measured = (travel * 1000) / elapsed;
    matches = active
      ? !reverse &&
        flippedBins.size >= 2 &&
        Math.abs(measured - expected) <= Math.abs(expected) * 0.12 &&
        bins.every((v) => Math.abs((v * 3000) / elapsed - expected!) <= Math.abs(expected!) * 0.32)
      : !reverse && bins.every((v) => Math.abs(v) < 0.05) && transitions === 0;
  } else {
    const edges: number[] = [];
    let valid = true;
    const colors: string[][] = [[], []];
    let lastColorAt = -Infinity;
    for (const [i, frame] of frames.entries()) {
      if (typeof frame.visible !== 'boolean') throw Error('缺少实际显隐状态。');
      const edge = i > 0 && frame.visible !== frames[i - 1].visible;
      if (frame.color !== undefined) {
        if (typeof frame.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(frame.color))
          throw Error('渲染像素无效。');
        const group = colors[Number(frame.visible)];
        if (!group.length) group.push(frame.color);
        else if (distinctColor(group[0], frame.color)) valid = false;
        lastColorAt = frame.ms;
      } else if (edge || frame.ms - lastColorAt > 1100) throw Error('缺少相位变化时的渲染像素。');
      if (edge) edges.push((frame.ms + frames[i - 1].ms) / 2);
    }
    transitions = edges.length;
    const periods = edges.slice(2).map((t, i) => t - edges[i]);
    cycles = Math.max(0, Math.floor((edges.length - 1) / 2));
    if (periods.length) measured = periods.reduce((a, b) => a + b, 0) / periods.length;
    if (active) {
      expected = 2 * halfPeriod(rule.speed);
      matches =
        valid &&
        cycles >= 2 &&
        colors.every((c) => c.length > 0) &&
        distinctColor(colors[0][0], colors[1][0]) &&
        periods.every((p) => Math.abs(p - expected!) <= expected! * 0.15) &&
        edges.slice(1).every((t, i) => Math.abs(t - edges[i] - expected! / 2) <= expected! * 0.13);
    } else matches = valid && transitions === 0 && colors[1].length > 0;
  }
  const appearance: TimingReading = {
    kind: rule.kind,
    active,
    expected,
    measured,
    elapsed,
    transitions,
    cycles: Math.max(0, cycles),
  };
  return { appearance, matches: matches && Number(client) === value };
}
export function timingLine(sample: TimingReading) {
  const window = ' · 观察 ' + (sample.elapsed / 1000).toFixed(2) + ' s';
  if (sample.kind === 'spin')
    return (
      ' · 实测转速 ' +
      sample.measured!.toFixed(2) +
      '°/s（' +
      (Math.abs(sample.measured!) / 6).toFixed(2) +
      ' rpm） / 标称 ' +
      sample.expected!.toFixed(2) +
      '°/s' +
      window +
      ' · 轮廓变化 ' +
      sample.transitions +
      ' 次'
    );
  return sample.active
    ? ' · 实测闪烁周期 ' +
        (sample.measured?.toFixed(0) ?? '未取得') +
        ' ms / 标称 ' +
        sample.expected +
        ' ms' +
        window +
        ' · 完整周期 ' +
        sample.cycles +
        ' 个'
    : ' · 预期常显，观察到 ' +
        sample.transitions +
        ' 次显隐切换，' +
        (sample.measured === null ? '无可测周期' : '实测闪烁周期 ' + sample.measured.toFixed(0) + ' ms') +
        window;
}
// end
