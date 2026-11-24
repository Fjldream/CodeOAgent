<script setup>
import { useI18n } from 'vue-i18n';

import hotkeyArr from '@/composables/clientCompose/useHotkey.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();

defineProps({
  dialogVisible: Boolean,
});

const emit = defineEmits(['update:dialogVisible', 'confirm', 'unSaveHandle', 'saveHandle']);
const key = ref('');
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('setHotkey')"
    :width="720"
    @confirm="emit('confirm', key)"
    @update:dialog-visible="emit('update:dialogVisible')"
  >
    <el-row :gutter="20">
      <el-radio-group v-model="key" class="radio-group">
        <el-col v-for="row of hotkeyArr" :key="row" :span="6">
          <el-radio :value="row">{{ row }}</el-radio>
        </el-col>
      </el-radio-group>
    </el-row>
  </CustomDialog>
</template>

<style lang="scss" scoped>
.radio-group {
  height: 65vh;
  overflow-y: auto;
}
</style>
