<script setup>
import { useI18n } from 'vue-i18n';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

defineProps({
  dialogShow: Boolean,
  tableData: Array,
});
const emit = defineEmits(['update:dialogShow', 'confirm', 'unSaveHandle', 'saveHandle']);
const selectTable = ref([]);
const tableSelectHandle = (data) => {
  selectTable.value = data;
};
</script>

<template>
  <el-dialog
    :append-to-body="true"
    :destroy-on-close="true"
    :draggable="true"
    :model-value="dialogShow"
    :title="t('tip')"
    :width="720"
    align-center
    body-class="save-custom-dialog-body"
    class="save-custom-dialog"
    @confirm="emit('confirm', $event)"
    @update:modelValue="emit('update:dialogShow', $event)"
  >
    <div>{{ t('saveErrorTip') }}</div>
    <CustomStyleTable
      :showPagination="false"
      :tableData="tableData"
      max-height="calc(100% - 120px)"
      @selectAll="tableSelectHandle"
      @selectionChange="tableSelectHandle"
    >
      <el-table-column align="center" type="selection" width="55" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column :label="t('scriptName')" align="center" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('path')" align="center" prop="path" show-overflow-tooltip />
    </CustomStyleTable>
    <template #footer>
      <div class="save-footer toolbar">
        <el-button @click="emit('update:dialogShow', false)">{{ t('cancle') }}</el-button>
        <el-button class="w-auto" type="danger" @click="emit('unSaveHandle')">
          {{ t('notSaveLeave') }}
        </el-button>
        <el-button
          :disabled="selectTable.length === 0"
          class="w-auto"
          type="primary"
          @click="emit('saveHandle', selectTable)"
        >
          {{ t('saveLeave') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.save-custom-dialog-body {
  min-height: 40vh;
}

.save-footer {
  display: flex;
  justify-content: flex-end;

  .el-button {
    padding: 0 6px;
    font-size: 12px;
  }

  .w-auto {
    width: auto;
  }
}
</style>
