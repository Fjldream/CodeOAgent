<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import {
  addProjectJSONDataServer,
  deleteProjectJSONDataServer,
  getProjectJSONDataServer,
  getProjectJSONSettingsServer,
  modifyProjectJSONDataServer,
  modifyScriptInvalidStatusServer,
} from '@/api/allRequest/calculationAPI.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';

import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import PeriodicScriptAttrEditor from '@/views/Main/CalculateView/CalculateDialogView/PeriodicScriptAttrEditor.vue';
import CustomDebugging from '@/views/Main/CalculateView/CalculateDialogView/CustomDebugging.vue';
import ScriptMoveDialog from '@/views/Main/CalculateView/CalculateDialogView/ScriptMoveDialog.vue';

const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();
const scriptEditorStore = useScriptEditorStore();
const { addScriptEditorList, setVisible, setLoading } = scriptEditorStore;
const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });
// 脚本编辑弹窗显示
const attrEditorDialog = ref(false);
// 脚本编辑弹窗添加/编辑
const debugVisible = ref(false);
// 脚本移动弹框
const moveVisible = ref(false);
const attrEditorModifyData = ref({});
const isModify = ref(false);

// 选中行
const selectRows = ref([]);
// 表格原始数据
const tableData = ref([]);
// 搜索框数据绑定
const searchContent = ref('');

watchEffect(async () => {
  const id = calculationMenuStore.currentCalculateRow.groupId;
  if (!id || calculationMenuStore.currentCalculateRow.scriptType !== 'periods') {
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

// 获取表格数据
const getTableData = async (groupId = calculationMenuStore.currentCalculateRow.groupId) => {
  tableData.value = await getProjectJSONSettingsServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    groupId: groupId,
  });
};

/**
 * @function editScriptHandle
 * @description 添加、编辑脚本弹窗交互
 * @returns null
 * @param row
 */
function editScriptHandle(row = selectRows.value[0]) {
  isModify.value = true;
  attrEditorModifyData.value = { ...row };
  attrEditorDialog.value = true;
}

const addScriptHandle = () => {
  isModify.value = false;
  attrEditorModifyData.value = {};
  attrEditorDialog.value = true;
};

/**
 * @function deletePeriodicScripts
 * @description 删除脚本函数
 * @returns null
 */
async function deletePeriodicScripts(deleteData) {
  if (!deleteData) {
    ElMessage.warning(t('plsSelectDeleteScript'));
  }
  await useConfirm(t('sureForDeleteSelectCycleScript'), t('tip'), 'warning');
  const result = await deleteProjectJSONDataServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    scriptIds: deleteData.map((items) => items.GUID),
  });

  if (result === 0) {
    ElMessage.success(t('deleteSuccess'));
  }
  await getTableData();
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
        JSONname: 'periods.json',
        fileType: calculationMenuStore.currentCalculateRow.scriptType,
        code: context,
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

/**
 * @function handleSubmitPeriodicScript
 * @description 子组件表单提交事件
 * @param {Object} formData
 * @param {Boolean} isModify
 * @returns null
 */
async function handleSubmitPeriodicScript(formData) {
  const params = getParams(formData);
  if (!params) {
    return;
  }
  if (!isModify.value) {
    const res = await addProjectJSONDataServer(params);
    if (res === 0) {
      ElMessage.success(t('addSuccess'));
    }
    attrEditorDialog.value = false;
  } else {
    await modifyProjectJSONDataServer(params);
    ElMessage.success(t('editSuccess'));
    attrEditorDialog.value = false;
  }
  await getTableData();
}

const getParams = (formData) => {
  if (formData.periodType === 'calendar') {
    formData.unit = formData.pattern;

    switch (formData.pattern) {
      case 'year':
        if (formData.yearLoopMode === 'type1') {
          if (!formData.monthVal || !formData.dayVal) {
            ElMessage.error(t('selectMonthAndDay'));
            return false;
          }
        } else if (formData.yearLoopMode === 'type2') {
          if (!formData.monthVal || !formData.seriesNo || !formData.weekVal) {
            ElMessage.error(t('selectMonthAndWeek'));
            return false;
          }
        }
        formData.year = {
          type: formData.yearLoopMode,
          month: formData.monthVal,
          day: formData.dayVal,
          weekIndex: formData.seriesNo,
          week: formData.weekVal,
        };
        break;
      case 'month':
        if (formData.monthLoopMode === 'type1') {
          if (!formData.monthLoopType1) {
            ElMessage.error(t('selectMonth'));
            return false;
          }
        } else if (formData.monthLoopMode === 'type2') {
          if (!formData.seriesNo || !formData.monthDay) {
            ElMessage.error(t('selectWeek'));
            return false;
          }
        }
        formData.month = {
          type: formData.monthLoopMode,
          day: formData.monthLoopType1,
          weekIndex: formData.seriesNo,
          week: formData.monthDay,
        };
        break;
      default:
        break;
    }
  }
  return {
    ...formData,
    whetherenable: formData.whetherenable || '是',
    groupId: String(calculationMenuStore.currentCalculateRow.groupId),
    fileType: calculationMenuStore.currentCalculateRow.scriptType,
  };
};

/**
 * @function handleDebugScript
 * @description 调试事件
 * @returns null
 */
const handleDebugScript = async () => {
  debugVisible.value = true;
};

/**
 * @function handleMoveScript
 * @description 移动脚本事件
 * @returns null
 */
const handleMoveScript = async () => {
  moveVisible.value = true;
};

/**
 * @function handleScriptValid
 * @description 脚本生效失效
 * @param {Boolean} flag
 * @param row
 * @returns null
 */
const handleScriptValid = async (flag, row) => {
  await useConfirm(t('sureForSelectScripts', { state: flag ? t('takeEffect') : t('loseEffect') }), t('tip'), 'warning')
    .then(async () => {
      await modifyScriptInvalidStatusServer({
        type: calculationMenuStore.currentCalculateRow.scriptType,
        whetherenable: flag ? '是' : '否',
        scriptIds: row.map((items) => items.GUID),
      });
      await getTableData();
      ElMessage.success(t('operateSuccess'));
    })
    .catch(async () => {
      await getTableData();
    });
};

async function handleScriptMove() {
  await getTableData();
}
</script>

<template>
  <div class="periodic-scripts-con">
    <header class="mb-12 fz-16">
      <span>{{ t('periodScriptList') }}</span>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="addScriptHandle">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('createscript') }}
        </el-button>
        <el-button :disabled="!selectRows.length" type="danger" @click="deletePeriodicScripts(selectRows)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-button @click="handleDebugScript">
          <CustomIcon name="debugIcon" svgStyle="width:1.2em;height:1.2em" />
          {{ t('debug') }}
        </el-button>
        <el-button :disabled="!selectRows.length" @click="handleScriptValid(true, selectRows)">
          <!-- <CustomIcon name="force" /> -->
          {{ t('takeEffect') }}
        </el-button>
        <el-button :disabled="!selectRows.length" @click="handleScriptValid(false, selectRows)">
          <!-- <CustomIcon name="failure" /> -->
          {{ t('loseEffect') }}
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
      <el-table-column :label="t('name')" align="center" min-width="8%" prop="name" show-overflow-tooltip />
      <el-table-column
        :label="t('description')"
        align="center"
        min-width="8%"
        prop="description"
        show-overflow-tooltip
      />
      <el-table-column :label="t('takeEffect')" align="center" min-width="5%" prop="valid" show-overflow-tooltip>
        <template #default="{ row }">
          <el-switch
            v-model="row.whetherenable"
            active-value="是"
            inactive-value="否"
            @change="handleScriptValid(row.whetherenable === '是', [row])"
          />
        </template>
      </el-table-column>
      <el-table-column
        :formatter="(row) => (row.periodType === 'interval' ? t('fixedCycleTigger') : t('calenderCycleTigger'))"
        :label="t('cycle')"
        align="center"
        min-width="16%"
        show-overflow-tooltip
      >
      </el-table-column>
      <el-table-column
        :label="t('createTime')"
        align="center"
        min-width="16%"
        prop="createTime"
        show-overflow-tooltip
      />
      <el-table-column
        :label="t('modifyTime')"
        align="center"
        min-width="16%"
        prop="modifyTime"
        show-overflow-tooltip
      />
      <el-table-column :label="t('operate')" align="center" min-width="10%" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="df justify-every">
            <el-link type="primary" @click="editScriptHandle(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-link>
            <el-link type="danger" @click="deletePeriodicScripts([row])">
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
  <PeriodicScriptAttrEditor
    v-if="attrEditorDialog"
    v-model:dialogVisible="attrEditorDialog"
    :modifyData="{ ...attrEditorModifyData }"
    @closeDialog="editScriptHandle"
    @submitPeriodicScript="handleSubmitPeriodicScript"
  />
  <!-- 调试弹窗 -->
  <CustomDebugging v-if="debugVisible" v-model:dialogVisible="debugVisible"></CustomDebugging>

  <LoadingComponent v-if="scriptEditorStore.loading" :loading="scriptEditorStore.loading" />
  <ScriptMoveDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :scriptType="2"
    :selectedScript="selectRows"
    @scriptMoveEvent="handleScriptMove"
  ></ScriptMoveDialog>
</template>

<style lang="scss" scoped>
.periodic-scripts-con {
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
