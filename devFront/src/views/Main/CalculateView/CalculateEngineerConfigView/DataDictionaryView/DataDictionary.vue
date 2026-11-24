<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
import { ElMessage } from 'element-plus';
import { dictionaryEntry } from '@/assistant/entry.js';
// end

import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import {
  addProjectJSONDataServer,
  deleteProjectJSONDataServer,
  getProjectJSONSettingsServer,
  modifyProjectJSONDataServer,
} from '@/api/allRequest/calculationAPI.js';

import AddEditorDataDictionary from '@/views/Main/CalculateView/CalculateDialogView/AddEditorDataDictionary.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import { useConfirm } from '@/composables/useConfirm.js';
const { t } = useI18n();
const calculationMenuStore = useCalculationMenuStore();

const tableColumns = computed(() => [
  {
    label: t('variableName'),
    props: 'name',
    minWidth: '8%',
  },
  {
    label: 'ID',
    props: 'id',
    minWidth: '8%',
  },
  {
    label: t('type'),
    props: 'type',
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
  },

  {
    label: t('associatedDataSourceType'),
    props: 'dataSourceType',
    minWidth: '12%',
  },
  {
    label: t('tagName'),
    props: 'TagName',
    minWidth: '8%',
  },
  {
    label: t('tagType'),
    props: 'TagType',
    minWidth: '8%',
  },
  {
    label: t('description'),
    props: 'description',
    minWidth: '8%',
  },
]);

const tableData = ref([]);

const dialogVisible = ref(false);
const dialogTitle = ref('');
const searchKeyword = ref('');
const activeDialogComponent = shallowRef(null);
const selectRow = ref([]);
const uploadRef = useTemplateRef('uploadRef');

const dataDictionaryForm = ref({});

const disabledEditName = markRaw([
  '$Year',
  '$Month',
  '$Date',
  '$DayofWeek',
  '$Day',
  '$Hour',
  '$Minute',
  '$Second',
  '$MilliSecond',
  '$User',
]);

// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
const selectable = (row) => !disabledEditName.includes(row.name);
watch(()=>[calculationMenuStore.currentCalculateEngineer?.guid,calculationMenuStore.currentCalculateRow.groupId],()=>{dictionaryEntry.value=null;});
onBeforeUnmount(()=>{dictionaryEntry.value=null;});
// end

watchEffect(async () => {
  const id = calculationMenuStore.currentCalculateRow.groupId;
  if (!id || calculationMenuStore.currentCalculateRow.scriptType !== 'globalVars') {
    return;
  }
  nextTick(async () => {
    tableData.value = await getTableData();
  });
});

const searchTableData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  return tableData.value.filter((item) => item.name?.toLowerCase().includes(searchKeyword.value.toLowerCase()));
});

// 获取表格数据
const getTableData = async (groupId = calculationMenuStore.currentCalculateRow.groupId) => {
  // return [];
  return await getProjectJSONSettingsServer({
    type: calculationMenuStore.currentCalculateRow.scriptType || 'globalVars',
    groupId: groupId || -1,
  });
};

// 新增事件
const addDataDictionary = () => {
  dataDictionaryForm.value = {};
  activeDialogComponent.value = AddEditorDataDictionary;
  dialogTitle.value = t('createDataDictionary');
  dialogVisible.value = true;
};

// 编辑事件
const editDataDictionary = (editRow = selectRow.value[0]) => {
  activeDialogComponent.value = AddEditorDataDictionary;
  dataDictionaryForm.value = { ...editRow };
  dialogTitle.value = t('editDataDictionary');
  dialogVisible.value = true;
};

// 删除事件
const deleteDataDictionary = async (row) => {
  await useConfirm(t('sureForDeleteDictionary'), t('tip'), 'warning');
  const result = await deleteProjectJSONDataServer({
    type: 'globalVars',
    scriptIds: row.map((items) => items.id),
  });

  if (result === 0) {
    tableData.value = await getTableData();
    ElMessage.success(t('deleteSuccess'));
  }
};

// 提交form
const onSubmit = async (row) => {
  dialogVisible.value = false;
  if (row.id) {
    const result = await modifyProjectJSONDataServer({
      ...row,
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      DataType: row.DataType || '0',
      fileType: 'globalVars',
    });
    if (result === 0) {
      ElMessage({
        type: 'success',
        message: t('editSuccess'),
      });
    }
  } else {
    if (row.type === 'Number' || row.type === 'IO_Number') {
      row.value = !isNaN(row.value) ? Number(row.value) : 0;
    }
    const result = await addProjectJSONDataServer({
      ...row,
      groupId: String(calculationMenuStore.currentCalculateRow.groupId),
      DataType: row.DataType || '0',
      fileType: 'globalVars',
    });
    if (result === 0) {
      ElMessage({
        type: 'success',
        message: t('bulidSuccess'),
      });
    }
  }

  tableData.value = await getTableData();
};

// 表格显示
const tableSelect = (row) => {
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
  selectRow.value = row;
  const selected=row.length===1 && ['IO_Number','IO_Boolean','IO_String'].includes(row[0].type) ? row[0] : null;
  dictionaryEntry.value=selected ? {kind:'calculation',projectId:calculationMenuStore.currentCalculateEngineer.guid,
    label:'数据词典 / '+selected.name,calcMenu:'calculate-global-variable',group:String(calculationMenuStore.currentCalculateRow.groupId??'-1'),object:String(selected.id)} : null;
// end
};
</script>

<template>
  <header class="mb-12 fz-16">
    <span>{{ t('dataDictionary') }}</span>
  </header>
  <div class="button toolbar mb-20 df">
    <div class="tool-button df">
      <el-button type="primary" @click="addDataDictionary">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createVariables') }}
      </el-button>
      <el-button :disabled="!selectRow.length" type="danger" @click="deleteDataDictionary(selectRow)">
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
        :prefix-icon="Search"
        class="search-input"
        clearable
      />
    </div>
  </div>
  <CustomStyleTable
    :tableData="searchTableData"
    class="table-custom"
    max-height="calc(100% - 120px)"
    row-key="id"
    @selectionChange="tableSelect"
  >
    <el-table-column :selectable="selectable" align="center" type="selection" width="45" />
    <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
    <el-table-column
      v-for="propItems of tableColumns"
      :key="propItems.props"
      :label="t(propItems.label)"
      :min-width="propItems.minWidth"
      :prop="propItems.props"
      align="center"
      show-overflow-tooltip
    />
    <el-table-column :label="t('operate')" align="center" show-overflow-tooltip width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link v-if="!(row.id >= 1 && row.id <= 9)" type="primary" @click="editDataDictionary(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link v-if="!(row.id >= 1 && row.id <= 9)" type="danger" @click="deleteDataDictionary([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <div class="dialog">
    <component
      :is="activeDialogComponent"
      v-if="dialogVisible"
      v-model:dialogVisible="dialogVisible"
      :editForm="dataDictionaryForm"
      :title="dialogTitle"
      @submit="onSubmit"
    />
  </div>
</template>

<style lang="scss" scoped>
.toolbar {
  justify-content: space-between;
}
</style>
