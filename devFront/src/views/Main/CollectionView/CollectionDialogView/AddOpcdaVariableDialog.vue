<script setup>
import { useI18n } from 'vue-i18n';
import { daRootSourcesServer } from '@/api/allRequest/collectionAPI.js';
import { removeEmptyTree } from '@/utils/commonUtils.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomTreeTransfer from '@/components/CustomTreeTransfer/CustomTreeTransfer.vue';
const { t } = useI18n();

const tableDataVariable = defineModel('tableDataVariable', {
  type: Array,
  default: () => [],
});

// 表单
const props = defineProps({
  dialogVisible: Boolean,
  currentRow: Object,
});
const selectedKeys = ref([]);
const selectedNodes = ref([]);
const treeData = ref([]);
const defaultProps = ref({
  label: 'tagName',
  children: 'children',
});

nextTick(async () => {
  await initDaRootSources();
});

const dataDisabled = computed(() => tableDataVariable.value.map((item) => item.tagName));

const emit = defineEmits(['update:dialogVisible', 'confirm']);

const emitConfirm = () => {
  if (selectedNodes.value?.length) {
    const selectionRow = selectedNodes.value.map((item) => ({
      ...item,
      accessMode: item.accessmode,
      UaTrans: 0,
      DaTrans: 0,
      MqTrans: 0,
      MqInter: 0,
    }));
    emit('confirm', selectionRow);
  }
};

const initDaRootSources = async () => {
  const result = await daRootSourcesServer(props.currentRow);
  if (result) {
    treeData.value = await removeEmptyTree(result, { childrenKey: 'children', filterKey: 'type', filterVal: 'object' });
  }
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('addOPCDATag')"
    :width="1368"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-row :gutter="0">
      <el-col :span="24">
        <el-text style="font-size: 14px">{{ t('opcdaTip1') }}</el-text>
      </el-col>
      <el-col :span="24">
        <CustomTreeTransfer
          defaultId="tagName"
          :defaultProps="defaultProps"
          v-model:modelValue="selectedKeys"
          v-model:treeData="treeData"
          v-model:selectedNodes="selectedNodes"
          v-model:dataDisabled="dataDisabled"
          class="full-transfer"
        />
      </el-col>
    </el-row>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.full-transfer {
  padding-top: 10px;
}
</style>
