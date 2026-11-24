<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps({
  headerForm: Object,
});
</script>

<template>
  <el-form v-if="headerForm" :model="headerForm" class="toolHeaderForm" label-position="left" label-width="60px">
    <el-form-item :label="t('dataItem')">
      <el-input v-model="headerForm.expression" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('description')">
      <el-input v-model="headerForm.description" size="small"></el-input>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.el-form-item {
  margin-bottom: 4px;
}
</style>
