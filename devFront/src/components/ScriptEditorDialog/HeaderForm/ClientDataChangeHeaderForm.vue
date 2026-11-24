<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import VariableChooseDialog from '@/views/Main/ClientView/ClientDialogView/VariableChooseDialog.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();

const emit = defineEmits(['update:dialogVisible', 'update:headerForm']);
const props = defineProps({
  headerForm: {
    type: Object,
    default: () => {
      return {
        name: '',
        comment: '',
        variable: '',
      };
    },
  },
});

const dialogVisible = ref(false);

const ruleForm = reactive({
  name: [regexValidator('safaText', t('nameRule'))],
  comment: [regexValidator('safaText', t('descriptionRule'), false)],
});

const chooseVariable = async () => {
  dialogVisible.value = true;
};
const submitHandle = (row) => {
  emit('update:headerForm', {
    ...props.headerForm,
    variable: `$System.${row.name}`,
  });
  dialogVisible.value = false;
};
</script>

<template>
  <el-form :model="headerForm" :rules="ruleForm" class="toolHeaderForm df" label-position="left" label-width="auto">
    <el-form-item :label="t('name')" prop="name">
      <el-input v-model="headerForm.name" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('variable')" prop="variable">
      <el-input v-model="headerForm.variable" class="interval" disabled size="small"></el-input>
      <el-button @click="chooseVariable" size="small" type="primary">{{ t('selectVariable') }}</el-button>
    </el-form-item>
    <el-form-item :label="t('description')" prop="comment">
      <el-input v-model="headerForm.comment" class="interval" size="small"></el-input>
    </el-form-item>
  </el-form>
  <VariableChooseDialog v-model:dialogVisible="dialogVisible" v-if="dialogVisible" @confirm="submitHandle" />
</template>

<style lang="scss" scoped>
.toolHeaderForm {
  margin: 10px auto;

  .interval {
    width: 200px;
  }

  .el-form-item {
    margin-bottom: 0;
    margin-right: 36px;
  }
}
</style>
