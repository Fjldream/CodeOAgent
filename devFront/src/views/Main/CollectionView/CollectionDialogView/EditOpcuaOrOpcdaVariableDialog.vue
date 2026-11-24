<script setup>
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { uaDevicesServer, getVariableAttributeServer } from '@/api/allRequest/collectionAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
nextTick(async () => {
  await getDeviceProperty();
  await getVariableAttribute();
});
const collectionMenuStore = useCollectionMenuStore();
const currentProject = storeToRefs(collectionMenuStore);
const currentProjectOsType = computed(() => currentProject.currentCollectionEngineer.value.osType);
// 表单
const props = defineProps({
  dialogVisible: Boolean,
  currentRow: Object,
  rowData: Object,
});
const options = reactive({
  AccessType: [
    {
      id: 0,
      text: t('onlyRead'),
      selected: true,
    },
    {
      id: 1,
      text: t('onlyWrite'),
    },
    {
      id: 2,
      text: t('readWrite'),
    },
  ],

  DataConvertType: [
    {
      id: 0,
      text: t('none'),
      selected: true,
      value: 0,
    },
    {
      id: 1,
      text: t('linearConvert'),
      value: 1,
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
      text: t('interForward'),
      value: 2,
    },
    {
      id: 4,
      text: t('collectForward'),
      value: 4,
    },
  ],
  storageType: [
    {
      id: 0,
      text: t('notStore'),
      selected: true,
      value: 0,
    },
    {
      id: 1,
      text: t('changeStore'),
      value: 1,
    },
    {
      id: 2,
      text: t('intervalStore'),
      value: 2,
    },
    {
      id: 4,
      text: t('collectStore'),
      value: 4,
    },
  ],
  DataType: [
    {
      value: '无',
    },
    {
      value: '绝对值',
    },
    {
      value: '百分比',
    },
  ],
});

const defaultForm = {
  tagName: '', // 名称
  description: '', // 描述
  deviceName: '', // 关联设备
  accessType: 2, // 读写类型
  collectTimeInterval: 1000, // 采集频率（ms）
  dataConvertType: 0, // 转换模式
  maxRawValue: 32767, //原始最大值
  minRawValue: -32768, // 原始最小值
  maxValue: 32767, // 工程最大值
  minValue: -32768, // 工程最小值
  deviceID: null, // 设备id
  channelDriver: '',
  deviceSeries: '',
  nonLinearName: '', // 非线性表
  dataConvertCoefficient: 1, // 系数
  dataConvertDeviation: 0, // 偏移
  dataCleaningType: 0, // 清洗模式
  valueRangeType: 0, // 值范围
  dataCleaningUpperLimit: 0, // 清晰最大值
  dataCleaningLowerLimit: 0, // 清洗最小值
  changeRate: 0, // 毛刺边界(%)
  deadbandRate: 0, //死区（%）
  tagType: 2,
  stepSize: 1, // 寄存器步长
  nameStepSize: 1, // 名称步长
  number: 1, // 个数
  uaTrans: 0, //0 不转发 1 转发 OPCUA转发
  daTrans: 0, // OPCDA转发
  mqTrans: 1, // MQTT转发
  mqInter: 1, //mqtt 间隔转发（秒）
  storEnable: 0, // 存储使能
  storMode: 0, // 存储模式
  storCycle: 1, // 存储周期（s）
  spaceTimeName: '', // 时空名称
  spaceTimeTagName: '', // 时空变量名
};
//通用正则
const rules = reactive({
  tagName: [regexValidator('notEmpty', t('rule1Message'))],
  description: [regexValidator('', t('rule2Message'), false)],
  deviceID: [regexValidator('notEmpty', t('rule1Message'))],
  dataType: [regexValidator('notEmpty', t('rule1Message'))],
  accessType: [regexValidator('notEmpty', t('rule1Message'))],
  collectTimeInterval: [regexValidator('number', t('numbersTips'))],
  dataConvertCoefficient: [regexValidator('number', t('numbersTips'))],
  dataConvertDeviation: [regexValidator('number', t('numbersTips'))],
  dataConvertType: [regexValidator('notEmpty', t('rule1Message'))],
  mqTrans: [regexValidator('notEmpty', t('rule1Message'))],
  mqInter: [regexValidator('number', t('numbersTips'))],
});
// 表单控件
const formRef = ref(null);
const form = reactive({ ...defaultForm, ...props.rowData });
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
const isCollectTimeIntervalDisabled = computed(() => {
  // group更新模式为轮询时，DA采集频率可以编辑。订阅时，DA采集频率默认为0，不允许编辑
  if (props.currentRow.subMethod === 0 && form.dialogType === 'editOPCDA') {
    form.collectTimeInterval = 0;
    return true;
  }
  return false;
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
  options.DeviceName = await uaDevicesServer();
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
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('editVariables')"
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
        <el-col v-if="form.dialogType === 'editOPCUA'" :span="12">
          <el-form-item :label="t('associatedDevice')" prop="deviceID">
            <el-select v-model="form.deviceID" disabled>
              <el-option
                v-for="row of options.DeviceName"
                :key="row.deviceID"
                :label="row.opcServerName"
                :value="row.deviceID"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('dataType')" prop="tagDataType">
            <el-select v-model="form.tagDataType" disabled>
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
          <el-form-item :label="t('samplingInterval')" prop="collectTimeInterval">
            <el-input v-model.number="form.collectTimeInterval" :disabled="isCollectTimeIntervalDisabled" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('readWriteType')" prop="accessType">
            <el-select v-model="form.accessType">
              <el-option v-for="row of options.AccessType" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
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
            <el-form-item :label="t('forwardingType')" prop="mqTrans">
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
            <el-form-item :label="t('forwardingCycleSeconds')" prop="mqInter">
              <el-input v-model.number="form.mqInter" :disabled="form.mqTrans !== 2" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div v-if="currentProjectOsType === 'Windows'">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('saveConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('storeEnable')">
              <el-switch v-model="form.storEnable" :active-value="1" :inactive-value="0"></el-switch>
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
          <el-form-item :label="t('storageInterval')" prop="storCycle">
            <el-input v-model.number="form.storCycle" :disabled="form.storMode !== 2" />
          </el-form-item>
        </el-col>
      </div>
    </el-form>
  </CustomDialog>
</template>
