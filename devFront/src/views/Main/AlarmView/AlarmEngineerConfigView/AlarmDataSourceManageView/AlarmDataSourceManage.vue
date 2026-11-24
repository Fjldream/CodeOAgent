<script setup>
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { regexValidator } from '@/utils/regexRules.js';
import { getAllDataSourceServer, getDbTestServer } from '@/api/allRequest/dataSourceAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import {
  createDataSourceServer,
  deleteDataSourceServer,
  editDataSourceServer,
  getDataSourceServer,
} from '@/api/allRequest/alarmAPI.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();

// 控制 loading 展示
const isLoading = ref(false);
// 控制 loading 文本
const loadingText = ref(t('testConnecting'));
// 选中行
const selectRows = ref([]);
// dialog显示变量
const datasourceEditorVisible = ref(false);
const datasourceEditorModify = ref(false);
// 表格原始数据
const tableData = ref([]);
// 表单ref
const datasourceFormRef = useTemplateRef('datasourceFormRef');
// 表单数据
const datasourceFormData = reactive({
  dm_name: '',
  dm_type: '',
  name: '',
  description: '',
});
// 表单验证规则
const datasourceFormRules = markRaw({
  dm_name: [{ required: true, message: t('plsSelectDatasource'), trigger: 'blur' }],
  dm_type: [{ required: true, message: t('plsinputDatasourceType'), trigger: 'blur' }],
  name: [regexValidator('safaText', t('nameRule'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});

// 下来列表选项 - 后期接口获取
const dataSourceOptions = ref([]);

// 搜索框数据绑定
const searchContent = ref('');

nextTick(async () => {
  await getTableData();
});

const searchTableData = computed(() => {
  if (!searchContent.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.name.toLowerCase().includes(searchContent.value.toLowerCase()));
});

const getTableData = async () => {
  const { data } = await getDataSourceServer();
  tableData.value = Object.values(data);
};

/**
 * @function addDatasource
 * @description 添加按钮
 * @returns null
 */
const addDatasource = async () => {
  await getDataSource();
  handleCancelDialog();
  datasourceEditorVisible.value = true;
  datasourceEditorModify.value = false;
};

/**
 * @function handleCancelDialog
 * @description dialog取消函数事件
 * @param val
 * @returns null
 */
function handleCancelDialog() {
  Object.assign(datasourceFormData, {
    dm_name: '',
    dm_type: '',
    name: '',
    description: '',
  });
}

const getDataSource = async () => {
  const { data } = await getAllDataSourceServer();
  dataSourceOptions.value = data;
};

/**
 * @function handleSubmitDatasource
 * @description dialog确认按钮
 */
function handleSubmitDatasource() {
  datasourceFormRef.value.validate(async (valid) => {
    if (valid) {
      datasourceEditorVisible.value = false;
      if (!datasourceEditorModify.value) {
        const { errorCode } = await createDataSourceServer({
          name: datasourceFormData.name,
          dm_guid: dataSourceOptions.value.find((row) => row.name === datasourceFormData.dm_name).guid,
          dm_name: datasourceFormData.dm_name,
          dm_type: datasourceFormData.dm_type,
          description: datasourceFormData.description,
        });
        if (errorCode === 0) {
          ElMessage({
            type: 'success',
            message: t('bulidSuccess'),
          });
        }
      } else {
        const { errorCode } = await editDataSourceServer({
          name: datasourceFormData.name,
          dm_guid: dataSourceOptions.value.find((row) => row.name === datasourceFormData.dm_name).guid,
          dm_name: datasourceFormData.dm_name,
          dm_type: datasourceFormData.dm_type,
          description: datasourceFormData.description,
          id: datasourceFormData.id,
        });
        if (errorCode === 0) {
          ElMessage({
            type: 'success',
            message: t('editSuccess'),
          });
        }
      }
      await getTableData();

      handleCancelDialog();
    }
  });
}

/**
 * @function handleDeleteDatasource
 * @description 删除数据源事件
 */
const handleDeleteDatasource = async (row) => {
  await useConfirm(t('sureForDeleteDatasourceConfig'), t('tip'), 'warning');

  const { errorCode } = await deleteDataSourceServer(row.map((items) => items.id));

  if (errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};

/**
 * @function handleEditorDatasource
 * @description 编辑数据源事件
 */
const handleEditorDatasource = async (selectData = selectRows.value[0]) => {
  await getDataSource();

  Object.assign(datasourceFormData, {
    ...selectData,
  });
  datasourceEditorVisible.value = true;
  datasourceEditorModify.value = true;
};

/**
 * @function handleDataSourceChange
 * @description 下拉框改变事件处理
 * @param val
 * @returns null
 */
function handleDataSourceChange(val) {
  datasourceFormData.dm_type = dataSourceOptions.value.find((row) => row.name === val).type;
}

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
 * @description 测试连接按钮事件
 * @param {Array} row 行数据
 * @returns null
 */
const dbConnectTest = async (row) => {
  isLoading.value = true;

  try {
    await getDataSource();
    const detestItem = dataSourceOptions.value.find((item) => item.name === row.dm_name);
    if (!detestItem) {
      ElMessage.warning(t('sureForDatasourceConfig'));
      isLoading.value = false;
      return;
    }
    const { errorCode } = await getDbTestServer({ ...detestItem, ...detestItem.config });
    isLoading.value = false;
    if (errorCode === 0) {
      ElMessage.success(t('testConnectSuccess'));
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="datasource-manage-con">
    <header class="mb-12 fz-16">
      <span>{{ t('leftMenus.dataSourceEngineer') }}</span>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="addDatasource">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selectRows.length === 0" type="danger" @click="handleDeleteDatasource(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
      </div>
      <div class="search-input">
        <el-input
          v-model="searchContent"
          :placeholder="t('plsInputKeywordSearch')"
          :prefix-icon="Search"
          style="width: 240px"
        />
      </div>
    </div>
    <CustomStyleTable
      :tableData="searchTableData"
      class="table-custom"
      max-height="calc(100% - 120px)"
      row-key="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('datasource')" align="center" prop="dm_name" show-overflow-tooltip />
      <el-table-column :label="t('datasourceType')" align="center" prop="dm_type" show-overflow-tooltip />
      <el-table-column :label="t('description')" align="center" prop="description" show-overflow-tooltip />
      <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="320">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-link type="primary" underline="never" @click="dbConnectTest(row)">
              <el-icon class="mr-5">
                <IEpLink />
              </el-icon>
              {{ t('connectTest') }}
            </el-link>
            <el-link size="small" type="primary" underline="never" @click="handleEditorDatasource(row)">
              <el-icon class="mr-5">
                <IEpEdit />
              </el-icon>
              {{ t('edit') }}
            </el-link>
            <el-link size="small" type="danger" underline="never" @click="handleDeleteDatasource([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-link>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </div>
  <CustomDialog
    v-model:dialog-visible="datasourceEditorVisible"
    :title="datasourceEditorModify ? t('editDatasource') : t('createDatasource')"
    width="400"
    @confirm="handleSubmitDatasource"
    @update:dialogVisible="handleCancelDialog"
  >
    <el-form ref="datasourceFormRef" :model="datasourceFormData" :rules="datasourceFormRules" label-width="auto">
      <el-form-item :label="t('datasource')" prop="dm_name">
        <el-select
          v-model="datasourceFormData.dm_name"
          :placeholder="t('plsSelectDatasource')"
          @change="handleDataSourceChange"
        >
          <el-option
            v-for="item in dataSourceOptions"
            :key="item.name"
            :label="item.name"
            :value="item.name"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('datasourceType')" prop="dm_type">
        <el-input v-model="datasourceFormData.dm_type" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="datasourceFormData.name"></el-input>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="datasourceFormData.description" type="textarea"></el-input>
      </el-form-item>
    </el-form>
  </CustomDialog>
  <LoadingComponent v-if="isLoading" :loading="isLoading" :loadingText="loadingText" />
</template>

<style lang="scss" scoped>
.datasource-manage-con {
  height: 100%;
  width: 100%;

  .operate-list {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .button-list-con {
      display: flex;
      flex-wrap: wrap; // 按钮自动换行
      gap: 0; // 按钮之间的间距
      .el-button {
        border-radius: 0;
      }
    }

    .search-input {
      :deep(.el-icon) {
        color: black;
      }
    }
  }
}
</style>
