<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { ElMessage } from 'element-plus';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();
const currentProjectOsType = ref(collectionMenuStore.currentCollectionEngineer.osType);
//通用正则
const formRules = reactive({
  transType: [regexValidator('notEmpty', t('rule1Message'))],
  Provider: [regexValidator('notEmpty', t('rule1Message'))],
  ConnectMode: [regexValidator('notEmpty', t('rule1Message'))],
  BrokerAddr: [regexValidator('notEmpty', t('rule1Message'))],
  KeepAlive: [regexValidator('number', t('numbersTips'))],
  ReConnect: [regexValidator('number', t('numbersTips'))],
  Qos: [regexValidator('notEmpty', t('rule1Message'))],
  Username: [regexValidator('notEmpty', t('rule1Message'), false)],
  PassWord: [regexValidator('notEmpty', t('rule1Message'), false)],
  UsernameOfW: [regexValidator('notEmpty', t('rule1Message'), false)],
  PassWordOfW: [regexValidator('notEmpty', t('rule1Message'), false)],
});
const options = reactive({
  TransType: [
    {
      id: 5,
      text: 'WellinTech-MQTT',
    },
    {
      id: 2,
      text: t('amazon'),
    },
    {
      id: 0,
      text: 'DataCenter',
    },
  ],
  ConnectMode: [
    {
      id: 0,
      text: t('anonymousNoEncryption'),
    },
    {
      id: 1,
      text: t('anonymousEncryption'),
    },
    {
      id: 2,
      text: t('nonAnonymousNoEncryption'),
    },
    {
      id: 3,
      text: t('nonAnonymousEncryption'),
    },
  ],
  Qos: [
    {
      id: 0,
      text: 0,
    },
    {
      id: 1,
      text: 1,
    },
    {
      id: 2,
      text: 2,
    },
  ],
  ForwardingType: [
    {
      id: 0,
      text: t('notForward'),
      selected: true,
      value: 0,
    },
    {
      id: 1,
      text: t('changeForward'),
      value: 1,
    },
    {
      id: 2,
      text: t('collectForward'),
      value: 2,
    },
    {
      id: 3,
      text: t('interForward'),
      value: 3,
    },
  ],
});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  transType: 5,
  Provider: '', // 提供商
  ConnectMode: 0, // 连接模式 0 匿名无加密|1 匿名加密|2 非匿名无加密|3 非匿名加密
  BrokerAddr: '', // 转发地址
  KeepAlive: 60, // 心跳间隔(s)
  ReConnect: 30, // 重连间隔(s)
  Qos: 0, // 服务质量
  Username: '',
  PassWord: '',
  UsernameOfW: '', // 数据下设用户名
  PassWordOfW: '', // 数据下设密码
  PUBScanPeriod: 1000, // 周期发布间隔(ms)
  MaxDataLeno: 65535, // 数据帧最大字节数(byte)
  WriteTimeGap: 1, // 数据下设最大接受时间偏差(s)
  BackupBrokerAddr: '', // 新增字段，支持双mqtt转发
  PUBEnable: 1, // 发布使能
  CustomTopicEnable: 0,
  YaKongTopicEnable: 1,
  SubscirbeCustomTopic: '',
};

// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});

const form = reactive({ ...defaultForm, ...props.rowData });
const emit = defineEmits(['update:dialogVisible', 'confirm']);

const emitConfirm = () => {
  try {
    formRef.value.validate((valid, errorFields) => {
      if (form.CustomTopicEnable && form.SubscirbeCustomTopic.trim() === '') {
        ElMessage.warning(t('SubscirbeCustomTopic'));
        return;
      }
      if (!form.YaKongTopicEnable && !form.CustomTopicEnable) {
        ElMessage.warning(t('tipicModeValid'));
        return;
      }
      if (valid) {
        emit('confirm', form);
      }
    });
  } catch (error) {}
};
const resetMqTransInter = (val) => {
  if (val !== 3) {
    form.PUBScanPeriod = 1000;
  }
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editDataForward') : t('createDataForward')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('forwardingType')" prop="transType">
            <el-select v-model="form.transType" disabled>
              <el-option v-for="row of options.TransType" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('topicMode')">
            <el-checkbox v-model="form.YaKongTopicEnable" :true-value="1" :false-value="0">
              {{ t('yakongTopic') }}
            </el-checkbox>
            <el-checkbox v-model="form.CustomTopicEnable" :true-value="1" :false-value="0">
              {{ t('customTopic') }}
            </el-checkbox>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('subscribeTopic')">
            <el-input v-model="form.SubscirbeCustomTopic" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('provider')" prop="Provider">
            <el-input v-model="form.Provider" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('connectionMode')" prop="ConnectMode">
            <el-select v-model="form.ConnectMode">
              <el-option v-for="row of options.ConnectMode" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('forwardAddress')" prop="BrokerAddr">
            <el-input v-model="form.BrokerAddr" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('heartbeatIntervalS')" prop="KeepAlive">
            <el-input v-model.number="form.KeepAlive" />
          </el-form-item>
        </el-col>
        <!-- 仅Linux支持配置  -->
        <el-col :span="12" v-if="currentProjectOsType === 'Linux'">
          <el-form-item :label="t('forwardingType')">
            <el-select v-model="form.PUBEnable" @change="resetMqTransInter">
              <el-option
                v-for="row of options.ForwardingType"
                :key="row.id"
                :label="row.text"
                :value="row.id"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="currentProjectOsType === 'Linux'">
          <el-form-item :label="t('forwardingCycleMilliSec')" prop="KeepAlive">
            <el-input v-model.number="form.PUBScanPeriod" :disabled="form.PUBEnable !== 3" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('reconnectIntervalS')" prop="ReConnect">
            <el-input v-model.number="form.ReConnect" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('qualityService')" prop="Qos">
            <el-select v-model="form.Qos">
              <el-option v-for="row of options.Qos" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('userNameA')" prop="Username">
            <el-input v-model="form.Username" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('password')" prop="PassWord">
            <el-input v-model="form.PassWord" show-password />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('usernameOfW')" prop="UsernameOfW">
            <el-input v-model="form.UsernameOfW" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('passWordOfW')" prop="PassWordOfW">
            <el-input v-model="form.PassWordOfW" show-password />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </CustomDialog>
</template>
