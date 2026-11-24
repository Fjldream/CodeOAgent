<script setup>
import { regexValidator } from '@/utils/regexRules.js';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  headerForm: {
    type: Object,
    default: () => {
      return {
        name: '',
        comment: '',
      };
    },
  },
});

const dialogVisible = ref(false);

const ruleForm = reactive({
  name: [regexValidator('funcName', t('functionNameRuls'))],
  comment: [regexValidator('safaText', t('descriptionRule'), false)],
});
</script>

<template>
  <el-form :model="headerForm" :rules="ruleForm" class="toolHeaderForm df" label-position="left" label-width="auto">
    <el-form-item :label="t('nameA')" prop="name">
      <el-input v-model="headerForm.name" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('descriptionA')" prop="description">
      <el-input v-model="headerForm.comment" class="interval" size="small"></el-input>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.toolHeaderForm {
  margin: 10px auto;

  .interval {
    width: 160px;
  }

  .el-form-item {
    margin-bottom: 0;
    margin-right: 36px;
  }

  .no-input {
    width: 120px;
    --el-input-bg-color: var(--el-disabled-bg-color);
  }
}
</style>
