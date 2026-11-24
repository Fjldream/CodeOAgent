import { axiosRequest } from '@/api/request.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';

/**
 * 获取客户端工程信息
 *
 * @returns
 * @param data
 */
export const getProjectInfoServer = async (data) => {
  const params = {
    projectGroupId: data.projectGroupId,
  };
  return await axiosRequest.get(`/client/projectList`, params);
};

/**
 * 创建工程
 *
 * @returns
 * @param data
 */
export const createProjectServer = async (data) => {
  const params = {
    name: data.name,
    projectGroupId: data.projectGroupId,
    description: data.description,
    projectData: data.projectData,
  };
  return await axiosRequest.post(`/client/createProject`, params);
};
/**
 * 编辑工程
 *
 * @param data 工程信息
 * @returns
 */
export const modifyProjectServer = async (data) => {
  const params = {
    name: data.name,
    guid: data.guid,
    description: data.description,
    projectData: data.projectData,
    status: data.status,
  };

  return await axiosRequest.put(`/client/updateProject`, params);
};

/**
 * 删除工程
 *
 * @returns
 * @param data
 */
export const deleteProjectServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  return await axiosRequest.delete(`/client/deleteProject`, params);
};
/**
 * 获取客户端页面、工程变量、模型组
 *
 * @returns
 * @param data
 */
export const getProjectConfigureTreeServer = async (data) => {
  const params = {
    projectId: data.projectId || data.guid,
  };
  return await axiosRequest.get(`/client/getProjectConfigureTree`, params);
};

/**
 * 创建页面组
 *
 * @returns
 * @param data
 */
export const createGroupServer = async (data) => {
  const params = {
    name: data.name,
    projectId: data.projectId,
    parentId: data.parentId,
  };
  return await axiosRequest.post(`/client/createGroup`, params);
};
/**
 * 保存变量组树结构
 *
 * @returns
 * @param data
 * @param type
 */
export const setVariableFileServer = async (data, type) => {
  const params = { projectId: data.projectId, type: type };
  if (type === 'add') {
    params.parentId = data.parentId;
    params.groupName = data.name;
  } else if (type === 'edit') {
    params.newGroupName = data.name;
    params.id = data.id;
  } else {
    params.id = data.id;
  }
  return await axiosRequest.post(`/client/setVariableFile`, params);
};
/**
 * 新建变量组
 *
 * @returns
 * @param groupId
 * @param data
 */
export const addVariableGroupServer = async (groupId, data) => {
  const addData = {
    id: groupId,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/addVariableGroup`, addData);
};

/**
 * 修改页面组
 *
 * @returns
 * @param data
 */
export const updateGroupServer = async (data) => {
  const params = {
    name: data.name,
    id: data.id,
    projectId: data.projectId,
    parentId: data.parentId,
  };
  return await axiosRequest.put(`/client/updateGroup`, params);
};
/**
 * 删除页面组
 *
 * @returns
 * @param data
 */
export const delGroupByIdServer = async (data) => {
  const params = {
    id: data.id,
    projectId: data.projectId,
  };
  return await axiosRequest.delete(`/client/delGroupById`, params);
};
/**
 * 删除变量组
 *
 * @returns
 * @param ids
 * @param projectId
 */
export const deleteVariableGroup = async (ids, projectId) => {
  const delData = {
    id: ids,
    projectId: projectId,
  };
  return await axiosRequest.delete(`/client/deleteVariableGroup`, delData);
};
/**
 * 获取页面管理ID
 *
 * @returns
 * @param data
 */
export const getPageMngIDServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getPageMngID`, params);
};

/**
 * 获取客户端页面信息
 *
 * @returns
 * @param data
 */
export const getPagesServer = async (data) => {
  const params = {
    projectId: data.projectId,
    ids: data.ids,
  };
  return await axiosRequest.get(`/client/getPages`, params);
};
/**
 * 获取客户端3d资源
 *
 * @returns
 * @param data
 */
export const getSceneInfoServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getSceneInfo`, params);
};
/**
 * 设置桌面端首页
 *
 * @returns
 * @param data
 */
export const setDefaultNameServer = async (data) => {
  const params = {
    name: data.name,
    projectId: data.projectId,
  };
  return await axiosRequest.put(`/client/setDefaultName`, params);
};

/**
 * 设置APP端首页
 *
 * @returns
 * @param data
 */
export const setAppNameServer = async (data) => {
  const params = {
    name: data.name,
    projectId: data.projectId,
  };
  return await axiosRequest.put(`/client/setAppName`, params);
};
/**
 * 批量获取页面信息json，用于导出页面
 *
 * @returns
 * @param data
 */
export const batchGetPageFileServer = async (data) => {
  const params = {
    pageArr: JSON.stringify(data.pageArr),
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/batchGetPageFile`, params);
};
/**
 * 批量导入页面
 *
 * @returns
 * @param data
 */
export const importPageServer = async (data) => {
  const params = {
    pageList: data.pageList,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/importPage`, params);
};
/**
 * 获取工程文件信息(页面信息)用于导出页面
 *
 * @returns
 * @param data
 */
export const getProjectFileServer = async (data) => {
  const params = {
    projectInfo: JSON.stringify({
      name: data.name,
      type: data.type,
      guid: data.guid,
    }),
  };
  return await axiosRequest.get(`/client/getProjectFile`, params);
};
/**
 * 创建页面
 *
 * @returns
 * @param data
 */
export const createPageServer = async (data) => {
  const params = {
    name: data.name,
    groupId: data.groupId,
    description: data.description,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/createPage`, params);
};
/**
 * 保存页面
 *
 * @returns
 * @param data
 */
export const saveProjectDataServer = async (data) => {
  const { paramData } = data;
  const params = {
    params: {
      projectInfo: JSON.stringify({
        name: data.name,
        type: data.type,
        guid: data.projectId,
        operation: data.operation,
      }),
    },
  };
  return await axiosRequest.post(`/client/saveProjectData`, paramData, params);
};
/**
 * 编辑页面基础信息
 *
 * @param data
 * @returns
 */
export const updatePageServer = async (data) => {
  const params = {
    name: data.name,
    id: data.id,
    description: data.description,
    projectId: data.projectId,
  };

  return await axiosRequest.put(`/client/updatePage`, params);
};

/**
 * 批量移动页面
 *
 * @param data
 * @returns
 */
export const movesToGroupServer = async (data) => {
  const params = {
    names: data.names,
    selectGroupId: data.selectGroupId,
    projectId: data.projectId,
  };
  return await axiosRequest.put(`/client/movesToGroup`, params);
};
/**
 * 删除页面
 *
 * @returns
 * @param data
 */
export const deletePageBatchServer = async (data) => {
  const params = {
    pages: data.pages,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/deletePageBatch`, params);
};
/**
 * 获取页面占位信息
 *
 * @returns
 * @param params
 */
export const getMultiSeatServer = async (params) => {
  return await axiosRequest.post(`/client/getMultiSeat`, params);
};
/**
 * 获取数据源列表
 *
 * @returns
 * @param data
 */
export const getDataSourceListServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getDataSourceList`, params);
};
/**
 * 新增数据源
 *
 * @returns
 * @param data
 */
export const addDataSourceServer = async (data) => {
  const params = {
    dataSource: {
      name: data.name,
      appName: data.dataSourceName,
      dataSourceName: data.dataSourceName,
      type: data.type,
      comment: data.comment,
      isDirectConnection: false,
    },
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/addDataSource`, params);
};
/**
 * 修改数据源
 *
 * @returns
 * @param data
 */
export const editDataSourceServer = async (data) => {
  const params = {
    putData: JSON.stringify({
      dataSource: {
        name: data.name,
        appName: data.dataSourceName,
        dataSourceName: data.dataSourceName,
        type: data.type,
        comment: data.comment,
        isDirectConnection: false,
        id: data.id,
      },
      projectId: data.projectId,
    }),
  };
  return await axiosRequest.put(`/client/editDataSource`, params);
};
/**
 * 删除数据源
 *
 * @returns
 * @param data
 */
export const deleteDataSourceServer = async (data) => {
  const params = {
    ids: data.ids,
    projectId: data.projectId,
  };
  return await axiosRequest.delete(`/client/deleteDataSource`, params);
};
/**
 * 更新变量
 *
 * @returns
 */
export const getVariableListServer = async () => {
  const clientMenuStore = useClientMenuStore();
  //const userStore = useLoginUserStore();
  //const { tenantId } = userStore.userInfo;
  const params = {
    projectId: clientMenuStore.currentClientEngineer.guid,
    //  tenantId,
  };
  return await axiosRequest.get(`/client/getVariableList`, params, { timeout: 60 * 1000 });
};
/**
 * 添加变量
 * @returns
 */
export const addVariableServer = async (data) => {
  const clientMenuStore = useClientMenuStore();

  const requestBody = {
    variable: {
      id: clientMenuStore.currentClientRow.id, //变量组id，通过获取变量树结构获取根组id，调用时将注释删掉，否则无法调通
      content: data,
    },
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/addVariable`, requestBody);
};
/**
 * 修改变量
 * @returns
 */
export const modifyVariableServer = async (data, oldName) => {
  const clientMenuStore = useClientMenuStore();
  const putData = {
    groupId: clientMenuStore.currentClientRow.id,
    variableName: oldName,
    variable: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/editVariable`, { putData: JSON.stringify(putData) });
};
/**
 * 导入变量
 * @returns
 */
export const importVariableServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const putData = {
    groupId: clientMenuStore.currentClientRow.id,
    variable: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/importVariable`, putData, { timeout: 60 * 1000 });
};
/**
 * 同步页面-更新工程下页面订阅信息
 * @returns
 */
export const updatePageTagIdServer = async () => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/updatePageTagId`, params, { timeout: 60 * 1000 });
};
/**
 * 删除变量
 * @returns
 */
export const deleteVariableServer = async (data, groupId) => {
  const clientMenuStore = useClientMenuStore();
  const putData = {
    groupId: groupId,
    delDatas: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/deleteVariable`, putData);
};
/**
 * 获取全局脚本
 *
 * @returns
 * @param data
 */
export const getGlobalScriptServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    currentPro: clientMenuStore.currentClientEngineer.guid,
    id: clientMenuStore.currentClientRow.id,
    type: data.type,
  };
  return await axiosRequest.get(`/client/getGlobalScript`, params);
};

/**
 * 更新脚本
 *
 * @returns
 * @param data
 * @param bodyParams
 */
export const setGlobalScriptServer = async (data, bodyParams) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    params: {
      currentPro: clientMenuStore.currentClientEngineer.guid,
      type: data.type,
      operation: data.operation,
    },
  };
  bodyParams.groupId = clientMenuStore.currentClientRow.id;
  return await axiosRequest.post(`/client/setGlobalScript`, bodyParams, params);
};

/**
 * 获取角色列表
 *
 * @returns
 * @param data
 */
export const getRoleListServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getRoleList`, params);
};
/**
 * 获取资源信息
 *
 * @returns
 * @param data
 */
export const getAllResourceServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getAllResource`, params);
};
/**
 * 获取资源信息-用于枚举安全对象
 *
 * @returns
 * @param data
 */
export const getResourceServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getResource`, params);
};

/**
 * 新增角色
 *
 * @returns
 * @param data
 */
export const createRoleServer = async (data) => {
  const params = {
    roleInfo: {
      name: data.name,
      comment: data.comment,
      createBy: data.createBy,
      status: data.status,
      showOrder: data.showOrder,
      operate: data.operate,
      linkUser: data.linkUser,
      user: data.user,
      userGroup: data.userGroup,
      userGroupMsg: data.userGroupMsg,
      resourceAuthInfo: data.resourceAuthInfo,
      statusMsg: data.statusMsg,
    },
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/createRole`, params);
};

/**
 * 修改角色
 *
 * @returns
 * @param data
 */
export const editRoleServer = async (data) => {
  const params = {
    roleInfo: {
      name: data.name,
      id: data.id,
      comment: data.comment,
      createBy: data.createBy,
      status: data.status,
      showOrder: data.showOrder,
      operate: data.operate,
      linkUser: data.linkUser,
      user: data.user,
      userGroup: data.userGroup,
      userGroupMsg: data.userGroupMsg,
      resourceAuthInfo: data.resourceAuthInfo,
      statusMsg: data.statusMsg,
    },
    projectId: data.projectId,
  };
  return await axiosRequest.put(`/client/editRole`, params);
};
/**
 * 删除角色
 *
 * @returns
 * @param data
 */
export const deleteRoleServer = async (data) => {
  const params = {
    roleInfo: data.ids,
    projectId: data.projectId,
  };
  return await axiosRequest.delete(`/client/deleteRole`, params);
};
/**
 * 更新图形模型
 *
 * @returns
 * @param data
 */
export const updateModuleImgServer = async (data) => {
  const bodyParams = {
    postData: data.postData,
  };
  const params = {
    params: {
      updateImgPath: JSON.stringify({
        imgName: data.imgName,
        modelGroup: data.modelGroup,
        name: data.name,
        guid: data.guid,
        type: data.type,
        flag: data.flag,
      }),
    },
  };
  return await axiosRequest.post(`/client/updateModuleImg`, bodyParams, params);
};
/**
 * 编辑图形模型
 *
 * @returns
 * @param data
 */
export const editModuleServer = async (data) => {
  const bodyParams = {
    postData: {
      modelGroup: data.modelGroup,
      name: data.name,
      newName: data.newName,
      guid: data.guid,
    },
  };
  return await axiosRequest.post(`/client/editModule`, bodyParams);
};

/**
 * 删除图形模型
 *
 * @returns
 * @param data
 */
export const batchDeleteModuleServer = async (data) => {
  const params = {
    projectInfo: JSON.stringify(data.projectInfo),
  };
  return await axiosRequest.get(`/client/batchDeleteModule`, params);
};
/**
 * 上传图形模型
 *
 * @returns
 * @param data
 */
export const batchUpdateModuleServer = async (data) => {
  const params = data.modeFileList;
  return await axiosRequest.post(`/client/batchUpdateModule`, params);
};
/**
 * 保存图形
 *
 * @returns
 * @param data
 */
export const saveModuleImgServer = async (data) => {
  const bodyParams = {
    postData: data.postData,
  };
  const params = {
    params: {
      saveImgPath: JSON.stringify({
        name: data.name,
        guid: data.guid,
        type: data.type,
      }),
    },
  };
  return await axiosRequest.post(`/client/saveModuleImg`, bodyParams, params);
};
/**
 * 批量导出图形模型-首先执行压缩
 *
 * @returns
 * @param data
 */
export const batchExportModuleServer = async (data) => {
  const bodyParams = data.names;
  const params = {
    params: {
      projectInfo: JSON.stringify({
        guid: data.guid,
      }),
    },
  };
  return await axiosRequest.post(`/client/batchExportModule`, bodyParams, params);
};
/**
 * 批量导出工程
 *
 * @returns
 * @param projectData
 */
export const exportProjectServer = async (projectData) => {
  const mainLeftMenusStore = useMainLeftMenusStore();

  const params = {
    projectData: projectData.map((row) => {
      return {
        name: row.name,
        id: row.guid, //工程id
        exportname: row.name,
        describe: row.description,
        version: row.version,
      };
    }),
    exportPath: mainLeftMenusStore.leftRowSelect.name,
    type: 'exportProject',
    groupName: mainLeftMenusStore.leftRowSelect.name,
  };

  return await axiosRequest.post(`/client/handleProject`, params, { timeout: 5 * 60 * 1000 });
};

/**
 * 导出App工程
 *
 * @returns
 * @param projectData
 */
export const exportAppProjectServer = async (projectData) => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    projectData: projectData.map((row) => {
      return {
        name: row.name,
        id: row.guid, //工程id
        exportname: row.name,
        describe: row.description,
        version: row.version,
      };
    }),
    exportPath: mainLeftMenusStore.leftRowSelect.name,
    type: 'exportAppProject',
    groupName: mainLeftMenusStore.leftRowSelect.name,
  };

  return await axiosRequest.post(`/client/exportAppProject`, params, { timeout: 5 * 60 * 1000 });
};
/**
 * 批量导出图形模型
 *
 * @returns
 * @param data
 */
export const importProjectServer = async (data) => {
  const loginUserStore = useLoginUserStore();
  const mainLeftMenusStore = useMainLeftMenusStore();
  const { errorCode } = await uploadLocalProjectServer(data);
  // 当工程导入之后才添加projectManager
  if (errorCode === 0) {
    const params = {
      importname: data.currentName.split('.')[0], //导入的名称
      createByName: loginUserStore.userInfo.userName,
      createBy: loginUserStore.userInfo.userId,
      projectGroupId: mainLeftMenusStore.leftRowSelect.guid, //工程组id
      groupName: mainLeftMenusStore.leftRowSelect.name, //工程组名
      currentName: data.currentName.split('.')[0], //导入的原名称
      type: 'importProject',
    };

    return await axiosRequest.post(`/client/handleProject`, params);
  }
  return '';
};

/**
 * 批量导出图形模型
 *
 * @returns
 * @param data
 */
async function uploadLocalProjectServer(data) {
  const params = new FormData();
  params.append('uploadproject', data.file);
  return await axiosRequest.post(`/client/uploadLocalProject`, params, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    timeout: 4 * 60 * 1000,
  });
}

/**
 * 提取资源
 *
 * @returns
 * @param data
 */
export const extractResourcesServer = async (data) => {
  const params = {
    projectId: data.projectId,
    pageName: data.pageName,
  };
  return await axiosRequest.post(`/client/extractResources`, params);
};

/**
 * 提取资源
 *
 * @returns
 * @param translateArray
 * @param type
 */
export const importTranslateSourceServer = async ({ translateArray, type }) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    projectId: clientMenuStore.currentClientEngineer.guid,
    translateArray,
    type,
  };
  return await axiosRequest.post(`/client/importTranslateSource`, params);
};
export const getAllReleaseDataServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  return await axiosRequest.get(`/client/getAllSeat`, params);
};
export const releaseMultiSeatServer = async (data) => {
  return await axiosRequest.post(`/client/releaseMultiSeat`, data);
};

/**
 * 共享工程
 *
 * @param data 共享的工程信息
 * @returns
 */
export const shareUserServer = async (data) => {
  const params = {
    guid: data.guid,
    userIds: data.userIds,
  };
  try {
    const { errorCode } = await axiosRequest.post(`/client/share`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 取消共享工程用户
 *
 * @param data 共享的工程信息
 * @returns
 */
export const deleteShareUserServer = async (data) => {
  const params = {
    guid: data.guid,
    userIds: data.userIds,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/client/share`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 取消共享工程所有用户
 *
 * @param data 共享的工程信息
 * @returns
 */
export const deleteShareAllUserServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/client/share/all`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};
/**
 * 回收站操作
 *
 * @returns
 * @param data
 */
export const handlePageRecordMngServer = async (data) => {
  const { params } = data;
  return await axiosRequest.post(`/client/handlePageRecordMng`, params);
};
/**
 * 删除图片
 *
 * @returns
 * @param data
 */
export const delImgServer = async (data) => {
  const params = {
    imgPath: data.imgPath,
  };
  return await axiosRequest.delete(`/client/delImg`, params);
};

/**
 * 创建报表
 * @returns
 * @param data
 */
export const createReportManagerServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    name: data.name,
    description: data.description,
    groupId: data.groupId,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/createReportManager`, params);
};

/**
 * 编辑报表
 * @returns
 * @param data
 */
export const editReportServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    ...data,
    groupId: data.groupId,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/editReport`, params);
};

/**
 * 编辑报表
 * @returns
 * @param data
 */
export const editReportManagerServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    name: data.name,
    description: data.description,
    id: data.id,
    groupId: data.groupId,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/editReportManager`, params);
};

/**
 * 获取报表管理
 * @returns
 * @param data
 */
export const getReportManagerServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    id: data?.id,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getReportManager`, params);
};

/**
 * 获取报表
 * @returns
 * @param data
 */
export const getReportServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    id: data.id,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getReport`, params);
};
/**
 * 创建数据集
 * @returns
 * @param data
 */
export const createDateSetServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/createDateSet`, params);
};
/**
 * 获取数据集
 * @returns
 * @param reportId
 * @param dataSetInfo
 */
export const getDataSetServer = async (reportId, dataSetInfo) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    reportId,
    dataSetInfo: dataSetInfo ? dataSetInfo : '',
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getDataSet`, params);
};
/**
 * 删除数据集
 *
 * @returns
 * @param dataSetInfo
 */
export const delDataSetServer = async (dataSetInfo) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    dataSetInfo,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.delete(`/client/delDataSet`, params);
};
/**
 * 编辑数据集
 *
 * @returns
 * @param data
 */
export const editDataSetServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/editDataSet`, params);
};
/**
 * 创建数据项
 * @returns
 * @param data
 */
export const createDateItemServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/createDateItem`, params);
};
/**
 * 获取数据项
 * @returns
 * @param reportId
 * @param dataItemInfo
 */
export const getDataItemServer = async (reportId, dataItemInfo) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    reportId,
    dataItemInfo: dataItemInfo ? dataItemInfo : '',
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getDataItem`, params);
};
/**
 * 编辑数据项
 *
 * @returns
 * @param data
 */
export const editDataItemServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/editDataItem`, params);
};
/**
 * 删除数据项
 *
 * @returns
 * @param dataItemInfo
 */
export const delDataItemServer = async (dataItemInfo) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    dataItemInfo,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.delete(`/client/delDataItem`, params);
};
/**
 * 删除数据项
 *
 * @returns
 * @param data
 */
export const delReportManagerServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    reportInfo: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.delete(`/client/delReportManagerServer`, params);
};
/**
 * 创建报表组
 *
 * @returns
 * @param data
 */
export const createReportGroupServer = async (data) => {
  const params = {
    name: data.name,
    id: data.id,
    parentId: data.parentId,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/createReportGroupServer`, params);
};

/**
 * 获取数据项
 * @returns
 * @param reportId
 */
export const getDataSetItemItemServer = async (reportId) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    reportId,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/getDataSetItem`, params);
};
/**
 * 编辑报表组
 *
 * @returns
 * @param data
 */
export const updateReportGroupServer = async (data) => {
  const params = {
    name: data.name,
    id: data.id,
    projectId: data.projectId,
  };
  return await axiosRequest.put(`/client/updateReportGroupServer`, params);
};
/**
 * 删除报表组
 *
 * @returns
 * @param data
 */
export const deleteReportGroupServer = async (data) => {
  const params = {
    id: data.id,
    projectId: data.projectId,
  };
  return await axiosRequest.delete(`/client/deleteReportGroupServer`, params);
};
/**
 * 批量获取报表
 * @returns
 * @param reportIds
 */
export const batchGetReportServer = async (reportIds) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    reportIds,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.get(`/client/batchGetReport`, params);
};
/**
 * 批量导入报表
 *
 * @returns
 * @param data
 */
export const importReportServer = async (data) => {
  const params = {
    reportList: data.reportList,
    projectId: data.projectId,
  };
  return await axiosRequest.post(`/client/importReport`, params);
};
/**
 * 设置报表占位
 *
 * @returns
 * @param reportId
 */
export const setReportSeatServer = async (reportId) => {
  const clientMenuStore = useClientMenuStore();
  const loginUserStore = useLoginUserStore();
  const params = [
    {
      projectId: clientMenuStore.currentClientEngineer.guid,
      type: 10,
      itemId: reportId,
      handSeatFlag: false,
      token: loginUserStore.userInfo.userName,
    },
  ];
  return await axiosRequest.post(`/client/setMultiSeat`, params);
};
/**
 * 解除报表占位
 *
 * @returns
 * @param reportId
 */
export const releaseReportSeatServer = async (reportId) => {
  const clientMenuStore = useClientMenuStore();
  const params = [
    {
      projectId: clientMenuStore.currentClientEngineer.guid,
      handSeatFlag: false,
      itemId: reportId,
      token: useLoginUserStore().userInfo.userName,
      type: 10,
    },
  ];
  return await axiosRequest.post(`/client/releaseMultiSeat`, params);
};
/**
 * 粘贴页面
 *
 * @returns
 * @param data
 */
export const pastePageServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    pageList: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/pastePage`, params);
};
/**
 * 创建脚本组
 * @returns
 * @param data
 */
export const createScriptGroupServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    name: data.name,
    parentId: data.parentId,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/createScriptGroup`, params);
};

/**
 * 编辑脚本组
 * @returns
 * @param data
 */
export const updateScriptGroupServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    name: data.name,
    id: data.id,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.put(`/client/updateScriptGroup`, params);
};

/**
 * 删除脚本组
 * @returns
 * @param data
 */
export const deleteScriptGroupServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    id: data.id,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.delete(`/client/deleteScriptGroup`, params);
};
/**
 * 解密上传翻译资源的excel
 *
 * @returns
 * @param translateArray
 * @param type
 */
export const translateDecrypt = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    projectId: clientMenuStore.currentClientEngineer.guid,
    data,
  };
  return await axiosRequest.post(`/client/translateDecrypt`, params);
};

/**
 * 获取脚本组
 * @returns
 * @param data
 */
export const getScriptGroupServer = async () => {
  try {
    const clientMenuStore = useClientMenuStore();
    const params = {
      projectId: clientMenuStore.currentClientEngineer.guid,
    };

    return await axiosRequest.get(`/client/getScriptGroupServer`, params);
  } catch (error) {
    return error;
  }
};
/**
 * 移动脚本组
 * @returns
 * @param data
 */
export const moveScriptGroupServer = async (params) => {
  try {
    const clientMenuStore = useClientMenuStore();
    params.projectId = clientMenuStore.currentClientEngineer.guid;
    return await axiosRequest.post(`/client/moveScriptGroupServer`, params);
  } catch (error) {
    return error;
  }
};
/**
 * 粘贴图形模型
 *
 * @returns
 * @param data
 */
export const pasteGraphicServer = async (data) => {
  const clientMenuStore = useClientMenuStore();
  const params = {
    graphicList: data,
    projectId: clientMenuStore.currentClientEngineer.guid,
  };
  return await axiosRequest.post(`/client/pasteGraphic`, params);
};
