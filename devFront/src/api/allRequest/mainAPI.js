import { axiosRequest } from '@/api/request.js';

/**
 * 获取组服务
 */
export const getProjectGroupServer = async (projectType) => {
  const data = {
    projectType,
  };
  return await axiosRequest.get(`/projectGroup`, data);
};
/**
 * 创建组服务
 */
export const createProjectGroupServer = async (params) => {
  const data = {
    projectType: params.projectType,
    name: params.name,
    description: params.description,
  };
  return await axiosRequest.post(`/projectGroup`, data);
};

/**
 * 编辑组服务
 */
export const editProjectGroupServer = async (params) => {
  const data = {
    projectType: params.projectType,
    name: params.name,
    guid: params.guid,
    description: params.description,
  };
  return await axiosRequest.put(`/projectGroup`, data);
};

/**
 * 删除组服务
 */
export const deleteProjectGroupServer = async (params) => {
  const data = {
    projectType: params.projectType,
    guid: params.guid,
  };
  return await axiosRequest.delete(`/projectGroup`, data);
};

/**
 * 工程发布服务
 */
export const publishServer = async (params) => {
  const data = {
    projectType: params.projectType,
    guid: params.guid,
  };
  return await axiosRequest.post(`/ops/publish`, data);
};

/**
 * 工程撤销发布服务
 */
export const unPublishServer = async (params) => {
  const data = {
    projectType: params.projectType,
    guid: params.guid,
  };
  return await axiosRequest.delete(`/ops/publish`, data);
};

/**
 * 工程发布服务
 */
export const updateServer = async (params) => {
  const data = {
    projectType: params.projectType,
    guid: params.guid,
  };
  return await axiosRequest.post(`/ops/update`, data);
};

/**
 * 判断存在的工程中是否有当前用户创建的
 */
export const isUserCreateProject = async (userId) => {
  const data = {
    userId,
  };
  return await axiosRequest.get(`/isUserCreateProject`, data);
};
