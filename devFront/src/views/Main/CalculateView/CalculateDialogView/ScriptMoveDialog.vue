<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { getScriptGroupServer, moveScriptGroupServer } from '@/api/allRequest/calculationAPI.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: false,
});
const props = defineProps({
  scriptType: {
    type: Number,
    default: null,
  },
  selectedScript: {
    type: Array,
    default: () => [],
  },
});

const emits = defineEmits(['scriptMoveEvent']);

const scriptGroupData = ref([]);
const selectedTreeNode = ref({});

nextTick(async () => {
  const res = await getScriptGroupServer(props.scriptType);
  if (res.errorCode === 0) {
    scriptGroupData.value.push(res.data);
  }
});

function currentSelectNode(node) {
  selectedTreeNode.value = node;
}

async function confirmHandle() {
  // 校验是否选中节点
  if (!selectedTreeNode.value) {
    ElMessage.warning(t('nodeNotSelected'));
    return;
  }

  // 移动脚本
  const oldData = props.selectedScript.map((element) => {
    return {
      GUID: element.GUID,
      name: element.name,
      groupId: element.groupId,
    };
  });

  const params = {
    newData: {
      groupId: selectedTreeNode.value.id,
      groupName: selectedTreeNode.value.label,
    },
    oldData: oldData,
    scriptType: props.scriptType,
  };
  const ret = await moveScriptGroupServer(params);
  if (ret.errorCode === 0 && ret.data) {
    ElMessage.success(t('operateSuccess'));
  }
  emits('scriptMoveEvent');
  dialogVisible.value = false;
}
</script>
<template>
  <CustomDialog
    v-model:dialogVisible="dialogVisible"
    :title="t('scriptGroupSelect')"
    :width="420"
    @confirm="confirmHandle"
  >
    <div class="tree-container">
      <el-tree
        :data="scriptGroupData"
        :default-expand-all="true"
        :expand-on-click-node="false"
        node-key="id"
        @node-click="currentSelectNode"
      >
      </el-tree>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.tree-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
}
</style>
