<script setup>
import { useI18n } from 'vue-i18n';
import { useConfirm } from '@/composables/useConfirm.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => true,
  },
  recycleData: {
    type: Array,
    default: [],
  },
});
// emit事件定义
const emit = defineEmits(['changeVisible', 'update:dialogVisible', 'recoverPages', 'deletePages', 'closeDialog']);
const selectRows = ref([]);

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
 * @function handleRecycleOeration
 * @description 删除 恢复页面事件
 * @param operate
 */
function handleRecycleOeration(operate) {
  if (!selectRows.value.length) {
    return;
  }
  if (operate === 'recover') {
    useConfirm(t('sureForRstorePages')).then(() => {
      emit('recoverPages', selectRows.value);
    });
  } else if (operate === 'delete') {
    useConfirm(t('sureForDeleteRstorePages')).then(() => {
      emit('deletePages', selectRows.value);
    });
  }
}

/**
 * @function handleClose
 * @description 关闭弹窗函数
 * @returns null
 */
function handleClose() {
  emit('update:dialogVisible', false);
  emit('closeDialog', false);
}
</script>
<template>
  <el-dialog
    :before-close="handleClose"
    :model-value="dialogVisible"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    :draggable="true"
    :title="t('recycleBin')"
    align-center
    class="custom-dialog"
    width="720"
    @update:modelValue="emit('update:dialogVisible', $event)"
  >
    <main>
      <span>{{ t('recycleBinTip') }}</span>
      <CustomStyleTable
        :showPagination="false"
        :tableData="recycleData"
        @selectionChange="handleSelectionChange"
        rowKey="ID"
      >
        <el-table-column align="center" type="selection" width="55" />
        <el-table-column :label="t('pageName')" align="center" prop="pageName" show-overflow-tooltip />
        <el-table-column :label="t('size')" align="center" prop="size" show-overflow-tooltip width="100" />
        <el-table-column :label="t('deleteTime')" align="center" prop="deleteTime" show-overflow-tooltip />
        <el-table-column :label="t('remainTime')" align="center" prop="effectTime" show-overflow-tooltip />
      </CustomStyleTable>
    </main>
    <footer>
      <el-button type="primary" @click="handleRecycleOeration('recover')">{{ t('recover') }}</el-button>
      <el-button type="danger" @click="handleRecycleOeration('delete')">{{ t('delete') }}</el-button>
      <el-button @click="handleClose">{{ t('cancle') }}</el-button>
    </footer>
  </el-dialog>
</template>
<style lang="scss" scoped>
.el-dialog {
  main {
    min-height: 650px;
    max-height: 650px;
    padding-bottom: 20px;

    span {
      display: inline-block;
      margin-bottom: 10px;
    }

    :deep(.el-table) {
      max-height: 600px !important;

      .el-table__inner-wrapper {
        height: 600px !important;
      }
    }
  }

  footer {
    display: flex;
    flex-direction: row;
    justify-content: right;

    .el-button {
      width: 80px;
    }
  }
}
</style>
