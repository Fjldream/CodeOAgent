<script setup>
import _ from 'lodash-es';
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { recursiveSearch } from '@/utils/commonUtils.js';

const { t } = useI18n();
const props = defineProps({
  rowData: Object,
  userList: Array,
  defaultProps: {
    type: Object,
    default: () => {
      return { children: 'children', label: 'label' };
    },
  },
});

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
});
const emit = defineEmits(['confirm']);
const treeRef = useTemplateRef('treeRef');
const userData = ref([]);
const searchValue = ref('');
let originUserData = [];
nextTick(() => {
  userData.value = convertTree(props.userList || []);
  const checkeds = props.rowData.user.map((item) => 'user_' + item);
  treeRef.value.setCheckedKeys(checkeds);
  originUserData = _.cloneDeep(userData.value);
});

function convertTree(data) {
  return data.map((group) => {
    const groupNode = {
      id: 'group_' + group.groupId,
      label: group.groupName,
      groupId: group.groupId + '',
      groupName: group.groupName,
      type: 'group',
      children: [],
    };
    if (group.users?.length) {
      groupNode.children = group.users.map((user) => ({
        id: 'user_' + user.userId,
        label: user.userName,
        userId: user.userId + '',
        userName: user.userName,
        description: user.description,
        type: 'user',
        groupId: group.groupId + '',
        groupName: group.groupName,
      }));
    }
    if (group.children?.length) {
      groupNode.children.push(...convertTree(group.children));
    }
    return groupNode;
  });
}
const handleGetChecked = () => {
  const checkedNodes = treeRef.value.getCheckedNodes(true);

  const { userIds, userNames, groupIds, groupNames } = checkedNodes.reduce((acc, node) => {
    if (!acc.groupIds) {
      acc.groupIds = new Set();
    }
    if (!acc.groupNames) {
      acc.groupNames = new Set();
    }
    if (!acc.userIds) {
      acc.userIds = new Set();
    }
    if (!acc.userNames) {
      acc.userNames = new Set();
    }
    if (node.type === 'group') {
      acc.groupIds.add(node.groupId);
      acc.groupNames.add(node.groupName);
      return acc;
    }
    acc.userIds.add(node.userId);
    acc.userNames.add(node.userName);
    acc.groupIds.add(node.groupId);
    acc.groupNames.add(node.groupName);
    return acc;
  }, {});
  if (!checkedNodes.length) {
    return {
      user: [],
      userGroup: [],
      userGroupMsg: [],
    };
  }
  return {
    user: [...userIds],
    userGroup: [...groupIds],
    userGroupMsg: [...groupNames, ...userNames],
  };
};

const emitConfirm = () => {
  const { user, userGroup, userGroupMsg } = handleGetChecked();
  const confirmData = { ...props.rowData, user, userGroup, userGroupMsg };
  emit('confirm', confirmData);
};

const searchHandle = () => {
  const { tree } = recursiveSearch(originUserData, searchValue.value, 'label');
  userData.value = tree;
};
</script>
<template>
  <CustomDialog v-model:dialogVisible="dialogVisible" :title="t('associatedUser')" :width="420" @confirm="emitConfirm">
    <el-input class="mb-12" :suffix-icon="Search" v-model="searchValue" @change="searchHandle" />
    <el-tree
      ref="treeRef"
      :check-on-click-node="false"
      :data="userData"
      :expand-on-click-node="false"
      :props="defaultProps"
      default-expand-all
      highlight-current
      node-key="id"
      show-checkbox
      class="client-safe-object-tree"
    >
      <template #default="{ node, data }">
        <div class="df w-90">
          <ElIcon v-if="data.type === 'group'" class="mr-5"> <IEpFolder /> </ElIcon>
          <ElIcon v-else class="mr-5"> <IEpUser /> </ElIcon>
          <el-tooltip :show-after="500" :content="node.label" placement="top">
            <div class="label ellipsis">
              {{ node.label }}
            </div>
          </el-tooltip>

          <el-tooltip :show-after="500" :content="data.description" placement="top" v-if="data.description">
            <div class="ellipsis desc ml-10">( {{ data.description }})</div>
          </el-tooltip>
        </div>
      </template>
    </el-tree>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.client-safe-object-tree {
  display: inline-block;
  width: 100%;
  height: 450px;
  border: 1px solid #e1e1e1;
  padding: 5px 15px 5px 5px;
  overflow: auto;
}

.label {
  max-width: 70%;
}
.desc {
  min-width: 24%;
  max-width: 70%;
}
</style>
