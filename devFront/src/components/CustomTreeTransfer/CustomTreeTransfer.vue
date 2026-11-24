<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { computed, ref } from 'vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const modelValue = defineModel('modelValue', {
  type: Array,
  default: () => [],
});
const selectedNodes = defineModel('selectedNodes', {
  type: Array,
  default: () => [],
});
const dataDisabled = defineModel('dataDisabled', {
  type: Array,
  default: () => [],
});
const treeData = defineModel('treeData', {
  type: Array,
  default: () => [],
});

const props = defineProps({
  defaultId: {
    type: String,
    default: 'id',
  },
  defaultProps: {
    type: Object,
    default: () => ({
      label: 'lable',
      children: 'children',
    }),
  },
});
const leftTreeRef = ref(null);

const leftFilter = ref('');
const rightFilter = ref('');

const leftCheckedKeys = ref([]);
const rightCheckedKeys = ref([]);

const pageSizes = ref([10, 20, 30, 50, 100, 200, 2000]);

const leftDataWithDisable = computed(() => markDisabled(treeData.value, modelValue.value, props.defaultProps));

const rightDataFlat = computed(() => flatten(treeData.value, modelValue.value, props.defaultProps, []));

const filterRightData = computed(() => {
  if (!rightFilter.value) {
    return rightDataFlat.value;
  }
  return rightDataFlat.value.filter((item) =>
    item[props.defaultProps.label].toLowerCase().includes(rightFilter.value.toLowerCase()),
  );
});

const filterLeft = (value, data) => {
  if (!value) {
    return true;
  }
  return data[props.defaultProps.label].toLowerCase().includes(value.toLowerCase());
};

watchEffect(() => {
  leftTreeRef.value?.filter(leftFilter.value);
});
watchEffect(() => {
  selectedNodes.value = JSON.parse(JSON.stringify(filterRightData.value));
});

const onLeftCheck = () => {
  const nodes = leftTreeRef.value?.getCheckedNodes();
  leftCheckedKeys.value = nodes
    .filter((node) => !node[props.defaultProps.children] || node[props.defaultProps.children].length === 0)
    .map((node) => node[props.defaultId]);
};
const onRightCheck = (rows) => {
  rightCheckedKeys.value = (rows || []).map((r) => r[props.defaultId]);
};

const moveRight = () => {
  modelValue.value = Array.from(new Set([...modelValue.value, ...leftCheckedKeys.value]));
  leftCheckedKeys.value = [];
};
const moveLeft = () => {
  modelValue.value = modelValue.value.filter((key) => !rightCheckedKeys.value.includes(key));
  rightCheckedKeys.value = [];
};

function markDisabled(source, keys, defaultProps) {
  const { children } = defaultProps;
  const allKeys = [...keys, ...dataDisabled.value];
  return source.map((node) => {
    const newNode = { ...node };
    newNode.disabled = !!allKeys.includes(node[props.defaultId]);
    if (node[children]?.length) {
      newNode[children] = markDisabled(node[children], keys, defaultProps);
    }
    return newNode;
  });
}

function flatten(list, keys, defaultProps, arr = []) {
  const { children } = defaultProps;
  for (const node of list) {
    if (keys.includes(node[props.defaultId])) {
      arr.push({ ...node });
    }
    if (node[children]?.length) {
      flatten(node[children], keys, defaultProps, arr);
    }
  }
  return arr;
}
</script>

<template>
  <div class="tree-transfer">
    <el-row :gutter="10">
      <el-col :span="11">
        <div class="tree-panel">
          <el-text style="font-size: 16px">{{ t('datasource') }}</el-text>
          <el-input
            v-model="leftFilter"
            :placeholder="t('plsInputKeywordSearch')"
            :suffix-icon="Search"
            class="search-input"
            clearable
          />
          <el-tree
            ref="leftTreeRef"
            class="tree-item"
            :data="leftDataWithDisable"
            show-checkbox
            :node-key="defaultId"
            :filter-node-method="filterLeft"
            :props="defaultProps"
            @check-change="onLeftCheck"
          />
        </div>
      </el-col>
      <el-col :span="2">
        <div class="transfer-buttons">
          <el-button type="primary" size="small" :disabled="!leftCheckedKeys.length" @click="moveRight">
            {{ t('add') }}
            <el-icon><IEpArrowRight /></el-icon>
          </el-button>
          <el-button type="danger" size="small" :disabled="!rightCheckedKeys.length" @click="moveLeft">
            <el-icon><IEpArrowLeft /></el-icon>
            {{ t('removed') }}
          </el-button>
        </div>
      </el-col>
      <el-col :span="11">
        <div class="tree-panel">
          <el-text style="font-size: 16px">{{ t('waitingToAddVariable') }}</el-text>
          <el-input
            v-model="rightFilter"
            :placeholder="t('plsInputKeywordSearch')"
            :suffix-icon="Search"
            class="search-input"
            clearable
          />
          <CustomStyleTable
            max-height="calc(100vh - 590px)"
            :tableData="filterRightData"
            :pageSizes="pageSizes"
            class="table-custom tree-item"
            :rowKey="defaultId"
            @selectionChange="onRightCheck"
          >
            <el-table-column align="center" type="selection" width="55" />
            <el-table-column align="center" type="index" width="55" />
            <el-table-column
              :label="t('variableName')"
              align="center"
              :prop="defaultProps.label"
              show-overflow-tooltip
            />
          </CustomStyleTable>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.tree-panel {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px;
  .tree-item {
    height: 400px;
    overflow: auto;
  }
}

.search-input {
  margin-bottom: 8px;
}
.transfer-buttons {
  height: 400px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
}
</style>
