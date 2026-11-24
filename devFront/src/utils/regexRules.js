import DOMPurify from 'dompurify';
import { t } from '@/i18n/index.js';

const regexRules = {
  //1. 密码强度（8-20位，只是包含字母和数字）
  strongPassword: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,20}$/,
  //2.数字
  number: /^-?(?:\d+\.\d+|\d+)$/,
  //3. 非空
  notEmpty: /\S+/,
  //4. 防止XSS
  noXss: /^(?!.*(<|>|script|on\w+=|javascript:)).*$/i,
  //5.首个字符不能为数字，只允许中英文、数字和下划线，限制在1-64
  safaText: /^(?=.{1,64}$)[\p{L}_][\p{L}\p{N}_]*$/u,
  // 允许世界语言、数字和下划线，限制在1-64
  safaName: /[\p{L}\p{N}_]{1,64}$/u,
  //6.URL
  url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
  //7.IPv4 地址
  ip: /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){2}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  //8.端口
  port: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-9])$/,
  //9.变量名命名规则
  variableName: /^(?=.{1,128}$)[\p{L}_][\p{L}\p{N}_#]*$/u,
  //10.校验函数调用正则
  funcName: /^[a-zA-Z_]\w*\s*\(([^()]*(,[^()]*)*)?\)$/,
  //11.用户名称校验正则
  userName: /^[\p{L}\p{N}_]{1,32}$/u,
  //12.校验函数调用正则
  projectName: /^.*(?<!_[0-9]|\+[0-9])$/,
  //13.数据库名称校验正则
  dbName: /^(?=.{1,64}$)[\p{L}_][\p{L}\p{N}_-]*$/u,
};

export function regexValidator(type, message, required = true, trigger = ['blur', 'change']) {
  const pattern = regexRules[type];
  return {
    required,
    validator: (rule, value, callback) => {
      if (!value && value !== 0 && required) {
        callback(new Error(t('rule1Message')));
      } else if (value && !containsXSS(value)) {
        callback(new Error(t('rule2Message')));
      } else if (value && pattern && !pattern.test(value)) {
        callback(new Error(message));
      } else {
        callback();
      }
    },
    trigger: trigger,
  };
}

export const regexSafeTExt = (val) => {
  return regexRules.safaText.test(val);
};

/**
 * 严格清洗 HTML，防止 XSS 攻击
 * @param input 任意字符串或用户 HTML 输入
 * @returns 安全的 HTML 字符串
 */
export function sanitizeStrictHTML(input) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // ❌ 不允许任何标签
    ALLOWED_ATTR: [], // ❌ 不允许任何属性
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'srcdoc'],
    USE_PROFILES: { html: false }, // 禁用默认 HTML 白名单
  });
}

/**
 * 判断是否半酣被DOMPurify判定为XSS的内用
 * @param {string} input - 需要检测的HTML字符串
 * @returns {boolean} - 如果存在禁用内容返回true,否则false
 */
export function containsXSS(input) {
  let foundXss = true;

  // 检测删除的标签
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.allowedTags && !data.allowedTags[node.nodeName.toLowerCase()]) {
      foundXss = false;
    }
  });
  sanitizeStrictHTML(input);
  // 清除hooks 避免污染全局
  DOMPurify.removeAllHooks();

  return foundXss;
}

export const isSafeSelect = (sql) => {
  if (typeof sql !== 'string') return false;
  const sqlString = sql.trim().toUpperCase();
  if (!sqlString.startsWith('SELECT')) return false;
  if (sqlString.includes(';')) return false;
  const blackList = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'ALTER',
    'CREATE',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
    'UNION',
    'SCRIPT',
    'XP_',
    'SP_',
    '--',
    'DECLARE',
    'MERGE',
    'GRANT',
    'REVOKE',
    'KILL',
  ];
  const kwPattern = new RegExp('\\b(' + blackList.join('|') + ')\\b', 'i');
  if (kwPattern.test(sqlString)) return false;
  if (/0x[0-9A-F]+/i.test(sqlString)) return false;
  if (/--/i.test(sqlString)) return false;
  let quote = 0;
  for (let index = 0; index < sqlString.length; index++) {
    if (sqlString[index] === "'") quote++;
    if (sqlString[index] === '-' && sqlString[index + 1] === '-' && quote % 2 === 1) return false;
  }
  return quote % 2 === 0;
};
