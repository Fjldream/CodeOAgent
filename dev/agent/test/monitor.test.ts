// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observePoint } from '../../../devFront/src/assistant/monitor-point.js';

test('数采监视先等连接确认，只接收指定点带质量与源时间的回执，取消即关闭', async (t) => {
  let socket: SampleSocket;
  class SampleSocket {
    static OPEN = 1;
    readyState = 1;
    packets: { operation: string }[] = [];
    closed = false;
    onopen?: () => void;
    onmessage?: (event: { data: string }) => void;
    constructor(url: URL) {
      assert.equal(url.href, 'wss://kf.test/ws');
      socket = this;
    }
    send(data: string) {
      this.packets.push(JSON.parse(data));
    }
    close() {
      this.closed = true;
    }
    receive(operation: string, data?: unknown[]) {
      this.onmessage?.({
        data: JSON.stringify({ type: 'collect_variable_monitor', operation, errorCode: 0, data }),
      });
    }
  }
  const originalSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket')!;
  Object.defineProperty(globalThis, 'WebSocket', { value: SampleSocket, configurable: true });
  t.after(() => Object.defineProperty(globalThis, 'WebSocket', originalSocket));
  const before = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { value: new URL('https://kf.test'), configurable: true });
  t.after(() => {
    if (before) Object.defineProperty(globalThis, 'location', before);
    else Reflect.deleteProperty(globalThis, 'location');
  });
  const target = {
    tag: 'pressure',
    appName: 'test',
    projectId: 'pr',
    ip: 'test',
    port: '1',
    osType: 'Linux',
  };
  const controller = new AbortController();
  const first = observePoint(target, 'fixture', controller.signal);
  socket!.onopen?.();
  assert.deepEqual(
    socket!.packets.map((p) => p.operation),
    ['connect_monitor'],
  );
  socket!.receive('connect_monitor');
  assert.deepEqual(
    socket!.packets.map((p) => p.operation),
    ['connect_monitor', 'update_variables'],
  );
  const row = { tagName: 'pressure', tagValue: 0, quality: 0, timeStamp: '2026-11-20 17:51:00' };
  socket!.receive('realtime_monitor', [
    { ...row, tagName: 'other' },
    { ...row, quality: '--' },
  ]);
  assert.equal(socket!.closed, false);
  socket!.receive('realtime_monitor', [row]);
  const sample = await first;
  assert.deepEqual([sample.value, sample.quality, sample.time], [0, 0, row.timeStamp]);
  assert.equal(socket!.closed, true);
  const pending = observePoint(target, 'fixture', controller.signal);
  controller.abort();
  await assert.rejects(pending, /结束本次监视/);
  assert.equal(socket!.closed, true);
});
// end
