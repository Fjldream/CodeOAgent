<script setup>
import { useI18n } from 'vue-i18n';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import { Tools } from '@univerjs/core';
import { isNull } from '@/utils/commonUtils.js';

const safaText = /^(?!\d)[\u4e00-\u9fa5a-zA-Z0-9_]{1,64}$/;

const { t } = useI18n();
const reportEditorStore = useReportEditorStore();

const { setCurrentSheet, setPagePropertyMap, runGetUniverAPI, getDataSetMap, setDataSetValue } = reportEditorStore;

const props = defineProps({
  activeTab: String,
});

const emits = defineEmits(['update:reportInfo']);

const activeRadio = ref(1);
const cellName = ref('');

await nextTick();

const reportAttrs = [
  {
    title: t('base'),
    id: 'base',
    tableData: [
      {
        key: t('name'),
        value: computed({
          get: () => reportEditorStore.pagePropertyMap.get(props.activeTab)?.name,
          set: (value) => {
            if (isNull(value)) {
              return;
            }
            if (!safaText.test(value)) {
              return;
            }
            setPagePropertyMap(props.activeTab, {
              ...reportEditorStore.pagePropertyMap.get(props.activeTab),
              name: value,
            });
          },
        }),
        type: 'input',
      },
      {
        key: t('description'),
        value: computed({
          get: () => reportEditorStore.pagePropertyMap.get(props.activeTab)?.description,
          set: (value) => {
            if (isNull(value)) {
              return;
            }
            if (!safaText.test(value)) {
              return;
            }
            setPagePropertyMap(props.activeTab, {
              ...reportEditorStore.pagePropertyMap.get(props.activeTab),
              description: value,
            });
          },
        }),
        type: 'input',
      },
    ],
    tableShow: true,
  },
  {
    title: t('sheetConfig'),
    id: 'sheetConfig',
    tableData: [
      {
        key: t('rowCount'),
        value: computed({
          get: () => reportEditorStore.currentSheet.rowCount,
          set: (value) => {
            const univerAPI = runGetUniverAPI();
            const workbook = univerAPI?.getActiveWorkbook();
            const activeSheet = workbook?.getActiveSheet();
            if (isNull(value)) {
              return;
            }
            if (!Number.isInteger(Number(value))) {
              return;
            }
            setCurrentSheet({
              ...reportEditorStore.currentSheet,
              rowCount: value,
            });
            activeSheet.setRowCount(value);
          },
        }),
        checkType: 'number',
        type: 'input',
      },
      {
        key: t('columnCount'),
        value: computed({
          get: () => reportEditorStore.currentSheet.columnCount,
          set: (value) => {
            const univerAPI = runGetUniverAPI();
            const workbook = univerAPI?.getActiveWorkbook();
            const activeSheet = workbook?.getActiveSheet();
            if (isNull(value)) {
              return value;
            }
            if (!Number.isInteger(Number(value))) {
              return;
            }
            setCurrentSheet({
              ...reportEditorStore.currentSheet,
              columnCount: value,
            });
            activeSheet.setColumnCount(value);
          },
        }),
        checkType: 'number',
        type: 'input',
      },
    ],
    tableShow: true,
  },
];

const cellAttrs = reactive([
  {
    title: t('base'),
    id: 1,
    tableData: [
      {
        key: t('name'),
        id: 'name',
        value: computed(() => cellName.value),
      },
    ],
    tableShow: true,
  },
  {
    title: t('expansion'),
    id: 2,
    tableData: [
      {
        key: t('expansionDirection'),
        id: 'expansion',
        value: '2',
        type: 'select',
        options: [
          {
            value: '1',
            label: t('noExpansion'),
          },
          {
            value: '2',
            label: t('transverse'),
          },
          {
            value: '3',
            label: t('longitudinal'),
          },
        ],
      },
    ],
    tableShow: true,
  },
  {
    title: t('dataSetting'),
    id: 3,
    tableData: [
      {
        key: t('dataSet'),
        id: 'dataSet',
        value: '',
        type: 'select',
        options: [],
      },
      {
        key: t('member'),
        id: 'member',
        value: '',
        type: 'select',
        options: [],
      },
    ],
    tableShow: true,
  },
  {
    title: t('cell'),
    id: 4,
    tableData: [
      {
        key: t('leftCell'),
        id: 'leftCell',
        value: '1',
        type: 'select',
        options: [
          {
            value: '1',
            label: t('none'),
          },
          {
            value: '2',
            label: t('defaultValue'),
          },
        ],
      },
      {
        key: t('topCell'),
        id: 'topCell',
        value: '1',
        type: 'select',
        options: [
          {
            value: '1',
            label: t('none'),
          },
          {
            value: '2',
            label: t('defaultValue'),
          },
        ],
      },
    ],
    tableShow: true,
  },
]);

const showAttrs = ref(reportAttrs);

watchEffect(() => {
  if (reportEditorStore.dataSetList) {
    getDataSetItemItem(reportEditorStore.dataSetList);
  }
});

watch(
  () => [reportEditorStore.currentCell.row, reportEditorStore.currentCell.column],
  async () => {
    if (!reportEditorStore.currentCell) {
      cellName.value = `A1`;
    } else {
      cellName.value = `${Tools.chatAtABC(reportEditorStore.currentCell.column)}${reportEditorStore.currentCell.row + 1}`;
    }
    const dataSetInfo = getDataSetMap(props.activeTab);

    const member = cellAttrs.find((row) => row.id === 3).tableData.find((row) => row.id === 'member');
    const dataSet = cellAttrs.find((row) => row.id === 3).tableData.find((row) => row.id === 'dataSet');
    const expansionObj = cellAttrs.find((row) => row.id === 2).tableData.find((row) => row.id === 'expansion');

    const dataSetObj = dataSetInfo.get(reportEditorStore.currentCell.subUnitId);
    const dataSetJson = dataSetObj?.get(reportEditorStore.currentCell.row)?.get(reportEditorStore.currentCell.column);
    expansionObj.value = dataSetJson?.expansion || '2';

    if (dataSetJson) {
      const tagList = reportEditorStore.dataSetList.find((row) => row.id === dataSetJson?.id)?.tagList || [];
      dataSet.value = dataSetJson.id;
      if (dataSetJson.tag) {
        member.dataSet = dataSetJson;
        member.value = dataSetJson.tag;
        member.type = 'select';
        member.options = tagList?.map((tag) => ({
          value: tag,
          label: tag,
        }));
      } else {
        member.type = 'input';
        member.disable = true;
      }

      return;
    }
    dataSet.value = '';
    member.value = '';
  },
);

function getDataSetItemItem(dataSetList) {
  const dataSetOption = cellAttrs.find((row) => row.id === 3).tableData.find((row) => row.id === 'dataSet');
  dataSetOption.options = dataSetList.map((row) => {
    return {
      ...row,
      value: row.id,
      label: row.name,
    };
  });
}

const handleTableShow = (row) => {
  row.tableShow = !row.tableShow;
};

const handleRadioChange = (radio) => {
  switch (radio) {
    case 1:
      showAttrs.value = reportAttrs;
      break;
    case 2:
      showAttrs.value = cellAttrs;
      break;
    default:
  }
};

const selectChange = (row, selectValue, tableData) => {
  try {
    const rowOptions = row.options.find((option) => option.id === selectValue);
    const member = tableData.find((data) => data.id === 'member');
    let dataSetValue = {
      activeTab: props.activeTab,
      ...reportEditorStore.currentCell,
    };
    const dataSetInfo = getDataSetMap(props.activeTab);
    const dataJson = dataSetInfo?.get(reportEditorStore.currentCell.subUnitId);
    const dataJsonObj = dataJson?.get(reportEditorStore.currentCell.row)?.get(reportEditorStore.currentCell.column);
    switch (row.id) {
      case 'dataSet':
        dataSetValue = {
          ...dataSetValue,
          id: rowOptions.id,
          type: rowOptions.type,
          name: rowOptions.label,
          expansion: '2',
          leftCell: { type: '1', row: '', col: '' },
          topCell: { type: '1', row: '', col: '' },
        };
        if (rowOptions.type === 'dataSet') {
          dataSetValue.tag = rowOptions.tagList?.[0];
          member.type = 'select';
          member.disable = false;
          member.dataSet = rowOptions;
          member.value = rowOptions.tagList[0];
          member.options =
            rowOptions.tagList.map((data) => ({
              value: data,
              label: data,
            })) || [];
          setCellValue(`${rowOptions.label}.${member.value}`);
        } else {
          member.type = 'input';
          member.value = '';
          member.options = [];
          member.disable = true;
          setCellValue(`${rowOptions.label}`);
        }
        setDataSetValue(dataSetValue);
        break;
      case 'member':
        if (!dataJsonObj) {
          return;
        }
        dataJsonObj.tag = row.value;
        setCellValue(`${row.dataSet.name}.${row.value}`);
        break;
      case 'leftCell':
        if (!dataJsonObj) {
          return;
        }
        dataJsonObj.leftCell = {
          type: row.value,
          row: reportEditorStore.currentCell.row,
          col: reportEditorStore.currentCell.column - 1,
        };
        break;
      case 'topCell':
        if (!dataJsonObj) {
          return;
        }
        dataJsonObj.topCell = {
          type: row.value,
          row: reportEditorStore.currentCell.row - 1,
          col: reportEditorStore.currentCell.column,
        };
        break;
      case 'expansion':
        if (!dataJsonObj) {
          return;
        }
        dataJsonObj.expansion = row.value;
        break;
      default:
    }
  } catch (e) {}
};

const setCellValue = (value) => {
  const univerAPI = runGetUniverAPI();
  const workbook = univerAPI?.getActiveWorkbook();
  const activeSheet = workbook?.getActiveSheet();
  const range = activeSheet?.getRange(reportEditorStore.currentCell.row, reportEditorStore.currentCell.column);
  range?.setValue(`$$${value}`);
};
</script>

<template>
  <el-card class="h-100 card">
    <el-radio-group v-model="activeRadio" size="small" class="mb-5" @change="handleRadioChange">
      <el-radio-button :value="1">{{ t('reportAttr') }}</el-radio-button>
      <el-radio-button :value="2">{{ t('cellAttr') }}</el-radio-button>
    </el-radio-group>
    <div v-for="item of showAttrs" :key="item.title">
      <div class="df header">
        <div class="mr-6 pointer" @click="handleTableShow(item)">
          <IEpMinus v-if="item.tableShow" />
          <IEpPlus v-else />
        </div>
        <div>{{ item.title }}</div>
      </div>
      <el-table :data="item.tableData" :show-header="false" border size="small" v-show="item.tableShow">
        <el-table-column prop="key" width="80"></el-table-column>
        <el-table-column prop="value">
          <template #default="{ row }">
            <el-input
              v-if="row.type === 'input'"
              v-model.trim="row.value"
              size="small"
              :disabled="row.disable"
            ></el-input>
            <el-select
              v-else-if="row.type === 'select'"
              v-model="row.value"
              size="small"
              @change="selectChange(row, $event, item.tableData)"
            >
              <el-option
                v-for="item of row.options"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
            <div v-else>{{ row.value }}</div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.h-100 {
  height: 100%;
}

.right-header {
  &::after {
    content: '';
    margin: 6px 0;
    display: block;
    border-bottom: 1px solid #d1d1d1;
  }
}

.card {
  min-width: 300px;
}

.header {
  height: 32px;
  padding: 0 4px;
  background-color: #ebeef5;
}

::v-deep(.el-input__wrapper),
::v-deep(.el-select__wrapper) {
  border: none;
  box-shadow: none;
}
</style>
