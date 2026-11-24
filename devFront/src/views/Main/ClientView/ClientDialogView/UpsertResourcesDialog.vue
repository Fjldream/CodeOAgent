<script setup>
import { useI18n } from 'vue-i18n';
import { getNowStr } from '@/utils/dayjsUtil';
import { getGuid } from '@/utils/commonUtils';
import { regexValidator } from '@/utils/regexRules';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  tableData: Array,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  name: [
    {
      validator: (rule, value, callback) => {
        if (props.tableData.includes(value)) {
          return callback(new Error(t('nameIsExist', { name: value })));
        }
        callback();
      },
      trigger: ['change', 'blur'],
    },
    regexValidator('safaText', t('plsInputSuccessName')),
  ],
});
const form = reactive({ name: '' });

const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      if (!form.id) {
        ((form.id = getGuid()), (form.createAt = getNowStr()));
      }
      form.modifiedAt = getNowStr();
      emit('confirm', form);
    }
  });
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('addResource')"
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
