<script setup>
import { useI18n } from 'vue-i18n';
import { getPagesServer, getVariableListServer, importPageServer } from '@/api/allRequest/clientAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const clientMenuStore = useClientMenuStore();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:dialogVisible', 'confirm']);

const tableData = ref([]);
const selectedRow = ref([]);
const loading = ref(true);
nextTick(() => {
  getTableData();
});

const getTableData = async () => {
  const {
    data: { message: variableList },
    errorCode,
  } = await getVariableListServer();

  if (errorCode === 0) {
    tableData.value = variableList.flatMap((row) => {
      return Object.values(row)[0].Variables;
    });
  }
  loading.value = false;
};
const selectChange = (row) => {
  selectedRow.value = row;
};

const confirm = async () => {
  emit('confirm', selectedRow.value);
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title="t('selectVariable')"
    :width="960"
    @confirm="confirm"
    @update:dialog-visible="emit('update:dialogVisible', $event)"
  >
    <CustomStyleTable
      :loading="loading"
      :table-data="tableData"
      max-height="65vh"
      @tableRowClick="selectChange"
      @tableRowDBClick="confirm"
    >
      <el-table-column :label="t('name')" align="left" prop="name" show-overflow-tooltip> </el-table-column>
      <el-table-column :label="t('description')" align="left" prop="comment" show-overflow-tooltip> </el-table-column>
    </CustomStyleTable>
  </CustomDialog>
</template>
