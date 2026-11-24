<script setup>
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';

const { t } = useI18n();
const props = defineProps({
  leftMenus: {
    type: Array,
    default: () => [],
  },
  isEditingStatus: Boolean,
  defaultProps: {
    type: Object,
    default: () => {
      return {
        children: 'children',
        label: 'name',
      };
    },
  },
  nodeClickKey: [String, Number],
  treeClass: {
    type: String,
    default: 'custom-tree',
  },
  defaultExpandAll: {
    type: Boolean,
    default: true,
  },
  svgClass: {
    type: String,
    default: 'tree-icon',
  },
  nodeKey: {
    type: String,
    default: 'guid',
  },
  expandOnClick: {
    type: Boolean,
    default: true,
  },
  selectNode: {
    type: [Object, String],
    default: () => {
      return {};
    },
  },
});

const inputType = ref('create');
const expandKeys = reactive([]);
const originalData = ref({});

const emit = defineEmits([
  'treeClickHandle',
  'saveEdit',
  'menuRightClick',
  'treeMouseEnter',
  'addClickHandle',
  'editClickHandle',
  'deleteClickHandle',
]);

const treeClickHandle = (data, node, row) => {
  emit('treeClickHandle', data, node, row);
};

const nodeContextmenu = (event, row, node) => {
  emit('menuRightClick', event, row, node);
};
const saveEdit = (data) => {
  if (data.name.length === 0) {
    if (typeof originalData.value === 'string') data.name = originalData.value;
    ElMessage.warning(t('varNameRuleTip1'));
    return;
  }
  if (inputType.value === 'editor' && originalData.value === data.name) {
    return;
  }
  emit('saveEdit', data, inputType.value);
};
const treeMouseEnterHandle = (data) => {
  if (isSelectNode()) {
    return;
  }
  emit('treeMouseEnter', data);
};
const treeMouseLeaveHandle = (data) => {
  data.addIcon = false;
  data.editIcon = false;
  data.deleteIcon = false;
};
const addClickHandle = (row, node) => {
  if (isSelectNode()) {
    return;
  }
  node.expanded = true;
  inputType.value = 'create';
  emit('addClickHandle', row);
};
const editClickHandle = (row) => {
  if (isSelectNode()) {
    return;
  }
  inputType.value = 'editor';
  originalData.value = row.name;
  emit('editClickHandle', row);
};
const deleteClickHandle = (row) => {
  if (isSelectNode()) {
    return;
  }
  emit('deleteClickHandle', row);
};

const isSelectNode = () => {
  return Object.keys(props.selectNode).length > 0;
};

const handleCollapse = (node) => {
  const index = expandKeys.indexOf(node.id);

  if (index > -1) {
    expandKeys.splice(index, 1);
  }
};
const handleExpand = (node) => {
  if (!expandKeys.includes(node.id)) {
    expandKeys.push(node.id);
  }
};
</script>

<template>
  <el-tree
    :class="treeClass"
    :current-node-key="nodeClickKey"
    :data="leftMenus"
    :default-expand-all="defaultExpandAll"
    :default-expanded-keys="expandKeys"
    :expand-on-click-node="expandOnClick"
    :nodeKey="nodeKey"
    :props="defaultProps"
    highlight-current
    @nodeContextmenu="nodeContextmenu"
    @nodeExpand="handleExpand"
    @node-click="treeClickHandle"
    @node-collapse="handleCollapse"
  >
    <template #default="{ node, data }">
      <div class="df w-100 ov-hiden" @mouseenter="treeMouseEnterHandle(data)" @mouseleave="treeMouseLeaveHandle(data)">
        <CustomIcon v-if="data.icon" :class="['icon', svgClass]" :name="data.icon" />
        <el-tooltip :content="data.name" :show-after="1000" effect="light" placement="left-start">
          <el-input
            v-if="selectNode && selectNode.id === data.id"
            v-model="data.name"
            autofocus
            class="menu-label"
            size="small"
            @blur="saveEdit(data)"
            @keyup.enter="saveEdit(data)"
          ></el-input>
          <div v-else :class="{ 'ml-12': data.icon }" class="menu-label ellipsis">{{ node.label }}</div>
        </el-tooltip>

        <div class="icon-content df">
          <el-icon v-if="data.addIcon" @click.stop="addClickHandle(data, node)">
            <IEpCirclePlus />
          </el-icon>
          <el-icon v-if="data.editIcon" @click.stop="editClickHandle(data)">
            <IEpEdit />
          </el-icon>
          <el-icon v-if="data.deleteIcon" @click.stop="deleteClickHandle(data)">
            <IEpClose />
          </el-icon>
        </div>
      </div>
    </template>
  </el-tree>
</template>

<style lang="scss" scoped>
.tree-icon {
  width: 1.45em;
  height: 1.45em;
}

.ov-hiden {
  overflow-x: hidden;
  padding: 0 6px;
}

.menu-label {
  width: 100%;
}

.ml-12 {
  margin-left: 12px;
}

.icon-content {
  max-width: 160px;
  min-width: 32px;
  justify-content: space-evenly;
}
</style>
