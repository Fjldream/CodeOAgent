<script setup>
import { useI18n } from 'vue-i18n';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: () => true,
});
const emit = defineEmits(['confirm']);
// 表单控件

const emitConfirm = () => {
  emit('confirm');
};
const handleCancle = () => {
  dialogVisible.value = false;
};
const tips = reactive({
  appReleaseTips1: t('appReleaseTips1'),
  appReleaseTips2: t('appReleaseTips2'),
});
</script>
<template>
  <CustomDialog v-model:dialogVisible="dialogVisible" :width="420" :footerVisible="false">
    <el-row>
      <el-col :span="24">
        <el-input v-model="tips.appReleaseTips1" :rows="4" type="textarea" readonly />
      </el-col>
      <el-col :span="24">
        <el-text type="primary">{{ tips.appReleaseTips2 }}</el-text>
      </el-col>
    </el-row>
    <div class="client-button-list">
      <el-button type="primary" @click="emitConfirm">
        {{ t('continueRelease') }}
      </el-button>
      <el-button @click="handleCancle">
        {{ t('cancle') }}
      </el-button>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.client-button-list {
  display: flex;
  flex-direction: row-reverse;
  margin-top: 10px;
  gap: 0; // 按钮之间的间距
  .el-button {
    border-radius: 4px;
    margin-left: 12px;
  }
}
</style>
