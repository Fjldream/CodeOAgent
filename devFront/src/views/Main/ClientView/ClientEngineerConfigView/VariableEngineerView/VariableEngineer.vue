<script setup>
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

import { useConfirm } from '@/composables/useConfirm.js';
import { useI18n } from 'vue-i18n';
import { exportTableToExcel } from '@/utils/importExportUtils.js';
import { useVariableEngineer } from '@/composables/clientCompose/useVariableEngineer.js';
import { fileChangeHandle } from '@/utils/commonUtils.js';
import { getDateName } from '@/utils/dayjsUtil.js';
import { regexSafeTExt } from '@/utils/regexRules.js';
import {
  addVariableServer,
  deleteVariableServer,
  getDataSourceListServer,
  getVariableListServer,
  importVariableServer,
  modifyVariableServer,
  updatePageTagIdServer,
} from '@/api/allRequest/clientAPI';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import UpsertVariableEngineerDialog from '@/views/Main/ClientView/ClientDialogView/UpsertVariableEngineerDialog.vue';
import QuickAddVariableDialog from '@/views/Main/ClientView/ClientDialogView/QuickAddVariableDialog.vue';
import QuickAddResolveDialog from '@/views/Main/ClientView/ClientDialogView/QuickAddResolveDialog.vue';
import QuickAddReportDialog from '@/views/Main/ClientView/ClientDialogView/QuickAddReportDialog.vue';

const { t } = useI18n();
const maxHeight = ref('calc(100vh - 190px)');
const clientMenuStore = useClientMenuStore();

const { translateVariableData, getTagTypeName } = useVariableEngineer({ t });
const changeTagTypeName = getTagTypeName();
const tableData = shallowRef([]);
const loading = ref(false);
const freezeTableData = shallowRef(tableData.value);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const searchKeyword = ref('');
const isCopy = ref(false);
const activeDialogComponent = shallowRef(null);
const selectRow = ref([]);
const configDatasource = ref([]);
const copyVars = ref([]);
// niudun.zhu
const existingNames = ref([]);
const quickAddFailedVars = ref([]);
const quickAddSuccessCount = ref([]);
const precheckResultVars = ref([]);
const resolveResultVars = ref({});
const uploadRef = useTemplateRef('uploadRef');
const dataDictionaryForm = ref({
  name: '',
  type: '',
  value: '',
  description: '',
  isMap: false,
  dataSourceType: '',
  writeAndRead: 0,
  dataSourceItem: {
    name: '',
    tagName: '',
    appName: '',
    variableType: '',
  },
  linkType: '',
  frequent: 3000,
});
const disabledEditName = [
  '$Year',
  '$Month',
  '$Day',
  '$Hour',
  '$Minute',
  '$Second',
  '$MilliSecond',
  '$Date',
  '$Time',
  '$DayofWeek',
];
const disabledList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const variableTypeEnum = new Set([0, 1, 2]);
const getAllTableDataName = computed(() => tableData.value.map((items) => items.name));
const tableColumns = computed(() => {
  return [
    {
      label: 'ID',
      props: 'id',
      minWidth: '8%',
    },
    {
      label: t('variableName'),
      props: 'name',
      minWidth: '8%',
    },
    {
      label: t('variableNameDescription'),
      props: 'description',
      minWidth: '16%',
    },
    {
      label: t('variableType'),
      props: 'typeName',
      minWidth: '8%',
    },
    {
      label: t('initValue'),
      props: 'value',
      minWidth: '8%',
    },
    {
      label: t('associatedDataSourceName'),
      props: 'dataSourceName',
      minWidth: '12%',
      formatter: (row) => {
        const data = configDatasource.value.find((item) => item.dataSourceName === row.dataSourceName);
        return data ? data.name : null;
      },
    },
    {
      label: t('datasourceType'),
      props: 'dataSourceType',
      minWidth: '12%',
    },
    {
      label: t('associatedTagName'),
      props: 'tagName',
      minWidth: '8%',
    },
    {
      label: t('associatedTagType'),
      props: 'tagType',
      minWidth: '8%',
    },
  ];
});

watchEffect(async () => {
  if (clientMenuStore.currentClientRow.path === 'client-variables-engineer' && clientMenuStore.currentClientRow.id) {
    await nextTick();
    await getCilentDataSourceList();
    initPageData();
  }
});
const selectable = (row) => !disabledList.includes(row.id);

/**
 * @function initPageData
 * @description 初始化页面数据
 * @returns null
 */
const initPageData = async () => {
  loading.value = true;
  const { data, errorCode } = await getVariableListServer();
  if (errorCode === 0) {
    let variableData = data.message;

    if (clientMenuStore.currentClientRow.level !== 1) {
      variableData = variableData.filter((item) => item.hasOwnProperty(clientMenuStore.currentClientRow.id));
    }
    let variables = [];
    for (const variableEle of variableData) {
      variables = [...variables, ...Object.values(variableEle)[0].Variables];
    }
    const change = { 1: 0, 2: 1, 3: 1, 4: 1, 5: 2 };
    const newTableData = variables
      .map((tag) => {
        return {
          id: tag.id,
          name: tag.name,
          description: tag.comment,
          type: tag.dataType,
          typeName: changeTagTypeName.value[parseInt(tag.dataType)],
          value: tag.defaultValue,
          dataSourceName: tag.dataSourceItem?.appName,
          dataSourceType: tag.dataSourceType,
          tagName: tag.dataSourceItem?.tagName,
          tagType: changeTagTypeName.value[change[tag.dataSourceItem?.variableType]],
          isWrite: '',
          originData: tag,
        };
      })
      .sort((a, b) => a.id - b.id);
    tableData.value = [...newTableData];
    freezeTableData.value = [...newTableData];
  }
  loading.value = false;
};

// 新增事件
const addDataDictionary = () => {
  dataDictionaryForm.value = {
    name: '',
    type: '',
    value: '',
    description: '',
    isMap: false,
    dataSourceType: '',
    writeAndRead: 0,
    dataSourceItem: {
      name: '',
      tagName: '',
      appName: '',
      variableType: '',
    },
    linkType: '',
    frequent: 3000,
  };
  activeDialogComponent.value = UpsertVariableEngineerDialog;
  dialogTitle.value = t('createVariables');
  dialogVisible.value = true;
};

// 编辑事件
const editDataDictionary = () => {
  activeDialogComponent.value = UpsertVariableEngineerDialog;
  const { originData } = { ...selectRow.value[0] };
  dataDictionaryForm.value = {
    id: originData.id,
    name: originData.name,
    type: originData.dataType,
    value: originData.defaultValue,
    description: originData.comment,
    isMap: originData.isMap,
    dataSourceType: originData.dataSourceType,
    writeAndRead: originData.writeAndRead,
    dataSourceItem: originData.dataSourceItem,
    linkType: originData.linkType,
    frequent: originData.frequent,
  };
  dialogTitle.value = t('editVariables');
  dialogVisible.value = true;
};

// 删除事件
const deleteDataDictionary = async () => {
  const result = await useConfirm(t('sureForDeleteSelectVariables'), t('deleteDatasource'));
  if (result === 'confirm') {
    const selectIds = selectRow.value.map((items) => {
      return { id: items.id, name: items.name };
    });
    const res = await deleteVariableServer(selectIds, clientMenuStore.currentClientRow.id);
    if (res.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      initPageData();
    }
  }
};

// 提交form
const onSubmit = async (row, oldName) => {
  dialogVisible.value = false;
  if (row.type === 0) {
    if (row.value === 'true') {
      row.value = true;
    }
    if (row.value === 'false') {
      row.value = false;
    }
  }
  if (dialogTitle.value === t('editVariables')) {
    const result = translateVariableData([row], true);
    const res = await modifyVariableServer(result[0], oldName);
    if (res.errorCode === 0) {
      ElMessage.success(t('updateSuccess'));
    }
  } else {
    const result = translateVariableData([row]);
    const { data, errorCode } = await addVariableServer(result, clientMenuStore.currentClientRow.id);
    if (errorCode === 0) {
      if (data.duplicateVariables?.length > 0) {
        ElMessage.info(
          `${t(`checkReplaceString`, { replaceNames: data.duplicateVariables.map((item) => item.name).join('、') })}`,
        );
      } else {
        ElMessage.success(t('addSuccess'));
      }
    }
  }
  initPageData();
};
// 表格显示
const tableSelect = (row) => {
  selectRow.value = row;
};

// 复制事件
const copyHandle = () => {
  isCopy.value = true;
  copyVars.value = [...selectRow.value];
  ElMessage({
    type: 'success',
    message: t('copySuccess'),
  });
};

// 粘贴事件
const pasteHandle = async () => {
  if (!isCopy.value) {
    return false;
  }
  const allTableDataNames = tableData.value.map((item) => item.name);
  const postData = copyVars.value.map((items) => {
    let copyName = `${items.name}_copy`;
    // 防止名称重复
    while (allTableDataNames.includes(copyName)) {
      copyName = `${copyName}_copy`;
    }
    allTableDataNames.push(copyName);
    return {
      ...items.originData,
      name: copyName,
      id: '',
    };
  });
  const res = await addVariableServer(postData, clientMenuStore.currentClientRow.id);
  if (res.errorCode === 0) {
    ElMessage.success(t('pasteSuccess'));
  }
  initPageData();
  isCopy.value = false;
};

// 文件上传
const fileChange = async (file) => {
  const fileChangeData = await fileChangeHandle(file, [...tableColumns.value, { props: 'type', label: 'TYPE' }]);
  const importData = fileChangeData?.filter((item) => !disabledEditName.includes(item.name));

  const importParams = importData
    .map((row) => {
      if (!regexSafeTExt(row.name) || !row.name) {
        return;
      }
      if (!variableTypeEnum.has(+row.type)) {
        return;
      }

      let dataSourceType;
      switch (+row.type) {
        case 0:
          dataSourceType = 1;
          break;
        case 1:
          dataSourceType = 2;
          break;
        case 2:
          dataSourceType = 5;
          break;
        default:
          dataSourceType = '';
      }
      const datasource = configDatasource.value.find((ele) => ele.name === row.dataSourceName);
      const obj = {
        name: row.name,
        type: +row.type || 0,
        value: row.value,
        description: row.description,
        isMap: !!row.tagName,
        dataSourceType: row.dataSourceType,
        writeAndRead: 0,
        dataSourceItem: {
          name: datasource?.dataSourceName || '',
          tagName: row.tagName,
          appName: datasource?.appName || '',
          variableType: datasource?.dataSourceName ? dataSourceType : '',
        },
        dataSourceName: row.dataSourceName,
        projectDataSourceId: datasource?.id || '',
        linkType: '',
        frequent: 3000,
      };
      if (obj.type === 0) {
        obj.value = obj.value !== 'false';
      }
      if (obj.type === 1) {
        obj.value = parseInt(obj.value);
      }
      return obj;
    })
    .filter((row) => !!row);

  if (importParams.length === 0) {
    ElMessage.warning(t('importError'));
  } else {
    const res = await importVariableServer(translateVariableData(importParams));
    initPageData();
  }
  uploadRef.value?.clearFiles();
};

// 导出变量
const exportHandle = () => {
  exportTableToExcel({
    tableData: selectRow.value.reduce((acc, row) => {
      if (!disabledList.includes(row.id)) {
        const newRow = JSON.parse(JSON.stringify(row));
        const data = configDatasource.value.find((ele) => ele.dataSourceName === newRow.dataSourceName);
        newRow.dataSourceName = data ? data.name : null;
        acc.push(newRow);
      }
      return acc;
    }, []),
    tableColumn: [...tableColumns.value, { props: 'type', label: 'TYPE' }],
    filename: `variable_${getDateName()}.xlsx`,
  });
};

// 搜索事件
const searchHandle = (val) => {
  tableData.value = freezeTableData.value.filter((items) => items.name.includes(val));
};
const quickAdd = async () => {
  await getCilentDataSourceList();
  activeDialogComponent.value = QuickAddVariableDialog;
  dialogTitle.value = t('quickAdd');
  dialogVisible.value = true;
};

async function getCilentDataSourceList() {
  const {
    data: { message },
  } = await getDataSourceListServer({ projectId: clientMenuStore.currentClientEngineer.guid });
  configDatasource.value = message;
}

async function quickAddConfirm(addData) {
  dialogVisible.value = false;
  const res = await addVariableServer(addData, clientMenuStore.currentClientRow.id);
  if (res?.errorCode === 0) {
    quickAddSuccessCount.value = res.data?.addVariables.length;
    if (res.data.duplicateVariables.length > 0) {
      // niudun.zhu
      quickAddFailedVars.value = res.data.duplicateVariables || [];
      existingNames.value = getAllTableDataName.value;
      activeDialogComponent.value = QuickAddResolveDialog;
      dialogTitle.value = t('importVariable');
      dialogVisible.value = true;
    } else {
      ElMessage.success(t('quickAddVarsSuccess'));
    }
    initPageData();
  }
}

async function onResolve(resolveResult) {
  dialogVisible.value = false;
  precheckResultVars.value = resolveResult;
  const importArr = resolveResult.importableArr;
  const toReplaceArr = importArr.filter((el) => el.action === 'replace');
  let addRes = null;
  if (toReplaceArr.length > 0) {
    // 删除原变量进行替换
    const toDelArr = [];
    for (const item of toReplaceArr) {
      const toDelItem = tableData.value.find((el) => el.name === item.name);
      toDelArr.push(toDelItem);
    }
    const delRes = await deleteVariableServer(toDelArr, clientMenuStore.currentClientRow.id);
    if (delRes?.errorCode === 0 && delRes?.data.state === 200) {
      addRes = await addVariableServer(importArr);
    }
  } else {
    addRes = await addVariableServer(importArr, clientMenuStore.currentClientRow.id);
  }
  if (addRes?.errorCode === 0) {
    resolveResultVars.value = addRes?.data;
  } else {
    resolveResultVars.value = { failedArr: importArr };
  }
  activeDialogComponent.value = QuickAddReportDialog;
  dialogTitle.value = t('importReport');
  dialogVisible.value = true;
}

function onResolveCancel() {
  dialogVisible.value = false;
}

function onReportConfirm() {
  dialogVisible.value = false;
}

function onReportClose() {
  dialogVisible.value = false;
}
const pageSync = async () => {
  const res = await updatePageTagIdServer();
  if (res?.errorCode === 0) {
    ElMessage.success(t('syncSuccess'));
  }
};
</script>

<template>
  <div class="content">
    <header class="header-inline">
      <template v-for="(item, index) in clientMenuStore.currentClientTitle" :key="index">
        <div v-if="index < clientMenuStore.currentClientTitle.length - 1">
          <span class="text">{{ item }}</span>
          <span class="diagonal-divider"></span>
        </div>
        <div v-else>
          <span class="text-current">{{ item }}</span>
        </div>
      </template>
    </header>
    <div class="operate-list mb-20 df">
      <div class="button-list-con df">
        <el-button type="primary" @click="addDataDictionary">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selectRow.length !== 1" type="primary" @click="editDataDictionary">
          <el-icon class="mr-5">
            <IEpEditPen />
          </el-icon>
          {{ t('edit') }}
        </el-button>
        <el-button :disabled="selectRow.length === 0" type="danger" @click="deleteDataDictionary">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-button :disabled="selectRow.length === 0" @click="copyHandle">
          <el-icon class="mr-5">
            <IEpCopyDocument />
          </el-icon>
          {{ t('copy') }}
        </el-button>
        <el-button @click="pasteHandle">
          <el-icon class="mr-5">
            <IEpDocumentCopy />
          </el-icon>
          {{ t('paste') }}
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="fileChange"
          :show-file-list="false"
          accept=".xlsx, xls"
          class="ml-10"
        >
          <el-button>
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </el-upload>
        <el-button @click="exportHandle">
          <el-icon class="mr-5">
            <IEpUpload />
          </el-icon>
          {{ t('export') }}
        </el-button>
        <el-button type="primary" @click="quickAdd">
          <el-icon class="mr-5">
            <IEpDocumentAdd />
          </el-icon>
          {{ t('quickAdd') }}
        </el-button>
        <el-button type="primary" @click="pageSync">
          <el-icon class="mr-5">
            <IEpMoney />
          </el-icon>
          {{ t('pageSync') }}
        </el-button>
      </div>
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :prefix-icon="Search"
          class="search-input"
          clearable
          size="default"
          @input="searchHandle"
        />
      </div>
    </div>
    <CustomStyleTable
      :max-height="maxHeight"
      :loading="loading"
      :tableData="tableData"
      class="table-custom"
      rowKey="id"
      @selectionChange="tableSelect"
      :border="true"
    >
      <el-table-column :selectable="selectable" align="center" type="selection" width="55" />
      <el-table-column
        v-for="propItems of tableColumns"
        :formatter="propItems.formatter"
        :key="propItems.props"
        :label="propItems.label"
        :min-width="propItems.minWidth"
        :prop="propItems.props"
        align="center"
        show-overflow-tooltip
      />
    </CustomStyleTable>

    <div class="dialog">
      <component
        :is="activeDialogComponent"
        v-if="dialogVisible"
        v-model:dialogVisible="dialogVisible"
        :configDatasource="configDatasource"
        :editForm="dataDictionaryForm"
        :title="dialogTitle"
        :initialFailed="quickAddFailedVars"
        :existingNames="existingNames"
        :quickAddSuccessCount="quickAddSuccessCount"
        :precheckResultVars="precheckResultVars"
        :resolveResultVars="resolveResultVars"
        @quickAddConfirm="quickAddConfirm"
        @submit="onSubmit"
        @resolve="onResolve"
        @cancel="onResolveCancel"
        @confirm="onReportConfirm"
        @close="onReportClose"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.content {
  width: 100%;
  height: 100%;

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

  .page-name {
    .el-button {
      padding: 5px;
    }

    .el-button + .el-button {
      margin: 0;
    }
  }

  .userPerson-icon {
    width: 2em;
    height: 2em;
  }

  .operate-list {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .button-list-con {
      display: flex;
      flex-wrap: wrap; // 按钮自动换行
      gap: 0px; // 按钮之间的间距
      .el-button {
        border-radius: 4px;
      }
    }

    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }

  .search-box {
    min-width: 260px;
    margin-top: 8px;
    @media screen and (min-width: 768px) {
      margin-top: 0;
    }

    .search-input {
      width: 260px;
    }

    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }

  .operate-button {
    .el-button {
      width: 48px;
      height: 21px;
      padding: 0; // 去掉内边距以保持设定高度
      font-size: 14px;
      line-height: 48px; // 垂直居中
      text-align: center;
      white-space: nowrap; // 防止文字换行
      overflow: hidden;
      text-overflow: ellipsis; // 超出隐藏（可选）
    }
  }
}
</style>
