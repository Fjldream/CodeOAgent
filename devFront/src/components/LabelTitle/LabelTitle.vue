<script setup>
import { useI18n } from 'vue-i18n';

const props = defineProps({
  title: String,
});
const { t } = useI18n();
</script>

<template>
  <div class="label-title mb-5">{{ title }}</div>
</template>

<style lang="scss" scoped>
.label-title {
  margin-left: 16px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 11%;
    width: 5px;
    height: 90%;
    background-color: #409eff;
  }
}
</style>
