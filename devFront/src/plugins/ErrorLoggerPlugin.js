import { getNowStr } from '@/utils/dayjsUtil.js';
import { getGuid } from '@/utils/commonUtils.js';

const dbName = 'errorLogsDB';
const storeName = 'errorLogs';
const errorCount = 1000;
const deleteCount = 100;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveError = async (log) => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const countRequest = store.count();
  return new Promise((resolve, reject) => {
    countRequest.onsuccess = async () => {
      const count = countRequest.result;

      if (count >= errorCount) {
        const getRequest = store.openCursor();
        let deleted = 0;
        getRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            store.add(log);
            tx.oncomplete = () => resolve(true);
            tx.onerror = (e) => reject(e);
          }
        };
        getRequest.onerror = (event) => reject(event);
      } else {
        store.add(log);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (event) => reject(event);
      }
    };

    countRequest.onerror = (event) => reject(event);
  });
};

const getAllErrors = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(request.error);
  });
};

const clearErrors = async () => {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  return tx.complete;
};

const createErrorHandle = () => {
  return (err, info) => {
    const log = {
      message: err?.message || err,
      stack: err?.stack || '',
      info,
      urlL: location.href,
      time: getNowStr(),
      id: getGuid(),
    };
    console.error(typeof err === 'string' ? err : err?.stack);
    saveError(log).catch(console.error);
  };
};

export default {
  install: (app) => {
    const handler = createErrorHandle();
    // 只在运行环境做错误收集,不在开发环境做错误收集
    if (process.env.NODE_ENV !== 'development') {
      // Vue全局错误
      app.config.errorHandler = (err, instance, info) => handler(err, info);
      //   全局JS错误
      addEventListener('error', (events) => handler(events.error || events.message, ''));

      //   Promise 未捕获异常
      addEventListener('unhandledrejection', (events) => handler(events.reason, ''));

      app.config.globalProperties.$errorLogger = {
        getAll: getAllErrors,
        clear: clearErrors,
      };
    }
  },
};
