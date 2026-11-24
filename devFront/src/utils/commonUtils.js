import { nanoid } from 'nanoid';
import _ from 'lodash-es';
import { importTableToExcel, getImportTableExcelHeader } from '@/utils/importExportUtils.js';
// 判断是否为纯对象
export const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';

// 判断是否为JSON字符串
export const isObjectString = (objStr) => {
  let result;
  try {
    result = JSON.parse(objStr);
  } catch (e) {
    result = false;
  }
  return result;
};

// 判断是否为空
export const isNull = (str) => {
  return str === void 0 || str === '' || str === null;
};

// 随机id
export const generateId = () => nanoid(7);

// 防抖函数
export const debounce = (func, wait = 500) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    timeoutId = setTimeout(function () {
      func.apply(this, args);
    }, wait);
  };
};

export const getTagChildren = (treeData, target = treeData[0]) => {
  for (const row of treeData) {
    if (!row.name) {
      target.children = target.children.filter((item) => item.id !== row.id);
      break;
    }
    if (row.children) {
      const data = getTagChildren(row.children, row);
      if (data) {
        break;
      }
    }
  }
  return null;
};

export const getMenuGroups = (menuList = [], targetId = '') => {
  const result = [];

  function findNamePath(menus, path = []) {
    for (const menu of menus) {
      const currentPath = [...path, menu.name];
      if (menu.id === targetId) {
        result.push(...currentPath);
        return true;
      }
      if (menu.children) {
        const found = findNamePath(menu.children, currentPath);
        if (found) {
          return true;
        }
      }
    }
  }

  findNamePath(menuList);
  return result;
};

export const getGuid = () => {
  return nanoid();
};

export function removeEmptyTree(treeData, opts = {}) {
  if (!Array.isArray(treeData)) {
    return [];
  }
  const { childrenKey = 'children', filterKey, filterVal } = opts;

  return treeData.reduce((acc, node) => {
    if (!node || typeof node !== 'object') {
      return acc;
    }

    const newNode = { ...node };

    const kids = Array.isArray(newNode[childrenKey]) ? newNode[childrenKey] : [];
    newNode[childrenKey] = removeEmptyTree(kids, opts);

    if (
      filterKey !== undefined &&
      filterVal !== undefined &&
      newNode[filterKey] === filterVal &&
      newNode[childrenKey].length === 0
    ) {
      return acc;
    }

    acc.push(newNode);
    return acc;
  }, []);
}

export function getImportParams(importData) {
  const importParams = {};
  for (const row of importData) {
    for (const key in row) {
      if (key === 'name') {
        continue;
      }
      if (!importParams[key]) {
        importParams[key] = [];
      }
      importParams[key].push({
        name: row.name,
        translate: row[key],
      });
    }
  }
  const paramArray = [];
  for (const row in importParams) {
    paramArray.push({
      languageId: row,
      tranlateArray: importParams[row],
    });
  }
  return paramArray;
}

export const fileChangeHandle = async (file, tableColumns) => {
  const rawFile = file.raw;
  const buffer = await rawFile.arrayBuffer();
  const importData = await importTableToExcel(buffer);
  return importData
    .map((data) => {
      const obj = {};
      for (let index = 1; index < data.length; index++) {
        const item = data[index];
        const columns = tableColumns[index - 1];
        if (columns) {
          obj[columns.props] = item;
          if (columns.props === 'id') {
            obj[columns.props] = generateId();
          }
        }
      }
      return obj;
    })
    .filter((items) => !!items);
};
export const fileChangeHandleTranslate = async (file, tableColumns) => {
  const rawFile = file.raw;
  const buffer = await rawFile.arrayBuffer();
  const headers = await getImportTableExcelHeader(buffer);
  const importData = await importTableToExcel(buffer);
  return importData
    .map((data) => {
      const obj = {};
      for (let index = 1; index < data.length; index++) {
        const item = data[index];
        let headerLabel = headers[index - 1];
        const columns = tableColumns.filter((item) => item.label == headerLabel)[0];
        if (columns) {
          obj[columns.props] = item;
          if (columns.props === 'id') {
            obj[columns.props] = generateId();
          }
        }
      }
      return obj;
    })
    .filter((items) => !!items);
};
// 大驼峰变小驼峰
export const pascakToCamel = (pascak) => {
  if (!pascak) {
    return '';
  }
  // 匹配所有大写字母，传入替换函数处理
  return pascak.replace(/[A-Z]/g, (match, offset) => {
    // offset 是匹配到的大写字母在字符串中的位置
    return offset === 0 ? match.toLowerCase() : match;
    // 如果是第一个字符，转为小写，否则保持原样
  });
};

export function recursiveSearch(tree, keyword, label = 'text', key = 'id') {
  const deepTree = _.cloneDeep(tree);
  if (!deepTree || !Array.isArray(deepTree)) {
    return {
      tree: [],
      expandKeys: [],
    };
  }
  if (!keyword) {
    return {
      tree: deepTree,
      expandKeys: [],
    };
  }
  let expandKeys = [];
  const searchTreeHandle = (nodes, ids = []) => {
    const result = [];
    for (const node of nodes) {
      const allIds = [...ids, node[key]];
      const selfMatch = node[label].toLowerCase().includes(keyword.toLowerCase());

      if (node.children) {
        node.children = searchTreeHandle(node.children, allIds);
      }

      const childMatch = node.children?.length > 0;

      if (selfMatch || childMatch) {
        expandKeys = [...expandKeys, ...allIds].filter((row) => !!row);
        result.push(node);
      }
    }
    return result;
  };
  return { tree: searchTreeHandle(deepTree), expandKeys };
}

export const searchTree = (nodes, label, keyword) => {
  const deepNode = _.cloneDeep(nodes);
  if (!keyword) {
    return deepNode;
  }
  return deepNode.filter((node) => {
    const textMatch = node[label].toLowerCase().includes(keyword.toLowerCase());
    if (textMatch) {
      return true;
    }
    if (node.children) {
      node.children = searchTree(node.children, label, keyword);
      return node.children.length > 0;
    }
    return false;
  });
};
/**
 * @function setCookie
 * @description 设置Cookie
 * @returns null
 */
export function setCookie(name, value, dayToLive) {
  const date = new Date();
  date.setTime(date.getTime() + dayToLive * 24 * 60 * 60 * 1000); // 转换为毫秒
  const expires = 'expires=' + date.toUTCString();
  document.cookie = `${name}=${value};${expires};path=/`;
}
/**
 * @function getCookie
 * @description 获取Cookie
 * @returns string
 */
export function getCookie(name) {
  for (const row of document.cookie.split(';')) {
    const [key, value] = row.split('=');

    if (key === name) {
      return value;
    }
  }
}
