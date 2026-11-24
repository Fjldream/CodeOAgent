<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useVariableEngineer } from '@/composables/clientCompose/useVariableEngineer';
import { regexValidator } from '@/utils/regexRules.js';
import { getAllDataSourceServer, getVariableServer } from '@/api/allRequest/dataSourceAPI.js';
import { getDataSourceListServer } from '@/api/allRequest/clientAPI';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const props = defineProps({
  isSingle: { type: Boolean, default: false },
  title: String,
});

const emit = defineEmits(['quickAddConfirm']);
const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
});
const tableRef = useTemplateRef('tableRef');
const clientMenuStore = useClientMenuStore();
const { getFilterOptions, getQuickAddTabColumns } = useVariableEngineer({ t });

const quickAddTabColumns = getQuickAddTabColumns();
const dataSourceNameOptions = ref([]);
const isLoading = ref(false);
const filterOptions = getFilterOptions();

// 表单控件
const formRules = reactive({
  dataSourceName: [regexValidator('notEmpty', t('clientRuleTip1'))],
  filterString: [regexValidator('', t('clientRuleTip2'), false)],
  prefix: [regexValidator('', t('clientRuleTip3'), false)],
  suffix: [regexValidator('', t('clientRuleTip4'), false)],
  original: [regexValidator('', t('clientRuleTip5'), false)],
  replace: [regexValidator('', t('clientRuleTip6'), false)],
});
const form = ref({
  dataSourceName: '',
  filterString: '',
  filterType: t('variableType'),
  isAffix: '',
  prefix: '',
  suffix: '',
  isReplace: '',
  original: '',
  replace: '',
});
//选择导入的变量
const tableData = ref([]);
// 多选数组
const selectRow = ref([]);

// 数据源信息列表
const datasourceList = ref({});
const allDatasourceList = ref({});

nextTick(() => {
  initPageData();
});

const filterData = computed(() => {
  if (form.value.filterType === t('variableType')) {
    return tableData.value.filter((item) =>
      item.dataType.toLowerCase().includes(form.value.filterString.toLowerCase()),
    );
  }
  return tableData.value.filter((item) => item.TagName.toLowerCase().includes(form.value.filterString.toLowerCase()));
});
// 表格显示
const tableSelect = (row) => {
  if (props.isSingle && row.length > 1) {
    const tableRefs = tableRef.value.getTableRef();
    const lastSelected = row[row.length - 1];
    tableRefs.clearSelection();
    tableRefs.toggleRowSelection(lastSelected, true);
    selectRow.value = [lastSelected];
  } else {
    selectRow.value = row;
  }
};
/**
 * @function initPageData
 * @description 初始化数据源列表
 * @returns null
 */
async function initPageData() {
  const res = await getAllDataSourceServer();
  const configDatasource = await getDataSourceListServer({ projectId: clientMenuStore.currentClientEngineer.guid });
  if (res.errorCode === 0 && configDatasource.errorCode === 0) {
    const allowType = ['KingSCADA', 'KingIOServer', 'KingView', '工业数据源_网络模式', 'KingHistorian_Windows'];
    for (let i = 0; i < res.data.length; i++) allDatasourceList.value[res.data[i].name] = res.data[i];
    configDatasource.data.message = configDatasource.data.message.filter((item) => {
      const filter = allowType.filter((type) => item.type.indexOf(type) !== -1);
      return filter.length > 0;
    });
    dataSourceNameOptions.value = [
      ...configDatasource.data.message.map((item) => {
        datasourceList.value[item.name] = allDatasourceList.value[item.appName];
        return { label: item.name, value: item.name, id: item.id };
      }),
    ];
  }
}

/**
 * @function selectedChange
 * @description 切换数据源
 * @returns null
 */
const selectedChange = async (val) => {
  if (!datasourceList.value[val]) {
    return;
  }
  isLoading.value = true;
  tableData.value = [];

  const res = await getVariableServer({ guid: datasourceList.value[val].guid });
  isLoading.value = false;
  if (res.errorCode === 0) {
    const typeName = {
      1: t('boolTag'),
      2: t('numberTag'),
      3: t('numberTag'),
      4: t('numberTag'),
      5: t('stringTag'),
      6: t('numberTag'),
      11: t('stringTag'),
    };
    tableData.value = res.data
      .filter((tagList) => tagList.DataType !== 0)
      .map((item) => {
        return { ...item, dataType: typeName[item.DataType] };
      });
    const invalidTags = res.data.filter((tagList) => tagList.DataType === 0).map((item) => item.TagName);
    if (invalidTags.length) {
      ElMessage.warning(t('invalidTags', { arr: invalidTags.join(',') }));
    }
  }
  form.value.filterType = t('variableType');
  form.value.filterString = '';
};
const affixRadio = () => {
  form.value.isAffix = form.value.isAffix === 'affix' ? '' : 'affix';
};
const replaceRadio = () => {
  form.value.isReplace = form.value.isReplace === 'replace' ? '' : 'replace';
};
const emitConfirm = () => {
  if (selectRow.value.length === 0) {
    return;
  }
  const datasource = datasourceList.value[form.value.dataSourceName];
  const dataTypeChange = {
    1: { type: 0, value: true },
    2: { type: 1, value: 0 },
    3: { type: 1, value: 0 },
    4: { type: 1, value: 0 },
    5: { type: 2, value: '' },
    11: { type: 2, value: '' },
  };
  const projectDataSourceId = dataSourceNameOptions.value.find((item) => item.label === form.value.dataSourceName)?.id;
  const addData = selectRow.value.map((data) => {
    let tagName = data.TagName;
    if (form.value.isReplace === 'replace') {
      for (let index = 0; index < form.value.original.length; index++) {
        tagName = tagName.replaceAll(form.value.original[index], form.value.replace[index]);
      }
    }
    if (form.value.isAffix === 'affix') {
      tagName = form.value.prefix + tagName + form.value.suffix;
    }
    return {
      name: tagName,
      dataType: dataTypeChange[data.DataType].type,
      id: '',
      comment: data.TagDescription,
      defaultValue: dataTypeChange[data.DataType].value,
      isMap: true,
      isSub: true,
      type: form.value.dataSourceName,
      securityConfig: {},
      writeAndRead: 0, // 默认读写方式
      dataSourceType: datasource.type,
      projectDataSourceId: projectDataSourceId || '',
      basicItem: {
        defaultValue: dataTypeChange[data.DataType].value,
      },
      dataSourceItem: {
        name: datasource.name,
        tagName: data.TagName,
        appName: datasource.name,
        variableType: data.DataType,
      },
      linkType: '', // 采集/订阅方式
      frequent: 3000, //订阅频率
    };
  });
  emit('quickAddConfirm', addData);
};
</script>
<template>
  <CustomDialog v-model:dialogVisible="dialogVisible" :title :width="720" @confirm="emitConfirm">
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('datasourceName')" prop="dataSourceName">
        <el-select v-model="form.dataSourceName" :placeholder="t('plsSetlect')" @change="selectedChange">
          <el-option
            v-for="item in dataSourceNameOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('filterCondition')" prop="filterString">
        <div class="qucik-filter">
          <el-select v-model="form.filterType" :placeholder="t('plsSetlect')" class="select-filter">
            <el-option
              v-for="item in filterOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
          <el-input v-model="form.filterString" />
        </div>
      </el-form-item>
      <el-form-item class="quick-table">
        <CustomStyleTable
          ref="tableRef"
          :loading="isLoading"
          :showHighlight="true"
          :showPagination="true"
          :tableData="filterData"
          rowKey="TagName"
          style="width: 100%"
          @selectionChange="tableSelect"
        >
          <el-table-column align="center" type="selection" width="55" />
          <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
          <el-table-column
            v-for="propItems of quickAddTabColumns"
            :key="propItems.props"
            :label="propItems.label"
            :min-width="propItems.minWidth"
            :prop="propItems.props"
            align="center"
            show-overflow-tooltip
          />
        </CustomStyleTable>
      </el-form-item>
      <el-form-item v-show="!isSingle" :label="t('variableRename')"></el-form-item>
      <el-row v-show="!isSingle" :gutter="20">
        <el-col :span="4">
          <el-form-item>
            <el-radio :model-value="form.isAffix" label="affix" @click="affixRadio"> {{ t('addFix') }}</el-radio>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="t('prefix')" prop="prefix">
            <el-input v-model="form.prefix" :disabled="form.isAffix === ''"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="t('suffix')" prop="suffix">
            <el-input v-model="form.suffix" :disabled="form.isAffix === ''"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row v-show="!isSingle" :gutter="20">
        <el-col :span="4">
          <el-form-item>
            <el-radio :model-value="form.isReplace" label="replace" @click="replaceRadio">
              {{ t('replaceRadio') }}
            </el-radio>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="t('original')" prop="original">
            <el-input v-model="form.original" :disabled="form.isReplace === ''"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="t('replaceFor')" prop="replace">
            <el-input v-model="form.replace" :disabled="form.isReplace === ''"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.select-filter {
  width: 200px;
}

.qucik-filter {
  display: flex;
  gap: 10px;
  width: 100%;
}

.el-radio {
  margin-left: 10px;
}

.quick-table {
  ::v-deep(.el-table__body-wrapper) {
    max-height: 330px;
    min-height: 330px;
    overflow: hidden auto;

    td {
      padding: 0px;
    }
  }

  ::v-deep(.pagination) {
    position: static;
    margin-top: 16px;
  }
}
</style>
