<!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
<script setup>
import { ChatLineRound, Clock, EditPen, FolderOpened, Plus, ArrowRight, Fold } from '@element-plus/icons-vue';
defineProps({ plans: Array, planId: String, chatId: String, busy: Boolean });
const emit = defineEmits(['choose', 'create', 'history', 'collapse']);
</script>
<template>
  <aside class="session-sidebar" aria-label="会话栏">
    <button
      type="button"
      class="new-thread"
      :disabled="busy"
      @click="emit('create', planId ? 'chat' : 'plan')"
    >
      <EditPen />新建对话
    </button>
    <div class="sidebar-heading">
      <span>个人方案</span
      ><button
        type="button"
        title="新建方案"
        aria-label="新建个人方案"
        :disabled="busy"
        @click="emit('create', 'plan')"
      >
        <Plus />
      </button>
    </div>
    <nav class="session-list" aria-label="个人方案和对话">
      <details v-for="plan in plans" :key="plan.id" :open="plan.id === planId">
        <summary :title="plan.title">
          <ArrowRight class="chevron" /><FolderOpened /><span>{{ plan.title }}</span>
        </summary>
        <button
          v-for="chat in plan.chats"
          :key="chat.id"
          type="button"
          class="session-row"
          :aria-current="chat.id === chatId ? 'page' : undefined"
          :title="chat.title"
          @click="emit('choose', plan.id, chat.id)"
        >
          <ChatLineRound /><span>{{ chat.title }}</span>
        </button>
      </details>
    </nav>
    <div class="sidebar-foot">
      <button type="button" @click="emit('history')"><Clock />历史</button
      ><button type="button" aria-label="收起会话栏" title="收起会话栏" @click="emit('collapse')">
        <Fold />
      </button>
    </div>
  </aside>
</template>
<style scoped>
.session-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: clamp(152px, 17%, 202px);
  flex: none;
  min-height: 0;
  padding: 13px 10px 8px;
  border-right: 1px solid #d5dff0;
  background: #eff3fd;
  color: #253653;
  font-size: 13px;
}
.session-sidebar button,
summary {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 7px;
  min-width: 0;
  min-height: 28px;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  font: inherit;
}
.session-sidebar svg {
  flex: none;
  width: 14px;
  height: 14px;
}
.session-sidebar .new-thread {
  justify-content: center;
  background: #fff;
  border: 1px solid #cfdaf0;
  font-weight: 600;
  padding: 7px;
}
.sidebar-heading,
.sidebar-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar-heading {
  padding-left: 6px;
  color: #52617c;
  font-size: 12px;
}
.session-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}
.session-list details {
  margin: 0 0 5px;
}
summary {
  list-style: none;
  font-weight: 600;
}
summary::-webkit-details-marker {
  display: none;
}
summary .chevron {
  width: 9px;
}
details[open] > summary .chevron {
  transform: rotate(90deg);
}
.session-row {
  width: calc(100% - 11px);
  margin: 2px 0 2px 11px;
  justify-content: flex-start;
  text-align: left;
}
.session-list span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-sidebar button:hover:enabled,
summary:hover {
  background: #e2eafa;
}
.session-sidebar .session-row[aria-current] {
  background: #d8e5ff;
  color: #1747ba;
  font-weight: 600;
}
.sidebar-foot {
  color: #526689;
}
@container assistant (max-width: 639px) {
  .session-sidebar {
    position: absolute;
    z-index: 2;
    inset: 0 auto 0 0;
    width: min(225px, 78%);
    box-shadow: 8px 0 20px #1833641c;
  }
}
</style>
<!-- end -->
