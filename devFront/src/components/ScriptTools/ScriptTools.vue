<script setup>
import { useI18n } from 'vue-i18n';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';

const { t } = useI18n();

const scriptEditoringStore = useScriptEditorStore();
const { setMinimized } = scriptEditoringStore;
</script>

<template>
  <div class="minimized-float-btn">
    <div class="df">
      <el-icon>
        <IEpMemo />
      </el-icon>
      <span>{{ t('scriptEditor') }}</span>
    </div>
    <el-icon class="pointer" @click="setMinimized(false)">
      <IEpFullScreen />
    </el-icon>
  </div>
</template>

<style lang="scss" scoped>
.minimized-float-btn {
  border-top: 1px solid;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
