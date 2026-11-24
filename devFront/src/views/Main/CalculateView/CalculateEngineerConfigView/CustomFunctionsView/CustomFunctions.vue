<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useConfirm } from '@/composables/useConfirm';
import {
  addProjectJSONDataServer,
  deleteProjectJSONDataServer,
  getProjectJSONDataServer,
  getProjectJSONSettingsServer,
  modifyProjectJSONDataServer,
} from '@/api/allRequest/calculationAPI.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomFunctionAttrEditor from '../../CalculateDialogView/CustomFuctionAttrEditor.vue';
import CustomDebugging from '@/views/Main/CalculateView/CalculateDialogView/CustomDebugging.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import ScriptMoveDialog from '@/views/Main/CalculateView/CalculateDialogView/ScriptMoveDialog.vue';

const { t } = useI18n();

const calculationMenuStore = useCalculationMenuStore();

const scriptEditorStore = useScriptEditorStore();
const { addScriptEditorList, setVisible, setLoading } = scriptEditorStore;

const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });

// 编辑弹窗visible
// 选中行
const selectRows = ref([]);
// 表格原始数据
const tableData = ref([]);
const customFuncEditorVisible = ref(false);
const debugVisible = ref(false);
const customFuncEditorModify = ref(false);
// 搜索框数据绑定
const searchContent = ref('');
const customFunctionEditorData = reactive({});
const moveVisible = ref(false);

watchEffect(async () => {
  const id = calculationMenuStore.currentCalculateRow.groupId;
  if (!id || calculationMenuStore.currentCalculateRow.scriptType !== 'functions') {
    return;
  }
  nextTick(async () => {
    await getTableData(id);
  });
});
const searchTableData = computed(() => {
  if (!searchContent.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.name.toLowerCase().includes(searchContent.value.toLowerCase()));
});

scriptEditorStore.$onAction(({ name, args, after }) => {
  if (name === 'saveEditorList') {
    after(async () => {
      await getTableData();
    });
  }
});

const getTableData = async (groupId = calculationMenuStore.currentCalculateRow.groupId) => {
  tableData.value = await getProjectJSONSettingsServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    groupId: groupId,
  });
};

/**
 * @function addCustomFunction
 * @description 添加按钮
 * @param val
 * @returns null
 */
function addCustomFunction() {
  customFuncEditorVisible.value = true;
  customFuncEditorModify.value = false;

  Object.assign(customFunctionEditorData, {});
}

/**
 * @function handleDeleteDatasource
 * @description 删除数据源事件
 */
async function handleDeleteDatasource(row) {
  await useConfirm(t('sureForDeleteSelectScripts'), t('sureForDelete'));
  await deleteProjectJSONDataServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    scriptIds: row.map((items) => items.GUID),
  });

  ElMessage.success(t('deleteSuccess'));
  await getTableData();
}

/**
 * @function modifyCustomFunction
 * @description 编辑数据源事件
 */
function modifyCustomFunction(editRow = selectRows.value[0]) {
  customFuncEditorVisible.value = true;
  customFuncEditorModify.value = true;
  Object.assign(customFunctionEditorData, { ...editRow });
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
 * @function handleEditorChangeVisible
 * @description 弹窗emit事件处理
 * @param {Array} val
 * @returns null
 */
function handleEditorChangeVisible(val) {
  customFuncEditorVisible.value = val;
}

/**
 * @function handleSubmitCustomFunction
 * @description 弹窗emit submit事件处理
 * @param {Object} formData emit事件传来formData
 * @param isModify
 * @returns null
 */
async function handleSubmitCustomFunction(formData, isModify) {
  if (!isModify) {
    const res = await addProjectJSONDataServer({
      ...formData,
      whetherenable: '是',
      paramlist: formData.paramList.map((item) => item.paramName).join(','),
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });
    if (res === 0) {
      ElMessage.success(t('addSuccess'));
    }
  } else {
    await modifyProjectJSONDataServer({
      ...formData,
      paramlist: formData.paramList.map((item) => item.paramName).join(','),
      id: formData.GUID,
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });
    ElMessage.success(t('editSuccess'));
  }
  await getTableData();
}

/**
 * @function rowDBClickHandle
 * @description 表格行双击函数
 * @param {Array} row 行数据
 * @returns null
 */
const rowDBClickHandle = async (row) => {
  try {
    setLoading(true);
    const hasScript = scriptEditorStore.scriptEditorList.some((scriptEditor) => scriptEditor.GUID === row.GUID);
    if (!hasScript) {
      await setTrees();
      const { context } = await getProjectJSONDataServer({
        type: calculationMenuStore.currentCalculateRow.scriptType,
        scriptId: row.GUID,
      });
      addScriptEditorList({
        ...row,
        id: row.GUID,
        name: row.expression,
        code: context,
        JSONname: 'selfdefinefunc_script.json',
        fileType: calculationMenuStore.currentCalculateRow.scriptType,
        save: true,
        isHover: true,
        group: scriptEditorStore.leftClickName,
      });
    }
    setVisible(true);
  } finally {
    setLoading(false);
  }
};

function handleDebugScript() {
  debugVisible.value = true;
}
/**
 * @function handleMoveScript
 * @description 移动脚本事件
 * @returns null
 */
const handleMoveScript = async () => {
  moveVisible.value = true;
};

async function handleScriptMove() {
  await getTableData();
}
</script>

<template>
  <div class="datasource-manage-con">
    <header class="mb-12 fz-16">
      <span>{{ t('customScriptList') }}</span>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="addCustomFunction">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('createscript') }}
        </el-button>
        <el-button :disabled="!selectRows.length" type="danger" @click="handleDeleteDatasource(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-button @click="handleDebugScript">
          <CustomIcon name="debugIcon" svgStyle="width:1.2em;height:1.2em" />
          {{ t('debug') }}
        </el-button>
        <el-button :disabled="!selectRows.length" @click="handleMoveScript">
          {{ t('move') }}
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
      maxHeight="calc(100% - 120px)"
      rowKey="GUID"
      @selectionChange="handleSelectionChange"
      @tableRowDBClick="rowDBClickHandle"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('functionName')" align="center" prop="functionName" show-overflow-tooltip />
      <el-table-column :label="t('paramsList')" align="center" prop="paramlist" show-overflow-tooltip></el-table-column>
      <el-table-column :label="t('createTime')" align="center" prop="createTime" show-overflow-tooltip />
      <el-table-column :label="t('modifyTime')" align="center" prop="modifyTime" show-overflow-tooltip />
      <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-link type="primary" @click="modifyCustomFunction(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-link>
            <el-link type="danger" @click="handleDeleteDatasource([row])">
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
  <CustomFunctionAttrEditor
    v-if="customFuncEditorVisible"
    :dialog-visible="customFuncEditorVisible"
    :edit-data="customFunctionEditorData"
    :is-modify="customFuncEditorModify"
    @changeVisible="handleEditorChangeVisible"
    @submitCustomFunction="handleSubmitCustomFunction"
  />
  <CustomDebugging v-if="debugVisible" v-model:dialogVisible="debugVisible" />
  <LoadingComponent v-if="scriptEditorStore.loading" :loading="scriptEditorStore.loading" />
  <ScriptMoveDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :scriptType="6"
    :selectedScript="selectRows"
    @scriptMoveEvent="handleScriptMove"
  ></ScriptMoveDialog>
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
    }

    .search-input {
      :deep(.el-icon) {
        color: black;
      }
    }
  }
}
</style>
