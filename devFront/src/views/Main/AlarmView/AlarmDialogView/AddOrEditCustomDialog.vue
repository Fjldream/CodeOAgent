<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
  title: String,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);

const formRef = ref(null);
// 表单控件
const formRules = reactive({
  name: [regexValidator('safaText', t('nameRule'))],
  text: [regexValidator('', t('rule2Message'), false)],
  delayMs: [regexValidator('number', t('numbersTips'))],
  priority: [regexValidator('number', t('numbersTips'))],
  extend_field_string: [regexValidator('', t('rule2Message'), false)],
});
const defaultForm = {
  name: '',
  text: '',
  delayMs: 0,
  priority: 1,
  paramList: [
    { label: 'extend_field_string1', extend_field_string: '' },
    { label: 'extend_field_string2', extend_field_string: '' },
    { label: 'extend_field_string3', extend_field_string: '' },
    { label: 'extend_field_string4', extend_field_string: '' },
    { label: 'extend_field_string5', extend_field_string: '' },
    { label: 'extend_field_string6', extend_field_string: '' },
    { label: 'extend_field_string7', extend_field_string: '' },
    { label: 'extend_field_string8', extend_field_string: '' },
  ],
};
const form = reactive({ ...defaultForm, ...props.rowData });
const emitConfirm = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      emit('confirm', form);
    }
  });
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editCustomAlarm') : t('createCustomAlarm')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item :label="t('alarmItemName')" prop="name">
            <el-input v-model="form.name"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('alarmText')" prop="text">
            <el-input v-model="form.text"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('alarmDelay')" prop="delayMs">
            <el-input v-model.number="form.delayMs"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('alarmPriority')" prop="priority">
            <el-input v-model.number="form.priority"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="t('alarmExtensionDomain')">
        <CustomStyleTable
          ref="tableRef"
          :showHighlight="false"
          :showPagination="false"
          :tableData="form.paramList"
          rowKey="label"
          style="width: 100%"
        >
          <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
          <el-table-column :label="t('extensionDomain')" align="center" show-overflow-tooltip>
            <template #default="{ row, $index }">
              <el-form-item :prop="`paramList.${$index}.extend_field_string`" :rules="formRules.extend_field_string">
                <el-input v-model="row.extend_field_string"></el-input>
              </el-form-item>
            </template>
          </el-table-column>
        </CustomStyleTable>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
:deep(.el-table__body-wrapper) {
  .el-table__cell {
    height: 46px;
  }
}
</style>
