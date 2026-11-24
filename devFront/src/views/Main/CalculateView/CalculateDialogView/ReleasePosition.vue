<script setup>
import { useI18n } from 'vue-i18n';
import { forceUnlockScriptServer, getLockerListServer } from '@/api/allRequest/calculationAPI.js';
import { getFormatDate } from '@/utils/dayjsUtil.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { Search } from '@element-plus/icons-vue';
import { useConfirm } from '@/composables/useConfirm.js';

const { t } = useI18n();

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: true,
  },
});
const emits = defineEmits(['update:dialogVisible', 'noticeRelease']);
const searchContent = ref('');
const tableData = ref([]);
const selectRow = ref([]);
nextTick(() => {
  getTableData();
});

const filterData = computed(() => {
  if (!searchContent.value) {
    return tableData.value;
  }
  return tableData.value.filter((row) => row.scriptName.toLowerCase().includes(searchContent.value.toLowerCase()));
});

const getTableData = async () => {
  const { data } = await getLockerListServer();
  tableData.value = data;
};

const selectHandle = (row) => {
  selectRow.value = row;
};

const confirmHandle = async () => {
  emits('update:dialogVisible', false);
};
const clickNoticeRelease = (row) => {
  emits('noticeRelease', row);
};
</script>
<template>
  <CustomDialog
    :confirmTitle="t('define')"
    :dialogVisible="dialogVisible"
    :title="t('releasePosition')"
    :width="720"
    class="custom-dialog"
    @confirm="confirmHandle"
    @update:dialogVisible="emits('update:dialogVisible', $event)"
  >
    <el-input
      v-model="searchContent"
      :placeholder="t('plsInputKeywordSearch')"
      :suffix-icon="Search"
      class="search-input mb-12"
      clearable
      size="default"
    />
    <CustomStyleTable
      :pageSizes="[10, 20]"
      :tableData="filterData"
      max-height="calc(100vh - 520px)"
      @selectionChange="selectHandle"
    >
      <el-table-column :width="55" align="center" type="selection" />
      <el-table-column :label="t('serialNumber')" :width="55" align="center" type="index" />
      <el-table-column :label="t('fileName')" align="center" prop="scriptName" show-overflow-tooltip />
      <el-table-column :label="t('fileType')" align="center" prop="scriptType" show-overflow-tooltip />
      <el-table-column :label="t('lockTime')" align="center" prop="lockTime" show-overflow-tooltip>
        <template #default="{ row }">
          <div>{{ getFormatDate(row.lockTime) }}</div>
        </template>
      </el-table-column>
      <el-table-column :label="t('lockBy')" align="center" prop="lockedByName" show-overflow-tooltip />
      <el-table-column :label="t('inform')" align="center">
        <template #default="{ row }">
          <el-button @click="clickNoticeRelease(row)">{{ t('remindRelease') }}</el-button>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </CustomDialog>
</template>
