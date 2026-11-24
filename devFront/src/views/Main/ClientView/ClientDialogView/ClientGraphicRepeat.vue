<script setup>
import { useI18n } from 'vue-i18n';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const dialogVisible = ref(true);
const props = defineProps({
  tableList: {
    type: Array,
    default: () => [],
  },
});
const emit = defineEmits(['confirm', 'cancel']);
const selectedRow = ref([]);
/**
 * @function handleSelectionChange
 * @description 处理表格选择改变事件
 * @param val
 * @return null
 */
function handleSelectionChange(val) {
  selectedRow.value = val;
}
async function handleRepeatOeration() {
  if (!selectedRow.value.length) {
    return;
  }
  emit('save', selectedRow.value);
}
function handleCancel() {
  dialogVisible.value = false;
  emit('cancel');
  emit('remove');
}
</script>
<template>
  <CustomDialog
    :confirmTitle="t('define')"
    :dialogVisible="dialogVisible"
    :defineDisable="defineDisable"
    :title="t('repeatGraphicMode')"
    :width="960"
    class="custom-dialog"
    @confirm="handleRepeatOeration"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <div>{{ t('repeatTip') }}</div>
    <CustomStyleTable
      :showPagination="false"
      :tableData="tableList"
      max-height="65vh"
      row-key="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column :selectable="selectable" align="center" type="selection" width="55" />
      <el-table-column :label="t('newName')" align="center" prop="newName" show-overflow-tooltip />
      <el-table-column :label="t('newGroup')" align="center" prop="newGroup" show-overflow-tooltip />
      <el-table-column :label="t('oldName')" align="center" prop="oldName" show-overflow-tooltip />
      <el-table-column :label="t('oldGroup')" align="center" prop="oldGroup" show-overflow-tooltip />
    </CustomStyleTable>
  </CustomDialog>
</template>
