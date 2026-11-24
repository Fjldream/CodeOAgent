<script setup>
import { regexValidator } from '@/utils/regexRules.js';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
  headerForm: {
    type: Object,
    default: () => {
      return {
        name: '',
        comment: '',
        interval: 4000,
      };
    },
  },
});

const ruleForm = reactive({
  name: [regexValidator('safaText', t('nameRule'))],
  comment: [regexValidator('safaText', t('descriptionRule'), false)],
  interval: [{ type: 'number', message: 'timeRule', min: 55 }],
});
</script>

<template>
  <el-form :model="headerForm" :rules="ruleForm" class="toolHeaderForm df" label-position="left" label-width="auto">
    <el-form-item :label="t('name')" prop="name">
      <el-input v-model="headerForm.name" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('description')" prop="comment">
      <el-input v-model="headerForm.comment" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('time')" prop="interval">
      <el-input v-model.number="headerForm.interval" class="interval" size="small"></el-input>
      <div class="ml-10">ms</div>
    </el-form-item>
  </el-form>
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
