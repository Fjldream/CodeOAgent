<script setup>
import { ElMessage, genFileId } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useConfirm } from '@/composables/useConfirm.js';
import { useI18n } from 'vue-i18n';
import {
  getVariableServer,
  createVariableServer,
  editVariableServer,
  deleteVariableServer,
  importTagsServer,
  exportTagsServer,
  getVariableAttributeServer,
  moveVariableServer,
} from '@/api/allRequest/collectionAPI.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { debounce } from '@/utils/commonUtils.js';
import { batchZIPDownloadHandle } from '@/utils/importExportUtils.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import UpsertVariableEngineerDialog from '@/views/Main/CollectionView/CollectionDialogView/UpsertVariableEngineerDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CsvEncodingSelect from '@/views/Main/CollectionView/CollectionDialogView/CsvEncodingSelect.vue';

const { t } = useI18n();
const collectionMenuStore = useCollectionMenuStore();
const uploadRef = useTemplateRef('uploadRef');
const fileList = ref([]);
const maxHeight = ref('calc(100vh - 190px)');
const tableData = ref([]);
const pageSizes = ref([10, 20, 30, 50, 100, 200, 2000]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogType = ref('');
const searchKeyword = ref('');
const activeDialogComponent = shallowRef(null);
const selectRows = ref([]);
const configDatasource = ref([]);
const dataDictionaryForm = ref({});
const editRows = ref({});
const tagTypeOptions = ref(null);
const searchTagType = ref('');
const searchType = ref(1);
const isLoading = ref(false);
const loadingText = ref('');
const moveVisible = ref(false);
const searchTypeOptions = ref([
  { label: t('variableName'), id: 1 },
  { label: t('variableType'), id: 2 },
]);
const encodingSelectVisible = ref(false);
const encodingData = ref('utf-8');
const uploadTrigger = ref(null);
const variablesGroupData = collectionMenuStore.collectionMenuList.filter((item) => item.id == 'variablesRoot');
const tableColumns = computed(() => {
  return [
    {
      label: t('variableName'),
      props: 'tagName',
    },
    {
      label: 'ID',
      props: 'tagId',
    },
    {
      label: t('variableNameDescription'),
      props: 'description',
    },
    {
      label: t('belongGroup'),
      props: 'tagGroupName',
    },
    {
      label: t('belongEquipment'),
      props: 'deviceName',
    },
    {
      label: t('dataType'),
      props: 'TagDataType',
    },
    {
      label: t('registerName'),
      props: 'RegName',
    },
    {
      label: t('registerAddress'),
      props: 'regAddress',
    },

    {
      label: t('readWriteType'),
      props: 'AccessType',
    },
  ];
});
//检索
const filterData = computed(() =>
  tableData.value
    .filter((item) => {
      if (!item.tagName.toLowerCase().includes(searchKeyword.value.toLowerCase())) {
        return false;
      }
      return !(searchTagType.value && item.tagDataType !== searchTagType.value);
    })
    .map((item) => {
      switch (item.AccessType) {
        case '只读':
          item.AccessType = t('onlyRead');
          break;
        case '只写':
          item.AccessType = t('onlyWrite');
          break;
        case '读写':
          item.AccessType = t('readWrite');
          break;
        default:
          break;
      }
      return item;
    }),
);
watchEffect(async () => {
  const { level } = collectionMenuStore.currentCollectionRow;
  await nextTick(async () => {
    if (collectionMenuStore.currentCollectionRow.path === 'collection-daq-variables') {
      await getVariableAttribute();
      await getTableData();
    }
  });
});
// 新增事件
const addDataDictionary = () => {
  dialogType.value = 'create';
  activeDialogComponent.value = UpsertVariableEngineerDialog;
  dialogTitle.value = t('createVariables');
  editRows.value = {};
  dialogVisible.value = true;
};

// 编辑事件
const editDataDictionary = (row) => {
  dialogType.value = 'edit';
  activeDialogComponent.value = UpsertVariableEngineerDialog;
  dialogTitle.value = t('editVariables');
  editRows.value = row[0];
  dialogVisible.value = true;
};

// 删除事件
const deleteDataDictionary = async (delRow) => {
  await useConfirm(`${t(`sureForSelectRow`, { length: delRow.length })}`, t('sureForDelete'));
  const tagIds = delRow.map((row) => row.tagId);
  const restful = await deleteVariableServer({ tagIds });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};

// 提交form
const handleConfirm = async (data) => {
  dialogVisible.value = false;
  if (dialogType.value === 'create') {
    const restful = await createVariableServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getTableData();
    }
  } else {
    const restful = await editVariableServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      await getTableData();
    }
  }
};
// 表格显示
const tableSelect = (row) => {
  selectRows.value = row;
};

const getTableData = async () => {
  const data = await getVariableServer();
  if (data) {
    tableData.value = data;
  }
};
const refreshData = async () => {
  await getTableData();
};
//导出
const exportHandle = async () => {
  const tagList = selectRows.value.map((row) => row.tagName);
  const restful = await exportTagsServer({ tagList });
  if (restful.errorCode === 0) {
    const { data } = restful;
    const downlandFiles = [
      {
        url: data,
        fileName: data.split('/')[data.split('/').length - 1],
      },
    ];
    await batchZIPDownloadHandle(downlandFiles);
    ElMessage.success(t('exportSuccess'));
  }
};
const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();
  uploadRef.value?.handleStart(file);
};
// 文件上传
const fileChange = debounce(async (file, files) => {
  fileList.value = files;
  await submitUpload();
}, 1000);
// modified by  jinlong.feng at 1119 修复变量导入失败后的状态清理
/**
 * @function submitUpload
 * @description 导入变量，无论成功或失败均清理loading和上传列表。
 * @returns {Promise<void>} 导入处理结果。
 */
const submitUpload = async () => {
  try {
    isLoading.value = true;
    loadingText.value = t('variablesImportLoading');
    const formData = new FormData();
    formData.append('tagsFiles', fileList.value[0].raw);
    formData.append('projectId', collectionMenuStore.currentCollectionEngineer.guid);
    formData.append('groupId', collectionMenuStore.currentCollectionRow.actualId || '-1');
    formData.append('fileType', 'csv');
    formData.append('encoding', encodingData.value);
    const res = await importTagsServer(formData);
    if (res.errorCode === 0) {
      ElMessage.success(t('importSuccess'));
    }
    await getTableData();
    await collectionMenuStore.getCollectionMenuList();
  } finally {
    isLoading.value = false;
    loadingText.value = '';
    fileList.value = [];
    fileUploadSuccess();
  }
};
// end
const fileUploadSuccess = () => {
  uploadRef.value?.clearFiles();
};
const fileUploadError = () => {
  uploadRef.value?.clearFiles();
};
const getVariableAttribute = async () => {
  const attributeData = await getVariableAttributeServer();
  if (attributeData) {
    tagTypeOptions.value = attributeData.TagDataType.editor.options.data;
  }
};
const resetSearch = () => {
  searchTagType.value = '';
  searchKeyword.value = '';
};
//打开移动弹窗
const openMove = async () => {
  moveVisible.value = true;
};
const handleMove = async (row) => {
  const toMoveRows = selectRows.value.map((item) => item.tagId);
  let body = { varIds: toMoveRows, targetVarGroupId: row.actualId ? parseInt(row.actualId) : 'root' };
  let res = await moveVariableServer(body);
  if (res?.errorCode === 0) {
    ElMessage.success(t('operateSuccess'));
    await getTableData();
  }
  moveVisible.value = false;
};
const handleSelectFile = (encoding) => {
  encodingData.value = encoding;
  uploadTrigger.value?.$el?.click();
};
</script>

<template>
  <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />
  <div class="content">
    <header class="header-inline">
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
    <div class="operate-list mb-20 df">
      <div class="button-list-con df">
        <el-button type="primary" @click="addDataDictionary">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selectRows.length !== 1" type="primary" @click="editDataDictionary(selectRows)">
          <el-icon class="mr-5">
            <IEpEditPen />
          </el-icon>
          {{ t('edit') }}
        </el-button>
        <el-button :disabled="selectRows.length === 0" type="danger" @click="deleteDataDictionary(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-button @click="encodingSelectVisible = true">
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
        <el-upload
          ref="uploadRef"
          v-show="false"
          :auto-upload="false"
          :before-upload="() => false"
          :file-list="fileList"
          :limit="1"
          :on-change="fileChange"
          :on-error="fileUploadError"
          :on-exceed="exceedHandle"
          :on-success="fileUploadSuccess"
          :show-file-list="false"
          accept=".csv"
          class="ml-10"
          name="uploadFiles"
        >
          <template #trigger>
            <el-button ref="uploadTrigger">
              <el-icon class="mr-5">
                <IEpDownload />
              </el-icon>
              {{ t('import') }}
            </el-button>
          </template>
        </el-upload>
        <el-button :disabled="!selectRows.length" @click="exportHandle">
          <el-icon class="mr-5">
            <IEpUpload />
          </el-icon>
          {{ t('export') }}
        </el-button>
        <el-button :disabled="!selectRows.length" @click="openMove">
          <el-icon class="mr-5">
            <IEpSoldOut />
          </el-icon>
          {{ t('move') }}
        </el-button>
      </div>
      <div class="search-box">
        <el-select v-model="searchType" class="search-type" @change="resetSearch">
          <el-option v-for="row of searchTypeOptions" :key="row.id" :label="row.label" :value="row.id"></el-option>
        </el-select>
        <el-select v-model="searchTagType" v-if="searchType === 2">
          <el-option v-for="row of tagTypeOptions" :key="row.id" :label="row.text" :value="row.id"></el-option>
        </el-select>
        <el-input
          v-model="searchKeyword"
          v-if="searchType === 1"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          clearable
          size="default"
        />
        <el-button style="width: 36px" @click="refreshData">
          <el-icon>
            <IEpRefresh />
          </el-icon>
        </el-button>
      </div>
    </div>
    <CustomStyleTable
      :max-height="maxHeight"
      :tableData="filterData"
      :pageSizes="pageSizes"
      class="table-custom"
      rowKey="tagId"
      @selectionChange="tableSelect"
    >
      <el-table-column :selectable="selectable" align="center" type="selection" width="55" />
      <el-table-column
        v-for="propItems of tableColumns"
        :formatter="propItems.formatter"
        :key="propItems.props"
        :label="t(propItems.label)"
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
        :rowData="{ ...editRows, dialogType }"
        :editForm="dataDictionaryForm"
        :title="dialogTitle"
        @confirm="handleConfirm"
      />
    </div>
  </div>
  <MovePlaneDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :pageTreeData="variablesGroupData"
    @confirm="handleMove"
  />
  <CsvEncodingSelect v-model="encodingSelectVisible" @select-file="handleSelectFile"></CsvEncodingSelect>
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
    margin-top: 8px;
    display: flex;
    @media screen and (min-width: 768px) {
      margin-top: 0;
    }

    .search-type {
      margin-left: 10px;
    }
    .el-input {
      width: 220px;
    }
    .el-select:nth-child(1) {
      width: 100px;
      margin-right: 10px;
    }
    .el-select:nth-child(2) {
      width: 220px;
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
