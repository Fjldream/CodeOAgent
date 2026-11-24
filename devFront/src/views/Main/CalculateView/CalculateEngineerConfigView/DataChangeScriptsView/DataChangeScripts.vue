<script setup>
import { useI18n } from 'vue-i18n';

import { Search } from '@element-plus/icons-vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomDebugging from '@/views/Main/CalculateView/CalculateDialogView/CustomDebugging.vue';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';
import { regexValidator } from '@/utils/regexRules.js';
import {
  addProjectJSONDataServer,
  deleteProjectJSONDataServer,
  getProjectJSONDataServer,
  getProjectJSONSettingsServer,
  modifyProjectJSONDataServer,
  modifyScriptInvalidStatusServer,
} from '@/api/allRequest/calculationAPI.js';
import { getNowStr } from '@/utils/dayjsUtil.js';
import { useConfirm } from '@/composables/useConfirm.js';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import ScriptMoveDialog from '@/views/Main/CalculateView/CalculateDialogView/ScriptMoveDialog.vue';

const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();
const scriptEditorStore = useScriptEditorStore();

const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });
const formRules = ref({
  name: [regexValidator('safaText', t('plsInputSuccessProName'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});

const { addScriptEditorList, setVisible, setLoading } = scriptEditorStore;
// 搜索关键词
const searchKeyword = ref('');
// 复选框选中行
const selectRows = ref([]);
// 新建、编辑弹窗标题
const dialogTitle = ref('');
// 新建、编辑弹窗显示隐藏
const dialogVisible = ref(false);
// 新建、编辑弹窗数据
const formData = ref({});
const debugVisible = ref(false);
const moveVisible = ref(false);

const tableData = ref([]);

watchEffect(async () => {
  const id = calculationMenuStore.currentCalculateRow.groupId;
  if (!id || calculationMenuStore.currentCalculateRow.scriptType !== 'dataChanges') {
    return;
  }
  nextTick(async () => {
    await getTableData(id);
  });
});

// 表格数据过滤计算
const filterData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  // 获取组下数据
  return tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()));
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

// 复选框选中的行的数据改变
const handleSelectionChange = (val) => {
  selectRows.value = val;
};

// 双击行打开编辑器
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
        JSONname: 'dataChanges.json',
        fileType: calculationMenuStore.currentCalculateRow.scriptType,
        code: context,
        save: true,
        isHover: true,
        group: scriptEditorStore.leftClickName,
        headerForm: { ...row },
      });
    }
    setVisible(true);
  } finally {
    setLoading(false);
  }
};

// 新增
const addScript = () => {
  dialogVisible.value = true;
  dialogTitle.value = t('createDataChangeScript');
  const nowTimeStamp = getNowStr();
  formData.value = {
    name: `${t('dataChangeScript')}_${tableData.value.length + 1}`,
    description: '',
    whetherenable: true,
    groupId: calculationMenuStore.currentCalculateRow.groupId || -1,
    createTime: nowTimeStamp,
    modifyTime: nowTimeStamp,
  };
};
// 确认新增/编辑
const handleSave = async () => {
  const addOrModifyRow = formData.value;
  // api操作

  if (!addOrModifyRow.GUID) {
    // 新增
    const res = await addProjectJSONDataServer({
      ...addOrModifyRow,
      whetherenable: '是',
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });
    if (res === 0) {
      ElMessage.success(t('addSuccess'));
    }
  } else {
    // 编辑确认
    await modifyProjectJSONDataServer({
      ...addOrModifyRow,
      id: addOrModifyRow.GUID,
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      fileType: calculationMenuStore.currentCalculateRow.scriptType,
    });

    ElMessage.success(t('editProjectSuccess'));
  }
  await getTableData();
  dialogVisible.value = false;
};
// 编辑
const editScript = (selectRow = { ...selectRows.value[0] }) => {
  dialogVisible.value = true;
  dialogTitle.value = t('editDataChangeScript');
  formData.value = { ...selectRow };
};
// 删除
const deleteScript = async (row) => {
  await useConfirm(t('sureForDeleteSelectScripts'), t('tip'), 'warning');
  const result = await deleteProjectJSONDataServer({
    type: calculationMenuStore.currentCalculateRow.scriptType,
    scriptIds: row.map((items) => items.GUID),
  });

  if (result === 0) {
    ElMessage.success(t('deleteSuccess'));
  }
  await getTableData();
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

// 脚本调试
async function handleDebugScript() {
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
  <header class="mb-12 fz-16">
    <span>{{ t('dataChangeEventScript') }}</span>
  </header>
  <!-- 工具栏 -->
  <div class="button-row mb-20">
    <el-button type="primary" @click="addScript">
      <el-icon class="mr-5">
        <IEpCirclePlus />
      </el-icon>
      {{ t('createscript') }}
    </el-button>
    <el-button :disabled="!selectRows.length" type="danger" @click="deleteScript(selectRows)">
      <el-icon class="mr-5">
        <IEpDelete />
      </el-icon>
      {{ t('delete') }}
    </el-button>
    <el-button @click="handleDebugScript">
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
  <!-- 数据表格 -->
  <CustomStyleTable
    :tableData="filterData"
    class="table-custom"
    maxHeight="calc(100% - 120px)"
    rowKey="GUID"
    @selectionChange="handleSelectionChange"
    @tableRowDBClick="rowDBClickHandle"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('name')" align="center" min-width="15%" prop="name" show-overflow-tooltip />
    <el-table-column :label="t('description')" align="center" min-width="15%" prop="description" show-overflow-tooltip>
    </el-table-column>
    <el-table-column :label="t('takeEffect')" align="center" min-width="5%" prop="enable" show-overflow-tooltip>
      <template #default="{ row }">
        <el-switch
          v-model="row.whetherenable"
          active-value="是"
          inactive-value="否"
          @change="setEnable(row.whetherenable === '是', [row])"
        />
      </template>
    </el-table-column>
    <el-table-column :label="t('dataItem')" align="center" min-width="10%" prop="expression" show-overflow-tooltip />
    <el-table-column :label="t('createTime')" align="center" min-width="10%" prop="createTime" show-overflow-tooltip />
    <el-table-column :label="t('modifyTime')" align="center" min-width="10%" prop="modifyTime" show-overflow-tooltip />

    <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editScript(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="deleteScript([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <!-- 新建编辑弹窗 -->
  <CustomDialog
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :formData="formData"
    :title="dialogTitle"
    :width="500"
    @confirm="handleSave"
  >
    <el-form :model="formData" :rules="formRules" label-width="100px">
      <el-form-item :label="t('scriptName')" prop="name">
        <el-input v-model="formData.name"></el-input>
      </el-form-item>
      <el-form-item :label="t('createTime')">
        <el-input v-model="formData.createTime" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('modifyTime')">
        <el-input v-model="formData.modifyTime" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="formData.description" :rows="3" type="textarea"></el-input>
      </el-form-item>
    </el-form>
  </CustomDialog>
  <!-- 调试弹窗 -->
  <CustomDebugging v-if="debugVisible" v-model:dialogVisible="debugVisible" />

  <LoadingComponent v-if="scriptEditorStore.loading" :loading="scriptEditorStore.loading" />

  <ScriptMoveDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :scriptType="3"
    :selectedScript="selectRows"
    @scriptMoveEvent="handleScriptMove"
  ></ScriptMoveDialog>
</template>

<style lang="scss" scoped>
.button-row {
  display: flex;
  flex-wrap: wrap; // 按钮自动换行
  gap: 0; // 按钮之间的间距
}
</style>
