class CrossTab {
  constructor(channelName = 'app_channel') {
    this.channel = new BroadcastChannel(channelName);
    this.listeners = [];
    this.channel.onmessage = (e) => this._notify(e.data);
  }

  // 发送消息
  postMessage(message) {
    this.channel.postMessage(message);
  }

  // 订阅消息
  onMessage(callBack) {
    this.listeners.push(callBack);
  }

  // 通知所有订阅者
  _notify(data) {
    this.listeners.forEach((cb) => cb(data));
  }

  // 关闭通道
  close() {
    this.channel.close();
    this.listeners = [];
  }
}

export default CrossTab;
