<script setup>
import { useI18n } from 'vue-i18n';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const props = defineProps({
  quickAddSuccessCount: { type: Number, default: 0 },
  precheckResultVars: { type: Object, default: () => ({ importableArr: [], unImportableArr: [] }) },
  resolveResultVars: { type: Object, default: () => ({}) },
  dialogVisible: { type: Boolean, default: false },
  title: { type: String },
});
const emit = defineEmits(['update:dialogVisible', 'confirm', 'close']);

const loading = ref(false);
const tableRows = ref([]);

const successCount = computed(() => {
  const firstSuccess = props.quickAddSuccessCount;
  if (props.resolveResultVars && Array.isArray(props.resolveResultVars.addVariables)) {
    const secondSuccess = props.resolveResultVars.addVariables.length;
    return firstSuccess + secondSuccess;
  }
  return firstSuccess;
});

const failCount = computed(() => {
  const precheckFailCount =
    props.precheckResultVars && Array.isArray(props.precheckResultVars.unImportableArr)
      ? props.precheckResultVars.unImportableArr.length
      : 0;
  if (props.resolveResultVars && Array.isArray(props.resolveResultVars.failedArr)) {
    return props.resolveResultVars.failedArr.length + precheckFailCount;
  }
  if (props.resolveResultVars && Array.isArray(props.resolveResultVars.duplicateVariables)) {
    return props.resolveResultVars.duplicateVariables.length + precheckFailCount;
  }
  return precheckFailCount;
});

const warnCount = computed(() => {
  if (props.resolveResultVars && Array.isArray(props.resolveResultVars.duplicateVariables)) {
    return props.resolveResultVars.duplicateVariables.filter((r) => r?.status === 'warning').length;
  }
  return 0;
});

nextTick(() => {
  buildTableRows();
});
watch(
  [() => props.precheckResultVars, () => props.resolveResultVars, () => props.quickAddSuccessCount],
  () => buildTableRows(),
  {
    immediate: true,
  },
);
function buildTableRows() {
  const tableData = [];
  const unImported =
    props.precheckResultVars && Array.isArray(props.precheckResultVars.unImportableArr)
      ? props.precheckResultVars.unImportableArr
      : [];
  for (const it of unImported) {
    tableData.push({
      name: it.name,
      dataSourceName: it.dataSourceItem.name,
      status: 'failed',
      statusLabel: t('fail'),
      message: t('varRepeat'),
    });
  }
  const duplicateArr =
    props.resolveResultVars && Array.isArray(props.resolveResultVars.duplicateVariables)
      ? props.resolveResultVars.duplicateVariables
      : [];
  for (const it of duplicateArr) {
    tableData.push({
      name: it.name,
      dataSourceName: it.dataSourceItem.name,
      status: 'failed',
      statusLabel: t('fail'),
      message: t('varRepeatAfterRename'),
    });
  }
  const failedArr =
    props.resolveResultVars && Array.isArray(props.resolveResultVars.failedArr)
      ? props.resolveResultVars.failedArr
      : [];
  for (const it of failedArr) {
    tableData.push({
      name: it.name,
      dataSourceName: it.dataSourceItem.name,
      status: 'failed',
      statusLabel: t('fail'),
      message: t('netErr'),
    });
  }
  tableRows.value = tableData;
}
function onConfirm() {
  emit('confirm');
  emit('update:dialogVisible', false);
}
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title
    :width="820"
    @confirm="onConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <div class="report-count">
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="report-box">
            <div class="report-label">{{ t('countOfSuccessImportedVar') }}</div>
            <div class="report-value">{{ successCount }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="report-box">
            <div class="report-label">{{ t('countOfFailImportedVar') }}</div>
            <div class="report-value">{{ failCount }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="report-box">
            <div class="report-label">{{ t('warn') }}</div>
            <div class="report-value">{{ warnCount }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="report-note">{{ t('countOfAbnormalImportedVar') }}</div>
    <CustomStyleTable max-height="360px" :tableData="tableRows" class="table-custom" rowKey="name" :loading>
      <el-table-column prop="name" :label="t('name')" min-width="220"></el-table-column>
      <el-table-column prop="dataSourceName" :label="t('datasourceName')" min-width="200"></el-table-column>
      <el-table-column prop="statusLabel" :label="t('status')" min-width="120"></el-table-column>
      <el-table-column prop="message" :label="t('state')" min-width="220"></el-table-column>
    </CustomStyleTable>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.report-box {
  border: 1px solid #e9e9e9;
  padding: 10px;
  text-align: center;
  border-radius: 4px;
  background: #fff;
}
.report-count {
  margin-bottom: 12px;
}
.report-label {
  color: #909399;
  font-size: 12px;
}
.report-value {
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}
.report-note {
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
