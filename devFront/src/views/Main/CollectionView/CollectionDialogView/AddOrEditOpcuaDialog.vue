<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { uaConenctTestServer } from '@/api/allRequest/collectionAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});
//通用正则
const formRules = reactive({
  opcServerName: [regexValidator('notEmpty', t('rule1Message'))],
  url: [regexValidator('notEmpty', t('rule1Message'))],
  username: [regexValidator('', t('rule1Message'), false)],
  password: [regexValidator('', t('rule1Message'), false)],
  recoverTime: [regexValidator('number', t('numbersTips'))],
  reconnectTime: [regexValidator('number', t('numbersTips'))],
  collectInterval: [regexValidator('number', t('numbersTips'))],
  triggerType: [regexValidator('notEmpty', t('rule1Message'))],
});
const options = reactive({
  TriggerType: [
    {
      id: 0,
      text: 'Satus',
    },
    {
      id: 1,
      text: 'Status/Value',
    },
    {
      id: 2,
      text: 'Status/Value/Timestamp',
    },
  ],
});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  opcServerName: '',
  url: '',
  username: '',
  password: '',
  recoverTime: 24,
  reconnectTime: 60,
  collectInterval: 1000,
  triggerType: 0, // 0|1|2 Satus|Status/Value|Status/Value/Timestamp
  lifetimeCount: 1800, // 生命周期计数
  maxKeepAliveCount: 5, // 最大保持活跃数
  maxNotificationsPerPublish: 65535, //每次发布的最大数
  publishingEnabled: 1, // 发布使能
  publishPriority: 0, // 订阅优先级
  securityModeType: 1, //
  messageSecurityModeType: 1,
  authenticationType: 0,
  sessionTimeOut: 1200, // 会话超时时间
  browseMaxNum: 1024, // OPCUA 中用作每次浏览的最大数目
  addTagtoSubNum: 5000, // OPCUA 中用作每次添加到订阅的变量数
  regMaxNum: 500, // OPCUA 中用作每次读请求最大数目
  deadType: 0,
  deadValue: 0.1,
  publishInterval: '', // 发布间隔
};

const form = reactive({ ...defaultForm, ...props.rowData });
const emit = defineEmits(['update:dialogVisible', 'confirm']);
const emitConfirm = () => {
  try {
    formRef.value.validate((valid, errorFields) => {
      if (valid) {
        emit('confirm', form);
      }
    });
  } catch (error) {}
};
const connectionTest = () => {
  try {
    formRef.value.validate(async (valid) => {
      if (valid) {
        const restful = await uaConenctTestServer(form);
        if (restful?.errorCode === 0) {
          ElMessage.success(t('testConnectSuccess'));
        }
      }
    });
  } catch (error) {}
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editOPCUA') : t('createOPCUA')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('opcServerName')" prop="opcServerName">
            <el-input v-model="form.opcServerName" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('serverUrl')" prop="url">
            <el-input v-model="form.url" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('userNameA')" prop="username">
            <el-input v-model="form.username" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('password')" prop="password">
            <el-input v-model="form.password" show-password />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('reconnectIntervalS')" prop="reconnectTime">
            <el-input v-model.number="form.reconnectTime" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('maxReconnect')" prop="recoverTime">
            <el-input v-model.number="form.recoverTime" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('samplingIntervalMs')" prop="collectInterval">
            <el-input v-model.number="form.collectInterval" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('triggerType')" prop="triggerType">
            <el-select v-model="form.triggerType">
              <el-option v-for="row of options.TriggerType" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item>
        <div class="text-right">
          <el-button type="text" @click="connectionTest">
            {{ t('connectTest') }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
