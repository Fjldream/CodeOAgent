<!-- modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读 -->
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { assistantJson } from './api.js';
import { snapshotContext } from './editor-context.js';
import { observePoint, identifyMonitorSample } from './monitor-point.js';
import { captureScene } from './runtime-observation.js';
const props = defineProps({
  context: Object,
  chatId: String,
  token: Function,
  choices: Array,
});
const emit = defineEmits(['recorded']);
const chosen = ref(''),
  pending = ref(null),
  busy = ref(false),
  status = ref('');
const controller = new AbortController(),
  token = props.token();
onBeforeUnmount(() => controller.abort());
watch(
  () => props.choices,
  (choices) => {
    if (!choices?.some((c) => c.id === chosen.value))
      chosen.value = choices?.length === 1 ? choices[0].id : '';
  },
  { immediate: true },
);
watch(chosen, () => {
  pending.value = null;
  status.value = '';
});
async function sample() {
  busy.value = true;
  try {
    if (token !== props.token()) throw Error('登录身份已变更。');
    const call = (path, args) =>
      assistantJson(token, 'scene-captures/' + path, { chatId: props.chatId, ...args }, controller.signal);
    const stage =
      pending.value ||
      (await call('begin', {
        binding: chosen.value,
        context: await snapshotContext(props.context),
      }));
    const monitor = async () =>
      identifyMonitorSample(stage.point, await observePoint(stage.point, token, controller.signal));
    const before = await monitor(),
      view = await captureScene(stage.targets),
      after = await monitor();
    const result = await call('sample', {
      ticket: stage.ticket,
      observation: { before, view, after },
    });
    if (result.ticket) {
      pending.value = { ...stage, ticket: result.ticket };
      status.value = '第一次观察已取得。保持当前相机和视口，待点值变化并稳定后再次观察。';
    } else {
      pending.value = null;
      status.value = result.matched ? '已验证两次画面变化。' : '核对完成，存在差异。';
      emit('recorded', result.lines);
    }
  } catch (e) {
    pending.value = null;
    status.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div v-if="choices?.length" class="solution-options">
    <label
      >页面、布局和属性
      <select v-model="chosen" :disabled="busy || !!pending">
        <option disabled value="">选择已保存的绑定</option>
        <option v-for="c in choices" :key="c.id" :value="c.id">
          {{ c.label }}
        </option>
      </select>
    </label>
    <!-- modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对 -->
    <p>在运行客户端显示部件，单击 Chrome 的「KF 运行画面核对」关联标签。核对旋转时让轮廓清晰可见，核对颜色时让部件中心无遮挡。两次观察保持镜头与照明一致。</p>
    <!-- end -->
    <!-- modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对 -->
    <p v-if="choices?.some(c => c.id === chosen && /自旋转|可见性闪烁/.test(c.label))">记录时会切到已关联的运行标签数秒。保持镜头和点值稳定，待自动返回后再切换启停档。</p>
    <!-- end -->
    <button type="button" :disabled="busy || !chosen" @click="sample">
      {{ busy ? '观察中…' : pending ? '记录第二次画面' : '记录第一次画面' }}
    </button>
    <button
      v-if="pending"
      :disabled="busy"
      type="button"
      @click="
        pending = null;
        status = '';
      "
    >
      重新开始
    </button>
    <p v-if="status" role="status">{{ status }}</p>
  </div>
</template>
<!-- end -->
