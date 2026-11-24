<script setup>
import { getNowStr } from '@/utils/dayjsUtil';
import { getGuid } from '@/utils/commonUtils';
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();

const props = defineProps({
  dialogVisible: Boolean,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
const emitConfirm = () => {
  try {
    formRef.value.validate((valid, errorFields) => {
      if (valid) {
        emit('confirm', form.value);
      }
    });
  } catch (error) {}
};
const selectFile = () => {
  fileInput.value.click();
};
const fileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    form.value.name = file.name;
    form.value.file = file;
    form.value.createAt = getNowStr();
    form.value.modifiedAt = getNowStr();
  }
};
// 表单控件
const formRef = ref(null);
const fileInput = ref();
const formRules = ref({
  name: [regexValidator('notEmpty', t('needSelectFile'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});
const form = ref({
  id: `request_${getGuid()}`,
  type: 'system',
  name: '',
  description: '',
  file: '',
  dialogType: 'import',
  createAt: '',
  modifiedAt: '',
});
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('extensionImport')"
    :width="420"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('file')" prop="name">
        <div class="npm-file">
          <el-input v-model="form.name" />
          <el-button type="primary" @click="selectFile">{{ t('select') }}</el-button>
          <input ref="fileInput" style="display: none" type="file" @change="fileChange" />
        </div>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" :rows="3" type="textarea" />
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
<style lang="css" scoped>
.npm-file {
  display: flex;
  gap: 8px;
  width: 100%;
}
</style>
