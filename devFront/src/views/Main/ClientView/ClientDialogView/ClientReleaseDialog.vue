<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { getAllReleaseDataServer, releaseMultiSeatServer } from '@/api/allRequest/clientAPI.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();
const userStore = useLoginUserStore();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => true,
  },
});
// emit事件定义
const emit = defineEmits(['closeDialog', 'update:dialogVisible']);
const selectRows = ref([]);
const tableData = ref([]);
const defineDisable = computed(() => {
  if (tableData.value.length === 0) {
    return true;
  }
  return selectRows.value.length === 0;
});

nextTick(() => {
  getReleaseData();
});

const selectable = (row) => {
  return userStore.userInfo.userName === row.userName;
};

const getReleaseData = async () => {
  const { data } = await getAllReleaseDataServer({ projectId: clientMenuStore.currentClientEngineer.guid });
  tableData.value = data.message.map((item) => {
    let modelType;
    switch (Number(item.type)) {
      case 3:
        modelType = t('pageManage');
        break;
      case 8:
        modelType = t('graphicModelLibrary');
        break;
      case 10:
        modelType = t('reportLibiary');
        break;
      default:
        break;
    }
    return {
      ...item,
      modelType,
      isRelease: selectable(item),
    };
  });
};

/**
 * @function handleSelectionChange
 * @description 处理表格选择改变事件
 * @param val
 * @return null
 */
function handleSelectionChange(val) {
  selectRows.value = val;
}

/**
 * @function handleReleaseOeration
 * @description 释放占位事件
 * @param val
 * @return null
 */
async function handleReleaseOeration() {
  if (!selectRows.value.length) {
    return;
  }
  const postData = selectRows.value.map((item) => ({
    handSeatFlag: false,
    itemId: item.id,
    projectId: clientMenuStore.currentClientEngineer.guid,
    token: userStore.userInfo.userName,
    type: item.type,
  }));
  const { errorCode } = await releaseMultiSeatServer(postData);
  if (errorCode === 0) {
    ElMessage.success(t('lockSuccess'));
  }
  emit('update:dialogVisible', false);
  emit('closeDialog', false);
}
</script>
<template>
  <CustomDialog
    :confirmTitle="t('define')"
    :dialogVisible="dialogVisible"
    :defineDisable="defineDisable"
    :title="t('releaseList')"
    :width="960"
    class="custom-dialog"
    @confirm="handleReleaseOeration"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <div>{{ t('ReleaseTip') }}</div>
    <CustomStyleTable
      :showPagination="false"
      :tableData="tableData"
      max-height="65vh"
      row-key="id"
      @selectionChange="handleSelectionChange"
    >
      <el-table-column :selectable="selectable" align="center" type="selection" width="55" />
      <el-table-column :label="t('modelType')" align="center" prop="modelType" show-overflow-tooltip />
      <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
      <el-table-column :label="t('userName')" align="center" prop="userName" show-overflow-tooltip />
      <el-table-column :label="t('isRelease')" align="center" prop="isRelease" show-overflow-tooltip>
        <template #default="{ row }">
          <el-text v-if="row.isRelease" type="success">
            {{ t('yes') }}
          </el-text>
          <el-text v-else type="info">
            {{ t('no') }}
          </el-text>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </CustomDialog>
</template>
