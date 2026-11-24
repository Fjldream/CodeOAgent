<!-- modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读 -->
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { assistantJson } from './api.js';
import { snapshotContext } from './editor-context.js';
import { observePoint } from './monitor-point.js';
import { requestObservation } from './calc-har.js';
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
const props = defineProps({ context: Object, token: Function, chatId: String, dependency: Object });
// end
const emit = defineEmits(['recorded']);
const apps = ref([]),
  appId = ref(''),
  pending = ref(null),
  busy = ref(true),
  status = ref('');
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
const connectionAlias = ref('');
const probe = ref('');
// end
const controller = new AbortController();
// end
const token = props.token();
const call = (path, data) => assistantJson(token, path, data, controller.signal);
onBeforeUnmount(() => controller.abort());
onMounted(async () => {
  try {
    const data = await call('tools/read_runtime', { context: await snapshotContext(props.context) });
    apps.value = data.apps.filter((a) => a.deployed === '已部署' && a.process === '运行中');
    if (apps.value.length === 1) appId.value = apps.value[0].appId;
    if (!apps.value.length) status.value = '当前工程没有匹配的已部署运行实例。';
  } catch (e) {
    status.value = e.message;
  } finally {
    busy.value = false;
  }
});
async function finish(ticket, observation) {
  controller.signal.throwIfAborted();
  if (props.token() !== token) throw Error('登录身份已变更，请重新打开脚本。');
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
  const result = await call(pending.value?.connection ? 'connection-captures/finish' : 'calc-captures/finish', {
// end
    ticket,
    chatId: props.chatId,
    observation,
  });
  pending.value = null;
  status.value = '回执已保存到本段对话。';
  emit('recorded', result.lines);
}
async function begin() {
  busy.value = true;
  pending.value = null;
  status.value = '';
  try {
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
    const connection = props.context.kind === 'request' && !!connectionAlias.value.trim();
    const capture = await call(connection ? 'connection-captures/begin' : 'calc-captures/begin', {
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
      ...(connection && {mode:'runtime',alias:connectionAlias.value.trim()}),
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
      ...(props.context.kind==='calculation' && {probe:probe.value.trim()}),
      ...(props.dependency && {dependency:props.dependency}),
// end
// end
// end
      context: await snapshotContext(props.context),
      chatId: props.chatId,
      appId: appId.value,
    });
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
    if (props.context.kind === 'request' || props.context.kind==='calculation') {
// end
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
      pending.value = {...capture,connection};
// end
      return;
    }
    const samples = [];
    for (const target of capture.monitors) {
      const sample = await observePoint(target.point, token, controller.signal);
      samples.push({
        ...sample,
        tag: target.point.tag,
        appId: target.point.appId,
        source: target.source,
        direction: target.direction,
      });
    }
    await finish(capture.ticket, samples);
  } catch (e) {
    status.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function importResponse(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !pending.value) return;
  busy.value = true;
  try {
    if (file.size > 16 * 1024 * 1024) throw Error('请仅导出本次测试，HAR 上限为 16 MB。');
    const observation = requestObservation(JSON.parse(await file.text()), pending.value);
    const ticket = pending.value.ticket;
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
    await finish(ticket, observation);
// end
  } catch (e) {
    status.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="solution-options">
    <label
      >目标计算 App
      <select v-model="appId" :disabled="busy" @change="pending = null">
        <option disabled value="">选择运行实例</option>
        <option v-for="app in apps" :key="app.appId" :value="app.appId">
          {{ app.name }} · {{ app.nodeId }}
        </option>
      </select>
    </label>
<!-- modified by jinlong.feng at 2026-11-23 KF计算连接双端回执 -->
<!-- modified by jinlong.feng at 2026-11-23 KF计算词典同步回读 -->
    <label v-if="context.kind==='calculation'">只读请求脚本名称<input v-model="probe" maxlength="200" @input="pending=null" /></label>
<!-- end -->
    <label v-if="context.kind==='request'">读取的工程连接别名（可选）
      <input v-model="connectionAlias" maxlength="200" @input="pending=null" />
    </label>
    <p v-if="connectionAlias">请求脚本应将实际查询的别名、KC 返回码和结果行放入 OutParam.connectionRead 的 alias、code、rows 字段。</p>
    <button type="button" :disabled="busy || !appId || !chatId" @click="begin">
<!-- end -->
      {{ context.kind === 'period' ? '采集输入与写回点' : pending ? '重新开始取证' : '关联一次请求回包' }}
    </button>
    <template v-if="pending">
      <p>
        打开调用端浏览器的 Network 并清空记录。通过正常业务入口调用一次目标脚本，导出含响应正文的
        HAR，在十分钟内选择文件。
      </p>
      <label
        >本次调用的 HAR
        <input type="file" accept=".har,application/json" :disabled="busy" @change="importResponse"
      /></label>
    </template>
    <p v-if="status" role="status">{{ status }}</p>
  </div>
</template>
<!-- end -->
