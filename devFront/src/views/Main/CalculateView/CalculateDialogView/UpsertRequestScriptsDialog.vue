<script setup>
import { useI18n } from 'vue-i18n';
import { getNowStr } from '@/utils/dayjsUtil';
import { regexValidator } from '@/utils/regexRules';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const calculationMenuStore = useCalculationMenuStore();
const { t } = useI18n();

const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});

const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  name: [regexValidator('safaText', t('plsInputSuccessScriptName'))],
  functionName: [regexValidator('safaText', t('plsInputSuccessFuncName'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});

const defaultForm = {
  name: '',
  functionName: '',
  whiteList: 'false',
  description: '',
  whetherenable: '是',
  createTime: getNowStr(),
  modifyTime: getNowStr(),
};
const form = reactive(props.rowData.dialogType === 'edit' ? { ...defaultForm, ...props.rowData } : { ...defaultForm });

const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      if (form.dialogType === 'edit') {
        form.modifyTime = getNowStr();
      }
      emit('confirm', form);
    } else {
      // ElMessage.warning('请仔细检查表单信息');
    }
  });
};
const tableData = ref([
  {
    name: 'InParam',
    description: t('parmsRuleTip'),
  },
  {
    name: 'OutParam',
    description: t('parmsRuleTipA'),
  },
  {
    name: 'RequestID',
    description: t('parmsRuleTipB'),
  },
  {
    name: 'Token',
    description: t('parmsRuleTipC'),
  },
]);
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editRequestScript') : t('createRequestScript')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('scriptName')" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item :label="t('functionName')" prop="functionName">
        <el-input v-model="form.functionName" />
      </el-form-item>
      <el-form-item :label="t('whiteList')" prop="whiteList">
        <el-select v-model="form.whiteList" :placeholder="t('plsSetlect')">
          <el-option :label="t('no')" value="false" />
          <el-option :label="t('can')" value="true" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('paramsList')">
        <CustomStyleTable :showHighlight="false" :showPagination="false" :tableData="tableData" class="ask-table">
          <el-table-column :label="t('serialNumber')" align="center" min-width="10%" type="index" />
          <el-table-column :label="t('name')" align="center" min-width="20%" prop="name" show-overflow-tooltip />
          <el-table-column
            :label="t('description')"
            align="center"
            min-width="70%"
            prop="description"
            show-overflow-tooltip
          />
        </CustomStyleTable>
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item :label="t('createTime')">
            <el-input v-model="form.createTime" disabled></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('modifyTime')">
            <el-input v-model="form.modifyTime" disabled></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" :rows="2" type="textarea" />
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>

<style lang="scss" scoped>
.ask-table {
  width: 100%;
}
</style>
