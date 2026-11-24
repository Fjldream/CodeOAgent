<script setup>
import { useI18n } from 'vue-i18n';
import { reactive, watch } from 'vue';
import { useVariableEngineer } from '@/composables/clientCompose/useVariableEngineer.js';
import { regexValidator } from '@/utils/regexRules.js';
import { getAllDataSourceServer, getVariableServer } from '@/api/allRequest/dataSourceAPI.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const props = defineProps({
  dialogVisible: Boolean,
  title: String,
  configDatasource: Array,
  filterTagType: {
    type: Array,
    default: () => {
      return [];
    },
  },
});

const { getFilterOptions, getQuickAddTabColumns } = useVariableEngineer({ t });
const tableRef = useTemplateRef('tableRef');
const clientMenuStore = useClientMenuStore();
const quickAddTabColumns = getQuickAddTabColumns();
const dataSourceNameOptions = ref([]);
const isLoading = ref(false);
const filterOptions = getFilterOptions();

const emit = defineEmits(['update:dialogVisible', 'quickAddConfirm']);
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
//检索
const filterData = ref([]);
// 多选数组
const selectRow = ref([]);

// 数据源信息列表
const datasourceList = {};
const isMapping = computed(() => props.title === t('variableMapping'));

nextTick(() => {
  initPageData();
});
// 表格显示
const tableSelect = (row) => {
  if (isMapping.value && row.length > 1) {
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
  const { errorCode, data } = await getAllDataSourceServer();
  const allDatasourceList = {};
  if (errorCode === 0) {
    for (let i = 0; i < data.length; i++) {
      allDatasourceList[data[i].name] = data[i];
    }
    dataSourceNameOptions.value = props.configDatasource.map((item) => {
      datasourceList[item.id] = allDatasourceList[item.appName];
      return { label: item.name, value: item.id, ...item };
    });
  }
}

/**
 * @function selectedChange
 * @description 切换数据源
 * @returns null
 */
const selectedChange = async (val) => {
  if (!datasourceList[val]) {
    return;
  }
  isLoading.value = true;
  tableData.value = [];

  const { errorCode, data } = await getVariableServer({ guid: datasourceList[val].guid });
  isLoading.value = false;
  if (errorCode === 0) {
    const typeName = { 1: 'Boolean', 2: 'Number', 3: 'Number', 4: 'Number', 5: 'String' };
    const isFilterTags = props.filterTagType.length > 0;

    tableData.value = data
      .filter((row) => {
        if (!isFilterTags) {
          return true;
        }
        return props.filterTagType.includes(row.DataType);
      })
      .map((item) => {
        return { ...item, dataType: typeName[item.DataType] };
      });
  }
  form.value.filterType = t('variableType');
  form.value.filterString = '';
};

const selectFile = () => {
  if (form.value.filterType === t('variableType')) {
    filterData.value = tableData.value.filter((item) =>
      item.dataType.toLowerCase().includes(form.value.filterString.toLowerCase()),
    );
  } else {
    filterData.value = tableData.value.filter((item) =>
      item.TagName.toLowerCase().includes(form.value.filterString.toLowerCase()),
    );
  }
};
const affixRadio = () => {
  form.value.isAffix = form.value.isAffix === 'affix' ? '' : 'affix';
};
const replaceRadio = () => {
  form.value.isReplace = form.value.isReplace === 'replace' ? '' : 'replace';
};
const emitConfirm = () => {
  const datasource = datasourceList[form.value.dataSourceName];
  const dataTypeChange = {
    1: { type: 0, value: true },
    2: { type: 1, value: 0 },
    3: { type: 1, value: 0 },
    4: { type: 1, value: 0 },
    5: { type: 2, value: '' },
    11: { type: 2, value: '' },
  };
  const addData = selectRow.value.map((data) => {
    let tagName = data.TagName;
    if (form.value.isReplace === 'replace') {
      tagName = tagName.replace(form.value.original, form.value.replace);
    }
    if (form.value.isAffix === 'affix') {
      tagName = form.value.prefix + tagName + form.value.suffix;
    }
    return {
      name: tagName,
      dataType: dataTypeChange[data.DataType].type,
      tagType: data.DataType,
      id: '',
      comment: data.TagDescription,
      defaultValue: dataTypeChange[data.DataType].value,
      isMap: true,
      isSub: true,
      securityConfig: {},
      writeAndRead: 0, // 默认读写方式
      dataSourceType: datasource.type,
      projectDataSourceId: '',
      basicItem: {
        defaultValue: dataTypeChange[data.DataType].value,
      },
      dataSourceItem: {
        ...datasource,
        name: datasource.name,
        tagName: data.TagName,
        appName: datasource.name,
        variableType: data.DataType,
        dataSourceId: form.value.dataSourceName,
      },
      linkType: '', // 采集/订阅方式
      frequent: 3000, //订阅频率
    };
  });
  emit('quickAddConfirm', addData);
};
watch(tableData, () => {
  filterData.value = tableData.value;
});
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title
    :width="780"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
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
          <el-button type="primary" @click="selectFile">{{ t('define') }}</el-button>
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
            :label="t(propItems.label)"
            :min-width="propItems.minWidth"
            :prop="propItems.props"
            align="center"
            show-overflow-tooltip
          />
        </CustomStyleTable>
      </el-form-item>
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
