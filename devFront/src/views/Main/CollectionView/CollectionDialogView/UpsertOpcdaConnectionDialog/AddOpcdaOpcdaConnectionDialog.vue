<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { daConenctTestServer } from '@/api/allRequest/collectionAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: () => true,
});
//通用正则
const formRules = reactive({
  name: [regexValidator('notEmpty', t('rule1Message'))],
  progID: [regexValidator('notEmpty', t('rule1Message'))],
  ip: [regexValidator('ip', t('plsCheckParams'))],
  clsID: [regexValidator('notEmpty', t('rule1Message'))],
  maxReconnectNum: [regexValidator('number', t('numbersTips'))],
  heartInterval: [regexValidator('number', t('numbersTips'))],
});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  name: '', //别名
  progID: '', //prog ID
  ip: '', // 远程服务器IP
  clsID: '',
  maxReconnectNum: 5, // 最大重连册数
  heartInterval: 1000, //心跳周期
  redundancyStyle: 0,
  redunDeviceName: '',
};

// 表单
const props = defineProps({
  rowData: Object,
});

const form = reactive({ ...defaultForm, ...props.rowData });
const emit = defineEmits(['confirm']);

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
    formRef.value.validateField(['ip'], async (valid) => {
      if (valid) {
        const restful = await daConenctTestServer(form);
        if (restful?.errorCode === 0) {
          form.clsID = restful.data?.CLSID.replace(/^\{+|\}+$/g, '');
          ElMessage.success(t('testConnectSuccess'));
        }
      }
    });
  } catch (error) {}
};
</script>

<template>
  <CustomDialog
    v-model:dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editConnections') : t('createConnections')"
    :width="600"
    @confirm="emitConfirm"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('name')" prop="name">
            <el-input v-model="form.name" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('progID')" prop="progID">
            <el-input v-model="form.progID" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="IP" prop="ip">
            <el-input v-model="form.ip" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="clsID" prop="clsID">
            <el-input v-model="form.clsID" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('maxReconnects')" prop="maxReconnectNum">
            <el-input v-model.number="form.maxReconnectNum" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('heartbeatCheckMs')" prop="heartInterval">
            <el-input v-model.number="form.heartInterval" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('redundancyStatus')" prop="redundancyStyle">
            <el-switch
              v-if="form.redundancyStyle !== 2"
              v-model="form.redundancyStyle"
              :active-value="1"
              :inactive-value="0"
            ></el-switch>
            <el-switch v-else :model-value="true" disabled></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('redundancyRelateDev')" prop="redunDeviceName">
            <el-input v-model="form.redunDeviceName" :disabled="form.redundancyStyle === 2" />
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
<style lang="scss" scoped>
.mapping {
  display: flex;
  width: 100%;
}
</style>
