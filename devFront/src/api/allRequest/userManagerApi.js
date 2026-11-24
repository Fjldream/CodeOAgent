import { axiosRequest } from '@/api/request.js';
import { getNowDateStr } from '@/utils/dayjsUtil.js';
import { isUserCreateProject } from '@/api/allRequest/mainAPI.js';

/**
 *  获取用户信息服务
 *
 * @returns 登录结果
 */
export const getUserInfoServer = async () => {
  return await axiosRequest.get(`/user/userInfo`);
};

/**
 *  通过用户id获取用户信息服务
 *
 * @returns 登录结果
 */
export const getUserInfoByIdServer = async (params) => {
  return await axiosRequest.get(`/user/getUserInfoById`, params);
};

/**
 * 刷新token服务
 *
 * @param params 登录参数
 * @param config 登录配置
 * @returns 登录结果
 */
export const refreshTokenServer = async (params, config) => {
  return await axiosRequest.post(`/user/tokenRefresh`, params, config);
};

/**
 * 多端登录服务
 */
export const setMultiChoiceServer = () => {
  return axiosRequest.post(`/user/setMultiChoice`, { reload: true });
};

/**
 * 获取用户服务
 */
export const getUserListServer = async (row) => {
  const params = {
    groupIds: row?.groupIds,
  };
  return await axiosRequest.get(`/user/userList`, params);
};

/**
 * 创建用户服务
 */
export const createUserServer = async (userForm) => {
  const params = {
    userName: userForm.userName,
    userBan: userForm.userBan,
    userType: userForm.userType,
    password: userForm.password,
    description: userForm.description,
    userInvalid: userForm.userInvalid,
    invalidDate: userForm.invalidDate,
    groupId: userForm.groupId,
    passwordValidTime: userForm.passwordValidTime ? userForm.passwordValidTime + '' : '0',
    domainName: 'admin001',
    isUse: 1,
    extendField: userForm.extendField || {},
    isMultiLogin: userForm.isMultiLogin,
    isSSO: userForm.isSSO,
    roles: userForm.roles,
  };
  return await axiosRequest.post(`/user/createUser`, params);
};

/**
 * 编辑用户服务
 */
export const editUserServer = async (form) => {
  const params = {
    domainName: form.domainName,
    userBan: form.userBan,
    userId: form.userId,
    userName: form.userName,
    groupId: form.groupId,
    description: form.description,
    nickName: form.userName,
    userType: form.userType,
    isUse: form.isUse,
    passwordValidTime: form.passwordValidTime ? String(form.passwordValidTime) : '0',
    userInvalid: !!form.userInvalid,
    invalidDate: form.invalidDate ? String(form.invalidDate) : getNowDateStr(),
    extendField: form.extendField,
    category: form.category,
    roles: form.roles,
    isMultiLogin: form.isMultiLogin,
    isSSO: form.isSSO,
  };
  return await axiosRequest.post(`/user/updateUser`, params);
};
export const updateRolesServer = async (params) => {
  const data = {
    userInfos: params.userInfos,
    roleIds: params.roleIds,
  };
  return await axiosRequest.post(`/user/updateRoles`, data);
};

/**
 * 删除用户服务
 */
export const deleteUserServer = async (params) => {
  const { data } = await isUserCreateProject(params.userId);
  if (data) {
    return {
      errorCode: 0,
      noDelete: true,
    };
  }
  return await axiosRequest.delete(`/user/deleteUser`, {
    userId: params.userId,
  });
};

/**
 * 获取安全配置服务
 */
export const getSecurity = async () => {
  return await axiosRequest.get(`/user/security`);
};

/**
 * 修改安全配置服务
 */
export const saveSecurityServer = async (params) => {
  const data = {
    blackList: params.blackList,
    passwordPolicy: params.passwordPolicy,
    lockingTotal: params.lockingTotal,
    lockingMinute: params.lockingMinute,
    multiTerminal: params.multiTerminal,
    accountExpired: params.accountExpired,
    expiredTime: params.expiredTime,
  };
  return await axiosRequest.post(`/user/saveSecurity`, data);
};

/**
 * 重置用户密码服务
 */
export const resetPasswordServer = async (params) => {
  const data = {
    userId: params.userId,
  };
  return await axiosRequest.post(`/user/resetPassword`, data);
};
/**
 * 获取用户组服务
 */
export const getGroupListServer = async () => {
  return await axiosRequest.get(`/user/groupStruct`);
};

/**
 * 创建用户组服务
 */
export const createUserGroupServer = async (params) => {
  const data = {
    groupName: params.groupName,
    parentGroupId: params.parentGroupId,
  };
  return await axiosRequest.post(`/user/createGroup`, data);
};

/**
 * 编辑用户组服务
 */
export const editUserGroupServer = async (params) => {
  const data = {
    groupName: params.groupName,
    groupId: params.groupId,
  };
  return await axiosRequest.put(`/user/editGroup`, data);
};

/**
 * 编辑用户组服务
 */
export const deleteUserGroupServer = async (params) => {
  const data = {
    groupId: params.groupId,
  };
  return await axiosRequest.delete(`/user/deleteGroup`, data);
};

/**
 * 编辑用户组服务
 */
export const getRoleUserListServer = async (params) => {
  const data = {
    roleIds: params.roleIds,
  };
  return await axiosRequest.get(`/user/roleUserList`, data);
};

/**
 * 修改用户密码
 */
export const changeUserPassword = async (params) => {
  const data = {
    userId: params.userId,
    oldPassword: params.oldPassword,
    newPassword: params.newPassword,
  };
  return await axiosRequest.post(`/user/changePassword`, data);
};

/**
 * 初次登陆修改用户密码
 */
export const changeUserPasswordForFirstLogin = async (params) => {
  const data = {
    userName: params.userName,
    oldPassword: params.oldPassword,
    newPassword: params.newPassword,
  };
  return await axiosRequest.post(`/user/firstUserPassword`, data);
};
