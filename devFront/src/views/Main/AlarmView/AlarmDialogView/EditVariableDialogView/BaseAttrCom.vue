<script setup>
import { useI18n } from 'vue-i18n';
import QuickAddVariableDialog from '@/views/Main/AlarmView/AlarmDialogView/AlarmQuickAddVariableDialog.vue';
import { getDataSourceServer } from '@/api/allRequest/alarmAPI.js';
import { regexValidator } from '@/utils/regexRules';
const { t } = useI18n();
const props = defineProps({
  baseForm: Object,
});
const emits = defineEmits(['chooseName']);

const form = ref({
  ...props.baseForm,
});

const filterTagType = shallowReactive([1, 2, 3, 4]);
const quickAddVisible = ref(false);
const configDatasource = ref([]);
const formRules = ref({
  Comment: [regexValidator('', '', false)],
  Name: [regexValidator('', '', false)],
  Type: [regexValidator('', '', false)],
  ExtendFieldString1: [regexValidator('', '', false)],
  ExtendFieldString2: [regexValidator('', '', false)],
  ExtendFieldString3: [regexValidator('', '', false)],
  ExtendFieldString4: [regexValidator('', '', false)],
  ExtendFieldString5: [regexValidator('', '', false)],
  ExtendFieldString6: [regexValidator('', '', false)],
  ExtendFieldString7: [regexValidator('', '', false)],
  ExtendFieldString8: [regexValidator('', '', false)],
});
const typeOptions = reactive([
  {
    label: 'Boolean',
    value: 1,
  },
  {
    label: 'Number',
    value: 2,
  },
  {
    label: 'Number',
    value: 3,
  },
  {
    label: 'Number',
    value: 4,
  },
  {
    label: 'String',
    value: 5,
  },
]);
nextTick(() => {
  getDataSource();
});

const getDataSource = async () => {
  const { data } = await getDataSourceServer();
  configDatasource.value = Object.values(data).map((item) => {
    return {
      ...item,
      appName: item.dm_name,
    };
  });
};

const handleQuickAdd = (row) => {
  form.value = {
    ...form.value,
    Name: row[0].name,
    Type: row[0].tagType,
    comment: row[0].comment,
  };
  emits('chooseName', { ...form.value });
  quickAddVisible.value = false;
};

const getForm = () => {
  return form.value;
};

defineExpose({
  getForm,
});
</script>

<template>
  <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
    <el-row>
      <el-col :span="12">
        <el-form-item :label="t('variableName')" prop="Name">
          <el-input v-model="form.Name" readonly></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('type')" prop="Type">
          <el-select v-model="form.Type" disabled>
            <el-option v-for="row of typeOptions" :key="row.value" :label="row.label" :value="row.value"></el-option>
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="24">
        <el-form-item :label="t('description')" prop="Comment">
          <el-input v-model="form.Comment" type="textarea"></el-input>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString1')" prop="ExtendFieldString1">
          <el-input v-model="form.ExtendFieldString1"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString2')" prop="ExtendFieldString2">
          <el-input v-model="form.ExtendFieldString2"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString3')" prop="ExtendFieldString3">
          <el-input v-model="form.ExtendFieldString3"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString4')" prop="ExtendFieldString4">
          <el-input v-model="form.ExtendFieldString4"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString5')" prop="ExtendFieldString5">
          <el-input v-model="form.ExtendFieldString5"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString6')" prop="ExtendFieldString6">
          <el-input v-model="form.ExtendFieldString6"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString7')" prop="ExtendFieldString7">
          <el-input v-model="form.ExtendFieldString7"></el-input>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item :label="t('ExtendFieldString8')" prop="ExtendFieldString8">
          <el-input v-model="form.ExtendFieldString8"></el-input>
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>

  <QuickAddVariableDialog
    v-if="quickAddVisible"
    v-model:dialog-visible="quickAddVisible"
    :configDatasource="configDatasource"
    :filterTagType="filterTagType"
    :title="t('variableMapping')"
    @quickAddConfirm="handleQuickAdd"
  />
</template>

<style lang="scss" scoped>
::v-deep(.el-form-item__content) {
  flex-wrap: nowrap;
}
</style>
