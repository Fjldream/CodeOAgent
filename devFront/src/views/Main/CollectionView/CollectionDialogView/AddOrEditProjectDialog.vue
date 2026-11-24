<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
  title: String,
  disableProjectName: Boolean,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  name: [regexValidator('safaText', t('plsInputSuccessProName'))],
  description: [regexValidator('', t('illegalInput'), false)],
  osType: [regexValidator('', t('illegalInput'), false)],
});
const defaultForm = { name: '', description: '', osType: 'Windows' };
const form = reactive({ ...defaultForm, ...props.rowData });

const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      emit('confirm', form);
    }
  });
};
const osType = [
  { value: 'Windows', label: 'Windows' },
  { value: 'Linux', label: 'Linux' },
];
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="title"
    :width="420"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="form.name" :disabled="props.disableProjectName" />
      </el-form-item>
      <el-form-item :label="t('osType')" prop="osType">
        <el-select v-model="form.osType" :placeholder="t('plsSetlect')" :disabled="title === t('editProject')">
          <el-option v-for="item in osType" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" :rows="2" type="textarea" />
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
