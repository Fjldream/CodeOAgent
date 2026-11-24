<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { getNetWorkPropertyServer, modifyNetworkConfigServer } from '@/api/allRequest/collectionAPI.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();

nextTick(() => {
  getSystemConfig();
});
//通用正则
const formRules = reactive({
  TransMode: [regexValidator('notEmpty', t('rule1Message'))],
  TransInterval: [regexValidator('notEmpty', t('rule1Message'))],
  Active: [regexValidator('notEmpty', t('rule1Message'))],
  Mode: [regexValidator('notEmpty', t('rule1Message'))],
  MasterOrSlave: [regexValidator('notEmpty', t('rule1Message'))],
  HostNameMaster1: [regexValidator('ip', t('deviceRuleTip4'))],
  HostPortMaster1: [regexValidator('port', t('deviceRuleTip5'))],
  HeartInterval: [regexValidator('number', t('numbersTips'))],
  MaxErrorTimes: [regexValidator('number', t('numbersTips'))],
});
// 表单控件
const formRef = ref(null);

const form = ref({
  TransMode: 0,
  TransInterval: 1000,
  Active: 0,
  Mode: 1,
  MasterOrSlave: 1,
  HostNameMaster1: '127.0.0.1',
  HostPortMaster1: 12306,
  HeartInterval: 3000,
  MaxErrorTimes: 3,
  uncontained: false,
  exposedPorts: [],
  HistoryDataMode: 0,
  HistoryDataCacheNumber: 1024,
  HistoryDataCacheTime: 24,
  FileCacheMode: 0,
  CacheFileSize: 1024,
  CacheFilePeriod: 24,
  AutoEnable: 1,
});
const options1 = reactive([
  { value: 0, label: t('periodicForward') },
  { value: 1, label: t('changeForward') },
]);
const options2 = reactive([
  { value: 0, label: t('coldSwitch') },
  { value: 1, label: t('warmSwitch') },
  { value: 2, label: t('hotSwitch') },
]);
const options3 = reactive([
  { value: 0, label: t('localHost') },
  { value: 1, label: t('slavehost') },
]);

const saveHandle = async () => {
  const { errorCode } = await modifyNetworkConfigServer(form.value);
  if (errorCode === 0) {
    ElMessage.success(t('editSuccess'));
  }
};

const getSystemConfig = async () => {
  const data = await getNetWorkPropertyServer();
  if (data) {
    form.value = { ...data.networkData };
  }
};
</script>

<template>
  <header class="header-inline mb-20">
    <template v-for="(item, index) in collectionMenuStore.currentCollectionTitle" :key="index">
      <div v-if="index < collectionMenuStore.currentCollectionTitle.length - 1">
        <span class="text">{{ item }}</span>
        <span class="diagonal-divider"></span>
      </div>
      <div v-else>
        <span class="text-current">{{ item }}</span>
      </div>
    </template>
  </header>

  <el-form ref="formRef" :model="form" :rules="formRules" :validate-on-rule-change="false" label-width="auto">
    <!-- 基本配置 -->
    <!-- <el-form-item>
      <el-divider direction="vertical" />
      <span>{{ t('baseAttr') }}</span>
    </el-form-item>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item :label="t('dataForwardMode')" prop="TransMode">
          <el-select v-model="form.TransMode">
            <el-option v-for="item in options1" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('dataForwardInterval')" prop="TransInterval">
          <el-input v-model.number="form.TransInterval" />
        </el-form-item>
      </el-col>
    </el-row> -->

    <!-- 冗余配置 -->
    <div>
      <el-form-item>
        <el-divider direction="vertical" />
        <span>{{ t('redundancyProperties') }}</span>
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('isEnabled')" prop="Active">
            <el-switch v-model="form.Active" :active-value="1" :inactive-value="0"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('masterSlaveSwitchMode')" prop="Mode">
            <el-select v-model="form.Mode" :disabled="form.Active === 0">
              <el-option v-for="item in options2" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('msterSlaveHost')" prop="MasterOrSlave">
            <el-select v-model="form.MasterOrSlave" :disabled="form.Active === 0">
              <el-option v-for="item in options3" :key="item.value" :label="item.label" :value="item.value"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="form.MasterOrSlave == 0 ? t('slaveIp') : t('masterIp')" prop="HostNameMaster1">
            <el-input v-model="form.HostNameMaster1" :disabled="form.Active === 0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="form.MasterOrSlave == 0 ? t('slavePort') : t('masterPort')" prop="HostPortMaster1">
            <el-input v-model.number="form.HostPortMaster1" :disabled="form.Active === 0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('heartbeatCheckMs')" prop="HeartInterval">
            <el-input v-model.number="form.HeartInterval" :disabled="form.Active === 0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('maxErrorCount')" prop="MaxErrorTimes">
            <el-input v-model.number="form.MaxErrorTimes" :disabled="form.Active === 0" />
          </el-form-item>
        </el-col>
      </el-row>
    </div>
  </el-form>

  <div class="df justify-end">
    <el-button type="primary" @click="saveHandle">{{ t('save') }}</el-button>
  </div>
</template>

<style lang="scss" scoped>
.border {
  border: solid 1px var(--el-border-color);
}
.el-divider--vertical {
  border-left: 4px #48a2ff var(--el-border-style);
}
.col-height {
  height: 49%;
  padding: 20px;
  margin-bottom: 12px;
  max-width: 49%;
  margin-right: 12px;
  background-color: #fff;
  border-radius: 12px;
}

.content {
  height: 97%;
  width: 100%;
  padding: 10px;
}

.form-height {
  height: calc(100% - 25px);
}
.header-inline {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  .diagonal-divider {
    background-color: #9ca3af;
    transform: rotate(35deg);
    margin: 0 8px;
    display: inline-block;
    width: 1px;
    height: 0.9em;
  }

  .icon {
    margin-right: 6px;
    font-size: 18px;
  }

  .text {
    font-size: 16px;
    color: #9ca3af;
    white-space: nowrap;
  }

  .text-current {
    font-size: 16px;
    color: #1f2937;
    white-space: nowrap;
  }
}
</style>
