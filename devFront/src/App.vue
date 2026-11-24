<script setup>
import { getCurrentInstance } from 'vue';
import { useLangStore } from '@/stores/langStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';

import ScriptEditorDialog from '@/components/ScriptEditorDialog/ScriptEditorDialog.vue';

// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { assistantEnabled } from '@/assistant/api.js';
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import { assistantState, useAssistantContext } from '@/assistant/entry.js';
// end
import AssistantPanel from '@/assistant/AssistantPanel.vue';
const assistantUser=useLoginUserStore();
const assistantContext=useAssistantContext();
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
watch(
  [() => assistantUser.userInfo?.tenantId, () => assistantUser.userInfo?.userId],
  () => { assistantState.value = 'closed'; },
);
// end
// end
const langStore = useLangStore();

const scriptEditoringStore = useScriptEditorStore();

const { proxy } = getCurrentInstance();
addEventListener('beforeunload', () => {
  const entries = performance.getEntriesByType('navigation');
  if (entries?.length) {
    const navEntry = entries[0];
    if (navEntry.type !== 'reload') {
      proxy.$crossTab.postMessage({ key: 'client_close' });
    }
  }
});
</script>

<template>
  <el-config-provider :locale="langStore.elementLocale">
    <router-view />
  </el-config-provider>
<!-- modified by jinlong.feng at 2026-11-20 KF开发助手M1 -->
<!-- modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗 -->
  <AssistantPanel
    v-if="assistantEnabled && assistantState !== 'closed' && assistantUser.accessToken"
    :key="String(assistantUser.userInfo.tenantId)+'/'+assistantUser.userInfo.userId"
    :token="()=>assistantUser.accessToken"
    :context="assistantContext"
    :minimized="assistantState === 'minimized'"
    @minimize="assistantState = 'minimized'"
    @restore="assistantState = 'open'"
    @close="assistantState = 'closed'"
  />
<!-- end -->
<!-- end -->
  <ScriptEditorDialog v-if="scriptEditoringStore.editorVisible" />
</template>
