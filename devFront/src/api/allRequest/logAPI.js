import { axiosRequest } from '@/api/request.js';

/**
 * @function handleMaintenanceLog
 * @description 日志查询接口
 * @param {*} data
 * @returns
 */
export const handleMaintenanceLogServer = async (data) => {
  return await axiosRequest.post(`/log/conditionQuery`, data);
};

/**
 * @function handleUserSelectionLog
 * @description 日志过滤条件
 * @param {*} data
 * @returns
 */
export const handleUserSelectionLogServer = async (data) => {
  return await axiosRequest.post(`/log/filterConditions`, data);
};

/**
 * @function saveLogRetainTimeServer
 * @description 保存日志配置
 * @param {*} data
 * @returns
 */
export const saveLogRetainTimeServer = async (data) => {
  return await axiosRequest.post(`/log/saveRetainTime`, data);
};

/**
 * @function getLogRetainTimeServer
 * @description 查询日志配置
 * @returns
 */
export const getLogRetainTimeServer = async () => {
  return await axiosRequest.get(`/log/getRetainTime`);
};
