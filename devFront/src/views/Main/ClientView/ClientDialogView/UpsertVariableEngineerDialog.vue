<script setup>
import { useI18n } from 'vue-i18n';
import { getDataSourceListServer } from '@/api/allRequest/clientAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { regexValidator } from '@/utils/regexRules.js';
import QuickAddVariableDialog from '@/views/Main/ClientView/ClientDialogView/QuickAddVariableDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  title: String,
  editForm: {
    type: Object,
    default: () => {
      return {
        name: '',
        type: '',
        value: '',
        description: '',
        isMap: false,
        dataSourceType: '',
        writeAndRead: 0,
        dataSourceItem: {
          name: '',
          tagName: '',
          appName: '',
          variableType: '',
        },
        linkType: '',
        frequent: 3000,
      };
    },
  },
});

const emit = defineEmits(['update:dialogVisible', 'submit']);

const clientMenuStore = useClientMenuStore();

const formRef = useTemplateRef('formRef');
const formRules = reactive({
  name: [regexValidator('variableName', t('plsInputSuccessvariable'))],
  type: [
    {
      required: true,
      message: t('requiredText'),
      trigger: 'blur',
    },
  ],
  value: [
    regexValidator('', t('plsInputSuccessInitValue'), false),
    { validator: validateDefaultValue, trigger: 'blur' },
  ],
  description: [regexValidator('', t('plsInputSuccessDes'), false)],
});
const typeOptions = reactive([
  {
    label: t('bool'),
    value: 0,
  },
  {
    label: t('number'),
    value: 1,
  },
  {
    label: t('stringTag'),
    value: 2,
  },
]);
// 变量映射弹窗
const tagMapDialogVisible = ref(false);
const configDatasource = ref([]);
const form = reactive({ ...props.editForm });
const oldName = ref(props.editForm.name);
const onSubmit = () => {
  if (!formRef) {
    return;
  }
  formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', form, oldName.value);
    }
  });
};

function validateDefaultValue(rule, value, callback) {
  if (form.type === 0) {
    if (value !== 'true' && value !== 'false' && value !== true && value !== false) {
      return callback(new Error(t('boolValueFormat')));
    }
  } else if (form.type === 1) {
    const reg = /^-?\d+(\.\d+)?$/;
    if (!reg.test(value)) {
      return callback(new Error(t('numValueFormat')));
    }
  }
  return callback();
}

async function selectMappingTag(flag) {
  if (flag) {
    const {
      data: { message },
    } = await getDataSourceListServer({ projectId: clientMenuStore.currentClientEngineer.guid });

    configDatasource.value = message;
  }
  tagMapDialogVisible.value = flag;
}

function tagMappingConfirm(data) {
  const obj = {
    type: data[0].dataType,
    isMap: data[0].isMap,
    dataSourceType: data[0].dataSourceType,
    writeAndRead: 0,
    dataSourceItem: data[0].dataSourceItem,
    linkType: data[0].linkType,
    frequent: data[0].frequent,
  };
  Object.assign(form, obj);
  selectMappingTag(false);
}

function mapValueChange(val) {
  if (!val) {
    form.dataSourceItem = {
      name: '',
      tagName: '',
      appName: '',
      variableType: '',
    };
    form.dataSourceType = '';
  }
}

function changeDataType(val) {
  const defaultValue = ['true', 0, ''];
  form.value = defaultValue[val];
}
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title
    :width="420"
    @confirm="onSubmit"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="form.name"></el-input>
      </el-form-item>
      <el-form-item :label="t('type')" prop="type">
        <el-select
          v-model="form.type"
          :disabled="form.isMap"
          :placeholder="t('plsSelectDatasourceType')"
          @change="changeDataType"
        >
          <el-option v-for="row of typeOptions" :key="row.value" :label="row.label" :value="row.value"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('initValue')" prop="value">
        <el-input v-model="form.value"></el-input>
      </el-form-item>
      <el-form-item :label="t('description')" prop="description">
        <el-input v-model="form.description" type="textarea"></el-input>
      </el-form-item>
      <el-form-item :label="t('isAssociate')" prop="datasourceType">
        <el-switch v-model="form.isMap" @change="mapValueChange"></el-switch>
      </el-form-item>
      <el-form-item :label="t('datasourceName')" prop="datasourceType">
        <el-input v-model="form.dataSourceItem.appName" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('datasourceType')" prop="datasourceType">
        <el-input v-model="form.dataSourceType" disabled></el-input>
      </el-form-item>
      <el-form-item :label="t('associate')" prop="mapping">
        <div class="mapping">
          <el-input v-model="form.dataSourceItem.tagName" disabled />
          <el-button :disabled="!form.isMap" type="primary" @click="selectMappingTag(true)">
            {{ t('select') }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </CustomDialog>
  <QuickAddVariableDialog
    :configDatasource="configDatasource"
    :dialogVisible="tagMapDialogVisible"
    :title="t('variableMapping')"
    :isSingle="true"
    @quickAddConfirm="tagMappingConfirm"
    @update:dialogVisible="selectMappingTag"
  />
</template>

<style lang="scss" scoped>
.mapping {
  display: flex;
  width: 100%;
}
</style>
