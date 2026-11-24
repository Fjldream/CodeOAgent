<!-- modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对 -->
<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { assistantJson } from './api.js';
import { snapshotContext } from './editor-context.js';
import { captureReport } from './runtime-observation.js';
import { reportObservation } from './report-har.js';
const props = defineProps({ context: Object, token: Function, chatId: String });
const emit = defineEmits(['recorded']);
const pending = ref(null),
  busy = ref(false),
  status = ref(''),
  har = ref(null),
  receipt = ref(null),
  field = ref('');
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());
const token = props.token();
const call = (path, data) =>
  assistantJson(token, 'report-captures/' + path, { chatId: props.chatId, ...data }, controller.signal);
async function act(begin) {
  busy.value = true;
  try {
    if (props.token() !== token) throw Error('登录身份已变更。');
    if (begin) {
      pending.value = await call('begin', {
        context: await snapshotContext(props.context),
      });
      har.value = null;
      receipt.value = null;
      status.value = '';
    } else {
      async function load(file) {
        if (file.size > 32 * 1024 * 1024) throw Error('请导出仅包含本次请求的 HAR，最大 32 MB。');
        return JSON.parse(await file.text());
      }
      const view = await captureReport(pending.value.targets);
      const observation = reportObservation(
        await load(har.value),
        pending.value,
        view,
        field.value.trim(),
        receipt.value ? await load(receipt.value) : null,
      );
      const ticket = pending.value.ticket;
      pending.value = null;
      const result = await call('finish', { ticket, observation });
      status.value = '本次核对结果已记入本段对话。';
      emit('recorded', result.lines);
    }
  } catch (e) {
    status.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="solution-options">
    <button type="button" :disabled="busy" @click="act(true)">
      {{ pending ? '重新开始取证' : '关联报表查询' }}
    </button>
    <template v-if="pending">
      <p>
        在运行客户端清空 Network，刷新目标报表一次，将目标格滚动到可见区域。随后单击 Chrome 的「KF
        运行画面核对」，导出含页面文档和 getReportData 响应正文的 HAR。
      </p>
      <label
        >报表查询 HAR
        <input type="file" accept=".har,application/json" @change="har = $event.target.files[0]"
      /></label>
      <details>
        <summary>补充同次脚本执行回执</summary>
        <label>逐次调用标识字段 <input v-model="field" /></label>
        <label
          >脚本调用或执行回执 HAR
          <input type="file" accept=".har,application/json" @change="receipt = $event.target.files[0]"
        /></label>
      </details>
      <button type="button" :disabled="busy || !har" @click="act(false)">核对运行单元格</button>
    </template>
    <p v-if="status" role="status">{{ status }}</p>
  </div>
</template>
<!-- end -->
