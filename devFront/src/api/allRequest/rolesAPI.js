import { axiosRequest } from '@/api/request.js';

/**
 *  获取角色信息服务
 *
 * @returns 角色信息
 */
export const getRoleListServer = async () => {
  return await axiosRequest.get(`/user/roleList`);
};

/**
 *  创建角色信息服务
 *
 * @returns 角色信息
 */
export const createRoleServer = async (data) => {
  const params = {
    roleName: data.roleName,
    description: data.description,
  };
  return await axiosRequest.post(`/user/createRole`, params);
};

/**
 *  创建角色信息服务
 *
 * @returns 角色信息
 */
export const editRoleServer = async (data) => {
  const params = {
    roleId: data.roleId,
    roleName: data.roleName,
    description: data.description,
  };
  return await axiosRequest.put(`/user/editRole`, params);
};

/**
 *  创建角色信息服务
 *
 * @returns 角色信息
 */
export const deleteRoleServer = async (data) => {
  const params = {
    roleIds: data.roleId,
  };
  return await axiosRequest.delete(`/user/deleteRole`, params);
};

/**
 *  创建角色信息服务
 *
 * @returns 角色信息
 */
export const setRoleToGroupServer = async (data) => {
  const params = {
    projectType: data.projectType,
    guid: data.guid,
    roleIds: data.roleIds,
  };
  return await axiosRequest.post(`/projectRoles`, params);
};

/**
 *  创建角色信息服务
 *
 * @returns 角色信息
 */
export const deleteRoleToGroupServer = async (data) => {
  const params = {
    projectType: data.projectType,
    guid: data.guid,
    roleIds: data.roleIds,
  };
  return await axiosRequest.delete(`/projectRoles`, params);
};
