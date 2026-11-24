<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore';
import { getDevicesPropertyServer } from '@/api/allRequest/collectionAPI.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import DriverLibraryDialog from '@/views/Main/CollectionView/CollectionDialogView/DriverLibraryDialog.vue';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();
nextTick(async () => {
  await getDevicesProperty();
});
//通用正则
const formRules = reactive({
  deviceName: [regexValidator('notEmpty', t('rule1Message'))],
  active: [regexValidator('notEmpty', t('rule1Message'))],
  description: [regexValidator('', t('rule2Message'), false)],
  driverName: [regexValidator('notEmpty', t('rule1Message'))],
  devAddress: [regexValidator('notEmpty', t('rule1Message'))],
  timeout: [regexValidator('number', t('numbersTips'))],
  deviceCollectTime: [regexValidator('number', t('numbersTips'))],
  reconnectInterval: [regexValidator('number', t('numbersTips'))],
  maxReconncetInterval: [regexValidator('notEmpty', t('rule1Message'))],
  linkType: [regexValidator('notEmpty', t('rule1Message'))],
  serialName: [regexValidator('notEmpty', t('rule1Message'))],
  serialBaudRate: [regexValidator('number', t('numbersTips'))],
  serialParity: [regexValidator('notEmpty', t('rule1Message'))],
  serialDataBits: [regexValidator('number', t('numbersTips'))],
  serialStopBits: [regexValidator('number', t('numbersTips'))],
});
const options = reactive({});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  deviceName: '', //设备名称
  active: 1, //是否激活
  description: '', //描述
  driverName: '', // 驱动名称
  deviceId: '', //设备ID
  driverSeries: '', // 设备系列
  deviceProvider: '', // 设备厂商
  systemPlatform: '', //CPU架构
  driverVersion: '', // 驱动版本
  company: '', // 网关厂商
  clsid: '', // 驱动ID
  devAddress: '', // 设备地址
  timeout: 3000, //超时
  deviceCollectTime: 1000, // 采集频率
  reconnectInterval: 60, // 重连间隔s
  maxReconncetInterval: 24, // 最大重连时间h
  linkType: 0, // 链路类别
  serialName: 'COM1', // 串口名称
  serialBaudRate: 9600, //波特率
  serialParity: 0, // 校验位
  serialDataBits: 8, // 数据位
  serialStopBits: 1, // 停止位
  frequencyControlMode: 0, // 变频模式
  frequencySwitchCondition: [], //  变频条件
  deviceGroup: '', // 设备组
  devNumber: 0, // 顺序号
  redundancyStyle: 0, // 冗余类型
  redunDeviceName: '', // 冗余设备
  OsType: collectionMenuStore.currentCollectionEngineer.osType,
};

// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
  dialogType: String,
});

const driverDialogVisible = ref(false);
const form = reactive({ ...defaultForm, ...props.rowData });
const emit = defineEmits(['update:dialogVisible', 'confirm']);
const getDevicesProperty = async () => {
  const devicesProperty = await getDevicesPropertyServer();
  for (const itemName in devicesProperty) {
    const item = devicesProperty[itemName];
    if (item?.editor?.options?.data) {
      options[itemName] = item.editor.options.data;
    }
  }
};

//选择设备
const selectClick = async () => {
  driverDialogVisible.value = true;
};
//链路类别变化
const linkTypeChange = async (val) => {
  if (props.dialogType === 'create') {
    if (val === 1) {
      formRules.serialName.push({
        require: true,
        validator: (rule, value, callback) => {
          const regexIp =
            /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){2}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
          if (!value && value !== 0) {
            callback(new Error(t('rule1Message')));
          } else if (value && regexIp && !regexIp.test(value)) {
            callback(new Error('IP'));
          } else {
            callback();
          }
        },
      });

      const serialNameIsIp = await formRef.value.validateField('serialName').catch(() => {
        return false;
      });
      if (!serialNameIsIp) {
        form.serialName = '192.168.0.';
      }
      formRef.value.clearValidate('serialName');
    } else {
      formRules.serialName.splice(1, 2);
    }
  }
};
const handleConfirm = async (row) => {
  form.driverName = row.DriverName; // 驱动名称
  form.driverSeries = row.DeviceSeries; // 设备系列
  form.deviceProvider = row.DriverCompany; // 设备厂商
  form.systemPlatform = row.SysPlatform; //CPU架构
  form.driverVersion = row.DriverVersion; // 驱动版本
  form.company = row.DriverCompany; // 网关厂商
  form.clsid = row.CLSID; // 驱动ID
  driverDialogVisible.value = false;
};
const emitConfirm = () => {
  try {
    formRef.value.validate((valid, errorFields) => {
      if (valid) {
        emit('confirm', form);
      }
    });
  } catch (error) {}
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="dialogType === 'edit' ? t('editDevice') : t('createDevice')"
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
        <el-col :span="12">
          <el-form-item :label="t('deviceName')" prop="deviceName">
            <el-input v-model="form.deviceName" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('deviceActive')" prop="active">
            <el-switch v-model="form.active" :active-value="1" :inactive-value="0"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('deviceDescription')" prop="description">
            <el-input v-model="form.description" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('deviceDriver')" prop="driverName">
            <div class="mapping">
              <el-input v-model="form.driverName" disabled />
              <el-button :disabled="dialogType === 'edit'" type="primary" @click="selectClick">
                {{ t('select') }}
              </el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('deviceAddress')" prop="devAddress">
            <el-input v-model="form.devAddress" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 连接配置 -->
      <div>
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('connectConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('timeout')" prop="timeout">
              <el-input v-model.number="form.timeout" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('samplingInterval')" prop="deviceCollectTime">
              <el-input v-model.number="form.deviceCollectTime" />
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
            <el-form-item :label="t('linkType')" prop="linkType">
              <el-select v-model="form.linkType" @change="linkTypeChange">
                <el-option
                  v-for="row of options.LinkType"
                  :key="row.roleid"
                  :label="row.rolename"
                  :value="row.roleid"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('serialPort')" prop="serialName">
              <el-input v-model="form.serialName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('baudRate')" prop="serialBaudRate">
              <el-select v-model.number="form.serialBaudRate">
                <el-option
                  v-for="row of options.SerialBaudRate"
                  :key="row.roleid"
                  :label="row.rolename"
                  :value="row.roleid"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('parity')" prop="serialParity">
              <el-select v-model="form.serialParity">
                <el-option
                  v-for="row of options.SerialParity"
                  :key="row.roleid"
                  :label="row.rolename"
                  :value="row.roleid"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('dataBits')" prop="serialDataBits">
              <el-select v-model.number="form.serialDataBits">
                <el-option
                  v-for="row of options.SerialDataBits"
                  :key="row.roleid"
                  :label="row.rolename"
                  :value="row.roleid"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('stopBits')" prop="serialStopBits">
              <el-select v-model.number="form.serialStopBits">
                <el-option
                  v-for="row of options.SerialStopBits"
                  :key="row.roleid"
                  :label="row.rolename"
                  :value="row.roleid"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
  </CustomDialog>
  <DriverLibraryDialog
    v-if="driverDialogVisible"
    v-model:dialogVisible="driverDialogVisible"
    @confirm="handleConfirm"
  />
</template>
<style lang="scss" scoped>
.mapping {
  display: flex;
  width: 100%;
}
</style>
