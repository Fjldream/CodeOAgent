<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

import { regexValidator } from '@/utils/regexRules.js';
import { editSystemConfigServer, getSystemConfigServer } from '@/api/allRequest/alarmAPI.js';
import { alarmSystemConfigOptions } from '@/composables/alarmCompose/alarmSystemConfigOptions.js';
const { testConnection } = alarmSystemConfigOptions();

import LabelTitle from '@/components/LabelTitle/LabelTitle.vue';

const { t } = useI18n();

const systemConfigForm = ref({
  alarmUpgrade: {
    alarmUpgradeTimeInterval: null,
    alarmUpgradeAckTimeInter: null,
    maxUpgradeTimes: null,
  },
  saveAlarmData: false,
  realDB: {},
  mqttConfig: {},
  historyDB: {},
});

const checkNumber = (rule, val, callback) => {
  const integerRegEx = /^\d+$/;
  if (val && !integerRegEx.test(val)) {
    return callback(new Error(t('numbersTips')));
  }
  callback();
};

const formRules = ref({
  'alarmUpgrade.alarmUpgradeTimeInterval': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
  'alarmUpgrade.alarmUpgradeAckTimeInter': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
  'alarmUpgrade.maxUpgradeTimes': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
  'realDB.ip': [regexValidator('ip', t('datasourceRuleTip4'), false)],
  'realDB.port': [regexValidator('port', t('datasourceRuleTip5'), false)],
  'realDB.timeout': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
  'historyDB.ip': [regexValidator('ip', t('datasourceRuleTip4'), false)],
  'historyDB.port': [regexValidator('port', t('datasourceRuleTip5'), false)],
  'historyDB.userName': [regexValidator('variableName', t('datasourceRuleTip5'), false)],
  'historyDB.dbName': [regexValidator('variableName', t('datasourceRuleTip5'), false)],
  'historyDB.timeout': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
  'mqttConfig.ip': [regexValidator('ip', t('datasourceRuleTip4'), false)],
  'mqttConfig.port': [regexValidator('port', t('datasourceRuleTip5'), false)],
  'mqttConfig.userName': [regexValidator('', t('datasourceRuleTip5'), false)],
  'mqttConfig.password': [regexValidator('', t('datasourceRuleTip5'), false)],
  'mqttConfig.timeout': [
    {
      validator: checkNumber,
      trigger: 'change',
    },
  ],
});

const DateSourceOptions = [
  { value: 3, label: 'PostgreSQL' },
  { value: 2, label: 'MySQL' },
  { value: 4, label: 'SqlServer' },
];

nextTick(() => {
  getSystemConfig();
});

const saveHandle = async () => {
  const {
    realDB: { dbName: _realName, ...realRest },
    mqttConfig: { dbName: _mqttName, ...mqttRest },
    alarmUpgrade,
    saveAlarmData,
    historyDB,
  } = systemConfigForm.value;
  const { errorCode } = await editSystemConfigServer({
    realDB: [realRest],
    mqttConfig: [mqttRest],
    alarmUpgrade,
    saveAlarmData,
    historyDB,
  });
  if (errorCode === 0) {
    ElMessage.success(t('saveSuccess'));
  }
};

const getSystemConfig = async () => {
  const { data } = await getSystemConfigServer();
  data.realDB = {
    dbName: 'redis',
    ...data.realDB[0],
  };
  data.mqttConfig = {
    dbName: 'emqx',
    ...data.mqttConfig[0],
  };
  systemConfigForm.value = structuredClone(data);
};

const connectionTest = async (type = null) => {
  try {
    const dbInfo = systemConfigForm.value.historyDB;
    const mqttInfo = systemConfigForm.value.mqttConfig;
    let newConnectionInfo;

    if (type === 'mqtt') {
      mqttInfo.name = mqttInfo.dbName;
      mqttInfo.guid = '';
      newConnectionInfo = {
        ...mqttInfo,
      };
      newConnectionInfo.name = mqttInfo.dbName;
      newConnectionInfo.type = 'Mqtt';
    } else {
      dbInfo.name = dbInfo.dbName;
      dbInfo.guid = '';
      newConnectionInfo = {
        ...dbInfo,
      };

      newConnectionInfo.name = dbInfo.dbName;
      if (newConnectionInfo.type === 3) {
        newConnectionInfo.type = 'PostgreSQL';
      }

      if (newConnectionInfo.type === 2) {
        newConnectionInfo.type = 'MySQL';
      }

      if (newConnectionInfo.type === 4) {
        newConnectionInfo.type = 'SqlServer';
      }
    }

    await testConnection(newConnectionInfo);
  } catch (error) {}
};
</script>

<template>
  <div class="df justify-space">
    <div>{{ t('saveConfig') }}</div>
  </div>
  <el-form :model="systemConfigForm" :rules="formRules" class="form-height" label-width="auto" size="small">
    <el-row :gutter="0" class="content">
      <el-col :span="12" class="border col-height">
        <LabelTitle :title="t('alarmUpdateSet')" />

        <el-form-item :label="t('alarmAfter')" prop="alarmUpgrade.alarmUpgradeTimeInterval">
          <el-input v-model="systemConfigForm.alarmUpgrade.alarmUpgradeTimeInterval"></el-input>
        </el-form-item>

        <el-form-item :label="t('alarmConfirm')" prop="alarmUpgrade.alarmUpgradeAckTimeInter">
          <el-input v-model="systemConfigForm.alarmUpgrade.alarmUpgradeAckTimeInter"></el-input>
        </el-form-item>

        <el-form-item :label="t('maxUpgradeTimes')" prop="alarmUpgrade.maxUpgradeTimes">
          <el-input v-model="systemConfigForm.alarmUpgrade.maxUpgradeTimes"></el-input>
        </el-form-item>
        <el-form-item :label="t('saveAlarmData')">
          <el-switch v-model="systemConfigForm.saveAlarmData"></el-switch>
        </el-form-item>
      </el-col>
      <el-col :span="12" class="border col-height">
        <LabelTitle :title="t('historyDBName')" />
        <el-form-item :label="t('dBName')">
          <el-select v-model="systemConfigForm.historyDB.type" :placeholder="t('plsSetlect')">
            <el-option
              v-for="item in DateSourceOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="ip" prop="historyDB.ip">
          <el-input v-model="systemConfigForm.historyDB.ip"></el-input>
        </el-form-item>
        <el-form-item :label="t('port')" prop="historyDB.port">
          <el-input v-model="systemConfigForm.historyDB.port"></el-input>
        </el-form-item>
        <el-form-item :label="t('userNameA')" prop="historyDB.userName">
          <el-input v-model="systemConfigForm.historyDB.userName"></el-input>
        </el-form-item>
        <el-form-item :label="t('password')">
          <el-input
            v-model="systemConfigForm.historyDB.password"
            show-password
            type="password"
            autocomplete="password"
          ></el-input>
        </el-form-item>
        <el-form-item :label="t('dbName')" prop="historyDB.dbName">
          <el-input v-model="systemConfigForm.historyDB.dbName"></el-input>
        </el-form-item>
        <el-form-item :label="t('timeout')" prop="historyDB.timeout">
          <el-input v-model="systemConfigForm.historyDB.timeout"></el-input>
        </el-form-item>
        <el-form-item class="button-right">
          <div class="text-right">
            <el-button type="text" @click="connectionTest">
              <div>{{ t('connectTest') }}</div>
            </el-button>
          </div>
        </el-form-item>
      </el-col>
      <el-col :span="12" class="border col-height">
        <LabelTitle :title="t('alarmSend')" />

        <el-form-item :label="t('alarmSendServer')">
          <el-input v-model="systemConfigForm.mqttConfig.dbName" readonly></el-input>
        </el-form-item>
        <el-form-item label="ip" prop="mqttConfig.ip">
          <el-input v-model="systemConfigForm.mqttConfig.ip"></el-input>
        </el-form-item>
        <el-form-item :label="t('port')" prop="mqttConfig.port">
          <el-input v-model="systemConfigForm.mqttConfig.port"></el-input>
        </el-form-item>
        <el-form-item :label="t('userNameA')" prop="mqttConfig.userName">
          <el-input v-model="systemConfigForm.mqttConfig.userName"></el-input>
        </el-form-item>
        <el-form-item :label="t('password')" prop="mqttConfig.password">
          <el-input
            v-model="systemConfigForm.mqttConfig.password"
            show-password
            type="password"
            autocomplete="password"
          ></el-input>
        </el-form-item>
        <el-form-item :label="t('timeout')" prop="mqttConfig.timeout">
          <el-input v-model="systemConfigForm.mqttConfig.timeout"></el-input>
        </el-form-item>
        <el-form-item class="button-right">
          <div class="text-right">
            <el-button type="text" @click="connectionTest('mqtt')">
              <div>{{ t('connectTest') }}</div>
            </el-button>
          </div>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
  <el-button class="save-btn" type="primary" @click="saveHandle">
    <el-icon class="mr-5"> <IEpChecked /> </el-icon>{{ t('save') }}
  </el-button>
</template>

<style lang="scss" scoped>
.border {
  border: solid 1px var(--el-border-color);
}
.save-btn {
  position: absolute;
  bottom: 10px;
  right: 20px;
  width: 80px;
}
.button-right {
  :deep(.el-form-item__content) {
    justify-content: flex-end;
  }
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
</style>
