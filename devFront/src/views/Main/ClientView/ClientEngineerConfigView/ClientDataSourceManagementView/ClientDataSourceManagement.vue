<script setup>
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import {
  addDataSourceServer,
  deleteDataSourceServer,
  editDataSourceServer,
  getDataSourceListServer,
  getVariableListServer,
} from '@/api/allRequest/clientAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { regexValidator } from '@/utils/regexRules.js';
import { getAllDataSourceServer, getDbTestServer } from '@/api/allRequest/dataSourceAPI.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const clientMenuStore = useClientMenuStore();
const { t } = useI18n();

const maxHeight = ref('calc(100vh - 190px)');
// 控制 loading 展示
const isLoading = ref(false);
// 控制 loading 文本
const loadingText = ref(t('testConnecting'));
// 选中行
const selectRows = ref([]);
// dialog显示变量
const dialogVisible = ref(false);
const dialogType = ref('');
// 表格原始数据
const tableData = ref([]);
// 表单ref
const formRef = ref(null);
// 表单数据
const formData = reactive({
  dataSourceName: '',
  type: '',
  name: '',
  comment: '',
  id: '',
});
// 表单验证规则
const formRules = {
  dataSourceName: [{ required: true, message: t('plsSelectDatasource'), trigger: 'blur' }],
  type: [{ required: true, message: t('plsinputDatasourceType'), trigger: 'blur' }],
  name: [regexValidator('safaText', t('nameRule'))],
  comment: [regexValidator('noXss', t('illegalInput'), false)],
};
// 下来列表选项 - 后期接口获取
const dataSourceOptions = ref([]);
const selectOption = ref([]);
// 搜索框数据绑定
const searchKeyword = ref('');
//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);

nextTick(async () => {
  await getTableData();
});

watchEffect(() => {
  const options = [...dataSourceOptions.value];
  const dataSourceNames = filterData.value.map((item) => item.dataSourceName);
  for (let index = 0; index < options.length; index++) {
    const optionItem = options[index];
    if (dataSourceNames.includes(optionItem.name)) {
      optionItem.disabled = true;
    } else {
      optionItem.disabled = false;
    }
  }
  selectOption.value = options;
});

//创建
const createDialog = async () => {
  dialogType.value = 'create';
  await getDataSource();
  dialogVisible.value = true;
};
//编辑
const editDialog = async (row) => {
  dialogType.value = 'edit';
  await getDataSource();
  formData.dataSourceName = row.dataSourceName;
  formData.type = row.type;
  formData.name = row.name;
  formData.comment = row.comment;
  formData.id = row.id;
  dialogVisible.value = true;
};

/**
 * @function handleCancelDialog
 * @description dialog取消函数事件
 * @param val
 * @returns null
 */
function handleCancelDialog(val) {
  Object.assign(formData, {
    dataSourceName: '',
    type: '',
    name: '',
    comment: '',
    id: '',
  });
  dialogVisible.value = false;
}

// 确认及取消
const handleConfirm = (data) => {
  formRef.value.validate(async (valid, errorFields) => {
    if (valid) {
      const { guid: projectId } = clientMenuStore.currentClientEngineer;
      if (dialogType.value === 'create') {
        const restful = await addDataSourceServer({ ...data, projectId });
        if (restful && restful.errorCode === 0) {
          ElMessage.success(t('createSuccess'));
          await getTableData();
        }
      } else {
        const restful = await editDataSourceServer({ ...data, projectId });
        if (restful && restful.errorCode === 0) {
          ElMessage.success(t('editSuccess'));
          await getTableData();
        }
      }
      Object.assign(formData, {
        dataSourceName: '',
        type: '',
        name: '',
        comment: '',
        id: '',
      });
      dialogVisible.value = false;
    }
  });
};
//删除
const handleDelete = async (delRow) => {
  const toDeleteRows = delRow;
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));

  //删除前查找数据源的变量是否未删除
  const dataSourceNameSet = new Set(toDeleteRows.map((row) => row.dataSourceName));
  const { data: varData } = await getVariableListServer();
  if (!varData) {
    return ElMessage.error(t('deleteError'));
  }
  const status = varData.message.some((obj) =>
    Object.values(obj).some((inner) =>
      inner?.Variables?.some((v) => v?.dataSourceItem?.appName && dataSourceNameSet.has(v.dataSourceItem.appName)),
    ),
  );
  if (status) {
    return ElMessage.error(t('variableInDataSource'));
  }
  const ids = toDeleteRows.map((row) => row.id);
  const restful = await deleteDataSourceServer({ projectId, ids });
  if (restful && restful.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};

/**
 * @function handldDataSourceChange
 * @description 下拉框改变事件处理
 * @param val
 * @returns null
 */
function handldDataSourceChange(val) {
  formData.type = dataSourceOptions.value.find((row) => row.name === val).type;
}

//获取数据源工程
const getDataSource = async () => {
  const { data } = await getAllDataSourceServer();
  dataSourceOptions.value = data;
};

/**
 * @function handleSelectionChange
 * @description 选择行数据改变函数
 * @param {Array} val 选择行数据
 * @returns null
 */
function handleSelectionChange(val) {
  selectRows.value = val;
}

/**
 * @function dbConnectTest
 * @description 测试连接
 * @param {Array} row 行数据
 * @returns null
 */
async function dbConnectTest(row) {
  isLoading.value = true;
  try {
    await getDataSource();
    const dbtestItem = dataSourceOptions.value.find((item) => item.name === row.dataSourceName);
    if (!dbtestItem) {
      ElMessage.warning(t('sureForDatasourceConfig'));
      isLoading.value = false;
      return;
    }
    const { errorCode } = await getDbTestServer({ ...dbtestItem, ...dbtestItem.config });
    isLoading.value = false;
    if (errorCode === 0) {
      ElMessage.success(t('testConnectSuccess'));
    }
  } finally {
    isLoading.value = false;
  }
}

const getTableData = async () => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  const result = await getDataSourceListServer({ projectId });
  if (result?.errorCode === 0) {
    tableData.value = result.data.message;
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
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="createDialog">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
      </div>
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          class="search-input"
          clearable
          size="default"
        />
        <el-button style="width: 36px" @click="getTableData">
          <el-icon class="mr-5">
            <IEpRefresh />
          </el-icon>
        </el-button>
      </div>
    </div>
    <CustomStyleTable
      :max-height="maxHeight"
      :tableData="filterData"
      class="table-custom"
      rowKey="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column :label="t('name')" align="left" min-width="20%" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('description')" align="left" min-width="20%" prop="comment" show-overflow-tooltip />
      <el-table-column
        :label="t('connectDatasource')"
        align="left"
        min-width="20%"
        prop="dataSourceName"
        show-overflow-tooltip
      />
      <el-table-column :label="t('datasourceType')" align="left" min-width="15%" prop="type" show-overflow-tooltip />
      <el-table-column :label="t('operate')" align="left" min-width="20%" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="operate-button">
            <el-button link type="primary" @click="dbConnectTest(row)">
              <el-icon class="mr-5">
                <IEpLink />
              </el-icon>
              {{ t('connectTest') }}
            </el-button>
            <el-button link type="primary" @click="editDialog(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-button>
            <el-button link type="danger" @click="handleDelete([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-button>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
    <CustomDialog
      v-model:dialog-visible="dialogVisible"
      :title="dialogType === 'edit' ? t('editDatasource') : t('createDatasource')"
      :width="420"
      @confirm="handleConfirm(formData)"
      @update:dialogVisible="handleCancelDialog"
    >
      <main>
        <el-form ref="formRef" :model="formData" :rules="formRules" label-width="auto">
          <el-form-item :label="t('datasource')" prop="dataSourceName">
            <el-select
              :disabled="dialogType === 'edit'"
              v-model="formData.dataSourceName"
              :placeholder="t('plsSelectDatasource')"
              @change="handldDataSourceChange"
            >
              <el-option
                v-for="item in selectOption"
                :key="item.name"
                :label="item.name"
                :value="item.name"
                :disabled="item.disabled"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="t('datasourceType')" prop="type">
            <el-input v-model="formData.type" disabled></el-input>
          </el-form-item>
          <el-form-item :label="t('name')" prop="name">
            <el-input v-model="formData.name"></el-input>
          </el-form-item>
          <el-form-item :label="t('description')" prop="comment">
            <el-input v-model="formData.comment" type="textarea"></el-input>
          </el-form-item>
        </el-form>
      </main>
    </CustomDialog>
  </div>
  <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />
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

  :deep(.el-table__body-wrapper) {
    .el-table__cell {
      height: 46px;
    }
  }
}
</style>
