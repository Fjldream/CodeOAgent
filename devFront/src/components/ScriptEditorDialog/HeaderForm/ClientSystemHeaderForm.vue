<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
defineProps({
  headerForm: {
    type: Object,
    default: () => {
      return {
        interval: 4000,
      };
    },
  },
});
</script>

<template>
  <el-form :model="headerForm" class="toolHeaderForm" label-position="left" label-width="auto">
    <el-form-item :label="t('executeCycle')">
      <el-input v-model="headerForm.interval" class="interval" size="small"></el-input>
      <div class="ml-10">ms</div>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped>
.interval {
  width: 200px;
}
</style>
