<script setup>
import { defineExpose } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
  tableData: {
    type: Array,
    default: () => [],
  },
  totalNum: {
    type: Number,
    default: null,
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
  showHighlight: {
    type: Boolean,
    default: true,
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 30, 50, 100, 200, 2000],
  },
  maxHeight: {
    type: String,
    default: '100%',
  },

  tableClass: {
    type: String,
    default: '',
  },
  rowKey: {
    type: [String, Function],
    default: 'guid',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  mergeFields: {
    type: Array,
    default: () => [],
  },
  paginateValid: {
    type: Boolean,
    default: true,
  },
  border: {
    type: Boolean,
    default: false,
  },
  selectPageClear: {
    type: Boolean,
    default: false,
  },
  rowClickSelect: {
    type: Boolean,
    default: false,
  },
  defaultSelect: {
    type: Array,
    default: () => [],
  },
});

const tableRef = useTemplateRef('tableRef');
const currentPage = ref(1);
const pageSize = ref(10);
pageSize.value = props.pageSizes[0];
const cssVar = ref({
  '--table-content__height': props.maxHeight,
});
const selectedMap = reactive(new Map());

watch(
  () => props.maxHeight,
  (maxHeight) => {
    cssVar.value = {
      '--table-content__height': maxHeight,
    };
  },
);
const emits = defineEmits([
  'select',
  'selectAll',
  'rowContextmenu',
  'sortChange',
  'currentChange',
  'sizeChange',
  'tableRowClick',
  'tableRowDBClick',
  'selectionChange',
  'currentChangeHandle',
  'currentPageChangeHandle',
]);

const displayTableData = computed(() => {
  if (!props.showPagination || !props.paginateValid) {
    return props.tableData;
  }
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return props.tableData?.slice(startIndex, endIndex);
});

watch(
  () => displayTableData.value,
  () => {
    nextTick(() => {
      if (!tableRef.value) return;
      displayTableData.value.forEach((row) => {
        const isSelected = selectedMap.has(row[props.rowKey]);
        tableRef.value?.toggleRowSelection(row, isSelected);
        if (isSelected) {
          selectedMap.set(row[props.rowKey], row);
        }
      });
      emits('selectionChange', Array.from(selectedMap.values()));
    });
  },
  { immediate: true },
);

watch(
  () => props.tableData,
  () => {
    nextTick(() => {
      const existingIds = new Set(props.tableData.map((item) => item[props.rowKey]));
      for (const key of selectedMap.keys()) {
        if (!existingIds.has(key)) {
          selectedMap.delete(key);
        }
      }
      emits('selectionChange', Array.from(selectedMap.values()));
    });
  },
  { immediate: true },
);
watch(
  () => props.defaultSelect,
  () => {
    nextTick(async () => {
      if (props.defaultSelect.length) {
        for (const row of props.tableData) {
          if (props.defaultSelect.includes(row[props.rowKey])) {
            tableRef.value.toggleRowSelection(row, true);
            selectedMap.set(row[props.rowKey], row);
          }
        }
      }
    });
  },
  { immediate: true },
);
function handleSizeChange(val) {
  pageSize.value = val;
  emits('sizeChange', val);
}

function handleCurrentPage(val) {
  currentPage.value = val;
  //切换分页后清除选中
  if (props.selectPageClear) {
    selectedMap.clear();
  }
  emits('currentPageChangeHandle', val);
}

const selectTable = (selection) => {
  const selectedKeySet = new Set(selection.map((row) => row[props.rowKey]));
  displayTableData.value.forEach((row) => {
    const key = row[props.rowKey];
    const isNowSelected = selectedKeySet.has(key);
    const wasSelected = selectedMap.has(key);
    if (isNowSelected && !wasSelected) {
      selectedMap.set(key, row);
    }
    if (!isNowSelected && wasSelected) {
      selectedMap.delete(key);
    }
  });
  emits('selectionChange', Array.from(selectedMap.values()));
  emits('select', selection);
};
const selectAll = (selection) => {
  const selectedKeySet = new Set(selection.map((row) => row[props.rowKey]));
  displayTableData.value.forEach((row) => {
    const key = row[props.rowKey];
    const isNowSelected = selectedKeySet.has(key);
    const wasSelected = selectedMap.has(key);
    if (isNowSelected && !wasSelected) {
      selectedMap.set(key, row);
    }
    if (!isNowSelected && wasSelected) {
      selectedMap.delete(key);
    }
  });
  emits('selectionChange', Array.from(selectedMap.values()));
  emits('selectAll', selection);
};

const rowContextmenu = (row, column, e) => {
  emits('rowContextmenu', { row, column, e });
};
const sortChange = (row) => {
  emits('sortChange', row);
};

const rowDblClick = (row, column, e) => {
  emits('tableRowDBClick', row, column, e);
};

const rowClick = (row, column, e) => {
  if (props.rowClickSelect) {
    const isSelected = selectedMap.has(row[props.rowKey]);
    tableRef.value.toggleRowSelection(row, !isSelected);
    if (isSelected) {
      selectedMap.delete(row[props.rowKey]);
    } else {
      selectedMap.set(row[props.rowKey], row);
    }
    emits('selectionChange', Array.from(selectedMap.values()));
  }
  emits('tableRowClick', row, column, e);
};

const selectionChange = () => {
  emits('selectionChange', Array.from(selectedMap.values()));
};
const currentChangeHandle = (row) => {
  emits('currentChangeHandle', row);
};
function handleSpanMethod({ row, column, rowIndex }) {
  const field = column.property;
  if (!props.mergeFields.includes(field)) return [1, 1];
  //判断是否需要合并
  const currentValue = row[field];
  const prevRow = props.tableData[rowIndex - 1];
  if (prevRow && prevRow[field] === currentValue) {
    return [0, 0];
  }
  //计算rowspan
  let rowspan = 1;
  for (let index = rowIndex + 1; index < props.tableData.length; index++) {
    if (props.tableData[index][field] === currentValue) {
      rowspan++;
    } else {
      break;
    }
  }
  return [rowspan, 1];
}

const getTableRef = () => {
  return tableRef.value;
};
const setSort = (prop, order) => {
  tableRef.value.sort(prop, order);
};

defineExpose({
  getTableRef,
  handleCurrentPage,
  setSort,
});
</script>

<template>
  <div :style="cssVar" class="table-container">
    <el-table
      ref="tableRef"
      v-loading="loading"
      :class="tableClass"
      :data="displayTableData"
      :span-method="handleSpanMethod"
      :element-loading-text="t('tableLoading')"
      :highlight-current-row="showHighlight"
      :rowKey="rowKey"
      :stripe="true"
      :virtualScroll="{ rowHeight: 30 }"
      class-name="custom-table-class"
      header-row-class-name="custom-header-row"
      height="100px"
      row-class-name="custom-row"
      style="width: 100%"
      :border="border"
      @currentChange="currentChangeHandle"
      @rowContextmenu="rowContextmenu"
      @rowDblclick="rowDblClick"
      @select="selectTable"
      @sortChange="sortChange"
      @row-click="rowClick"
      @selection-change="selectionChange"
      @select-all="selectAll"
    >
      <slot name="default"></slot>
    </el-table>
    <el-pagination
      v-if="showPagination"
      :background="false"
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :total="totalNum ? totalNum : tableData.length"
      class="pagination"
      layout="total, sizes, prev, pager, next, jumper"
      @currentChange="handleCurrentPage"
      @size-change="handleSizeChange"
    ></el-pagination>
  </div>
</template>

<style lang="scss" scoped>
.table-container {
  display: flex;
  height: var(--table-content__height);
  flex-direction: column;
  justify-content: flex-start;
  background-color: #ffffff;
  border-radius: 16px;

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  .pagination {
    align-self: flex-end;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .custom-table-class {
    flex: 1;
    --el-table-header-bg-color: #f1f4f9;
    --el-table-header-text-color: #687280;

    ::v-deep(td.el-table__cell) {
      padding: 6px 0;
    }

    ::v-deep(.custom-row) {
      color: var(--custom-1f2937-color); // 表头文字颜色
      font-weight: 500;
      text-align: center;
      font-size: 14px;

      &:hover {
        background-color: #e8ecf2; // 鼠标移入行颜色（浅蓝）
      }

      &.current-row {
        background-color: #dce3f0; // 当前选中行颜色（更深蓝）
      }
    }
  }
}
</style>
