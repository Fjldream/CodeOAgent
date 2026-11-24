import { axiosRequest } from '@/api/request.js';
import { useCalculationMenuStore } from '@/stores/calculationMenuStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';

/**
 * 获取计算工程信息
 *
 * @returns
 * @param projectGroupId
 */
export const getProjectInfoServer = async (projectGroupId) => {
  const params = {
    projectGroupId,
  };
  try {
    const { data } = await axiosRequest.get(`/calculation/project`, params);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * 创建工程
 *
 * @returns
 * @param row
 */
export const createSolutionProjectServer = async (row) => {
  const params = {
    name: row.name,
    projectGroupId: row.projectGroupId,
    description: row.description,
  };
  try {
    const { errorCode } = await axiosRequest.post(`/calculation/project`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
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
    status: data.status,
  };
  try {
    const { errorCode } = await axiosRequest.put(`/calculation/project`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 删除工程
 *
 * @returns
 * @param item
 */
export const deleteProjectServer = async (item) => {
  const params = {
    projectId: item.projectId,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/calculation/project`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
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
    const { errorCode } = await axiosRequest.post(`/calculation/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/calculation/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/calculation/share/all`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};
/**
 * 导入工程
 *
 * @returns
 * @param formData
 */
export const importProjectServer = async (formData) => {
  return await axiosRequest.post(`/calculation/importProjects`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    timeout: 5 * 60 * 1000,
  });
};

/**
 * 导出工程
 *
 * @returns
 * @param data
 */
export const exportProjectServer = async (data) => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
    guidArr: data.guidArr, //工程ID 必填
  };
  return await axiosRequest.post(`/calculation/exportProject`, params, { timeout: 5 * 60 * 1000 });
};

/**
 * 创建程详情中的组
 *
 * @returns
 * @param row
 */
export const addScriptGroupServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: row.guid || calculationMenuStore.currentCalculateEngineer.guid,
    parentId: row.parentId,
    name: row.name,
    scriptType: row.scriptType,
  };
  try {
    const { errorCode } = await axiosRequest.post(`/calculation/addScriptGroup`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 编辑程详情中的组
 *
 * @returns
 * @param row
 */
export const modifyScriptGroupServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    name: row.name,
    groupId: row.groupId,
    scriptType: row.scriptType,
  };
  try {
    const { errorCode } = await axiosRequest.put(`/calculation/modifyScriptGroup`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 删除程详情中的组
 *
 * @returns
 * @param row
 */
export const deleteScripteGroupServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    groupId: row.groupId,
    scriptType: row.scriptType,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/calculation/deleteScripteGroup`, params);
    return errorCode;
  } catch (error) {
    return error;
  }
};
/**
 * 获取工程详情中的组
 *
 * @returns
 * @param row
 */
export const getProjectScriptGroupServer = async (row) => {
  const params = {
    projectId: row.guid,
  };
  try {
    const {
      data: { group },
    } = await axiosRequest.get(`/calculation/openProject`, params);

    return group;
  } catch (error) {
    return null;
  }
};

/**
 * 获取工程文件信息
 *
 * @param row 工程文件信息
 * @returns
 */
export const getProjectJSONSettingsServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: row.projectId || calculationMenuStore.currentCalculateEngineer.guid,
    type: row.type,
    groupId: row.groupId,
  };
  try {
    const { data } = await axiosRequest.get(`/calculation/projectJsonData`, params);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * 获取工程文件详细Data（脚本内容）
 *
 * @param row 工程文件信息
 * @returns
 */
export const getProjectJSONDataServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.type,
    scriptId: row.scriptId,
  };
  try {
    const { data } = await axiosRequest.get(`/calculation/scriptData`, params);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * 编辑工程脚本
 *
 * @param row 工程脚本信息
 * @returns
 */
export const editProjectJSONDataServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.type,
    scriptId: row.scriptId,
    scriptData: {
      expression: row.expression,
      text: row.text,
      in: row.in,
      out: row.out,
      exist: row.exist,
      interval: row.interval,
      unit: row.unit,
    },
  };

  try {
    const { errorCode } = await axiosRequest.put(`/calculation/scriptData`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 新建工程文件信息
 *
 * @param row 工程文件信息
 * @returns
 */
export const addProjectJSONDataServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.fileType,
    data: {
      name: row.name,
      type: row.type,
      value: row.value,
      description: row.description,
      dataSourceName: row.dataSourceName,
      dataSourceType: row.dataSourceType,
      datasourceName: row.datasourceName,
      datasourceType: row.datasourceType,
      TagName: row.TagName,
      TagType: row.TagType,
      DataType: row.DataType,
      groupId: row.groupId,
      interval: row.interval,
      unit: row.unit,
      startTime: row.startTime,
      endTime: row.endTime,
      times: row.times,
      periodType: row.periodType,
      whetherenable: row.whetherenable,
      pattern: row.pattern,
      triggerTime: row.triggerTime,
      week: row.week,
      month: row.month,
      year: row.year,
      functionName: row.functionName,
      paramlist: row.paramlist,
      newWorkDateType: row.newWorkDateType,
      whiteList: row.whiteList,
    },
  };
  try {
    const { errorCode } = await axiosRequest.post(`/calculation/projectJsonData`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 编辑工程文件信息
 *
 * @param row 工程文件信息
 * @returns
 */
export const modifyProjectJSONDataServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.fileType,
    scriptId: row.GUID || row.id,
    data: {
      groupId: row.groupId,
      name: row.name,
      type: row.type,
      value: row.value,
      description: row.description,
      dataSourceName: row.dataSourceName,
      dataSourceType: row.dataSourceType,
      datasourceName: row.datasourceName,
      datasourceType: row.datasourceType,
      TagName: row.TagName,
      TagType: row.TagType,
      DataType: row.DataType,
      functionName: row.functionName,
      paramlist: row.paramlist,
      interval: row.interval,
      unit: row.unit,
      startTime: row.startTime,
      endTime: row.endTime,
      times: row.times,
      periodType: row.periodType,
      whetherenable: row.whetherenable,
      pattern: row.pattern,
      triggerTime: row.triggerTime,
      week: row.week,
      month: row.month,
      year: row.year,
      newWorkDateType: row.newWorkDateType,
      whiteList: row.whiteList,
    },
  };
  try {
    const { errorCode } = await axiosRequest.put(`/calculation/projectJsonData`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 删除工程文件信息
 *
 * @param row 工程文件信息
 * @returns
 */
export const deleteProjectJSONDataServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.type,
    scriptIds: row.scriptIds,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/calculation/projectJsonData`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 脚本生效失效服务
 *
 * @param row 工程文件信息
 * @returns
 */
export const modifyScriptInvalidStatusServer = async (row) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type: row.type,
    whetherenable: row.whetherenable,
    scriptIds: row.scriptIds,
  };
  try {
    const { errorCode } = await axiosRequest.put(`/calculation/modifyScriptInvalidStatus`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};

/**
 * 获取强制站位列表服务
 *
 * @returns
 */
export const getLockerListServer = async () => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
  };
  return await axiosRequest.get(`/calculation/lockerList`, params);
};

/**
 * 强制解除占位
 *
 * @returns
 */
export const forceUnlockScriptServer = async (scriptIds) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    scriptIds,
  };
  return await axiosRequest.put(`/calculation/forceUnlockScript`, params);
};

/**
 * 移除占位
 *
 * @returns
 */
export const unlockScriptServer = async (scriptIds) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    scriptIds,
  };
  return await axiosRequest.put(`/calculation/unlockScript`, params);
};
/**
 * 脚本调试服务
 *
 * @returns
 * @param debuggerStatus
 * @param debugConfigForm
 */
export const scriptDebuggerServer = async (debuggerStatus, debugConfigForm) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    debuggerStatus,
    projectPort: debugConfigForm?.projectPort,
    debugPort: debugConfigForm?.debugPort,
  };
  return await axiosRequest.get(`/calculation/serverDebug`, params, { timeout: 10000 });
};
/**
 * 获取依赖列表
 *
 * @returns
 * @param type
 */
export const dependanceListServer = async (type) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type,
  };
  return await axiosRequest.get(`/calculation/getDependenceslist`, params);
};

/**
 * 删除依赖
 *
 * @returns
 * @param type
 * @param nameArr
 */
export const delDependanceServer = async (type, nameArr) => {
  const calculationMenuStore = useCalculationMenuStore();
  const params = {
    projectId: calculationMenuStore.currentCalculateEngineer.guid,
    type,
    name: nameArr,
  };
  return await axiosRequest.delete(`/calculation/deleteDependence`, params);
};

/**
 * 导入依赖
 *
 * @returns
 * @param description
 * @param type
 * @param file
 */
export const importDependanceServer = async (description, type, file) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    const formData = new FormData();
    formData.append('projectId', calculationMenuStore.currentCalculateEngineer.guid);
    formData.append('description', description);
    formData.append('uploadFiles', file.raw);
    // 依赖导入中文编码
    formData.append('name', encodeURIComponent(file.name));
    formData.append('type', type);
    return await axiosRequest.post(`/calculation/addDependence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
      timeout: 2 * 60 * 1000,
    });
  } catch (error) {
    return error;
  }
};
/**
 * 下载依赖
 *
 * @returns
 * @param type
 * @param description
 */
export const installDependanceServer = async (name, description) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    const body = { projectId: calculationMenuStore.currentCalculateEngineer.guid, name, description };
    return await axiosRequest.post(`/calculation/installDependence`, body, { timeout: 5 * 60 * 1000 });
  } catch (error) {
    return error;
  }
};
/**
 * 卸载npm依赖
 *
 * @returns
 * @param type
 * @param description
 */
export const unInstallDependanceServer = async (name) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    const body = { projectId: calculationMenuStore.currentCalculateEngineer.guid, name };
    return await axiosRequest.delete(`/calculation/unInstallDependence`, body, { timeout: 5 * 60 * 1000 });
  } catch (error) {
    return error;
  }
};
/**
 * 全局脚本搜索
 *
 * @returns
 * @param searchPattern
 */
export const scriptSearchServer = async (searchPattern) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    const params = {
      projectId: calculationMenuStore.currentCalculateEngineer.guid,
      searchPattern,
    };
    return await axiosRequest.get(`/calculation/scriptSearch`, params);
  } catch (error) {
    return error;
  }
};

// 获取脚本分组
export const getScriptGroupServer = async (scriptType) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    const params = {
      projectId: calculationMenuStore.currentCalculateEngineer.guid,
      scriptType: scriptType,
    };
    return await axiosRequest.get(`/calculation/scriptGroup`, params);
  } catch (error) {
    return error;
  }
};

export const moveScriptGroupServer = async (params) => {
  try {
    const calculationMenuStore = useCalculationMenuStore();
    params.projectId = calculationMenuStore.currentCalculateEngineer.guid;
    return await axiosRequest.post(`/calculation/moveScript`, params);
  } catch (error) {
    return error;
  }
};
