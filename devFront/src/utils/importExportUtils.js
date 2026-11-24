import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { t } from '@/i18n/index.js';
export const exportTableToExcel = async ({
  tableData,
  tableColumn,
  filename = `${Date.now()}.xlsx`,
  sheetName = 'sheet1',
}) => {
  const columnData = tableColumn.value || tableColumn;
  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columnData.map((column) => ({
    header: column.label,
    key: column.props,
    width: 16,
  }));

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F1F4F9' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  for (const row of tableData) {
    const rowData = {};
    for (const col of columnData) {
      rowData[col.props] = row[col.props];
    }
    const dataRow = worksheet.addRow(rowData);
    columnData.forEach((column, index) => {
      const value = row[column.props] ?? '';
      const cell = dataRow.getCell(index + 1);
      cell.value = value;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    dataRow.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(new Blob([buffer]), filename);
};

export const importTableToExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  const result = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const plainRow = row.values.map(getPlainText);
    result.push(plainRow);
  });
  function getPlainText(value) {
    if (value === '') {
      return '';
    }
    if (value.richText) {
      return value.richText
        .map((v) => v.text)
        .join('')
        .trim();
    }
    return value.toString();
  }
  return result;
};
export const getImportTableExcelHeader = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  const header = [];
  worksheet.getRow(1).eachCell((cell) => header.push(cell.value));
  return header;
};
export const exportScriptJsonHandle = (data, fileName = 'script.json') => {
  return new Promise((resolve) => {
    const jsonStr = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });

    const url = URL.createObjectURL(blob);

    // 这个标签不需要处理,浏览器自动处理临时DOM元素
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
    resolve();
  });
};

export const importScriptJsonHandle = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      return reject(new Error(t('selectJsonTips')));
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        resolve(data);
      } catch (e) {
        reject(new Error(t('jsonErrorTip', { message: e.message })));
      }
    };
    reader.onerror = () => reject(new Error(t('jsonReadErrorTip')));

    reader.readAsText(file);
  });
};

export const batchZIPDownloadHandle = async (files) => {
  return new Promise(async (resolve) => {
    const pool = 3;
    let idx = 0;
    const success = [],
      fail = [];
    const worker = async () => {
      while (idx < files.length) {
        const { url, fileName } = files[idx++];
        try {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          success.push(fileName);
        } catch (error) {
          fail.push(fileName);
        }
        await new Promise((item) => setTimeout(item, 100));
      }
    };
    await Promise.all(Array.from({ length: pool }, worker));
    resolve(success.concat(fail).join(','));
  });
};
