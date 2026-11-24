<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import {
  getDataSetServer,
  delDataSetServer,
  getDataItemServer,
  delDataItemServer,
} from '@/api/allRequest/clientAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import DataSetDialog from '@/views/Main/ClientView/ClientDialogView/DataSetDialog.vue';
import DataItemDialog from '@/views/Main/ClientView/ClientDialogView/DataItemDialog.vue';

const reportEditorStore = useReportEditorStore();
const { setDragNode, getDataSetItemItem } = reportEditorStore;

const { t } = useI18n();
const props = defineProps({ activeTab: String });

const showDialog = ref(false);
const showItemDialog = ref(false);
const currentNode = ref(null);
const currentRow = ref({});
const currentItemRow = ref({});
const mode = ref('add');
const leftTree = ref([]);
const filterText = ref('');
const treeRef = useTemplateRef('treeRef');

nextTick(async () => {
  await initData();
});
const filterDataSetItem = (val) => {
  treeRef.value.filter(val);
};
const filterNode = (value, data) => {
  if (!value) {
    return true;
  }
  return data.label.includes(value);
};
const initData = async () => {
  leftTree.value = getDataSetList();
  const dataSet = await getDataSetServer(props.activeTab);
  const dataItem = await getDataItemServer(props.activeTab);
  await getDataSetItemItem(props.activeTab);
  const dataSetData = getDataSetList();
  if (dataSet.errorCode === 0) {
    dataSetData[0].children = dataSet.data.map((row) => {
      let childrenMumber = [];
      if (row.tagList.length) {
        childrenMumber = row.tagList.map((item) => ({ label: item, id: item, type: 'dataSet' }));
      }
      return { label: row.name, id: row.id, type: 'dataSet', children: childrenMumber };
    });
  }
  if (dataItem.errorCode === 0) {
    dataSetData[1].children = dataItem.data.map((row) => {
      return { label: row.name, id: row.id, type: 'dataItem' };
    });
  }
  leftTree.value = [...dataSetData];
};

const getDataSetList = () => {
  return [
    {
      label: t('dataSetManage'),
      id: 1,
      children: [],
    },
    {
      label: t('dataItemManage'),
      id: 2,
      children: [],
    },
  ];
};
const handleNodeClick = (data) => {
  currentNode.value = data;
};
const addDataSet = (node, data) => {
  mode.value = 'add';
  if (data.label === t('dataSetManage')) {
    currentRow.value = null;
    showDialog.value = true;
  } else {
    currentItemRow.value = null;
    showItemDialog.value = true;
  }
};
const editDataSet = async (node, data) => {
  mode.value = 'edit';
  if (node.parent.data.id === 1) {
    const params = {
      label: data.label,
      id: data.id,
    };
    const dataSet = await getDataSetServer(props.activeTab, params);
    currentRow.value = { ...dataSet.data[0] };
    showDialog.value = true;
  } else {
    const params = {
      label: data.label,
      id: data.id,
    };
    const dataItem = await getDataItemServer(props.activeTab, params);
    currentItemRow.value = { ...dataItem.data[0] };
    showItemDialog.value = true;
  }
};
const removeDataSet = async (node, data) => {
  await useConfirm(t('sureForDeleteName', { name: data.label }), t('tip'));
  if (node.parent.data.id === 1) {
    const params = {
      label: data.label,
      id: data.id,
    };
    const delResult = await delDataSetServer(params);
    if (delResult.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  } else {
    const params = {
      label: data.label,
      id: data.id,
    };
    const delResult = await delDataItemServer(params);
    if (delResult.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
    }
  }
  await initData();
};

const allowDrop = () => {
  return false;
};
const allowDrag = (row) => {
  return row.isLeaf && row.level !== 1;
};
const nodeDragStart = (row) => {
  setDragNode(row);
};
const nodeDragEnd = () => {
  setDragNode(null);
};
</script>

<template>
  <div class="report-left-tree">
    <el-input
      v-model="filterText"
      @change="filterDataSetItem"
      :placeholder="t('plsInputKeywordSearch')"
      :suffix-icon="Search"
      class="search-input report-Left-Search"
      clearable
      size="small"
    />
    <el-tree
      ref="treeRef"
      :filter-node-method="filterNode"
      :data="leftTree"
      @node-click="handleNodeClick"
      default-expand-all
      draggable
      :allow-drag="allowDrag"
      :allow-drop="allowDrop"
      @nodeDragStart="nodeDragStart"
      @nodeDragEnd="nodeDragEnd"
    >
      <template #default="{ node, data }">
        <div class="custom-node">
          <el-tooltip :content="node.label" :show-after="1000">
            <div class="node-label ellipsis">{{ node.label }}</div>
          </el-tooltip>
          <div class="btn-group">
            <el-icon class="ic" :title="t('add')" v-if="node.level === 1" @click.stop="addDataSet(node, data)">
              <IEpPlus />
            </el-icon>
            <el-icon class="ic" :title="t('edit')" v-if="node.level === 2" @click.stop="editDataSet(node, data)">
              <IEpEdit />
            </el-icon>
            <el-icon class="ic" :title="t('delete')" v-if="node.level === 2" @click.stop="removeDataSet(node, data)">
              <IEpDelete />
            </el-icon>
          </div>
        </div>
      </template>
    </el-tree>
  </div>

  <DataSetDialog
    v-model="showDialog"
    v-if="showDialog"
    v-bind="$attrs"
    :activeTab="props.activeTab"
    :editTreeNode="currentRow"
    :mode="mode"
    @confirm="initData"
  />
  <DataItemDialog
    v-model="showItemDialog"
    v-if="showItemDialog"
    v-bind="$attrs"
    :activeTab="props.activeTab"
    :editTreeNode="currentItemRow"
    :mode="mode"
    @confirm="initData"
  />
</template>

<style scoped lang="scss">
.report-Left-Search {
  padding: 5px 5px 0 5px;
}
.report-left-tree {
  height: calc(100vh - 190px);
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 3px;
}
.custom-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;

  .node-label {
    width: 122px;
  }
}
.label {
  user-select: none;
}
.btn-group {
  margin-left: 8px;
  display: inline-flex;
  gap: 6px;
}

.ic {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
}
</style>
