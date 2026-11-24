import { axiosRequest } from '@/api/request.js';

/**
 * 登录服务
 *
 * @param params 登录参数
 * @returns 登录结果
 */
export const loginServer = async (params) => {
  return await axiosRequest.post(`/user/login`, params);
};

/**
 * 登录服务
 *
 * @param params 登录参数
 * @returns 登录结果
 */
export const logoutServer = async (params) => {
  return await axiosRequest.post(`/user/logout`, params);
};

/**
 * 获取公钥服务
 *
 * @returns Promise 包含公钥的Promise对象
 */
export const getPublicKeyServer = async () => {
  return await axiosRequest.get(`/user/getPublicKey`);
};

export const userTokenValidServer = async (access_token) => {
  try {
    return await axiosRequest.get(`/user/userTokenValid`, { access_token });
  } catch (error) {
    return { isValid: false };
  }
};
/**
 * 单点登录服务
 *
 * @param params 登录参数
 * @returns 登录结果
 */
export const loginSSOServer = async (username) => {
  return await axiosRequest.get(`/user/ssologin`, { username });
};
