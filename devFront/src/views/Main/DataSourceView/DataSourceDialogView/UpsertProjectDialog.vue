<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { useDataSourceOptions } from '@/composables/DataSourceMng/useDataSourceOptions.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const emit = defineEmits(['update:dialogVisible', 'confirm']);

// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
  disableProjectName: Boolean,
});
const {
  DateTypeCheckboxs,
  getVariableMethodOptions,
  NewWorkDateSourcesOptions,
  realWriteMethodOptions,
  testConnection,
  getAllProjects,
  getDateSourceOptions,
} = useDataSourceOptions();
//通用正则
const rules = reactive({
  name: [regexValidator('safaText', t('datasourceRuleTip')), regexValidator('projectName', t('clientRuleTip1'))],
  type: [regexValidator('notEmpty', t('datasourceRuleTip1'))],
  dbName: [regexValidator('dbName', t('datasourceRuleTip2'))],
  dataType: [regexValidator('notEmpty', t('datasourceRuleTip3'))],
  ip: [regexValidator('ip', t('datasourceRuleTip4'))],
  backIp: [regexValidator('ip', t('datasourceRuleTip4'))],
  port: [regexValidator('port', t('datasourceRuleTip5'))],
  backPort: [regexValidator('port', t('datasourceRuleTip5'))],
  webPort: [regexValidator('port', t('datasourceRuleTip5'))],
  realPort: [regexValidator('port', t('datasourceRuleTip5'))],
  historyPort: [regexValidator('port', t('datasourceRuleTip5'))],
  alarmPort: [regexValidator('port', t('datasourceRuleTip5'))],
  alarmProject: [regexValidator('safaText', t('datasourceRuleTip'))],
  backRealPort: [regexValidator('port', t('datasourceRuleTip5'))],
  backHistoryPort: [regexValidator('port', t('datasourceRuleTip5'))],
  backAlarmPort: [regexValidator('port', t('datasourceRuleTip5'))],
  userName: [regexValidator('safaText', t('datasourceRuleTip6'))],
  password: [regexValidator('notEmpty', t('datasourceRuleTip7'))],
  maxConnectionNum: [regexValidator('number', t('datasourceRuleTip8'))],
  minConnectionNum: [regexValidator('number', t('datasourceRuleTip9'))],
  timeout: [regexValidator('number', t('datasourceRuleTip10'))],
  newWorkDateType: [regexValidator('notEmpty', t('datasourceRuleTip1'))],
  getVariableListMethod: [regexValidator('notEmpty', t('datasourceRuleTip1'))],
  setVariableValueMethod: [regexValidator('notEmpty', t('datasourceRuleTip1'))],
  realPublishingThene: [regexValidator('notEmpty', t('datasourceRuleTip11'))],
  engineeringId: [regexValidator('notEmpty', t('datasourceRuleTip12'))],
  engineeringName: [regexValidator('notEmpty', t('datasourceRuleTip13'))],
  emqx_ip: [regexValidator('ip', t('datasourceRuleTip14'))],
  emqx_port: [regexValidator('port', t('datasourceRuleTip15'))],
  emqx_username: [regexValidator('', t('datasourceRuleTip21'), false)],
  emqx_password: [regexValidator('', t('datasourceRuleTip22'), false)],
  redis_ip: [regexValidator('ip', t('datasourceRuleTip16'))],
  redis_port: [regexValidator('port', t('datasourceRuleTip17'))],
  redis_password: [regexValidator('', t('datasourceRuleTip23'), false)],
  restful_ip: [regexValidator('ip', t('datasourceRuleTip18'))],
  restful_port: [regexValidator('port', t('datasourceRuleTip19'))],
  description: [regexValidator('', t('datasourceRuleTip20'), false)],
  mode: [regexValidator('notEmpty', t('datasourceRuleTip21'))],
  nodeUrls: [regexValidator('notEmpty', t('rule1Message'))],
});
// 表单控件
const formRef = ref(null);
const alarmProjects = ref([]);

// 表单数据
const defaultPort = new Map(
  Object.entries({
    PostgreSQL: '5432',
    MySQL: '3306',
    Oracle: '1521',
    SQLServer: '1433',
    MongoDB: '27017',
    DM: '5236',
    Tdengine: '6041',
    IoTDB: '6667',
    Redis: '6379',
    KingSCADA_Windows: ['8800', '12345', '12347'],
    KingIOServer_Windows: '12380',
    KingHistorian_Windows: '5678',
    KingView_Windows: ['41170', '41130', '41150'],
  }),
);
const defaultForm = {
  name: '',
  description: '',
  type: 'PostgreSQL',
  ip: '',
  port: '5432',
  backIp: '',
  backPort: '',
  webPort: '',
  realPort: '',
  historyPort: '',
  alarmPort: '',
  backRealPort: '',
  backHistoryPort: '',
  backAlarmPort: '',
  dbName: '',
  alarmProject: '',
  userName: '',
  password: '',
  minConnectionNum: '1',
  maxConnectionNum: '8',
  timeout: '3000',
  mode: 'single',
  nodeUrls: '',
  dataType: ['1'],
  redundancy: false,
  newWorkDateType: 'KingIOServerWindows3.8',
  getVariableListMethod: 'restful',
  setVariableValueMethod: 'restful',
  realPublishingThene: '',
  engineeringId: '',
  engineeringName: '',
  emqx_ip: '',
  emqx_port: '',
  emqx_username: '',
  emqx_password: '',
  redis_ip: '',
  redis_port: '',
  redis_password: '',
  restful_ip: '',
  restful_port: '',
};

const form = reactive(props.rowData.dialogType === 'edit' ? { ...defaultForm, ...props.rowData } : { ...defaultForm });
const dateSourceOptions = ref([]);
//数据源默认
const dataTypePort = computed(() => {
  return defaultPort.get(form.type);
});
//网络类型io及scada
const isIoOrScad = computed(() => {
  const typeEnum = ['KingIOServerWindows3.8', 'KingScadaWindows3.8', 'KingIOServerLinux'];
  return typeEnum.includes(form.newWorkDateType);
});
const resetfulIpShow = computed(
  () =>
    form.getVariableListMethod === 'restful' ||
    form.setVariableValueMethod === 'restful' ||
    form.newWorkDateType === 'KHFDBServer',
);

nextTick(() => {
  initDateSourceOptions();
});
//切换数据源类型
const selectedChange = () => {
  const preservedKey = new Set([
    'name',
    'description',
    'type',
    'guid',
    'dialogType',
    'createBy',
    'createByName',
    'createTime',
    'projectGroupId',
    'shareUserIds',
    'status',
  ]);
  if (form['type'] === 'AlarmEngineering') {
    initGetAlarmProjects();
  }

  for (const key in form) {
    if (!preservedKey.has(key)) {
      switch (key) {
        case 'timeout':
          form[key] = '3000';
          break;
        case 'dataType':
          form[key] = ['1'];
          break;
        case 'redundancy':
          form[key] = false;
          break;
        case 'newWorkDateType':
          form[key] = 'KingIOServerWindows3.8';
          break;
        case 'getVariableListMethod':
        case 'setVariableValueMethod':
          form[key] = 'restful';
          break;
        case 'minConnectionNum':
          form[key] = '1';
          break;
        case 'maxConnectionNum':
          form[key] = '8';
          break;
        case 'realPort':
          form[key] = dataTypePort.value?.[0] || '';
          break;
        case 'historyPort':
          form[key] = dataTypePort.value?.[1] || '';
          break;
        case 'alarmPort':
          form[key] = dataTypePort.value?.[2] || '';
          break;
        case 'port':
          form[key] = dataTypePort.value || '';
          break;
        case 'mode':
          form[key] = "single";
          break;
        case 'nodeUrls':
          form[key] = '';
          break;
        default:
          form[key] = '';
      }
    }
  }
  nextTick(() => {
    formRef.value.clearValidate();
  });
};
//切换网络数据来源
const selectedNewWorkChange = () => {
  form.getVariableListMethod = 'restful';
  form.setVariableValueMethod = 'restful';
  form.realPublishingThene = '';
  form.engineeringId = '';
  form.engineeringName = '';
  form.emqx_ip = '';
  form.emqx_port = '';
  form.redis_ip = '';
  form.redis_port = '';
  form.restful_ip = '';
  form.restful_port = '';
  // modified by jinlong.feng at 2026-11-24 KF开发助手公开仓库交付
  form.userName = '';
  form.password = '';
  // end
};
//切换网络数据来源中的获取变量列表方式
const variableMethodChange = () => {};
//切换网络数据来源中的实时变化数据发布主题
const realWriteMethodChange = () => {};

//正则根据复选框变化
const formRules = computed(() => {
  if (form.dataType.includes('1')) {
    rules.realPort = [regexValidator('port', t('datasourceRuleTip5'))];
    rules.backRealPort = [regexValidator('port', t('datasourceRuleTip5'))];
  } else {
    delete rules.realPort;
    delete rules.backRealPort;
  }
  if (form.dataType.includes('2')) {
    rules.historyPort = [regexValidator('port', t('datasourceRuleTip5'))];
    rules.backHistoryPort = [regexValidator('port', t('datasourceRuleTip5'))];
  } else {
    delete rules.historyPort;
    delete rules.backHistoryPort;
  }
  if (form.dataType.includes('3')) {
    rules.alarmPort = [regexValidator('port', t('datasourceRuleTip5'))];
    rules.backAlarmPort = [regexValidator('port', t('datasourceRuleTip5'))];
  } else {
    delete rules.alarmPort;
    delete rules.backAlarmPort;
  }

  if (form.type === 'IoTDB' && form.mode === 'cluster'){
    rules.nodeUrls = [regexValidator('notEmpty', t('rule1Message'))];
  } else {
    rules.nodeUrls = [regexValidator('notEmpty', t('datasourceRuleTip21'), false)];
  }

  return rules;
});
//数据源类型
const selectedDataType = computed(() => {
  return dateSourceOptions.value.find((item) => item.value === form.type)?.type;
});
const emitConfirm = () => {
  try {
    formRef.value.validate((valid) => {
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
        await testConnection(form);
      } else {
        ElMessage.warning(t('plsCheckParams'));
      }
    });
  } catch (error) {}
};

// 初始化获取报警工程
const initGetAlarmProjects = async () => {
  const { data } = await getAllProjects();
  alarmProjects.value = data;
};
// 初始化数据源类型
const initDateSourceOptions = async () => {
  dateSourceOptions.value = await getDateSourceOptions();
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editProject') : t('createProject')"
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
          <el-form-item :label="t('datasourceType')" prop="type">
            <el-select v-model="form.type" :placeholder="t('plsSetlect')" @change="selectedChange">
              <el-option
                v-for="item in dateSourceOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('name')" prop="name">
            <el-input v-model="form.name" :disabled="props.disableProjectName" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" />
      </el-form-item>
      <!-- 数据源配置 -->
      <div v-if="selectedDataType === 1">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port')" prop="port">
              <el-input v-model="form.port" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="form.type !== 'Redis'">
          <el-col :span="12">
            <el-form-item :label="t('dbName')" prop="dbName">
              <el-input v-model="form.dbName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('timeout')" prop="timeout">
              <el-input v-model="form.timeout" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- 数据源配置 -->
      <div v-if="selectedDataType === 9">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('connectionMode')" prop="mode">
              <el-radio-group v-model="form.mode">
                <el-radio label="single">{{ t('singleMachineMode') }}</el-radio>
                <el-radio label="cluster">{{ t('clusterMode') }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="form.mode === 'single'">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port')" prop="port">
              <el-input v-model="form.port" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-else>
          <el-col :span="24">
            <el-form-item :label="t('nodeUrls')" prop="nodeUrls">
              <el-input v-model="form.nodeUrls" :placeholder="t('nodeUrlTips')" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div v-else-if="selectedDataType === 2 || selectedDataType === 8">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('dataType')" prop="dataType">
              <el-checkbox-group v-model="form.dataType">
                <el-checkbox
                  v-for="check in DateTypeCheckboxs"
                  :key="check.value"
                  :disabled="check.value === '1'"
                  :label="check.label"
                  :value="check.value"
                ></el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('realPort')" prop="realPort">
              <el-input v-model="form.realPort" :disabled="!form.dataType.includes('1')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('historyPort')" prop="historyPort">
              <el-input v-model="form.historyPort" :disabled="!form.dataType.includes('2')" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('alarmPort')" prop="alarmPort">
              <el-input v-model="form.alarmPort" :disabled="!form.dataType.includes('3')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('redundancy')">
              <el-switch v-model="form.redundancy" />
            </el-form-item>
          </el-col>
        </el-row>
        <div v-if="form.redundancy === true">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('backIp')" prop="backIp">
                <el-input v-model="form.backIp" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('backRealPort')" prop="backRealPort">
                <el-input v-model="form.backRealPort" :disabled="!form.dataType.includes('1')" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('backHistoryPort')" prop="backHistoryPort">
                <el-input v-model="form.backHistoryPort" :disabled="!form.dataType.includes('2')" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('backAlarmPort')" prop="backAlarmPort">
                <el-input v-model="form.backAlarmPort" :disabled="!form.dataType.includes('3')" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('timeout')" prop="timeout">
                <el-input v-model="form.timeout" />
              </el-form-item>
            </el-col>
            <el-col :span="12"></el-col>
          </el-row>
        </div>
        <div v-else-if="form.redundancy === false">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('timeout')" prop="timeout">
                <el-input v-model="form.timeout" />
              </el-form-item>
            </el-col>
            <el-col :span="12"></el-col>
          </el-row>
        </div>
      </div>
      <div v-else-if="selectedDataType === 3">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port')" prop="port">
              <el-input v-model="form.port" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('redundancy')">
              <el-switch v-model="form.redundancy" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.redundancy === false" :label="t('timeout')" prop="timeout">
              <el-input v-model="form.timeout" />
            </el-form-item>
            <el-form-item v-else-if="form.redundancy === true" :label="t('backIp')" prop="backIp">
              <el-input v-model="form.backIp" />
            </el-form-item>
          </el-col>
        </el-row>
        <div v-if="form.redundancy === true">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('backPort')" prop="backPort">
                <el-input v-model="form.backPort" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('timeout')" prop="timeout">
                <el-input v-model="form.timeout" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
      <div v-else-if="selectedDataType === 4">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port')" prop="port">
              <el-input v-model="form.port" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('timeout')" prop="timeout">
              <el-input v-model="form.timeout" />
            </el-form-item>
          </el-col>
          <el-col :span="12"></el-col>
        </el-row>
      </div>
      <div v-else-if="selectedDataType === 5">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP" prop="ip">
              <el-input v-model="form.ip" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('dataType')" prop="dataType">
              <el-checkbox-group v-model="form.dataType">
                <el-checkbox
                  v-for="check in DateTypeCheckboxs"
                  :key="check.value"
                  :disabled="check.value === '1'"
                  :label="check.label"
                  :value="check.value"
                ></el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('realPort')" prop="realPort">
              <el-input v-model="form.realPort" :disabled="!form.dataType.includes('1')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('historyPort')" prop="historyPort">
              <el-input v-model="form.historyPort" :disabled="!form.dataType.includes('2')" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('alarmPort')" prop="alarmPort">
              <el-input v-model="form.alarmPort" :disabled="!form.dataType.includes('3')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('timeout')" prop="timeout">
              <el-input v-model="form.timeout" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div v-else-if="selectedDataType === 6">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('datasourceConfig') }}</span>
        </el-form-item>
        <el-form-item :label="t('dataOraginal')" prop="newWorkDateType">
          <el-select v-model="form.newWorkDateType" :placeholder="t('plsSetlect')" @change="selectedNewWorkChange">
            <el-option
              v-for="item in NewWorkDateSourcesOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <div v-if="isIoOrScad">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('getVariableList')" prop="getVariableListMethod">
                <el-select
                  v-model="form.getVariableListMethod"
                  :placeholder="t('plsSetlect')"
                  @change="variableMethodChange"
                >
                  <el-option
                    v-for="item in getVariableMethodOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('realDataWriteBack')" prop="setVariableValueMethod">
                <el-select
                  v-model="form.setVariableValueMethod"
                  :placeholder="t('plsSetlect')"
                  @change="realWriteMethodChange"
                >
                  <el-option
                    v-for="item in realWriteMethodOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('realDataPublishTitle')" prop="realPublishingThene">
                <el-input v-model="form.realPublishingThene" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('projectId')" prop="engineeringId">
                <el-input v-model="form.engineeringId" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('projectInstanceName')" prop="engineeringName">
                <el-input v-model="form.engineeringName" />
              </el-form-item>
            </el-col>
            <el-col :span="12"></el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('emqx_ip')" prop="emqx_ip">
                <el-input v-model="form.emqx_ip" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('emqx_port')" prop="emqx_port">
                <el-input v-model="form.emqx_port" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('emqx_user')" prop="emqx_username">
                <el-input v-model="form.emqx_username" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('emqx_pwd')" prop="emqx_password">
                <el-input v-model="form.emqx_password" show-password />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div v-if="form.getVariableListMethod === 'redis'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('redis_ip')" prop="redis_ip">
                <el-input v-model="form.redis_ip" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('redis_port')" prop="redis_port">
                <el-input v-model="form.redis_port" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('redis_pwd')" prop="redis_password">
                <el-input v-model="form.redis_password" show-password />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div v-if="resetfulIpShow">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="t('restful_ip')" prop="restful_ip">
                <el-input v-model="form.restful_ip" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="t('restful_port')" prop="restful_port">
                <el-input v-model="form.restful_port" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
      <div v-else-if="selectedDataType === 7">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('alarmEngineerConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('AlarmEngineering')" prop="alarmProject">
              <el-select v-model="form.alarmProject" :placeholder="t('plsSelectAlarmProject')">
                <el-option
                  v-for="item in alarmProjects"
                  :key="item.name"
                  :label="item.name"
                  :value="item.name"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- 连接配置 -->
      <div v-if="selectedDataType === 1 || selectedDataType === 4 || selectedDataType === 9">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('connectConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('userName')" prop="userName">
              <el-input v-model="form.userName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('password')" prop="password">
              <el-input v-model="form.password" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="form.type !== 'Tdengine' && form.type !== 'Redis'">
          <el-col :span="12">
            <el-form-item :label="t('minConnectionNum')" prop="minConnectionNum">
              <el-input v-model="form.minConnectionNum" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('maxConnectionNum')" prop="maxConnectionNum">
              <el-input v-model="form.maxConnectionNum" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div v-else-if="selectedDataType === 6">
        <el-form-item>
          <el-divider direction="vertical" />
          <span>{{ t('connectConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('userName')" prop="userName">
              <el-input v-model="form.userName" :disabled="form.newWorkDateType === 'KingScadaWindows3.8'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('password')" prop="password">
              <el-input
                v-model="form.password"
                show-password
                :disabled="form.newWorkDateType === 'KingScadaWindows3.8'"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('minConnectionNum')" prop="minConnectionNum">
              <el-input v-model="form.minConnectionNum" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('maxConnectionNum')" prop="maxConnectionNum">
              <el-input v-model="form.maxConnectionNum" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <el-form-item>
        <div class="text-right">
          <el-button type="text" @click="connectionTest">
            <div>{{ t('connectTest') }}</div>
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
