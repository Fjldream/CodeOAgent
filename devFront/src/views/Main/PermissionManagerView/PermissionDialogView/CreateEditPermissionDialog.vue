<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  title: String,
  dialogVisible: Boolean,
  editForm: {
    type: Object,
    default: () => {
      return {
        roleName: '',
        description: '',
      };
    },
  },
});

const emit = defineEmits(['update:dialogVisible', 'confirm']);

const form = reactive({ ...props.editForm });

const rule = reactive({
  roleName: [regexValidator('safaText', t('plsInputSuccessRoleName'))],
  description: [regexValidator('noXss', t('illegalInput'), false)],
});
const emitConfirm = () => {
  emit('confirm', form);
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="title"
    :width="360"
    @confirm="emitConfirm"
    @update:dialog-visible="emit('update:dialogVisible', $event)"
  >
    <el-form :model="form" :rules="rule" label-width="auto">
      <el-form-item :label="t('name')" prop="roleName">
        <el-input v-model="form.roleName"></el-input>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" type="textarea"></el-input>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
