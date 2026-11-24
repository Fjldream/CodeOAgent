// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
export function observePoint(target, token, signal) {
  signal.throwIfAborted();
  const url = new URL('/ws', location.origin);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let subscribed = false,
      completed = false;
    const timeout = setTimeout(() => finish(new Error('监视超时，本次未取得带时间和质量的点值。')), 10000);
    function finish(error, sample) {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      socket.onmessage = socket.onopen = socket.onclose = socket.onerror = null;
      socket.close();
      if (error) reject(error);
      else resolve(sample);
    }
    function cancel() {
      finish(new Error('已结束本次监视。'));
    }
    function send(operation, msg) {
      if (socket.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({
            accessToken: token,
            projectId: target.projectId,
            type: 'collect_variable_monitor',
            from: 'ops',
            operation,
            msg,
          }),
        );
    }
    signal.addEventListener('abort', cancel, { once: true });
    socket.onopen = () => {
      send('connect_monitor', {
        ip: target.ip,
        port: target.port,
        appName: target.appName,
        osType: target.osType,
      });
    };
    socket.onerror = socket.onclose = () => finish(new Error('监视连接已关闭，本次没有有效回执。'));
    socket.onmessage = ({ data }) => {
      let frame;
      try {
        frame = JSON.parse(data);
      } catch {
        return;
      }
      if (
        frame?.type === 'collect_variable_monitor' &&
        frame.operation === 'connect_monitor' &&
        !subscribed
      ) {
        if (frame.errorCode !== 0) return finish(new Error('目标实例未确认监视连接。'));
        subscribed = true;
        send('update_variables', { variables: [target.tag] });
        return;
      }
      if (
        !subscribed ||
        frame?.type !== 'collect_variable_monitor' ||
        frame.operation !== 'realtime_monitor' ||
        !Array.isArray(frame.data)
      )
        return;
      const row = frame.data.find((item) => item?.tagName === target.tag);
      if (
        !row ||
        row.tagValue == null ||
        row.quality == null ||
        !row.timeStamp ||
        [row.tagValue, row.quality, row.timeStamp].includes('--')
      )
        return;
      finish(null, {
        value: row.tagValue,
        quality: row.quality,
        time: row.timeStamp,
        at: new Date().toISOString(),
      });
    };
  });
}
// end

// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
export function identifyMonitorSample(target, sample) {
  const { projectId, appId, nodeId, tag } = target;
  return { ...sample, point: { projectId, appId, nodeId, tag } };
}
// end
