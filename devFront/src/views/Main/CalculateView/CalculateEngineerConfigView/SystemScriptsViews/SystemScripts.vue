<script setup>
import { useI18n } from 'vue-i18n';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { getProjectJSONDataServer, getProjectJSONSettingsServer } from '@/api/allRequest/calculationAPI.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useCalculateScriptTree } from '@/composables/CalculateMng/useCalculateScriptTree.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';

const { t } = useI18n();
const scriptEditorStore = useScriptEditorStore();
const { addScriptEditorList, setVisible, setLoading } = scriptEditorStore;
const calculationMenuStore = useCalculationMenuStore();
const tableData = ref([]);
const { setTrees } = useCalculateScriptTree({ t, scriptEditorStore });

nextTick(async () => {
  tableData.value = await getTableData();
});

// 获取表格数据
const getTableData = async (groupId = calculationMenuStore.currentCalculateRow.groupId) => {
  const data = await getProjectJSONSettingsServer({
    type: 'systemScripts',
    groupId: groupId,
  });
  return data.map((items) => {
    return {
      ...items,
      id: items.GUID,
      code: '',
      save: true,
      isHover: true,
      JSONname: 'systemScripts.json',
      fileType: 'systemScripts',
      group: scriptEditorStore.leftClickName,
    };
  });
};

const rowDBClickHandle = async (row) => {
  try {
    setLoading(true);

    const hasScript = scriptEditorStore.scriptEditorList.some((scriptEditor) => scriptEditor.GUID === row.GUID);
    if (!hasScript) {
      await setTrees();

      const { context } = await getProjectJSONDataServer({
        type: 'systemScripts',
        scriptId: row.GUID,
      });
      addScriptEditorList({
        ...row,
        id: row.GUID,
        JSONname: 'systemScripts.json',
        fileType: 'systemScripts',
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
</script>

<template>
  <header class="mb-12 fz-16">
    <span>{{ t('systemScript') }}</span>
  </header>
  <CustomStyleTable
    :tableData="tableData"
    class="table-custom"
    max-height="calc(100% - 64px)"
    @tableRowDBClick="rowDBClickHandle"
  >
    <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
    <el-table-column :label="t('description')" align="center" prop="description" show-overflow-tooltip />
    <el-table-column :label="t('createTime')" align="center" prop="createTime" show-overflow-tooltip />
    <el-table-column :label="t('modifyTime')" align="center" prop="modifyTime" show-overflow-tooltip />
  </CustomStyleTable>

  <LoadingComponent v-if="scriptEditorStore.loading" :loading="scriptEditorStore.loading" />
</template>
