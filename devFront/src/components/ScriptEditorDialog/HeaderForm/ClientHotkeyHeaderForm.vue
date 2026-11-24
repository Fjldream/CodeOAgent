<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import SetHotkey from '@/components/ScriptEditorDialog/HeaderForm/SetHotkey.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();

const dialogVisible = ref(false);
const emit = defineEmits(['update:dialogVisible', 'update:headerForm']);
const props = defineProps({
  headerForm: {
    type: Object,
    default: () => {
      return {
        name: '',
        comment: '',
        variable: '',
        hotkey: [],
        keyBinding: '',
      };
    },
  },
});

const ruleForm = reactive({
  name: [regexValidator('safaText', t('nameRule'))],
  comment: [regexValidator('safaText', t('descriptionRule'), false)],
});

const keyClickHandle = () => {
  dialogVisible.value = true;
};
const confirmHandle = (row) => {
  dialogVisible.value = false;
  props.headerForm.keyBinding = row;
};
</script>

<template>
  <el-form :model="headerForm" :rules="ruleForm" class="toolHeaderForm df" label-position="left" label-width="auto">
    <el-form-item :label="t('name')" prop="name">
      <el-input v-model="headerForm.name" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('description')" prop="comment">
      <el-input v-model="headerForm.comment" class="interval" size="small"></el-input>
    </el-form-item>
    <el-form-item :label="t('hotkey')" prop="hotkey">
      <el-checkbox-group v-model="headerForm.hotkey">
        <el-checkbox label="Ctrl" class="checkbox-btn">Ctrl+</el-checkbox>
        <el-checkbox label="Shift" class="checkbox-btn">Shift+</el-checkbox>
      </el-checkbox-group>
      <el-input
        v-model="headerForm.keyBinding"
        class="interval no-input"
        readonly
        size="small"
        @click="keyClickHandle"
      ></el-input>
    </el-form-item>
  </el-form>
  <SetHotkey v-model:dialog-visible="dialogVisible" @confirm="confirmHandle" />
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
  .checkbox-btn {
    margin: 0 4px;
  }
  .checkbox-btn :deep(.el-radio__input) {
    display: none;
  }
  .checkbox-btn :deep(.el-radio__label) {
    display: inline-block;
    padding: 8px 15px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .checkbox-btn :deep(.el-radio__original:checked) + .el-radio__label {
    color: #409eff;
    background: #ecf5ff;
    border-color: #b3d8ff;
  }
  .no-input {
    width: 120px;
    --el-input-bg-color: var(--el-disabled-bg-color);
  }
}
</style>
