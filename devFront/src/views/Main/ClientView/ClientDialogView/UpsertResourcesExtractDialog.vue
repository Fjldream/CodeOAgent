<script setup>
import { useI18n } from 'vue-i18n';
import { extractResourcesServer } from '@/api/allRequest/clientAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();
const props = defineProps({
  dialogVisible: Boolean,
  pageList: Array,
  defaultProps: {
    type: Object,
    default: () => {
      return { children: 'children', label: 'name' };
    },
  },
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);

const loading = ref(false);
const loadingText = ref(t('resourceGetting'));
const selectRow = ref([]);

const selectChange = (row) => {
  selectRow.value = row;
};
const emitConfirm = async () => {
  try {
    loading.value = true;
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const pageName = selectRow.value.map((node) => node.name);
    const restful = await extractResourcesServer({ projectId, pageName });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('ExtractionSuccess'));
    }
  } finally {
    loading.value = false;
  }

  emit('confirm');
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('getResource')"
    :width="760"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <div>{{ t('choosePage') }}</div>
    <div class="resources-tree">
      <CustomStyleTable
        :pageSizes="[10, 50, 100, 500, 1000, 2000]"
        :table-data="pageList"
        max-height="50vh"
        row-key="id"
        @selectionChange="selectChange"
      >
        <el-table-column align="center" type="selection" width="55" />
        <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
        <el-table-column :label="t('pageName')" align="center" prop="name" show-overflow-tooltip />
        <el-table-column :label="t('description')" align="center" prop="description" show-overflow-tooltip />
        <el-table-column :label="t('createTime')" align="center" prop="createtime" show-overflow-tooltip />
      </CustomStyleTable>
    </div>
  </CustomDialog>

  <LoadingComponent v-if="loading" :loading="loading" :loading-text="loadingText" />
</template>
