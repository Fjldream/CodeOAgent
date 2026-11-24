<script setup>
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { onMounted } from 'vue';

const collectionMenuStore = useCollectionMenuStore();
const currentProject = storeToRefs(collectionMenuStore);
const currentProjectOsType = computed(() => currentProject.currentCollectionEngineer.value.osType);
const { t } = useI18n();

// 表单
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});
//通用正则
const rules = reactive({
  dbType: [regexValidator('notEmpty', t('rule1Message'))],
  Active: [regexValidator('number', t('numbersTips'))],
  Description: [regexValidator('', t('rule2Message'), false)],
  dataName: [regexValidator('notEmpty', t('rule1Message'))],
  DeploymentMode: [regexValidator('notEmpty', t('rule1Message'))],
  Model: [regexValidator('notEmpty', t('rule1Message'))],
  HostName: [regexValidator('notEmpty', t('rule1Message'))],
  Port: [regexValidator('number', t('numbersTips'))],
  UserName: [regexValidator('notEmpty', t('rule1Message'))],
  StorageInterval: [regexValidator('number', t('numbersTips'))],
  Cache: [regexValidator('number', t('numbersTips'))],
  CachePath: [regexValidator('notEmpty', t('rule1Message'))],
  CacheFileSize: [regexValidator('number', t('numbersTips'))],
  TimeOut: [regexValidator('number', t('numbersTips'))],
  TimeOutS: [regexValidator('number', t('numbersTips'))],
  ReConnectInterval: [regexValidator('number', t('numbersTips'))],
  PartTimeInterval: [regexValidator('number', t('numbersTips'))],
  OneTableName: [regexValidator('notEmpty', t('rule1Message'))],
});
const options = reactive({
  DbType: [
    // {
    //   id: 1,
    //   text: 'SQLServer',
    // },
    // {
    //   id: 2,
    //   text: 'MySQL',
    // },
    // {
    //   id: 8,
    //   text: 'PostgreSQL',
    // },
    {
      id: 11,
      text: 'Tdengine',
    },
    {
      id: 12,
      text: 'KingHistorian_Windows',
    },
    // {
    //   id: 6,
    //   text: 'Redis',
    // },
    {
      id: 3,
      text: 'TimescaleDB',
    },
    {
      id: 13,
      text: 'KingHistorian4.0',
    },
  ],
  Model: [
    {
      id: 'insert',
      text: 'insert',
    },
    {
      id: 'update',
      text: 'update',
    },
    {
      id: 'singleTag',
      text: 'singleTag',
    },
  ],
  Cache: [
    {
      id: 1,
      text: t('can'),
    },
    {
      id: 0,
      text: t('no'),
    },
  ],
  DeploymentMode: [
    {
      id: 1,
      text: t('singleMachineMode'),
    },
    {
      id: 0,
      text: t('clusterMode'),
    },
  ],
});
// 表单控件
const formRef = ref(null);

const defaultForm = {
  dbType: 11,
  Active: 1,
  Description: '',
  dataName: '',
  DeploymentMode: 1,
  Model: 'insert',
  HostName: '',
  Port: null,
  UserName: '',
  Password: '',
  StorageInterval: 1,
  Cache: 0,
  CachePath: 'D:/mydata',
  CacheFileSize: 1024,
  TimeOut: 3000,
  TimeOutS: 30,
  GroupNameEnable: 1,
  DataTypeEnable: 0,
  DataVersionEnable: 0,
  HisTDengineProjectName: '',
  id: '',
  DockerHostName: '',
  ReConnectInterval: 30,
  PartTimeInterval: 12,
  OneTableName: '',
  TableStructrue: [],
  TableNames: [],
  TagGroupActive: 0,
  TagGroup: [],
  tabName: [],
  tabStrc: [],
  tagGroup: [],
};

const form = reactive({ ...defaultForm, ...props.rowData });
const emit = defineEmits(['update:dialogVisible', 'confirm']);
onMounted(() => {
  if (form.dbType == 3) {
    form.TimeOutS = form.TimeOut;
  }
  if (form.dbType == 12) {
    form.ReConnectInterval = form.ConnectInterval;
  }
});
const emitConfirm = () => {
  try {
    formRef.value.validate((valid, errorFields) => {
      if (valid) {
        if (currentProjectOsType.value === 'Windows') {
          form.DeploymentMode = String(form.DeploymentMode);
          form.StorageInterval = String(form.StorageInterval);
          form.TimeOut = String(form.TimeOut);
        }
        emit('confirm', form);
      }
    });
  } catch (error) {}
};
//正则根据复选框变化
const formRules = computed(() => {
  if (form.dbType === 6) {
    rules.Password = [regexValidator('notEmpty', t('rule1Message'), false)];
  } else {
    rules.Password = [regexValidator('notEmpty', t('rule1Message'))];
  }
  return rules;
});
// 支持数据库类型过滤
const dbTypeOptions = computed(() => {
  let optionsArr = options.DbType.filter((item) => {
    return (currentProjectOsType.value === 'Linux' ? [3, 13] : [11, 12]).includes(item.id);
  });
  if (form.dialogType == 'create') form.dbType = optionsArr[0].id;
  return optionsArr;
});
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editDataStorage') : t('createDataStorage')"
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
          <el-form-item :label="t('databaseType')" prop="dbType">
            <el-select v-model="form.dbType" :disabled="form.dialogType === 'edit'">
              <el-option v-for="row of dbTypeOptions" :key="row.id" :label="row.text" :value="row.id"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('isEnabled')" prop="Active">
            <el-switch v-model.number="form.Active" :active-value="1" :inactive-value="0"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('description')" prop="Description">
            <el-input v-model="form.Description" />
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
          <el-col :span="12" v-if="form.dbType !== 12">
            <el-form-item :label="t('dbName')" prop="dataName">
              <el-input v-model="form.dataName" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType === 6">
            <el-form-item :label="t('deploymentMode')" prop="DeploymentMode">
              <el-select v-model="form.DeploymentMode" disabled>
                <el-option
                  v-for="row of options.DeploymentMode"
                  :key="row.id"
                  :label="row.text"
                  :value="row.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-else-if="form.dbType !== 12">
            <el-form-item :label="t('storageModel')" prop="Model">
              <el-select v-model="form.Model" :disabled="form.dbType !== 3">
                <el-option v-for="row of options.Model" :key="row.id" :label="row.text" :value="row.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IP" prop="HostName">
              <el-input v-model="form.HostName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('port')" prop="Port">
              <el-input v-model.number="form.Port" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType !== 6">
            <el-form-item :label="t('userNameA')" prop="UserName">
              <el-input v-model="form.UserName" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('password')" prop="Password">
              <el-input v-model="form.Password" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType !== 12">
            <el-form-item :label="t('storageInterval')" prop="StorageInterval">
              <el-input v-model.number="form.StorageInterval" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType === 12">
            <el-form-item :label="t('reconnectIntervalS')" prop="ReConnectInterval">
              <el-input v-model="form.ReConnectInterval" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType !== 6">
            <el-form-item :label="t('whetherCache')" prop="Cache">
              <el-select v-model="form.Cache">
                <el-option v-for="row of options.Cache" :key="row.id" :label="row.text" :value="row.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType !== 6">
            <el-form-item :label="t('cachePath')" prop="CachePath">
              <el-input v-model="form.CachePath" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType !== 6">
            <el-form-item :label="t('cacheSize')" prop="CacheFileSize">
              <el-input v-model.number="form.CacheFileSize" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType === 6">
            <el-form-item :label="t('timeoutS')" prop="TimeOut">
              <el-input v-model.number="form.TimeOut" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.dbType === 11">
            <el-form-item :label="t('storagePrefix')">
              <el-input v-model="form.HisTDengineProjectName" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="form.dbType === 11">
          <el-divider direction="vertical" />
          <span>{{ t('filedConfig') }}</span>
        </el-form-item>
        <el-row :gutter="20" v-if="form.dbType === 11">
          <el-col :span="8">
            <el-form-item :label="t('storageGroup')">
              <el-switch v-model.number="form.GroupNameEnable" :active-value="1" :inactive-value="0"></el-switch>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('storageTagType')">
              <el-switch v-model.number="form.DataTypeEnable" :active-value="1" :inactive-value="0"></el-switch>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('storageTagVersion')">
              <el-switch v-model.number="form.DataVersionEnable" :active-value="1" :inactive-value="0"></el-switch>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="form.dbType === 3">
          <el-col :span="12">
            <el-form-item :label="t('connectTimeOutS')" prop="TimeOutS">
              <el-input v-model="form.TimeOutS" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('reconnectIntervalS')" prop="ReConnectInterval">
              <el-input v-model="form.ReConnectInterval" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="form.dbType === 3">
          <el-divider direction="vertical" />
          <span>{{ t('supertableConf') }}</span>
        </el-form-item>
        <el-row :gutter="20" v-if="form.dbType === 3">
          <el-col :span="12">
            <el-form-item :label="t('partitionTimeInterval')" prop="PartTimeInterval">
              <el-input v-model="form.PartTimeInterval" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('tableName')" prop="OneTableName">
              <el-input v-model="form.OneTableName" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
  </CustomDialog>
</template>
