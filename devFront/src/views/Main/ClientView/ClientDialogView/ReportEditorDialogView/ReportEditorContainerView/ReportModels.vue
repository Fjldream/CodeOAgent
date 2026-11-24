<script setup>
import { useI18n } from 'vue-i18n';

import UniverPlugins from '@/utils/univerConfigUtils.js';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import { releaseReportSeatServer, setReportSeatServer } from '@/api/allRequest/clientAPI';

const { t } = useI18n();

const reportEditorStore = useReportEditorStore();
const {
  setCurrentCell,
  setCurrentSheet,
  getDataSetMap,
  handleGetUniverAPI,
  setDataSetValue,
  updateDataSetMapOnRowChange,
  updateDataSetMapOnColumnChange,
} = reportEditorStore;

const props = defineProps({
  activeTab: String,
});

const dataSetInfo = getDataSetMap(props.activeTab);

const univerRef = ref(null);
let univerAPI;
let CellValueType;

onMounted(async () => {
  await setReportSeatServer(props.activeTab);

  const { API, cellType } = await UniverPlugins(univerRef.value);
  await nextTick();
  univerAPI = API;
  CellValueType = cellType;
  handleGetUniverAPI(getUniverAPI);

  const workbookData = reportEditorStore.workbookDataMap.get(props.activeTab);
  await univerAPI.createWorkbook(workbookData ?? {});

  registEvent();
});

onBeforeUnmount(async () => {
  await releaseReportSeatServer(props.activeTab);
});

window.addEventListener('beforeunload', async () => {
  await releaseReportSeatServer(props.activeTab);
});

const registEvent = () => {
  univerAPI.addEvent(univerAPI.Event.LifeCycleChanged, ({ stage }) => {
    if (stage === univerAPI.Enum.LifecycleStages.Rendered) {
      const workbook = univerAPI.getActiveWorkbook();
      const activeSheet = workbook.getActiveSheet();
      const activeCell = activeSheet.getActiveCell();
      setCurrentSheet({
        columnCount: activeSheet.getMaxColumns(),
        rowCount: activeSheet.getMaxRows(),
      });
      setCurrentCell({
        column: activeCell.getColumn(),
        row: activeCell.getRow(),
        subUnitId: activeSheet.getSheetId(),
        unitId: workbook.getId(),
      });
    }
  });
  univerAPI.addEvent(univerAPI.Event.CellClicked, (params) => {
    const { location } = params;
    setCurrentCell({
      column: location.col,
      row: location.row,
      subUnitId: location.subUnitId,
      unitId: location.unitId,
    });
  });
  univerAPI.addEvent(univerAPI.Event.ActiveSheetChanged, (params) => {
    const { activeSheet } = params;
    setCurrentSheet({
      columnCount: activeSheet.getMaxColumns(),
      rowCount: activeSheet.getMaxRows(),
    });
  });
  univerAPI.addEvent(univerAPI.Event.SheetValueChanged, (data) => {
    const {
      payload: { params },
    } = data;
    changeDataSet(params);
    changeCellDataType();
  });
  univerAPI.addEvent(univerAPI.Event.Drop, (params) => {
    const { column, row, worksheet, location } = params;
    const currentCell = worksheet.getRange(row, column);
    const dataSetValue = {
      activeTab: props.activeTab,
      ...location,
      column,
      row,
      expansion: '2',
      type: reportEditorStore.dragNode.data.type,
    };
    switch (reportEditorStore.dragNode.data.type) {
      case 'dataSet':
        dataSetValue.id = reportEditorStore.dragNode.parent.data.id;
        dataSetValue.name = reportEditorStore.dragNode.parent.data.label;
        dataSetValue.tag = reportEditorStore.dragNode.label;
        currentCell.setValue(`$$${reportEditorStore.dragNode.parent.label}.${reportEditorStore.dragNode.label}`);
        break;
      case 'dataItem':
        dataSetValue.id = reportEditorStore.dragNode.data.id;
        dataSetValue.name = reportEditorStore.dragNode.data.label;
        currentCell.setValue(`$$${reportEditorStore.dragNode.data.label}`);
        break;
      default:
    }
    setDataSetValue(dataSetValue);
  });
  univerAPI.addEvent(univerAPI.Event.CommandExecuted, (data) => {
    const { id, params } = data;
    if (!params?.range || !params?.subUnitId) {
      return;
    }
    const { range, subUnitId } = params;
    switch (id) {
      case 'sheet.command.insert-row':
        updateDataSetMapOnRowChange(1, range.startRow, range.endRow - range.startRow + 1, props.activeTab, subUnitId);
        break;
      case 'sheet.mutation.remove-rows':
        updateDataSetMapOnRowChange(0, range.startRow, range.endRow - range.startRow + 1, props.activeTab, subUnitId);

        break;
      case 'sheet.command.insert-col':
        updateDataSetMapOnColumnChange(
          1,
          range.startColumn,
          range.endColumn - range.startColumn + 1,
          props.activeTab,
          subUnitId,
        );
        break;
      case 'sheet.mutation.remove-col':
        updateDataSetMapOnColumnChange(
          0,
          range.startColumn,
          range.endColumn - range.startColumn + 1,
          props.activeTab,
          subUnitId,
        );
        break;
      default:
    }
  });
};
const changeDataSet = (params) => {
  const valueReg = /^\$\$.*/;
  const subInfo = dataSetInfo.get(params.subUnitId);
  if (subInfo) {
    for (const [row, columnValue] of subInfo) {
      if (!params.cellValue[row]) {
        continue;
      }
      for (const [column] of columnValue) {
        if (!params.cellValue[row][column] || valueReg.test(params.cellValue[row][column]?.v)) {
          continue;
        }
        columnValue.delete(column);
      }
      if (columnValue.size === 0) {
        subInfo.delete(row);
      }
    }
    if (subInfo.size === 0) {
      dataSetInfo.delete(params.subUnitId);
    }
  }
};

const changeCellDataType = () => {
  const worksheet = univerAPI.getActiveWorkbook().getActiveSheet();
  const active = worksheet.getActiveCell();
  if (!active) {
    return;
  }
  const range = worksheet.getRange(active.getRow(), active.getColumn());
  const formula = range.getFormula();
  if (!formula) {
    return;
  }
  const refs = extractRefs(formula);
  refs.forEach((ref) =>
    refToCells(ref).forEach(({ row, column }) => {
      const ranges = worksheet.getRange(row, column);
      const cur = ranges.getValue();
      if (typeof cur === 'string' && !isNaN(Number(cur))) {
        ranges.setValue({ v: Number(cur), t: CellValueType.NUMBER });
      }
    }),
  );
};
const getSheetData = () => {
  const workbook = univerAPI.getActiveWorkbook();
  // 获取完整 JSON 配置
  return workbook.save();
};
const createWorkbook = (data) => {
  univerAPI.createWorkbook(data);

  const workbook = univerAPI.getActiveWorkbook();
  const activeSheet = workbook.getActiveSheet();
  const activeCell = activeSheet.getActiveCell();

  setCurrentSheet({
    columnCount: activeSheet.getMaxColumns(),
    rowCount: activeSheet.getMaxRows(),
  });
  setCurrentCell({
    column: activeCell.getColumn(),
    row: activeCell.getRow(),
    subUnitId: activeSheet.getSheetId(),
    unitId: workbook.getId(),
  });
};

const getUniverAPI = () => {
  return univerAPI;
};

function refToCells(ref) {
  const [startRef, endRef = startRef] = ref.split(':');
  const start = refToRC(startRef);
  const end = refToRC(endRef);
  const cells = [];
  for (let { rowIndex } = start; rowIndex <= end.rowIndex; rowIndex++) {
    for (let { colIndex } = start; colIndex <= end.colIndex; colIndex++) {
      cells.push({ row: rowIndex, column: colIndex });
    }
  }
  return cells;
}
function refToRC(ref) {
  const matchs = ref.match(/([A-Z]+)(\d+)/);
  const colIndex = matchs[1].split('').reduce((pre, item) => pre * 26 + item.charCodeAt(0) - 64, 0) - 1;
  const rowIndex = Number(matchs[2]) - 1;
  return { rowIndex, colIndex };
}
function extractRefs(formula) {
  return formula.match(/\$?[A-Z]+\$?\d+(:\$?[A-Z]+\$?\d+)?/g) || [];
}
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { editorCell } from '@/assistant/editor-context.js';
function assistantSelection() {
  const sheet = univerAPI?.getActiveWorkbook()?.getActiveSheet();
  const cell = sheet?.getActiveCell();
  return cell && editorCell(sheet.getSheetId(), cell.getRow(), cell.getColumn());
}
defineExpose({ getUniverAPI, createWorkbook, getSheetData, assistantSelection });
// end
</script>

<template>
  <div ref="univerRef" class="univer-content"></div>
</template>

<style lang="scss" scoped>
.univer-content {
  width: 100%;
  height: 100%;
}
</style>
