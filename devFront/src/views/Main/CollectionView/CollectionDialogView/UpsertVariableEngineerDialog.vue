<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { useCollectionVariables } from '@/composables/collectionCompose/useCollectionVariables';
import {
  getDeviceServer,
  getRegisterdatatypesServer,
  getRegistersServer,
  getVariableAttributeServer,
} from '@/api/allRequest/collectionAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
nextTick(async () => {
  await getDeviceProperty();
  await getVariableAttribute();
  if (form.dialogType === 'edit') {
    await deviceChange(form.deviceId);
    await regNameChange(form.regName);
  }
});
const collectionMenuStore = useCollectionMenuStore();
const currentProject = storeToRefs(collectionMenuStore);
const currentProjectOsType = computed(() => currentProject.currentCollectionEngineer.value.osType);
// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});
const { options, defaultForm, rules } = useCollectionVariables({ t });
// 表单控件
const formRef = ref(null);
const form = reactive(props.rowData.dialogType === 'edit' ? { ...defaultForm, ...props.rowData } : { ...defaultForm });
const oldDataTypeValue = reactive({
  tagDataType: '',
  regDataType: '',
});
//正则根据复选框变化
const formRules = computed(() => {
  if (form.dataConvertType === 1) {
    rules.maxRawValue = [regexValidator('number', t('numbersTips'))];
    rules.minRawValue = [regexValidator('number', t('numbersTips'))];
    rules.maxValue = [regexValidator('number', t('numbersTips'))];
    rules.minValue = [regexValidator('number', t('numbersTips'))];
  } else {
    delete rules.maxRawValue;
    delete rules.minRawValue;
    delete rules.maxValue;
    delete rules.minValue;
  }
  return rules;
});
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
const getDeviceProperty = async () => {
  options.DeviceName = await getDeviceServer();
};
const deviceChange = async (row) => {
  const selectedItem = options.DeviceName.find((item) => item.deviceId === row);
  if (selectedItem) {
    form.deviceName = selectedItem.deviceName;
    form.channelDriver = selectedItem.driverName;
    form.deviceSeries = selectedItem.driverSeries;
    options.RegName = await getRegistersServer({ deviceName: selectedItem.deviceName });
  }
};
const regNameChange = async (row) => {
  const devices = await getRegisterdatatypesServer({ deviceName: form.deviceName, regName: row });
  if (devices) {
    options.DataType = devices;
  }
};
const getVariableAttribute = async () => {
  const attributeData = await getVariableAttributeServer();
  if (attributeData) {
    options.ConvertDataType = attributeData.TagDataType.editor.options.data;
  }
};
const resetInter = (val, type) => {
  if (type === 1 && val !== 2) form.mqInter = 1;
  if (type === 2 && val !== 2) form.storCycle = 1;
};
const dataTypeVisibleChange = (show, fieldName) => {
  if (form.dialogType !== 'edit') {
    return;
  }
  if (show) {
    oldDataTypeValue[fieldName] = form[fieldName];
  }
};
const dataTypeChange = async (val, fieldName) => {
  if (form.dialogType !== 'edit') {
    return;
  }
  await ElMessageBox.confirm(t('choiceCarefully'), t('tip'), {
    type: 'warning',
    showClose: false,
    closeOnClickModel: false,
    closeOnPressEscape: false,
  }).catch(() => {
    form[fieldName] = oldDataTypeValue[fieldName];
  });
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editevice') : t('createDevice')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
      <!-- 基本配置 -->
      <el-form-item>
        <el-divider direction="vertical" />
        <span>{{ t('basicConfig') }}</span>
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('variableName')" prop="tagName">
            <el-input v-model="form.tagName" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('variableDescription')" prop="description">
            <el-input v-model="form.description" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('associatedDevice')" prop="deviceId">
            <el-select v-model="form.deviceId" @change="deviceChange">
              <el-option
                v-for="row of options.DeviceName"
                :key="row.deviceId"
                :label="row.deviceName"
                :value="row.deviceId"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('registerName')" prop="regName">
            <el-select v-model="form.regName" @change="regNameChange">
              <el-option v-for="row of options.RegName" :key="row" :label="row" :value="row"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('registerAddress')" prop="regAddress">
            <el-input v-model="form.regAddress" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('registerDataType')" prop="regDataType">
            <el-select
              v-model="form.regDataType"
              @visible-change="(val) => dataTypeVisibleChange(val, 'regDataType')"
              @change="(val) => dataTypeChange(val, 'regDataType')"
            >
              <el-option v-for="row of options.DataType" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('conversionDataType')" prop="tagDataType">
            <el-select
              v-model="form.tagDataType"
              @visible-change="(val) => dataTypeVisibleChange(val, 'tagDataType')"
              @change="(val) => dataTypeChange(val, 'tagDataType')"
            >
              <el-option
                v-for="row of options.ConvertDataType"
                :key="row.id"
                :label="row.text"
                :value="row.id"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('readWriteType')" prop="accessType">
            <el-select v-model="form.accessType">
              <el-option v-for="row of options.AccessType" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('samplingInterval')" prop="collectTimeInterval">
            <el-input v-model.number="form.collectTimeInterval" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 转换配置 -->
      <div>
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('conversionConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('convertCoefficient')" prop="dataConvertCoefficient">
              <el-input v-model.number="form.dataConvertCoefficient" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('convertDeviation')" prop="dataConvertDeviation">
              <el-input v-model.number="form.dataConvertDeviation" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('forwardingMode')" prop="dataConvertType">
              <el-select v-model="form.dataConvertType">
                <el-option
                  v-for="row of options.DataConvertType"
                  :key="row.id"
                  :label="row.text"
                  :value="row.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('rawMaxValue')" prop="maxRawValue">
              <el-input v-model.number="form.maxRawValue" :disabled="form.dataConvertType === 0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('rawMinValue')" prop="minRawValue">
              <el-input v-model.number="form.minRawValue" :disabled="form.dataConvertType === 0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('engineeringMaxValue')" prop="maxValue">
              <el-input v-model.number="form.maxValue" :disabled="form.dataConvertType === 0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('engineeringMinValue')" prop="minValue">
              <el-input v-model.number="form.minValue" :disabled="form.dataConvertType === 0" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- 转发配置 -->
      <div v-if="currentProjectOsType === 'Windows'">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('forwardConfiguration') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('forwardingType')" prop="dataConvertType">
              <el-select v-model="form.mqTrans" @change="resetInter($event, 1)">
                <el-option
                  v-for="row of options.ForwardingType"
                  :key="row.id"
                  :label="row.text"
                  :value="row.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('forwardingCycleSeconds')" prop="collectTimeInterval">
              <el-input v-model.number="form.mqInter" :disabled="form.mqTrans !== 2" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- <div v-if="currentProjectOsType === 'Windows'"> -->
      <div>
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('saveConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('storeEnable')">
              <el-switch v-model="form.storEnable" :active-value="2" :inactive-value="0"></el-switch>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('storeType')" prop="dataConvertType">
              <el-select v-model="form.storMode" @change="resetInter($event, 2)">
                <el-option
                  v-for="row of options.storageType"
                  :key="row.id"
                  :label="row.text"
                  :value="row.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-col :span="12">
          <el-form-item :label="t('storageInterval')" prop="collectTimeInterval">
            <el-input v-model.number="form.storCycle" :disabled="form.storMode !== 2" />
          </el-form-item>
        </el-col>
      </div>
    </el-form>
  </CustomDialog>
</template>
