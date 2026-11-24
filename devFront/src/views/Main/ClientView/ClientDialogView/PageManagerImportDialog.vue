<script setup>
import { useI18n } from 'vue-i18n';
import { getPagesServer, importPageServer } from '@/api/allRequest/clientAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const clientMenuStore = useClientMenuStore();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: true,
  },
  tableData: {
    type: Array,
    default: () => {
      return [];
    },
  },
});

const emit = defineEmits(['update:dialogVisible', 'confirm']);

const importData = ref([]);
const selectedRow = ref([]);
const allName = ref([]);
const loading = ref(true);
const currentRow = shallowRef({});
const allSwitch = ref(false);
let importPageData = {};
nextTick(() => {
  getImportTableData();
  setTimeout(() => {
    loading.value = false;
    importPageData = getImportPageData();
  }, 1000);
});

const selectAbleHandle = (row) => {
  return !allName.value.includes(row.importName) || row.isReplace;
};

const getAllTableData = async () => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  const result = await getPagesServer({ projectId });
  allName.value = result.data.message.Pages.map((row) => row.name);
};

const getImportTableData = async () => {
  await getAllTableData();
  importData.value = props.tableData.map((row, index) => {
    const acnImport = !allName.value.includes(row.name);
    return {
      guid: index,
      name: row.name,
      importName: row.name,
      isReplace: false,
      isEdit: false,
      canImport: acnImport,
      status: !acnImport ? t('pageNameReplace') : '',
    };
  });
};

const selectChange = (row) => {
  selectedRow.value = row.map((item) => {
    item.data = importPageData[item.name];
    if (item.data.pagePrototype) {
      item.data.pagePrototype.name = item.importName;
    }
    if (item.data.pageProperty) {
      item.data.pageProperty.name = item.importName;
    }
    return {
      description: '',
      groupId: clientMenuStore.currentClientRow.id,
      name: item.importName,
      isReplace: item.isReplace,
      pageInfo: {
        pageInfoObj: {
          name: item.importName,
          source: '',
          type: 3,
          importMethod: 'import',
        },
        pageJson: { ...item.data },
      },
    };
  });
};

const confirm = async () => {
  if (!selectedRow.value.length) {
    return ElMessage.error(t('importTips'));
  }
  const restful = await importPageServer({
    pageList: selectedRow.value,
    projectId: clientMenuStore.currentClientEngineer.guid,
  });
  if (restful?.errorCode === 0) {
    ElMessage.success(t('importSuccess'));
  }
  emit('update:dialogVisible', false);
  emit('confirm', [clientMenuStore.currentClientRow.id]);
};

const handleEdit = (row, index) => {
  currentRow.value = { ...row, index };
};
const endEdit = (row) => {
  row.importName = row.importName.trim();
  currentRow.value = {};
};

const handleAllSwitch = (val) => {
  for (const data of importData.value) {
    if (disabledReplace(data)) {
      return;
    }
    data.isReplace = val;
  }
};

const getImportPageData = () => {
  return props.tableData.reduce((acc, cur) => {
    acc[cur.name] = cur.data;
    return acc;
  }, {});
};

const disabledReplace = (row) => {
  return row.name === row.importName && row.canImport;
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title="t('pageImport')"
    :width="960"
    @confirm="confirm"
    @update:dialog-visible="emit('update:dialogVisible', $event)"
  >
    <CustomStyleTable
      :loading="loading"
      :show-pagination="false"
      :table-data="importData"
      max-height="65vh"
      @selectionChange="selectChange"
      @click.self="endEdit"
    >
      <el-table-column :selectable="selectAbleHandle" type="selection" width="55"></el-table-column>
      <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('importName')" align="center" prop="importName" show-overflow-tooltip>
        <template #default="{ row, $index }">
          <div @click.stop="handleEdit(row, $index)">
            <el-input
              v-if="currentRow.index === $index"
              v-model="row.importName"
              @blur="endEdit(row)"
              @keyup.enter="endEdit(row)"
            />
            <div v-else>{{ row.importName }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('isReplace')" align="center" prop="isReplace" show-overflow-tooltip>
        <template #header>
          <div class="df justify-center">
            <div class="mr-12">{{ t('isReplace') }}</div>
            <el-switch v-model="allSwitch" @change="handleAllSwitch"></el-switch>
          </div>
        </template>
        <template #default="{ row }">
          <el-switch v-model="row.isReplace" :disabled="disabledReplace(row)"></el-switch>
        </template>
      </el-table-column>
      <el-table-column :label="t('status')" align="center" prop="status" show-overflow-tooltip />
    </CustomStyleTable>
  </CustomDialog>
</template>
