<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { getAllDataSourceServer, getVariableServer } from '@/api/allRequest/dataSourceAPI.js';
import { isSafeSelect } from '@/utils/regexRules.js';
import { getFormatDate } from '@/utils/dayjsUtil.js';
import { createDateSetServer, editDataSetServer, getDataSourceListServer } from '@/api/allRequest/clientAPI';
import { getProjectInfoServer, getProjectJSONSettingsServer } from '@/api/allRequest/calculationAPI';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const reportEditorStore = useReportEditorStore();
const { t } = useI18n();
const props = defineProps({ modelValue: Boolean, activeTab: String, editTreeNode: Object, mode: String });
const emit = defineEmits(['update:modelValue', 'confirm', 'closed']);
const formRef = ref(null);
const tableRef = ref(null);
const verifySQLResult = ref(false);
const variableTreeRef = ref();
const form = reactive({
  name: '',
  type: 'relation',
  history: '',
  userVar: false,
  member: '',
  queryMode: 'raw',
  startTime: new Date(),
  endTime: new Date(),
  interval: 0,
  dsGuid: '',
  sql: '',
  calculateId: '',
  calculateScriptId: '',
  searchCriteria: '',
});
const isIntervalDisabled = computed(() => form.queryMode !== 'interval');

const dsList = ref([]); //数据源数据
const tagList = ref([]); //变量数据
const checkedKeys = ref([]); //控制变量树的选中节点
const tableData = ref([]);
const allDatasourceList = ref([]);
const calculateNameList = ref([]);
const calculateScriptList = ref([]);
const maxHeight = computed(() => {
  const tableDataLength = tableData.value.length;

  if (tableDataLength === 0) {
    return '41px';
  }
  if (tableDataLength === 1) {
    return 'calc(176px - 86px)';
  }
  return 'calc(176px - 36px)';
});
nextTick(async () => {
  await initDataSource();
  if (!props.editTreeNode) {
    return;
  }
  Object.assign(form, props.editTreeNode);
  if (props.editTreeNode.type === 'custom') {
    await changeType();
  }
  const clientDataSource = dsList.value.find((item) => item.guid === form.dsGuid);
  if (!clientDataSource) {
    form.dsGuid = '';
  }
  if (props.editTreeNode.type === 'history') {
    await getTagList();
    treeChecked(form.tagList);
    return;
  }
  setTableData(form.tagList);
});

watch(
  () => tableData.value,
  (val) => {
    form.member = val.map((row) => row.content);
  },
  { deep: true },
);
const resetForm = () => {
  Object.assign(form, {
    name: '',
    type: 'relation',
    history: '',
    userVar: false,
    queryMode: 'raw',
    startTime: new Date(),
    endTime: new Date(),
    interval: 0,
    dsGuid: '',
    sql: '',
    calculateId: '',
    calculateScriptId: '',
    searchCriteria: '',
  });
  dsList.value = [];
  tagList.value = [];
  tableData.value = [];
  checkedKeys.value = [];
  allDatasourceList.value = [];
  calculateNameList.value = [];
  calculateScriptList.value = [];
  verifySQLResult.value = false;
  emit('update:modelValue', false);
  emit('close');
};
const initDataSource = async () => {
  const res = await getAllDataSourceServer();
  const configDatasource = await getDataSourceListServer();
  if (res.errorCode === 0 && configDatasource.errorCode === 0 && res.data.length) {
    for (let i = 0; i < res.data.length; i++) {
      allDatasourceList.value[res.data[i].name] = res.data[i];
    }
    dsList.value = configDatasource.data.message.map((item) => {
      return {
        label: item.name,
        guid: item.id,
        dataSourceProjectName: allDatasourceList.value[item.appName]?.name,
        dataSourceProjectId: allDatasourceList.value[item.appName]?.guid,
      };
    });
  }
};
const setTableData = (TableData) => {
  const data = [];
  for (let index = 0; index < TableData.length; index++) {
    data.push({
      content: TableData[index],
    });
  }
  tableData.value = data;
};
const getTagList = async () => {
  const guid = dsList.value.find((item) => item.guid === form.dsGuid)?.dataSourceProjectId;
  const { errorCode, data } = await getVariableServer({ guid });
  const tagListObj = [
    {
      label: t('variable'),
      children: [],
    },
  ];
  if (Array.isArray(data)) {
    tagListObj[0].children = data.map((item, index) => {
      return { label: item.TagName, id: index + 1 };
    });
    tagList.value = tagListObj;
  } else {
    tagList.value = [];
  }
};
const changeType = async () => {
  if (form.type === 'custom') {
    const calculateProject = await getProjectInfoServer('ALL');
    calculateNameList.value = [
      ...calculateProject.map((item) => {
        return { label: item.name, guid: item.guid };
      }),
    ];
    const filterCalculateName = calculateNameList.value.filter((item) => item.guid === form.calculateId);
    if (!filterCalculateName.length) {
      form.calculateId = '';
      form.calculateScriptId = '';
    }
    if (form.calculateId) {
      await getRequestScript(form.calculateId, false);
    }
  }
};
const getRequestScript = async (item, operation = true) => {
  if (operation) {
    form.calculateScriptId = '';
  }
  const requestScripts = await getProjectJSONSettingsServer({
    projectId: item,
    type: 'APIs',
    groupId: -1,
  });
  calculateScriptList.value = requestScripts.map((row) => {
    return { label: row.name, guid: row.GUID };
  });
};

async function submit() {
  let tags = [];
  if (form.type === 'history' && variableTreeRef.value) {
    const checkedTags = variableTreeRef.value.getCheckedNodes();
    tags = checkedTags.filter((item) => !('children' in item)).map((item) => item.label);
  } else {
    for (let index = 0; index < tableData.value.length; index++) {
      tags.push(tableData.value[index].content);
    }
  }
  const regexName = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
  if (!form.name || !regexName.test(form.name)) {
    ElMessage.error(t('dataSetItemNameValidator'));
    return;
  }
  if (form.type !== 'custom') {
    if (!form.dsGuid) {
      ElMessage.error(t('plsSelectDatasource'));
      return;
    }
  }
  if (!tags.length) {
    ElMessage.error(t('addMember'));
    return;
  }
  if (form.type === 'relation') {
    if (!verifySQLResult.value) {
      ElMessage.error(t('verifySQL'));
      return;
    }
  }
  if (form.type === 'custom') {
    if (!form.calculateId) {
      ElMessage.error(t('enterCalculateName'));
      return;
    }
    if (!form.calculateScriptId) {
      ElMessage.error(t('enterCalculateScriptName'));
      return;
    }
    if (!form.searchCriteria) {
      ElMessage.error(t('enterSearchCriteria'));
      return;
    }
  }
  if (form.type === 'history') {
    if (form.queryMode === 'interval' && !form.interval) {
      ElMessage.error(t('enterIntervalTime'));
      return;
    }
    if (form.startTime >= form.endTime) {
      ElMessage.error(t('timeValidator'));
      return;
    }
  }
  const dataSourceName = dsList.value.find((item) => item.guid === form.dsGuid)?.label;
  const dataSourceProjectId = dsList.value.find((item) => item.guid === form.dsGuid)?.dataSourceProjectId;
  const dataSourceType = Object.values(allDatasourceList.value).find((item) => item.guid === dataSourceProjectId)?.type;
  const calculateAppName = calculateNameList.value.find((item) => item.guid === form.calculateId)?.label;
  const calculateScriptName = calculateScriptList.value.find((item) => item.guid === form.calculateScriptId)?.label;
  const dataSetObj = {
    reportId: props.activeTab,
    name: form.name,
    dataSourceName: dataSourceName,
    dsGuid: form.dsGuid,
    dataSourceType: dataSourceType,
    type: form.type,
    sql: form.type === 'relation' ? form.sql : '',
    tagList: tags.length ? tags : [],
    itemList: [],
    queryMode: form.type === 'history' ? form.queryMode : '',
    startTime: form.type === 'history' ? getFormatDate(form.startTime) : '',
    endTime: form.type === 'history' ? getFormatDate(form.endTime) : '',
    interval: form.interval,
    calculateName: form.type === 'custom' ? calculateAppName : '',
    calculateId: form.type === 'custom' ? form.calculateId : '',
    calculateScript: form.type === 'custom' ? calculateScriptName : '',
    calculateScriptId: form.type === 'custom' ? form.calculateScriptId : '',
    searchCriteria: form.type === 'custom' ? form.searchCriteria : '',
  };
  if (props.mode === 'add') {
    const data = await createDateSetServer(dataSetObj);
    if (data.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      resetForm();
    }
  } else {
    dataSetObj.id = form.id;
    const data = await editDataSetServer(dataSetObj);
    if (data.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      resetForm();
    }
  }

  emit('confirm');
}

const treeChecked = (tagArr) => {
  const ids = [];

  function walk(nodes) {
    nodes.forEach((element) => {
      if (tagArr.includes(element.label)) {
        ids.push(element.id);
      }
      if (element.children?.length) {
        walk(element.children);
      }
    });
  }

  walk(tagList.value);
  checkedKeys.value = ids;
};
const deleteSafeSet = (index) => {
  tableData.value.splice(index, 1);
};
const addSafeSet = async () => {
  const noInput = tableData.value.some((item) => !item.content);
  if (noInput) {
    return ElMessage({
      type: 'warning',
      message: t('userListRule3'),
    });
  }
  tableData.value.push({
    content: `content${tableData.value.length + 1}`,
  });
  const tables = tableRef.value?.getTableRef();
  const scrollBody = tables.value?.$el.querySelector('.el-scrollbar__wrap');
  if (scrollBody) {
    tables.value?.setScrollTop(scrollBody.scrollHeight);
  }
};
const validateSQL = () => {
  const validateSQLResult = isSafeSelect(form.sql);
  if (!validateSQLResult) {
    ElMessage.error(t('validateSQL'));
  } else {
    verifySQLResult.value = true;
  }
};
</script>
<template>
  <CustomDialog
    :dialogVisible="modelValue"
    :title="mode === 'add' ? t('addDataSet') : t('editDataSet')"
    :width="700"
    class="custom-dialog dataSet-dialog"
    @update:model-value="(val) => emit('update:modelValue', val)"
    @close="resetForm"
    @confirm="submit"
  >
    <el-form ref="formRef" :model="form" label-width="100px">
      <el-form-item :label="t('dataSetName')" prop="name" required>
        <el-input v-model="form.name" :placeholder="t('enterDataSetName')" />
      </el-form-item>
      <!-- 数据集类型 -->
      <el-form-item :label="t('dataSetType')" prop="type" required>
        <el-select v-model="form.type" :placeholder="t('plsSetlect')" @change="changeType">
          <el-option :label="t('historyDatabase')" value="history" />
          <el-option :label="t('relationDataBase')" value="relation" />
          <el-option :label="t('custom')" value="custom" />
        </el-select>
      </el-form-item>
      <!-- 选择数据源 -->
      <el-form-item :label="t('selectDataSource')" prop="dsGuid" required v-if="form.type !== 'custom'">
        <el-select v-model="form.dsGuid" :placeholder="t('plsSetlect')" @change="getTagList">
          <el-option v-for="item in dsList" :key="item.guid" :label="item.label" :value="item.guid" />
        </el-select>
      </el-form-item>
      <!-- 成员信息 -->
      <el-form-item :label="t('memberInformation')" prop="member" required v-if="form.type !== 'history'">
        <div class="table">
          <CustomStyleTable ref="tableRef" :maxHeight="maxHeight" :showPagination="false" :tableData="tableData">
            <el-table-column :label="t('member')" align="center" prop="content" show-overflow-tooltip>
              <template #default="scope">
                <el-input v-model="scope.row.content" required></el-input>
              </template>
            </el-table-column>
            <el-table-column :label="t('operate')" align="center" prop="name" show-overflow-tooltip width="120">
              <template #default="scope">
                <el-button :disabled="scope.row.disable" plain type="danger" @click="deleteSafeSet(scope.$index)">
                  {{ t('delete') }}
                </el-button>
              </template>
            </el-table-column>
          </CustomStyleTable>
          <div class="add-param-btn" @click="addSafeSet">
            <el-icon>
              <IEpCirclePlusFilled />
            </el-icon>
          </div>
        </div>
      </el-form-item>
      <!-- 查询条件区域 -->
      <template v-if="form.type === 'history'">
        <el-form-item :label="t('searchCriteria')" class="form-history">
          <!-- left -->
          <div class="querybox querybox-tree">
            <el-tree
              :data="tagList"
              show-checkbox
              ref="variableTreeRef"
              default-expand-all
              node-key="id"
              :default-checked-keys="checkedKeys"
            ></el-tree>
          </div>
          <!-- right -->
          <div class="querybox querybox-right">
            <div class="query-mode">
              <el-form-item :label="t('searchMode')">
                <el-radio-group v-model="form.queryMode" class="query-mode-group">
                  <el-radio value="raw">{{ t('rawData') }}</el-radio>
                  <el-radio value="interval">{{ t('intervalQuery') }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </div>
            <div class="start-time">
              <el-form-item :label="t('startTime')">
                <el-date-picker
                  v-model="form.startTime"
                  type="datetime"
                  :placeholder="t('selectDataTime')"
                ></el-date-picker>
              </el-form-item>
            </div>
            <div class="end-time">
              <el-form-item :label="t('endTime')">
                <el-date-picker
                  v-model="form.endTime"
                  type="datetime"
                  :placeholder="t('selectDataTime')"
                ></el-date-picker>
              </el-form-item>
            </div>
            <div class="interval">
              <el-form-item :label="t('interval_ms')">
                <el-input-number
                  v-model="form.interval"
                  :min="0"
                  step-strictly
                  :controls="false"
                  :disabled="isIntervalDisabled"
                />
              </el-form-item>
            </div>
          </div>
        </el-form-item>
      </template>
      <template v-if="form.type === 'relation'">
        <el-form-item :label="t('searchCriteria')" required>
          <el-input
            v-model="form.sql"
            type="textarea"
            :rows="6"
            :placeholder="t('enterSQLstatement')"
            class="el-form-item-textarea"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="validateSQL">{{ t('verify') }}</el-button>
        </el-form-item>
      </template>
      <template v-if="form.type === 'custom'">
        <div class="calculate-flex">
          <el-form-item :label="t('calculateName')" prop="calculateId" required style="width: 100%">
            <el-select
              v-model="form.calculateId"
              :placeholder="t('plsSetlect')"
              @change="getRequestScript"
              style="flex: 1"
            >
              <el-option v-for="item in calculateNameList" :key="item.guid" :label="item.label" :value="item.guid" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('calculateScript')" prop="calculateScriptId" required style="width: 100%">
            <el-select v-model="form.calculateScriptId" :placeholder="t('plsSetlect')" style="flex: 1">
              <el-option v-for="item in calculateScriptList" :key="item.guid" :label="item.label" :value="item.guid" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item :label="t('searchCriteria')" prop="searchCriteria" required>
          <el-input v-model="form.searchCriteria" type="textarea" :rows="6" class="el-form-item-textarea" />
        </el-form-item>
      </template>
    </el-form>
  </CustomDialog>
</template>
<style scoped lang="scss">
.query-mode {
  padding: 3px 0;
}

.start-time {
  padding: 3px 0;
}

.end-time {
  padding: 3px 0;
}

.interval {
  padding: 3px 0;
}

.querybox {
  border: 1px solid #dcdfe6;
  height: 270px;
  overflow-y: auto;
  :deep(.el-tree-node__expand-icon.is-leaf) {
    display: none !important;
  }
  :deep(.el-tree-node__children .el-tree-node__content) {
    display: flex;
    align-items: center;
    padding-left: 40px !important;
  }
  :deep(.el-tree-node__children .el-tree-node__content .el-tree-node__expand-icon) {
    margin-right: 6px !important;
  }
}

.querybox-tree {
  padding-top: 6px;
  width: 30%;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.querybox-right {
  width: 70%;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.query-mode-group {
  display: inline-flex;
  gap: 24px;
}

.calculate-flex {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 660px;
}

.add-param-btn {
  width: 100%;
  border: 1px dashed rgb(24, 144, 255);
  height: 36px;
  background: rgba(24, 144, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  &:hover {
    background: rgba(24, 144, 255, 0.4);
  }
}

.table {
  width: 100%;
  height: 176px;
}
.custom-dialog {
  height: 650px;
  position: relative;
  footer {
    position: absolute;
    top: 590px;
    left: 510px;
  }
}
</style>
<style>
.dataSet-dialog {
  height: 650px;
  position: relative;
}
.dataSet-dialog footer {
  position: absolute;
  top: 590px;
  left: 510px;
}
</style>
