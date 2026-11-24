<script setup>
import { getNowStr } from '@/utils/dayjsUtil';
import { getGuid } from '@/utils/commonUtils';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { regexValidator } from '@/utils/regexRules';
import { installDependanceServer } from '@/api/allRequest/calculationAPI';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 安装中标志位
const installInProcess = ref(false);
const formRef = ref(null);
// 表单控件
const formRules = ref({
  name: [regexValidator('notEmpty', t('plsInputSuccessNPMname'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});
const form = ref({
  id: `request_${getGuid()}`,
  type: 'system',
  name: '',
  description: '',
  createAt: '',
  modifiedAt: '',
  dialogType: 'install',
});
const outputLines = ref([]);
const currentLine = ref('......');
const loadingDots = ref('');
let loadingTimer = null;
let dotCount = 0;
onUnmounted(() => {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
});
const emitConfirm = () => {
  try {
    formRef.value.validate(async (valid, errorFields) => {
      if (valid) {
        currentLine.value = 'Installing packages';
        loadingTimer = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          loadingDots.value = '.'.repeat(dotCount);
        }, 500);
        installInProcess.value = true;
        const result = await installDependanceServer(form.value.name, form.value.description);
        installInProcess.value = false;
        clearInterval(loadingTimer);
        form.value.createAt = getNowStr();
        form.value.modifiedAt = getNowStr();
        if (result.errorCode === 0) {
          if (result.data.code) {
            // install success
            outputLines.value.push(result.data.msg);
            outputLines.value.push(`√ Install ${form.value.name} success.`);
            outputLines.value.push(`√ All packages install.`);
            ElMessage.success('installSuccess');
            setTimeout(() => {
              emit('confirm', form.value);
            }, 2000);
          } else {
            // install failed
            outputLines.value.push(result.data.msg);
            outputLines.value.push(`× Install ${form.value.name} Failed.`);
          }
        }
      }
    });
  } catch (error) {}
};
const handleDialogVisible = ($event) => {
  if (installInProcess.value) {
    ElMessage.warning(t('installInProcess'));
  } else {
    emit('update:dialogVisible', $event);
  }
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :footerVisible="false"
    :title="t('npmInstall')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="handleDialogVisible($event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <div class="npm-notes">{{ t('npmInstallTip') }}</div>
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" :rows="3" type="textarea" />
      </el-form-item>
      <el-form-item :label="' '">
        <el-button type="primary" @click="emitConfirm">{{ t('download') }}</el-button>
      </el-form-item>
      <el-card class="terminal-card" shadow="hover">
        <el-scrollbar height="300px">
          <div class="terminal-output">
            <div v-for="(line, index) in outputLines" :key="index">{{ line }}</div>
            <div v-if="!outputLines.length && !currentLine">{{ t('waiting') }}</div>
            <div v-if="currentLine && outputLines.length === 0">{{ currentLine }}{{ loadingDots }}</div>
          </div>
        </el-scrollbar>
      </el-card>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.npm-notes {
  margin-bottom: 15px;
  font-size: 14px;
}

.terminal-card {
  background-color: #2d2d2d;
  color: #fff;
  font-family: monospace;
  padding: 10px;
  border-radius: 6px;
}

.terminal-output {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  padding: 5px;
}
</style>
