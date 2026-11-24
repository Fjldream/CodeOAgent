<script setup>
import { useI18n } from 'vue-i18n';
import { containsXSS, regexValidator } from '@/utils/regexRules.js';
import { getAllDataSourceServer, getVariableServer } from '@/api/allRequest/dataSourceAPI.js';
import { getProjectJSONSettingsServer } from '@/api/allRequest/calculationAPI';
import { Search } from '@element-plus/icons-vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

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
      };
    },
  },
});
const emit = defineEmits(['update:dialogVisible', 'submit']);

const formRef = useTemplateRef('formRef');
const tagVisible = ref(false);
const tagData = ref([]);
const tableSelect = ref();
const searchTag = ref('');
const filterTagData = computed(() => {
  return tagData.value.filter((item) => item.TagName.includes(searchTag.value));
});
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
    {
      validator: (rule, value, callback) => {
        if (value === '') {
          return callback();
        }
        if (form.type === 'Number' && isNaN(Number(value))) {
          return callback(t('memoryNumRuleTip'));
        }
        if (form.type === 'Boolean' && typeof value !== 'boolean') {
          return callback(t('memoryBoolRuleTip'));
        }
        if (form.type === 'String' && !containsXSS(value)) {
          return callback(t('plsCheckInputMemoryString'));
        }
        callback();
      },
      trigger: ['change'],
    },
  ],
  TagName: [
    {
      required: true,
      message: t('requiredText'),
      trigger: ['change'],
    },
  ],
  dataSourceName: [
    {
      required: true,
      message: t('requiredText'),
      trigger: ['change'],
    },
  ],
  dataSourceType: [
    {
      required: true,
      message: t('requiredText'),
      trigger: ['change'],
    },
  ],
  TagType: [
    {
      required: true,
      message: t('requiredText'),
      trigger: ['change'],
    },
  ],
  description: [regexValidator('', t('plsInputSuccessDes'), false, ['change'])],
});

const typeOptions = reactive([
  {
    label: t('memoryBool'),
    value: 'Boolean',
  },
  {
    label: t('memoryNumber'),
    value: 'Number',
  },
  {
    label: t('memoryString'),
    value: 'String',
  },
  {
    label: t('dataSourceVariable'),
    value: 'DataSource',
  },
]);

const datasourceOptions = ref([]);

const form = reactive({ type: 'String', DataType: '0', value: '', ...props.editForm });
const datasourceInfo = ref({});

nextTick(async () => {
  const viriableTypeList = ['KingIOServer_Windows', 'KingSCADA_Windows', '工业数据源_网络模式', 'KingSCADA4.0'];
  const { data } = await getAllDataSourceServer();
  const allDatasource = await getProjectJSONSettingsServer({ type: 'dataAccess', groupId: -1 });
  const allDatasourceMap = new Map();
  for (let i = 0; i < allDatasource.length; i++) {
    allDatasourceMap.set(allDatasource[i].connectName, allDatasource[i]);
  }
  datasourceOptions.value = data.filter((item) => {
    if (viriableTypeList.includes(item.type) && allDatasourceMap.has(item.name)) {
      const dataSource = allDatasourceMap.get(item.name);
      item.name = dataSource.name;
      return true;
    } else {
      return false;
    }
  });
  if (form.DataType !== '0') {
    form.type = 'DataSource';
    datasourceInfo.value = datasourceOptions.value.find((item) => item.type === form.dataSourceType);
  }
});

const onSubmit = () => {
  if (!formRef) {
    return;
  }
  formRef.value.validate((valid) => {
    if (valid) {
      if (form.type === 'DataSource') {
        form.type = `IO_${form.TagType}`;
      }
      emit('submit', form);
    }
  });
};

const selectChange = (row) => {
  selectChangeType(row);
  if (row === 'Boolean' || row === 'Number' || row === 'String') {
    form.DataType = '0';
    form.TagName = '';
    form.TagType = '';
    form.dataSourceName = '';
    form.dataSourceType = '';
  }
};
const selectChangeType = (row) => {
  switch (row) {
    case 'Boolean':
      form.value = props.editForm.value && row === props.editForm.type ? props.editForm.value : false;
      break;
    case 'Number':
      form.value = props.editForm.value && row === props.editForm.type ? props.editForm.value : '0';
      break;
    default:
      form.value = props.editForm.value && row === props.editForm.type ? props.editForm.value : '';
  }
};

const datasourceChange = (row) => {
  const datasourceData = datasourceOptions.value.find((item) => item.name === row);
  form.dataSourceType = datasourceData.type;

  datasourceInfo.value = datasourceData;
};

const getTagName = async () => {
  if (!datasourceInfo.value.guid) {
    ElMessage.error(t('plsFirstSelectDatasource'));
    return;
  }
  tagVisible.value = true;

  const { data } = await getVariableServer(datasourceInfo.value);
  tagData.value = data;
};

const onTagNameSelect = () => {
  if (!tableSelect.value) {
    return;
  }
  form.TagName = tableSelect.value.TagName;
  form.TagType = getTagType(tableSelect.value.DataType);
  form.DataType = String(tableSelect.value.DataType);
  selectChangeType(form.TagType);
  tagVisible.value = false;
};

const cancelTagHandle = () => {
  tableSelect.value = null;
};
const currentChangeHandle = (row) => {
  tableSelect.value = row;
};
const getTagType = (type) => {
  switch (type) {
    case '1':
    case 1:
      return 'Boolean';
    case '2':
    case 2:
      return 'Number';
    case '3':
    case '6':
    case 3:
    case 6:
      return 'Number';
    case '4':
    case 4:
      return 'Number';
    case '5':
    case 5:
      return 'String';
    default:
      return '';
  }
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title
    :width="720"
    @confirm="onSubmit"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-row>
        <el-col :span="12">
          <el-form-item :label="t('variableName')" prop="name">
            <el-input v-model="form.name"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('variableType')" prop="type">
            <el-select v-model="form.type" :placeholder="t('plsSelectDatasourceType')" @change="selectChange">
              <el-option v-for="row of typeOptions" :key="row.value" :label="row.label" :value="row.value"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="form.type === 'DataSource'" :span="12">
          <el-form-item :label="t('datasourceName')" prop="dataSourceName">
            <el-select
              v-model="form.dataSourceName"
              :placeholder="t('plsSelectDatasourceType')"
              @change="datasourceChange"
            >
              <el-option
                v-for="row of datasourceOptions"
                :key="row.name"
                :label="row.name"
                :value="row.name"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="form.type === 'DataSource'" :span="12">
          <el-form-item :label="t('datasourceType')" prop="datasourceType">
            <el-input v-model="form.dataSourceType" readonly></el-input>
          </el-form-item>
        </el-col>

        <el-col v-if="form.type === 'DataSource'" :span="12">
          <el-form-item :label="t('tagName')" prop="TagName">
            <el-input v-model="form.TagName" readonly>
              <template #append>
                <el-icon class="pointer" @click.stop="getTagName">
                  <IEpMore />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
        </el-col>

        <el-col v-if="form.type === 'DataSource'" :span="12">
          <el-form-item :label="t('tagType')" prop="TagType">
            <el-input v-model="form.TagType" readonly></el-input>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item :label="t('initValue')" prop="value">
            <el-select
              v-if="form.type === 'Boolean' || form.type === 'IO_Boolean' || form.TagType === 'Boolean'"
              v-model="form.value"
            >
              <el-option :value="false" label="false"></el-option>
              <el-option :value="true" label="true"></el-option>
            </el-select>
            <el-input v-else v-model="form.value"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('description')" prop="description">
            <el-input v-model="form.description" type="textarea"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </CustomDialog>

  <CustomDialog
    v-model:dialog-visible="tagVisible"
    :title="t('associateDBVariable')"
    :width="720"
    @close="cancelTagHandle"
    @confirm="onTagNameSelect"
    @update:dialogVisible="emit('update:tagVisible', $event)"
  >
    <el-input
      v-model="searchTag"
      :placeholder="t('plsInputKeywordSearch')"
      :suffix-icon="Search"
      class="search-input"
      clearable
    />
    <CustomStyleTable
      :table-data="filterTagData"
      max-height="calc(100vh - 264px)"
      row-key="TagName"
      @currentChangeHandle="currentChangeHandle"
      @tableRowDBClick="onTagNameSelect"
    >
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column :label="t('name')" align="center" prop="TagName" show-overflow-tooltip />
      <el-table-column :label="t('type')" align="center" prop="DataType" show-overflow-tooltip>
        <template #default="{ row }">
          {{ getTagType(row.DataType) }}
        </template>
      </el-table-column>
      <el-table-column :label="t('description')" align="center" prop="TagDescription" show-overflow-tooltip />
    </CustomStyleTable>
  </CustomDialog>
</template>

<style lang="scss" scoped>
.flex-direction-column {
  flex-direction: column;
}
.search-input {
  width: 200px;
  display: block;
  margin-left: auto;
  margin-bottom: 15px;
}
</style>
