<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { scriptDebuggerServer } from '@/api/allRequest/calculationAPI.js';
import { regexValidator } from '@/utils/regexRules';
import { setCookie, getCookie, isObjectString } from '@/utils/commonUtils';

import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: false,
});
const debugDialogVisible = ref(false);
const debugConfigFormRef = useTemplateRef('debugConfigFormRef');
const debugConfigForm = reactive({
  projectPort: null,
  debugPort: null,
});
const debugConfigFormRules = reactive({
  projectPort: [
    regexValidator('port', t('datasourceRuleTip5')),
    {
      validator: (rule, value, callback) => {
        if (debugConfigForm.projectPort === debugConfigForm.debugPort) {
          callback(t('portRepet'));
        } else {
          callback();
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
  debugPort: [
    regexValidator('port', t('datasourceRuleTip5')),
    {
      validator: (rule, value, callback) => {
        if (debugConfigForm.projectPort === debugConfigForm.debugPort) {
          callback(t('portRepet'));
        } else {
          callback();
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
});

const emits = defineEmits(['confirm']);

const devtoolString = ref('');
const isLoading = ref(false);

onMounted(() => {
  const cookieJson = getCookie('debugConfigForm');
  if (isObjectString(cookieJson)) {
    const cookieData = JSON.parse(cookieJson);
    debugConfigForm.projectPort = cookieData.projectPort;
    debugConfigForm.debugPort = cookieData.debugPort;
  }
});

const copyToClipboard = async (event) => {
  try {
    const text = event.target.innerText;
    await navigator.clipboard.writeText(text);
    ElMessage.success(t('copySuccess'));
  } catch (error) {
    ElMessage.error(t('copyError'));
  }
};

/**
 * @function handleDebugScript
 * @description 调试事件
 * @returns null
 */
const handleDebugScript = async () => {
  isLoading.value = true;
  let result = '';

  if (!debugConfigFormRef) {
    return;
  }
  await debugConfigFormRef.value.validate(async (valid) => {
    try {
      if (valid) {
        const {
          data,
          data: { chromeAddress },
        } = await scriptDebuggerServer(true, debugConfigForm);
        result = data;
        if (!chromeAddress) {
          ElMessage.warning(result);
          return result;
        }
        devtoolString.value = chromeAddress.slice(7);
        debugDialogVisible.value = true;
        // 将端口存储在cookie中,30天后过期
        setCookie('debugConfigForm', JSON.stringify(debugConfigForm), 30);
      }
    } catch (e) {
      ElMessage.error(result);
    }
  });
  isLoading.value = false;
};
/**
 * @function handleDebugScript
 * @description 调试事件
 * @returns null
 */
const handleDebugScriptExist = async () => {
  await scriptDebuggerServer(false);
  dialogVisible.value = false;
  debugDialogVisible.value = false;
};
</script>

<template>
  <LoadingComponent v-if="isLoading" :loading="isLoading" :loading-text="t('plsWaitDebugServerStarting')" />
  <CustomDialog
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :title="t('debugConfig')"
    :width="550"
    @confirm="handleDebugScript"
  >
    <el-form ref="debugConfigFormRef" :model="debugConfigForm" :rules="debugConfigFormRules" class="debug-config-form">
      <el-form-item :label="t('projectPort')" prop="projectPort">
        <el-row style="width: 100%">
          <el-col :span="10">
            <el-input v-model="debugConfigForm.projectPort" type="number" :controls="false"></el-input>
          </el-col>
          <el-col :span="14">{{ t('projectPortTip') }} </el-col>
        </el-row>
      </el-form-item>
      <el-form-item :label="t('debugPort')" prop="debugPort">
        <el-row style="width: 100%">
          <el-col :span="10">
            <el-input v-model="debugConfigForm.debugPort" type="number" :controls="false"></el-input>
          </el-col>
          <el-col :span="14">{{ t('debugPortTip') }}</el-col>
        </el-row>
      </el-form-item>
    </el-form>
  </CustomDialog>
  <el-dialog
    v-if="debugDialogVisible"
    :append-to-body="true"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    v-model:model-value="debugDialogVisible"
    :title="t('debugHelp')"
    :width="720"
    align-center
    class="custom-debugging"
    @close="handleDebugScriptExist"
  >
    <span class="debugging-prompt">
      {{ t('debugTip') }}
    </span>
    <el-steps :active="3" direction="vertical">
      <el-step>
        <template #title>
          <span class="debugging-title">{{ t('visitAddress') }}</span>
          <span class="debugging-link" @click="copyToClipboard($event)">chrome://inspect</span>
        </template>
        <template #description>
          <div class="debugging-step-content">
            <svg aria-hidden="true" class="debugging-svg-3">
              <use xlink:href="#icon-debugging1" />
            </svg>
          </div>
        </template>
      </el-step>
      <el-step>
        <template #title>
          <span class="debugging-title">
            {{ t('debugTipA') }}
          </span>
        </template>
        <template #description>
          <div class="debugging-step-content">
            <svg aria-hidden="true" class="debugging-svg-18">
              <use :xlink:href="`#icon-debugging2`" />
            </svg>
          </div>
        </template>
      </el-step>
      <el-step>
        <template #title>
          <span class="debugging-title">{{ t('debugTipB') }}</span>
          <span class="debugging-link" @click="copyToClipboard($event)">{{ devtoolString }}</span>
        </template>
        <template #description>
          <div class="debugging-step-content">
            <svg aria-hidden="true" class="debugging-svg-3">
              <use xlink:href="#icon-debugging3" />
            </svg>
          </div>
        </template>
      </el-step>
    </el-steps>
    <span class="debugging-prompt">
      {{ t('debugTipC') }}
    </span>
    <template #footer>
      <el-button type="primary" @click="handleDebugScriptExist">{{ t('logoutDebug') }}</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.custom-debugging {
  padding: 20px;

  .el-dialog__body {
    flex: 1;
    overflow: hidden;
    padding: 0 20px;

    .el-steps--vertical {
      margin: 1em 0;
    }

    .debugging-prompt {
      font-size: 14px;
      color: #000;
    }

    .debugging-step-content {
      margin-bottom: 1em;
      display: flex;
      align-items: center;
      gap: 0.5em;
      flex-wrap: wrap;
    }

    .debugging-title {
      font-size: 13px;
      min-height: 32px;
      color: #000;
    }

    .debugging-link {
      color: #409eff;
      cursor: pointer;
      font-size: 13px;
      word-break: break-word;
    }

    .el-button {
      font-size: 13px;
      width: 60px;
      height: 25px;
      border-radius: 25px;
    }

    .debugging-svg-3 {
      height: 3em;
    }

    .debugging-svg-18 {
      height: 18em;
      width: 30em;
    }
  }

  .el-dialog__footer {
    padding-top: 35px;

    .el-button {
      font-size: 14px;
      width: 78px;
      height: 34px;
    }

    .el-button--primary {
      margin-left: 15px;
    }
  }

  .el-dialog__title {
    font-size: 16px;
    font-weight: bold;
  }
}
.debug-config-form {
  padding: 12px;
}
</style>
