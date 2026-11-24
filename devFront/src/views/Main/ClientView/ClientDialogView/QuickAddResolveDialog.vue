<script setup>
import { useI18n } from 'vue-i18n';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const ProjectVariableTestRegExp = /[`~!@#$%^&*()+<>?:"{},.\/;'[\]]/im;
const startWithDigit = /^\d/;
const MAX_NAME_LEN = 32;

const props = defineProps({
  initialFailed: { type: Array, required: true },
  existingNames: { type: Array, default: () => [] },
  dialogVisible: { type: Boolean, default: false },
  title: { type: String },
});
const emit = defineEmits(['update:dialogVisible', 'resolve', 'cancel']);
const submitting = ref(false);

const tableRows = reactive([]);
const tableRef = ref(null);
const selectedRows = ref([]);

nextTick(() => {
  buildRowsFromInitial();
});
watch(
  () => props.initialFailed,
  () => buildRowsFromInitial(),
);

const importDisabled = computed(() => {
  return !tableRows.some((r) => r.canImport);
});
function buildRowsFromInitial() {
  tableRows.splice(0);
  const typeName = { 0: t('boolTag'), 1: t('numberTag'), 2: t('stringTag') };
  for (const it of props.initialFailed) {
    tableRows.push({
      originalName: it.name,
      name: it.name,
      editName: it.name,
      fileType: typeName[it.dataType],
      desc: it.comment,
      message: '',
      suggestions: it.suggestions || [],
      actionReplace: false,
      canImport: false,
      edit: false,
      data: it,
    });
  }
}
function onSelectionChange(vals) {
  selectedRows.value = vals;
}
function startEdit(row) {
  row.edit = true;
  row.editName = row.name;
}
function endEdit(row) {
  const candidate = row.editName;
  const res = validateNameAndApply(row, candidate);
  row.edit = false;
  if (res.ret) {
    row.name = (candidate || '').trim();
    row.canImport = true;
    row.action = 'rename';
  } else {
    ElMessageBox.alert(res.msg, t('validateFailed'), { confirmButtonText: t('define') });
    row.editName = row.name;
  }
  row.edit = false;
}
function validateNameAndApply(row, candidate) {
  const nameValue = (candidate || '').trim();
  if (!nameValue) {
    return { ret: false, msg: t('varNameRuleTip1') };
  }
  if (startWithDigit.test(nameValue)) {
    return { ret: false, msg: t('varNameRuleTip2') };
  }

  if (ProjectVariableTestRegExp.test(nameValue)) {
    return { ret: false, msg: t('varNameRuleTip3') };
  }
  if (nameValue.length > MAX_NAME_LEN) {
    return { ret: false, msg: `${t('varNameRuleTip4')}${MAX_NAME_LEN}` };
  }
  for (const item of tableRows) {
    if (item !== row && item.name === nameValue) {
      return { ret: false, msg: t('varNameRuleTip5') };
    }
    if (props.existingNames && Array.isArray(props.existingNames) && props.existingNames.includes(nameValue)) {
      return { ret: false, msg: t('varNameRuleTip6') };
    }
  }
  return { ret: true };
}

function deleteRow(index) {
  tableRows.splice(index, 1);
}
function getSelected() {
  return selectedRows.value || [];
}
function onAutoRename() {
  const selected = getSelected();
  const target = selected.length ? selected : tableRows;
  for (let i = 0; i < target.length; i++) {
    const item = target[i];
    const suffix = '_' + Date.now().toString().slice(-4) + '_' + (i + 1);
    const newName = item.originalName + suffix;
    item.editName = (newName || '').trim();
    item.name = (newName || '').trim();
    item.canImport = true;
    item.action = 'rename';
  }
  ElMessage.success(t('autoRenameTip'));
}
async function onReplace() {
  try {
    const selected = getSelected();
    const target = selected.length ? selected : tableRows;
    const count = target.length;
    await ElMessageBox.confirm(` ${count} ${t('replaceWarning')}`, t('replaceConfirm'), { type: 'warning' });
    for (const item of target) {
      item.canImport = true;
      item.name = item.originalName;
      item.action = 'replace';
    }
    ElMessage.success(t('replacedTip'));
  } catch {}
}
async function onImport() {
  if (importDisabled.value) return;

  const resolutions = {
    importableArr: [],
    unImportableArr: [],
  };
  tableRows.forEach((item) => {
    if (item.canImport) {
      item.data.name = item.name;
      item.data.action = item.action;
      resolutions.importableArr.push(item.data);
      return item.data;
    } else {
      resolutions.unImportableArr.push(item.data);
      return null;
    }
  });

  if (resolutions.importableArr.length === 0) {
    ElMessage.info(t('noImportItem'));
    return;
  }

  submitting.value = true;
  emit('resolve', resolutions);
  submitting.value = false;
}

function onCancel() {
  emit('cancel');
  emit('update:dialogVisible', false);
}
</script>
<template>
  <el-dialog
    :model-value="dialogVisible"
    :width="920"
    :destory-on-close="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="onCancel"
    :title="title"
  >
    <div class="header-row">
      <div>
        {{ t('toHandleA') }}<strong>{{ tableRows.length }}</strong>
      </div>
      <div class="header-note">{{ t('renameTip') }}</div>
    </div>

    <CustomStyleTable
      ref="tableRef"
      max-height="420px"
      :tableData="tableRows"
      class="table-custom"
      rowKey="name"
      @selectionChange="onSelectionChange"
      :loading
    >
      <el-table-column type="selection" width="55"></el-table-column>

      <el-table-column :label="t('importable')" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.canImport" type="success">YES</el-tag>
          <el-tag v-else type="danger">NO</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="name" :label="t('name')" width="260">
        <template #default="{ row }">
          <div v-if="row.edit">
            <el-input
              v-model="row.editName"
              size="small"
              @blur="endEdit(row)"
              @keyup.enter.native="endEdit(row)"
              :pleaceholder="t('nameHolder')"
              maxlength="32"
              show-word-limit
            ></el-input>
          </div>
          <div v-else @dblclick="startEdit(row)" class="name-view">
            <div class="name-text">{{ row.name }}</div>
            <div class="name-desc">{{ row.message }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="fileType" :label="t('type')" width="120" align="center">
        <template #default="{ row }">{{ row.fileType || '--' }}</template>
      </el-table-column>

      <el-table-column prop="desc" :label="t('description')" min-width="220">
        <template #default="{ row }">{{ row.desc || '' }}</template>
      </el-table-column>

      <el-table-column :label="t('operate')" width="120" align="center">
        <template #default="{ row, $index }">
          <el-button type="text" size="small" @click="deleteRow($index)">{{ t('delete') }}</el-button>
        </template>
      </el-table-column>
    </CustomStyleTable>
    <template #footer>
      <div class="footer-row">
        <div>
          <el-button size="small" @click="onAutoRename">{{ t('autoRename') }}</el-button>
          <el-button size="small" @click="onReplace" class="footer-left">{{ t('replace') }}</el-button>
        </div>

        <div>
          <el-button @click="onCancel">{{ t('cancle') }}</el-button>
          <el-button type="primary" :disabled="importDisabled" :loading="submitting" @click="onImport">
            {{ t('import') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
<style lang="scss" scoped>
.kf-resolve .el-table .cell {
  white-space: normal;
}
.header-row {
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-note {
  font-size: 12px;
  color: #909399;
}
.name-view {
  cursor: text;
}
.name-text {
  font-weight: 600;
}
.name-desc {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 10px;
}
.footer-left {
  margin-left: 8px;
}
</style>
