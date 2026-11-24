<template>
  <!-- modified by  jinlong.feng at 1119 修复导入编码弹窗 -->
  <el-dialog
    :model-value="modelValue"
    title="导入文件"
    width="min(460px, calc(100vw - 32px))"
    class="import-encoding-dialog"
    align-center
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="handleVisibilityChange"
  >
    <ElForm label-position="left" label-width="80px" @submit.prevent>
      <ElFormItem label="文件编码">
        <ElSelect
          v-model="selectedEncoding"
          class="import-encoding-dialog__select"
          style="width: 100%"
          :disabled="disabled"
          aria-label="文件编码"
        >
          <ElOption v-for="option in encodingOptions" :key="option.value" :label="option.label" :value="option.value" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="import-encoding-dialog__footer">
        <ElButton @click="handleCancel">取消</ElButton>
        <ElButton type="primary" :icon="Folder" :disabled="disabled" @click="handleChooseFile"
          >选择文件</ElButton
        >
      </div>
    </template>
  </el-dialog>
  <!-- end -->
</template>
<script setup>
// modified by  jinlong.feng at 1119 修复导入编码弹窗
import { Folder } from '@element-plus/icons-vue';
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  defaultEncoding: {
    type: String,
    default: 'utf-8',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(['update:modelValue', 'select-file', 'cancel']);
const selectedEncoding = ref('utf-8');
const encodingOptions = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB18030', value: 'gb18030' },
];
watch(() => props.modelValue, handleOpen, { immediate: true });
function handleOpen(visible) {
  if (!visible) return;
  selectedEncoding.value = encodingOptions.some((option) => option.value === props.defaultEncoding)
    ? props.defaultEncoding
    : 'auto';
}
function handleChooseFile() {
  if (!props.modelValue || props.disabled) {
    return;
  }
  emit('update:modelValue', false);
  emit('select-file', selectedEncoding.value);
}
function handleCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
function handleVisibilityChange(visible) {
  if (!visible && props.modelValue) {
    handleCancel();
  }
}
// end
</script>
<style lang="scss" scoped>
:deep(.el-form-item) {
  margin-bottom: 0px;
}

.import-encoding-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.import-encoding-dialog__footer :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
