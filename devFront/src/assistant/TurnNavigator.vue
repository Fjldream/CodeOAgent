<!-- modified by jinlong.feng at 2026-11-23 KF对话轮次导航 -->
<script setup>
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  turns: { type: Array, required: true },
  scroller: Object,
});
const emit = defineEmits(["navigate"]);
const entries = computed(() =>
  props.turns.filter((turn) => turn.question && turn.status !== "hidden"),
);
const nav = ref(null),
  marks = ref(null),
  active = ref(""),
  preview = ref(null);
let offsets = [],
  frame = 0;

function measure() {
  const box = props.scroller;
  if (!box) return;
  const origin = box.getBoundingClientRect().top - box.scrollTop;
  const ids = new Set(entries.value.map((turn) => turn.id));
  offsets = Array.from(box.querySelectorAll("article[data-turn-id]"), (el) => ({
    id: el.dataset.turnId,
    top: el.getBoundingClientRect().top - origin,
  })).filter((row) => ids.has(row.id));
  update();
}
function update() {
  const box = props.scroller;
  if (!box || !offsets.length) return;
  let index = offsets.length - 1;
  if (box.scrollHeight - box.clientHeight - box.scrollTop > 2) {
    while (index > 0 && offsets[index].top > box.scrollTop + 24) index--;
  }
  const id = offsets[index].id;
  if (active.value === id) return;
  active.value = id;
  const rail = marks.value,
    mark = rail?.querySelector('[data-mark="' + CSS.escape(id) + '"]');
  if (rail && mark && !rail.matches(":hover, :focus-within")) {
    const delta =
      mark.getBoundingClientRect().top - rail.getBoundingClientRect().top;
    if (delta < 0 || delta + mark.clientHeight > rail.clientHeight)
      rail.scrollTop += delta - rail.clientHeight / 2;
  }
}
function queueMeasure() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}
watch(
  [() => props.scroller, () => entries.value.map((turn) => turn.id).join("|")],
  async ([box], _, cleanup) => {
    preview.value = null;
    if (!box) return;
    const resize = new ResizeObserver(queueMeasure);
    cleanup(() => {
      resize.disconnect();
      box.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
      frame = 0;
    });
    resize.observe(box);
    box
      .querySelectorAll("article[data-turn-id]")
      .forEach((el) => resize.observe(el));
    box.addEventListener("scroll", update, { passive: true });
    await nextTick();
    queueMeasure();
  },
  { immediate: true, flush: "post" },
);

function show(button, index) {
  const outer = nav.value.getBoundingClientRect(),
    rect = button.getBoundingClientRect();
  preview.value = {
    index,
    top: Math.max(
      2,
      Math.min(outer.height - 56, rect.top - outer.top + rect.height / 2 - 18),
    ),
  };
}
function jump(index) {
  const row = offsets.find((v) => v.id === entries.value[index]?.id);
  if (!row || !props.scroller) return;
  emit("navigate");
  props.scroller.scrollTop = row.top - 12;
  update();
  preview.value = null;
}
function move(event, index) {
  if (event.key === "Escape") {
    preview.value = null;
    return;
  }
  const next = {
    ArrowDown: index + 1,
    ArrowUp: index - 1,
    Home: 0,
    End: entries.value.length - 1,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  const target = Math.min(Math.max(next, 0), entries.value.length - 1);
  marks.value.children[target]?.focus();
  jump(target);
}
</script>
<template>
  <nav
    v-if="entries.length > 1"
    ref="nav"
    class="turn-nav"
    aria-label="对话轮次导航"
    @pointerleave="preview = null"
  >
    <div ref="marks" class="marks" @scroll="preview = null">
      <button
        v-for="(turn, i) in entries"
        :key="turn.id"
        type="button"
        :data-mark="turn.id"
        :aria-current="active === turn.id ? 'location' : undefined"
        :tabindex="(active ? active === turn.id : i === 0) ? 0 : -1"
        :aria-label="'第 ' + (i + 1) + ' 轮：' + turn.question.slice(0, 90)"
        @pointerenter="show($event.currentTarget, i)"
        @focus="show($event.currentTarget, i)"
        @blur="preview = null"
        @keydown="move($event, i)"
        @click="jump(i)"
      >
        <span />
      </button>
    </div>
    <div
      v-if="preview && entries[preview.index]"
      class="turn-preview"
      :style="{ top: preview.top + 'px' }"
      aria-hidden="true"
    >
      <small>第 {{ preview.index + 1 }} 轮</small>
      <div>{{ entries[preview.index].question }}</div>
    </div>
  </nav>
</template>
<style scoped>
.turn-nav {
  position: relative;
  display: flex;
  align-items: center;
  flex: none;
  width: 22px;
  min-height: 0;
  margin-inline-start: 4px;
  z-index: 1;
}
.marks {
  /* modified by jinlong.feng at 2026-11-23 KF计算需求变更 */
  display: flex;
  flex-direction: column;
  /* end */
  /* modified by jinlong.feng at 2026-11-24 KF轮次刻度十轮居中 */
  --turn-step: 6px;
  /* modified by jinlong.feng at 2026-11-24 KF三十轮刻度与选中加长 */
  max-height: min(calc(30 * var(--turn-step)), calc(100% - 20px));
  /* end */
  scroll-snap-type: y mandatory;
  /* end */
  width: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.marks::-webkit-scrollbar {
  display: none;
}
/* modified by jinlong.feng at 2026-11-24 KF对话轮次紧凑刻度 */
.marks button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  /* modified by jinlong.feng at 2026-11-24 KF轮次刻度十轮居中 */
  flex: 0 0 var(--turn-step);
  height: var(--turn-step);
  scroll-snap-align: start;
  /* end */
  min-height: 0;
  padding: 0 0 0 5px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.marks button span {
  width: 6px;
  height: 2px;
  border-radius: 2px;
  background: #adb9c7;
}
.marks button[aria-current] span {
  /* modified by jinlong.feng at 2026-11-24 KF三十轮刻度与选中加长 */
  width: 12px;
  /* end */
  background: #2a61af;
}
.marks button:is(:hover, :focus-visible) span {
  background: #254777;
}
/* end */
button:focus-visible {
  outline: 1px solid #487bc3;
  outline-offset: -1px;
}
.turn-preview {
  position: absolute;
  left: 100%;
  width: max-content;
  max-width: min(260px, 55cqw);
  background: #fff;
  color: #24334c;
  border: 1px solid #dce3ed;
  box-shadow: 0 3px 12px #213b6024;
  border-radius: 6px;
  padding: 6px 9px;
  pointer-events: none;
  line-height: 1.45;
  font-size: 12px;
}
.turn-preview small {
  color: #596b80;
  font-size: 11px;
}
.turn-preview div {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
</style>
<!-- end -->
