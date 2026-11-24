import { defineStore } from 'pinia';
import { getDataSetItemItemServer, getReportServer } from '@/api/allRequest/clientAPI.js';

export const useReportEditorStore = defineStore('reportEditorStore', () => {
  const rowCount = ref(100);
  const cellMap = ref(new Map());
  const currentCell = ref({});
  const currentSheet = ref({});
  const pagePropertyMap = reactive(new Map());
  const dataSetMap = reactive(new Map());
  const workbookDataMap = reactive(new Map());
  const reportEditorList = ref([]);
  const dataSetList = ref([]);
  const dragNode = ref(null);
  const getUniverAPI = ref(() => {});

  const handleGetUniverAPI = (func) => {
    getUniverAPI.value = func;
  };
  const runGetUniverAPI = () => {
    return getUniverAPI.value();
  };
  const addReportEditorList = async (row) => {
    row.reportInfo = await getReportInfo(row.id);
    pagePropertyMap.set(row.id, row.reportInfo.pageProperty);
    dataSetMap.set(row.id, handleDataSetMap(row.reportInfo.dataSet));
    workbookDataMap.set(row.id, row.reportInfo.workbookData);
    reportEditorList.value.push(row);
  };

  const setPagePropertyMap = (activeTab, row) => {
    pagePropertyMap.set(activeTab, row);
  };

  const setDataSetMap = (id, row) => {
    dataSetMap.set(id, row);
  };

  const setWorkbookDataMap = (id, reportWorkData) => {
    workbookDataMap.set(id, reportWorkData);
  };
  const handleDataSetMap = (dataSet) => {
    if (dataSet && typeof dataSet === 'object' && !Array.isArray(dataSet)) {
      const dataSetInfoMap = new Map();
      for (const key in dataSet) {
        if (Object.prototype.hasOwnProperty.call(dataSet, key)) {
          let sheetKey = Number(key);

          if (isNaN(sheetKey)) {
            sheetKey = key;
          }
          const value = dataSet[sheetKey];
          if (value && !value.id) {
            dataSetInfoMap.set(sheetKey, handleDataSetMap(dataSet[sheetKey]));
          } else {
            dataSetInfoMap.set(sheetKey, value);
          }
        }
      }
      return dataSetInfoMap;
    }
    return dataSet;
  };

  const setDataSetValue = ({ activeTab, subUnitId, unitId, column, row, type, id, name, tag, expansion }) => {
    const dataSetInfo = getDataSetMap(activeTab);
    if (!dataSetInfo.has(subUnitId)) {
      dataSetInfo.set(subUnitId, new Map());
    }
    const numRow = +row;
    const numColumn = +column;
    const subUnitMap = dataSetInfo.get(subUnitId);
    if (!subUnitMap.has(numRow)) {
      subUnitMap.set(numRow, new Map());
    }
    const rowMap = subUnitMap.get(numRow);
    rowMap.set(numColumn, {
      column: numColumn,
      row: numRow,
      type,
      subUnitId: subUnitId,
      unitId: unitId,
      id,
      name,
      tag,
      expansion,
    });
  };

  const deleteDataSetMap = (id) => {
    dataSetMap.delete(id);
  };

  const getDataSetMap = (id) => {
    return dataSetMap.get(id);
  };

  const setDragNode = (node) => {
    dragNode.value = node;
  };
  const setCellMap = (row) => {
    cellMap.value = row;
  };
  const setCurrentCell = (cell) => {
    currentCell.value = cell;
  };
  const setCurrentSheet = (sheet) => {
    currentSheet.value = sheet;
  };

  const getReportInfo = async (id) => {
    const { data } = await getReportServer({ id });
    return JSON.parse(data);
  };

  const getDataSetItemItem = async (id) => {
    const { data } = await getDataSetItemItemServer(id);
    const dataItem = data.dataItem.map((item) => {
      return {
        ...item,
        type: 'dataItem',
      };
    });
    const dataSet = data.dataSet.map((item) => {
      return {
        ...item,
        type: 'dataSet',
      };
    });
    dataSetList.value = [...dataItem, ...dataSet];
  };

  /**
   * @description 插入或删除行函数
   * @param {Number} type  0: 删除 1:插入
   * @param {Number} index 删除或插入的起始行
   * @param {Number} count 插入或删除的总数
   * @param {String} tabId tab页的activeTab
   * @param  {String}  sheetId
   */
  const updateDataSetMapOnRowChange = (type, index, count = 1, tabId, sheetId) => {
    const newMap = new Map();
    const dataSetInfo = dataSetMap.get(tabId)?.get(sheetId);
    for (const [rowKey, colMap] of dataSetInfo.entries()) {
      let newRowKey = rowKey;
      if (type === 1) {
        if (rowKey >= index) {
          newRowKey = rowKey + count;
        }
      } else if (type === 0) {
        if (rowKey >= index && rowKey < index + count) {
          continue;
        }
        if (rowKey >= index + count) {
          newRowKey = rowKey - count;
        }
      }
      const newColMap = new Map();
      for (const [colKey, cell] of colMap.entries()) {
        newColMap.set(colKey, { ...cell, row: newRowKey });
      }
      newMap.set(newRowKey, newColMap);
    }

    dataSetMap.set(tabId, new Map([[sheetId, newMap]]));
  };

  /**
   @description 插入或删除列函数
   * @param {Number} type  0: 删除 1:插入
   * @param {Number} index 删除或插入的起始行
   * @param {Number} count 插入或删除的总数
   * @param {String} tabId tab页的activeTab
   * @param sheetId
   */
  const updateDataSetMapOnColumnChange = (type, index, count = 1, tabId, sheetId) => {
    const dataSetInfo = dataSetMap.get(tabId)?.get(sheetId);
    const newMap = new Map();
    for (const [rowKey, colMap] of dataSetInfo.entries()) {
      const newColMap = new Map();
      for (const [colKey, cell] of colMap.entries()) {
        let newColKey = colKey;
        if (type === 1) {
          if (colKey >= index) {
            newColKey = colKey + count;
          }
        } else if (type === 0) {
          if (colKey >= index && colKey < index + count) {
            continue;
          }
          if (colKey >= index + count) {
            newColKey = colKey - count;
          }
        }
        newColMap.set(newColKey, { ...cell, column: newColKey });
      }
      newMap.set(rowKey, newColMap);
    }
    dataSetMap.set(tabId, new Map([[sheetId, newMap]]));
  };

  const resetReportStore = () => {
    reportEditorList.value = [];
    pagePropertyMap.clear();
    dataSetMap.clear();
    workbookDataMap.clear();
  };
  return {
    rowCount,
    currentCell,
    currentSheet,
    reportEditorList,
    pagePropertyMap,
    dataSetMap,
    workbookDataMap,
    dragNode,
    getUniverAPI,
    dataSetList,
    runGetUniverAPI,
    handleGetUniverAPI,
    setDragNode,
    setPagePropertyMap,
    setCellMap,
    setCurrentCell,
    setCurrentSheet,
    addReportEditorList,
    setDataSetMap,
    getDataSetMap,
    deleteDataSetMap,
    getDataSetItemItem,
    resetReportStore,
    setDataSetValue,
    setWorkbookDataMap,
    updateDataSetMapOnRowChange,
    updateDataSetMapOnColumnChange,
  };
});
