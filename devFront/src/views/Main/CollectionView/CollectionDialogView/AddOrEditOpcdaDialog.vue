<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: () => true,
});
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const dialogDeviceVisible = ref(false);
// 表单
const props = defineProps({
  rowData: Object,
});
//通用正则
const formRules = reactive({
  deviceName: [regexValidator('safaText', t('nameRule'))],
  description: [regexValidator('', t('rule1Message'), false)],
  perDeadZone: [regexValidator('number', t('numbersTips'))],
  updateFrequency: [regexValidator('number', t('numbersTips'))],
  timeout: [regexValidator('number', t('numbersTips'))],
  languageID: [regexValidator('number', t('numbersTips'))],
  reconnectInterval: [regexValidator('number', t('numbersTips'))],
  maxReconncetInterval: [regexValidator('notEmpty', t('rule1Message'))],
  readMaximum: [regexValidator('number', t('numbersTips'))],
  writeMaximum: [regexValidator('number', t('numbersTips'))],
  connectName: [regexValidator('notEmpty', t('rule1Message'))],
});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  deviceName: '', //设备名称
  description: '', //描述
  isOptimize: 1,
  active: 1,
  subMethod: 0, // 用作标记订阅0、轮询方式1
  perDeadZone: 0, // 百分比死区
  updateFrequency: 1000, // 更新频率
  timeout: 500, // 异步请求超时时间
  languageID: 1033, // 语言ID
  reconnectInterval: 60, // 重连间隔s
  maxReconncetInterval: 24, // 最大重连时间h
  readMaximum: 250, //单词读请求最大Item数
  writeMaximum: 200, // 单词写请求最大Item数
  connectName: '', //连接名称
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
// 确认及取消
const handleConfirm = async (data) => {
  dialogDeviceVisible.value = false;
};
</script>

<template>
  <CustomDialog
    v-model:dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editOPCDA') : t('createOPCDA')"
    :width="720"
    @confirm="emitConfirm"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('deviceName')" prop="deviceName">
            <el-input v-model="form.deviceName" maxlength="32" show-word-limit />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('description')" prop="description">
            <el-input v-model="form.description" :rows="3" type="textarea" maxlength="128" show-word-limit />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('updateMode')">
            <el-radio-group v-model="form.subMethod">
              <el-radio :value="0">{{ t('AsynMQTTSubscribe') }}</el-radio>
              <el-radio :value="1">{{ t('polling') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('percentDeadband')" prop="perDeadZone">
            <el-input-number :min="0" :max="100" controls-position="right" v-model="form.perDeadZone" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('updateFrequencyMs')" prop="updateFrequency">
            <el-input v-model.number="form.updateFrequency" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('languageID')" prop="languageID">
            <el-input v-model.number="form.languageID" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('reconnectIntervalS')" prop="reconnectInterval">
            <el-input v-model.number="form.reconnectInterval" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('maxReconnect')" prop="maxReconncetInterval">
            <el-input v-model.number="form.maxReconncetInterval" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('maxItemsPerRead')" prop="readMaximum">
            <el-input v-model.number="form.readMaximum" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('maxItemsPerWrite')" prop="writeMaximum">
            <el-input v-model.number="form.writeMaximum" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('asyncRequestTimeout')" prop="timeout">
            <el-input v-model.number="form.timeout" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('deviceActive')">
            <el-switch v-model="form.active" :active-value="1" :inactive-value="0"></el-switch>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <component
      :is="activeDialogComponent"
      v-if="dialogDeviceVisible"
      v-model:dialogVisible="dialogDeviceVisible"
      @confirm="handleConfirm"
    />
  </CustomDialog>
</template>
<style lang="scss" scoped>
.mapping {
  display: flex;
  width: 100%;
}
</style>
