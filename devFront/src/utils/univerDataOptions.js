// univerDataOptions.js
// 输入：luckyData - 可以是 Array 或者 { data: Array }
// 输出：符合 data2 样例的 workbook 对象（sheets 为对象映射）

import { nanoid } from 'nanoid'; // 用于生成类似 mTVIwU 的随机 id
import ExcelJS from 'exceljs';
import LuckyExcel from 'luckyexcel';
import JSZip from 'jszip';
// 导入excel并转换为univer渲染格式
export async function importReportExcel(file) {
  const cleanBuffer = await trimExcelKeepStyle(file);
  return new Promise((resolve, reject) => {
    LuckyExcel.transformExcelToLucky(cleanBuffer, async (luckyData) => {
      // 遍历 sheet 和 cell，补齐 alignment
      const univerJson = await convertLuckyToUniver(luckyData?.sheets, file).catch((e) => {
        reject(e);
      });
      resolve(univerJson);
    });
  });
}
async function trimExcelKeepStyle(file) {
  const rb = new ExcelJS.Workbook();
  await rb.xlsx.load(file);
  const wb = new ExcelJS.Workbook();
  rb.eachSheet((src) => {
    const dest = wb.addWorksheet(src.name, {
      properties: src.properties,
      pageSetup: src.pageSetup,
      views: src.views,
    });
    src.eachRow({ includeEmpty: false }, (row) => {
      const destRow = dest.getRow(row.number);
      destRow.height = row.height;
      destRow.style = row.style;
      destRow.values = row.values;
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const destCell = destRow.getCell(colNumber);
        destCell.style = cell.style;
        destCell.numFmt = cell.numFmt;
      });
    });
    if (src.model.merges) {
      src.model.merges.forEach((m) => dest.mergeCells(m));
    }
  });
  return wb.xlsx.writeBuffer();
}
// xlsx转换为univer格式的数据
async function convertLuckyToUniver(luckyInput, file) {
  // 再用 ExcelJS 读取原始对齐方式

  const cellImgInfo = await extractWpsCellImages(file);
  const hideRows = {};
  const hideColumns = {};

  const luckyData = luckyInput.filter((row) => row.name !== 'WpsReserved_CellImgList') || [];
  const sheetOrder = [];
  const sheets = {};
  const styleMap = new Map(); // key(JSON.stringify style) -> styleId
  const stylesOut = {};
  const workbookId = genWorkbookId();

  const imgCell = luckyInput.find((row) => row.name === 'WpsReserved_CellImgList');
  const imgReg = /^=DISPIMG\("([^"]+)"\s*,\s*\d+\)$/;
  const resources = getResource();
  const resourceJson = {};
  for (let idx = 0, luckyLength = luckyData.length; idx < luckyLength; idx++) {
    const sheet = luckyData[idx];

    const sheetId = genSheetId(sheet.index, idx);
    sheetOrder.push(sheetId);

    if (sheet.images) {
      const order = [];
      const data = {};
      for (const imagesKey in sheet.images) {
        const image = sheet.images[imagesKey];
        const imgIds = nanoid(6);
        order.push(imgIds);
        data[imgIds] = {
          drawingId: imgIds,
          subUnitId: sheetId,
          unitId: workbookId,
          drawingType: 0,
          imageSpirceType: 'BASE64',
          source: image.src,
          sheetTransform: {
            from: {
              column: image.fromCol,
              columnOffset: image.fromColOff,
              row: image.fromRow,
              rowOffset: image.fromRowOff,
            },
            to: {
              column: image.toCol,
              columnOffset: image.toColOff,
              row: image.toRow,
              rowOffset: image.toRowOff,
            },
          },
          transform: {
            angle: 0,
            flipX: false,
            flipY: false,
            skewX: 0,
            skewY: 0,
            ...image.default,
          },
        };
      }
      if (order.length) {
        resourceJson[sheetId] = {
          data,
          order,
        };
      }
    }

    const cellData = {};
    let maxRow = -1;
    let maxCol = -1;
    const luckCellData = sheet.celldata || [];

    for (const cell of luckCellData) {
      const { r } = cell;
      const { c } = cell;
      const v = cell.v || {};
      if (!v.v && v.ct?.s) {
        v.v = v.ct.s[0].v;
      }
      if (r == null || c == null) {
        return;
      }

      if (!cellData[r]) {
        cellData[r] = {};
      }
      if (r > maxRow) {
        maxRow = r;
      }
      if (c > maxCol) {
        maxCol = c;
      }
      if (imgReg.test(v.v || '')) {
        const imgId = v.v.match(imgReg);
        const drawingId = nanoid(6);
        const imgSource = cellImgInfo[imgId[1]];
        cellData[r][c] = getCellImg({ drawingId, source: imgSource });
        continue;
      }

      const ucell = {};

      ucell.v = v.v != null ? v.v : null;
      ucell.t = mapType(v);
      if (v.f) {
        ucell.f = v.f;
      }
      if (v.m != null) {
        ucell.m = v.m;
      }
      if (v.ct && v.ct.fa) {
        ucell.z = v.ct.fa;
      }

      const styleObj = convertStyle(v);
      const sid = getStyleId(styleObj);
      if (sid) {
        ucell.s = sid;
      }

      cellData[r][c] = ucell;
    }

    // row/column config
    const rowData = {};
    const columnData = {};
    if (sheet.config) {
      if (sheet.config.rowlen) {
        Object.entries(sheet.config.rowlen).forEach(([ri, h]) => (rowData[ri] = { h }));
      }
      if (sheet.config.columnlen) {
        Object.entries(sheet.config.columnlen).forEach(([ci, w]) => (columnData[ci] = { w }));
      }
    }

    // mergeData
    const mergeData = [];
    if (sheet.config && sheet.config.merge) {
      Object.values(sheet.config.merge).forEach((m) => {
        const startRow = m.r;
        const startCol = m.c;
        const endRow = m.r + m.rs - 1;
        const endCol = m.c + m.cs - 1;
        mergeData.push({
          startRow,
          startColumn: startCol,
          endRow,
          endColumn: endCol,
          rangeType: 0,
          unitId: null,
          sheetId,
        });
        if (endRow > maxRow) {
          maxRow = endRow;
        }
        if (endCol > maxCol) {
          maxCol = endCol;
        }
      });
    }

    // freeze
    let freeze = null;
    if (sheet.frozen) {
      const r = sheet.frozen.range?.row_focus ?? 0;
      const c = sheet.frozen.range?.column_focus ?? 0;
      freeze = {};
      if (sheet.frozen.type === 'row') {
        freeze.ySplit = r + 1;
      } else if (sheet.frozen.type === 'column') {
        freeze.xSplit = c + 1;
      } else if (sheet.frozen.type === 'both') {
        freeze.ySplit = r + 1;
        freeze.xSplit = c + 1;
      }
    }

    const rowCount = sheet.row ?? (maxRow >= 0 ? maxRow + 100 : 100);
    const columnCount = sheet.column ?? (maxCol >= 0 ? maxCol + 40 : 40);
    if (hideRows[idx]?.length > 0) {
      const hideRowList = hideRows[idx];
      for (let i = 0; i < hideRowList.length; i++) {
        rowData[hideRowList[i]] = {
          ...(rowData[hideRowList[i]] || {}),
          hd: 1,
        };
      }
    }
    if (hideColumns[idx]?.length > 0) {
      const hideColumnList = hideColumns[idx];
      for (let i = 0; i < hideColumnList.length; i++) {
        columnData[hideColumnList[i]] = {
          ...(columnData[hideColumnList[i]] || {}),
          hd: 1,
        };
      }
    }
    sheets[sheetId] = {
      id: sheetId,
      name: sheet.name || `Sheet${idx + 1}`,
      rowCount,
      columnCount,
      ...(Object.keys(rowData).length ? { rowData } : {}),
      ...(Object.keys(columnData).length ? { columnData } : {}),
      ...(mergeData.length ? { mergeData } : {}),
      ...(freeze ? { freeze } : {}),
      zoomRatio: 1,
      showGridlines: 1,
      defaultRowHeight: 24,
      defaultColumnWidth: 88,
      cellData,
    };
  }

  if (Object.keys(resourceJson).length) {
    resources.find((row) => row.name === 'SHEET_DRAWING_PLUGIN').data = JSON.stringify(resourceJson);
  }
  Object.values(sheets).forEach((sh) => {
    if (Array.isArray(sh.mergeData)) sh.mergeData.forEach((m) => (m.unitId = workbookId));
  });

  return {
    id: workbookId,
    name: 'workbook',
    resources,
    sheetOrder,
    styles: stylesOut,
    sheets,
    rev: 0,
  };

  function genSheetId(rawIndex, idx) {
    if (rawIndex != null && String(rawIndex).trim() !== '') {
      return String(rawIndex);
    }
    return `sheet-${String(idx + 1).padStart(2, '0')}`;
  }

  function genWorkbookId() {
    return 'workbook-' + Math.random().toString(36).slice(2, 9);
  }

  function getStyleId(styleObj) {
    const key = JSON.stringify(styleObj || {});
    if (!styleObj || Object.keys(styleObj).length === 0) {
      return null;
    }
    if (styleMap.has(key)) {
      return styleMap.get(key);
    }
    const id = nanoid(6);
    styleMap.set(key, id);
    stylesOut[id] = styleObj;
    return id;
  }

  function hasCellContentOrStyle(v) {
    if (!v) {
      return false;
    }
    const keys = ['v', 'm', 'f', 'bl', 'it', 'ul', 'fc', 'bg', 'fs', 'ff', 'ht', 'vt', 'bd'];
    return keys.some((k) => v[k] != null);
  }

  function mapType(v) {
    if (!v) {
      return 1;
    }
    const ct = v.ct && v.ct.t;
    if (ct === 'n' || typeof v.v === 'number') {
      return 2;
    }
    if (ct === 'b' || typeof v.v === 'boolean') {
      return 3;
    }
    if (ct === 'd') {
      return 4;
    }
    return 1;
  }

  // 样式转换函数，保证完全还原颜色/边框/居中等
  function convertStyle(v) {
    const s = {};
    // 水平/垂直居中，默认居中
    s.ht = v.ht;
    s.vt = v.vt;

    s.pd = { t: 0, b: 2, l: 2, r: 2 };

    if (v.fs != null) {
      s.fs = v.fs;
    }
    if (v.ff) {
      s.ff = v.ff;
    }

    // 字体颜色
    s.cl = v.fc ? { rgb: v.fc } : { rgb: '#000000' };
    // 背景色
    s.bg = v.bg ? { rgb: v.bg } : {};

    // 边框：如果原单元格有 bd，保留原颜色，否则默认黑色
    const bd = {};
    ['l', 'r', 't', 'b'].forEach((side) => {
      if (v.bd && v.bd[side]) {
        bd[side] = {
          s: v.bd[side].s ?? 1,
          cl: { rgb: v.bd[side].cl?.rgb ?? '#000000' },
        };
      } else {
        bd[side] = { s: 1, cl: { rgb: '#000000' } };
      }
    });
    s.bd = bd;

    s.bl = v.bl || 0;
    s.it = v.it || 0;
    s.ul = v.ul || 0;
    if (v.ct && v.ct.fa) {
      s.n = { pattern: v.ct.fa };
    }

    return s;
  }

  function getResource() {
    return [
      {
        name: 'SHEET_RANGE_PROTECTION_PLUGIN',
        data: '',
      },
      {
        name: 'SHEET_AuthzIoMockService_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_WORKSHEET_PROTECTION_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_WORKSHEET_PROTECTION_POINT_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_CONDITIONAL_FORMATTING_PLUGIN',
        data: '',
      },
      {
        name: 'SHEET_HYPER_LINK_PLUGIN',
        data: '{"1":[]}',
      },
      {
        name: 'SHEET_DRAWING_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_DEFINED_NAME_PLUGIN',
        data: '',
      },
      {
        name: 'SHEET_RANGE_THEME_MODEL_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_FILTER_PLUGIN',
        data: '{}',
      },
      {
        name: 'SHEET_DATA_VALIDATION_PLUGIN',
        data: '{"1":[]}',
      },
    ];
  }

  function getCellImg({ drawingId, source }) {
    return {
      p: {
        id: 'd',
        documentStyle: {
          pageSize: { width: null, height: null },
          marginTop: 0,
          marginBottom: 2,
          marginRight: 2,
          marginLeft: 2,
          renderConfig: {
            horizontalAlign: 0,
            verticalAlign: 0,
            centerAngle: 0,
            vertexAngle: 0,
            wrapStrategy: 0,
            zeroWidthParagraphBreak: 1,
          },
        },
        body: {
          dataStream: '\b\r\n',
          textRuns: [],
          paragraphs: [
            {
              startIndex: 1,
              paragraphStyle: { horizontalAlign: 0 },
            },
          ],
          sectionBreaks: [{ startIndex: 2 }],
          customBlocks: [{ startIndex: 0, blockId: drawingId }],
          customRanges: [],
          customDecorations: [],
        },
        drawings: {
          [drawingId]: {
            unitId: 'd',
            subUnitId: 'd',
            drawingId,
            drawingType: 0,
            imageSourceType: 'BASE64',
            source,
            transform: {
              left: 0,
              top: 0,
              width: 40,
              height: 22.5,
            },
            docTransform: {
              size: { width: 40, height: 22.5 },
              positionH: { relativeFrom: 0, posOffset: 0 },
              positionV: { relativeFrom: 1, posOffset: 0 },
              angle: 0,
            },
            behindDoc: 0,
            title: '',
            description: '',
            layoutType: 0,
            wrapText: 0,
            distB: 0,
            distL: 0,
            distR: 0,
            distT: 0,
          },
        },
        drawingsOrder: [drawingId],
      },
    };
  }
}

async function extractWpsCellImages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const imagesMap = {}; // { "ID_XXX": base64 }

  await getImgHandle(zip, imagesMap);

  await getOldFile(zip, imagesMap);
  return imagesMap;
}
function getZipFile(zip, targetPath) {
  const candidates = [
    targetPath,
    'xl/' + targetPath.replace(/^(\.\.\/)+/, ''), // ../media/image1.png -> xl/media/image1.png
    targetPath.replace(/^(\.\.\/)+/, ''), // ../media/image1.png -> media/image1.png
  ];
  for (const path of candidates) {
    const file = zip.file(path);
    if (file) {
      return file;
    }
  }
  return null;
}

// 兼容就版本wps的图片格式
async function getOldFile(zip, imagesMap) {
  const parser = new DOMParser();

  // 1️⃣ 解析 drawing 文件（WPS 可能存在多个 drawingX.xml）
  const drawingFiles = Object.keys(zip.files).filter((p) => p.startsWith('xl/drawings/drawing') && p.endsWith('.xml'));

  for (const drawingPath of drawingFiles) {
    const drawingXml = await zip.file(drawingPath).async('text');
    const drawingJson = parser.parseFromString(drawingXml, 'application/xml');
    const imageNameMap = {};
    const twoCellAnchor = drawingJson.querySelectorAll('xdr\\:twoCellAnchor, twoCellAnchor');
    for (const el of twoCellAnchor) {
      const imageNameDom = el.querySelector('xdr\\:cNvPr, cNvPr');

      const ridDom = el.querySelector('a\\:blip, blip');
      if (!imageNameDom || !ridDom) {
        continue;
      }
      const rid = ridDom.getAttribute('r:embed');
      if (!imageNameMap[rid]) {
        imageNameMap[rid] = [];
      }
      imageNameMap[rid].push(imageNameDom.getAttribute('name'));
    }
    if (Object.keys(drawingJson).length === 0) {
      return;
    }
    // 获取 _rels 文件
    const relsPath = drawingPath.replace('drawings/', 'drawings/_rels/') + '.rels';
    const relsFile = zip.file(relsPath);
    if (!relsFile) {
      continue;
    }
    const relsXml = await relsFile.async('text');
    const relsXmlDom = parser.parseFromString(relsXml, 'application/xml');
    const relDom = relsXmlDom.querySelectorAll(' Relationship');
    for (const rel of relDom) {
      const mediaPath = rel.getAttribute('Target');
      const rId = rel.getAttribute('Id');
      const imgFile = getZipFile(zip, mediaPath);
      const ext = mediaPath.split('.').pop();
      const base64 = await imgFile.async('base64');

      if (imageNameMap[rId]) {
        for (const name of imageNameMap[rId]) {
          imagesMap[name] = `data:image/${ext};base64,${base64}`;
        }
      }
    }
  }
}

async function getImgHandle(zip, imagesMap = {}) {
  const imgMap = await getImageMap(zip);
  if (zip.files['xl/cellimages.xml']) {
    const xml = await zip.files['xl/cellimages.xml'].async('text');
    const rels = await zip.files['xl/_rels/cellimages.xml.rels'].async('text');
    const parser = new DOMParser();

    const xmlDom = parser.parseFromString(xml, 'application/xml');
    const relsDom = parser.parseFromString(rels, 'application/xml');

    const relMap = {};

    relsDom.querySelectorAll('Relationship').forEach((el) => {
      const id = el.getAttribute('Id');
      relMap[id] = el.getAttribute('Target').replace('media/', '');
    });

    xmlDom.querySelectorAll('cellImage, etc\\:cellImage').forEach((node) => {
      const rIdDom = node.querySelector('a\\:blip, blip');
      const nameDom = node.querySelector('xdr\\:cNvPr, cNvPr');
      const idName = nameDom.getAttribute('name');
      const rId = rIdDom.getAttribute('r:embed');
      const imageName = relMap[rId];
      const buffer = imgMap.get(imageName);
      const type = imageName.split('.')[1];
      imagesMap[idName] = `data:image/${type};base64,${unitToBase64(buffer)}`;
    });
  }
}

async function getImageMap(zip) {
  // 辅助：兼容多种路径，确保能在 zip.file 找到
  const imageFiles = Object.keys(zip.files).filter((row) => row.startsWith('xl/media'));
  const imgMap = new Map();

  for (const path of imageFiles) {
    const buffer = await zip.files[path].async('uint8array');
    imgMap.set(path.replace('xl/media/', ''), buffer);
  }
  return imgMap;
}
function unitToBase64(uint8) {
  let binary = '';
  const chunkSize = 0x8000; // 32kb 防止 call stack 爆炸
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, uint8.slice(i, i + chunkSize));
  }
  return btoa(binary);
}
