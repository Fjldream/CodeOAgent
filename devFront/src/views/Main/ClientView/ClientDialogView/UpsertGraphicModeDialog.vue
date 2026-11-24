<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  name: [regexValidator('safaText', t('plsInputSuccessProName'))],
});
const defaultForm = { name: '', json: '', img: '' };
const form = reactive(props.rowData.dialogType === 'edit' ? { ...defaultForm, ...props.rowData } : { ...defaultForm });

const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      emit('confirm', form);
    }
  });
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editGraphicModel') : t('createGraphicModel')"
    :width="420"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
