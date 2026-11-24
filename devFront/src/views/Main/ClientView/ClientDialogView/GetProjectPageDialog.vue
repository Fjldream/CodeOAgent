<script setup>
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { getPagesServer, getProjectFileServer } from '@/api/allRequest/clientAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  guid: String,
  defaultProps: {
    type: Object,
    default: () => {
      return { children: 'children', label: 'name' };
    },
  },
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
const treeRef = ref(null);
const treeData = ref([]);
const currentNode = ref(null);
const searchKeyword = ref('');

nextTick(async () => {
  let pageList = [];
  const restful = await getPagesServer({ projectId: props.guid });
  if (restful?.errorCode === 0) {
    pageList = restful.data.message.Pages;
  }
  treeData.value = pageList;
});

const filterTreeData = computed(() =>
  treeData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);

const emitConfirm = async () => {
  if (!currentNode.value) {
    ElMessage.error(t('selectPage'));
  }
  const { name } = currentNode.value;
  const type = 3;
  const restful = await getProjectFileServer({ name, type, guid: props.guid });
  if (restful?.errorCode === 0) {
    const pageString = JSON.stringify(restful.data).toLowerCase();
    if (pageString.includes('login') || pageString.includes('logon')) {
      emit('confirm', { name });
      return;
    }
  }
  ElMessage.error(t('selectNotLogin'));
};
const handleNodeClick = async (data, node) => {
  currentNode.value = data;
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('页面列表')"
    :width="420"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <div class="page-search">
      <el-input
        v-model="searchKeyword"
        :placeholder="t('plsInputKeywordSearch')"
        :suffix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
    </div>
    <div class="page-tree">
      <el-tree
        ref="treeRef"
        :data="filterTreeData"
        :props="defaultProps"
        highlight-current
        node-key="id"
        @node-click="handleNodeClick"
      >
        <template #default="{ node, data }">
          <div class="df w-100">
            <el-icon class="mr-5">
              <IEpNotebook />
            </el-icon>
            <div class="el-tree-node__label">{{ node.label }}</div>
          </div>
        </template>
      </el-tree>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.page-tree {
  display: inline-block;
  width: 100%;
  height: 350px;
  border: 1px solid #e1e1e1;
  overflow: auto;
  padding: 5px 15px 5px 5px;
}

.page-search {
  margin-bottom: 10px;
}
</style>
