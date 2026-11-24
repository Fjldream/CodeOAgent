<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useConfirm } from '@/composables/useConfirm';
import {
  addProjectJSONDataServer,
  deleteProjectJSONDataServer,
  getProjectJSONDataServer,
  getProjectJSONSettingsServer,
  modifyProjectJSONDataServer,
  modifyScriptInvalidStatusServer,
} from '@/api/allRequest/calculationAPI.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';

import UpsertRequestScriptsDialog from '@/views/Main/CalculateView/CalculateDialogView/UpsertRequestScriptsDialog.vue';
import CustomDebugging from '@/views/Main/CalculateView/CalculateDialogView/CustomDebugging.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import ScriptMoveDialog from '@/views/Main/CalculateView/CalculateDialogView/ScriptMoveDialog.vue';

const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();
const scriptEditorStore = useScriptEditorStore();
const { addScriptEditorList, setVisible, setLoading } = scriptEditorStore;
const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });
// 复选框选中行
const selectRows = ref([]);
const searchKeyword = ref('');

const editRow = ref({});
const dialogVisible = ref(false);
const moveVisible = ref(false);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const tableData = ref([]);
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);
watchEffect(async () => {
  const id = calculationMenuStore.currentCalculateRow.groupId;
  if (!id || calculationMenuStore.currentCalculateRow.scriptType !== 'APIs') {
    return;
  }
  nextTick(async () => {
    await getTableData(id);
  });
});

scriptEditorStore.$onAction(({ name, args, after }) => {
  if (name === 'saveEditorList') {
    after(async () => {
      await getTableData();
    });
  }
});
// 获取表格数据
const getTableData = async (groupId = calculationMenuStore.currentCalculateRow.groupId) => {
  tableData.value = await getProjectJSONSettingsServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    groupId: groupId,
  });
};
// 显示哪个弹窗
const openDialog = (type, row = { ...selectRows.value[0] }) => {
  dialogType.value = type;
  switch (type) {
    case 'create':
      activeDialogComponent.value = UpsertRequestScriptsDialog;
      break;

    case 'edit':
      activeDialogComponent.value = UpsertRequestScriptsDialog;
      editRow.value = { ...row };
      break;
    case 'debug':
      activeDialogComponent.value = CustomDebugging;
      break;
    default:
      break;
  }
  dialogVisible.value = true;
};

const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const res = await addProjectJSONDataServer({
      ...data,
      whetherenable: '是',
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });
    if (res === 0) {
      ElMessage.success(t('addSuccess'));
    }
  } else {
    await modifyProjectJSONDataServer({
      ...data,
      id: data.GUID,
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });
    ElMessage.success(t('editSuccess'));
  }
  dialogVisible.value = false;
  await getTableData();
};

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};

const deleteCalculation = async (row) => {
  await useConfirm(t('sureForDeleteSelectScripts'), t('sureForDelete'), 'warning');

  await deleteProjectJSONDataServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    scriptIds: row.map((items) => items.GUID),
  });
  await getTableData();
  ElMessage.success(t('deleteSuccess'));
};

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
        name: `${row.name}(InParam,OutParam,RequestID,Token)`,
        JSONname: 'RESTfulAPI.json',
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

// 设置生效、失效
const setEnable = async (status, row) => {
  await useConfirm(
    t('sureForSelectScripts', { state: status ? t('takeEffect') : t('loseEffect') }),
    t('tip'),
    'warning',
  )
    .then(async () => {
      await modifyScriptInvalidStatusServer({
        type: calculationMenuStore.currentCalculateRow.scriptType,
        whetherenable: status ? '是' : '否',
        scriptIds: row.map((items) => items.GUID),
      });
      await getTableData();
      ElMessage.success(t('operateSuccess'));
    })
    .catch(async () => {
      await getTableData();
    });
};

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
  <div class="periodic-scripts-con">
    <header class="mb-12 fz-16">
      <span>{{ t('requestScript') }}</span>
    </header>
    <div class="button mb-20">
      <el-button type="primary" @click="openDialog('create')">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createscript') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="deleteCalculation(selectRows)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button @click="openDialog('debug')">
        <CustomIcon name="debugIcon" svgStyle="width:1.2em;height:1.2em" />
        {{ t('debug') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="setEnable(true, selectRows)">
        <CustomIcon name="force" />
        {{ t('takeEffect') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="setEnable(false, selectRows)">
        <CustomIcon name="failure" />
        {{ t('loseEffect') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="handleMoveScript">
        {{ t('move') }}
      </el-button>
      <el-input
        v-model="searchKeyword"
        :placeholder="t('plsInputKeywordSearch')"
        :prefix-icon="Search"
        clearable
        size="default"
        style="max-width: 250px; margin-left: auto"
      />
    </div>
    <CustomStyleTable
      :tableData="filterData"
      class="table-custom"
      maxHeight="calc(100% - 120px)"
      rowKey="GUID"
      @selectionChange="handleSelectionChange"
      @tableRowDBClick="rowDBClickHandle"
    >
      <el-table-column align="center" min-width="5%" type="selection" width="55" />
      <el-table-column :label="t('name')" align="center" min-width="20%" prop="name" show-overflow-tooltip />
      <el-table-column
        :label="t('description')"
        align="center"
        min-width="20%"
        prop="description"
        show-overflow-tooltip
      />
      <el-table-column :label="t('takeEffect')" align="center" min-width="7%" prop="enable">
        <template #default="{ row }">
          <el-switch
            v-model="row.whetherenable"
            active-value="是"
            inactive-value="否"
            @change="setEnable(row.whetherenable === '是', [row])"
          />
        </template>
      </el-table-column>
      <el-table-column
        :label="t('functionName')"
        align="center"
        min-width="20%"
        prop="functionName"
        show-overflow-tooltip
      />
      <el-table-column
        :label="t('createTime')"
        align="center"
        min-width="15%"
        prop="createTime"
        show-overflow-tooltip
      />
      <el-table-column :label="t('修改时间')" align="center" min-width="15%" prop="modifyTime" show-overflow-tooltip />
      <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-link type="primary" @click="openDialog('edit', row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-link>
            <el-link type="danger" @click="deleteCalculation([row])">
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
  <component
    :is="activeDialogComponent"
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :rowData="{ ...editRow, dialogType }"
    @confirm="handleConfirm"
  />

  <LoadingComponent v-if="scriptEditorStore.loading" :loading="scriptEditorStore.loading" />
  <ScriptMoveDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :scriptType="5"
    :selectedScript="selectRows"
    @scriptMoveEvent="handleScriptMove"
  ></ScriptMoveDialog>
</template>
<style lang="scss" scoped>
.periodic-scripts-con {
  height: 100%;
  width: 100%;
}

.button {
  display: flex;
  flex-wrap: wrap; // 按钮自动换行
  gap: 0; // 按钮之间的间距
}
</style>
