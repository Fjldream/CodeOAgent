<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const selectedNode = ref(null);
const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: () => true,
});
const props = defineProps({
  pageTreeData: {
    type: Object,
    default: () => {},
  },
});
// emit事件定义
const emit = defineEmits(['confirm']);

/**
 * @function handleRecycleOeration
 * @description 删除 恢复页面事件
 */
function handleSave() {
  if (!selectedNode.value) {
    ElMessage({
      message: t('plsSetlect'),
      type: 'warning',
    });
    return;
  }
  emit('confirm', selectedNode.value);
}
//选择某个节点
function handleNodeSelect(data) {
  selectedNode.value = data;
}
</script>
<template>
  <CustomDialog v-model:dialogVisible="dialogVisible" :title="t('move')" :width="420" @confirm="handleSave">
    <div class="dialog-container">
      <el-row :gutter="0">
        <el-col :span="24">
          <div class="node-tree">
            <el-tree
              :data="props.pageTreeData"
              :props="{ label: 'name', children: 'children' }"
              default-expand-all
              highlight-current
              node-key="id"
              @node-click="handleNodeSelect"
            >
            </el-tree>
          </div>
        </el-col>
      </el-row>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.node-tree {
  padding: 10px;
  height: 300px;
  border: 1px solid #eee;
  overflow: auto;
}
</style>
