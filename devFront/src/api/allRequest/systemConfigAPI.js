import { axiosRequest } from '@/api/request.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';

/**
 * 获取系统OEM配置
 */
export const getSystemConfig = async () => {
  return await axiosRequest.get(`/system/oemConfig`);
};

/**
 * 更新系统OEM配置
 */
export const updateSystemConfig = async (params) => {
  const loginUserStore = useLoginUserStore();
  const { userName, tenantId } = loginUserStore.userInfo;
  const headers = { 'Content-Type': 'multipart/form-data' };
  if (userName) {
    headers.userName = userName;
  }
  if (tenantId) {
    headers.tenantId = tenantId;
  }
  return await axiosRequest.post(`/system/setOEMConfig`, params, {
    headers: headers,
  });
};
