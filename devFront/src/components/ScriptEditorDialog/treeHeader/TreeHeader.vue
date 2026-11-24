<script setup>
import { watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  treeForm: {
    type: Object,
    default: () => {
      return {
        interval: String,
        unit: String,
      };
    },
  },
});
const { t } = useI18n();

const inputValue = ref(props.treeForm.interval);
const selectValue = ref(props.treeForm.unit);
const emit = defineEmits(['update:treeForm']);

watchEffect(() => {
  emit('update:treeForm', { interval: inputValue.value, unit: selectValue.value });
});

watch(
  () => selectValue.value,
  (val) => {
    if (!val) {
      selectValue.value = 'ms';
    }
  },
);
const options = reactive([
  {
    label: t('milliseconds'),
    value: 'ms',
  },
  {
    label: t('sconds'),
    value: 's',
  },
  {
    label: t('minutes'),
    value: 'min',
  },
  {
    label: t('hours'),
    value: 'hour',
  },
]);

const inputHandle = () => {
  if (!inputValue.value) {
    inputValue.value = 1000;
  }
};
</script>

<template>
  <div class="df">
    <div class="title">{{ t('cycle') }}</div>
    <el-input v-model="inputValue" class="input" type="number" @blur="inputHandle"></el-input>
    <el-select v-model="selectValue" class="select">
      <el-option v-for="row of options" :key="row.value" :label="row.label" :value="row.value"></el-option>
    </el-select>
  </div>
</template>

<style lang="scss" scoped>
.title {
  flex: 1;
}

.input {
  flex: 2;
  margin-right: 10px;
}

.select {
  flex: 2;
}
</style>
