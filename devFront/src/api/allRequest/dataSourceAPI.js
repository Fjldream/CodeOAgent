import { axiosRequest } from '@/api/request.js';

/**
 * 获取数据源工程信息
 *
 * @param data 参数
 * @returns
 */
export const getProjectInfoServer = async (data) => {
  const params = {
    projectGroupId: data.projectGroupId,
  };
  return await axiosRequest.get(`/dataSource/project`, params);
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
    description: data.description || '',
    projectGroupId: data.projectGroupId,
    projectData: {
      // 必填 数据库配置
      type: data.type, // 必填
      config: {
        //必填 自定义配置
        ip: data.ip,
        port: data.port,
        backIp: data.backIp,
        backPort: data.backPort,
        webPort: data.webPort,
        realPort: data.realPort,
        historyPort: data.historyPort,
        alarmPort: data.alarmPort,
        backRealPort: data.backRealPort,
        backHistoryPort: data.backHistoryPort,
        backAlarmPort: data.backAlarmPort,
        dbName: data.dbName,
        userName: data.userName,
        password: data.password,
        minConnectionNum: data.minConnectionNum,
        maxConnectionNum: data.maxConnectionNum,
        timeout: data.timeout,
        dataType: data.dataType,
        redundancy: data.redundancy,
        newWorkDateType: data.newWorkDateType,
        getVariableListMethod: data.getVariableListMethod,
        setVariableValueMethod: data.setVariableValueMethod,
        realPublishingThene: data.realPublishingThene,
        engineeringId: data.engineeringId,
        engineeringName: data.engineeringName,
        emqx_ip: data.emqx_ip,
        emqx_port: data.emqx_port,
        emqx_username: data.emqx_username,
        emqx_password: data.emqx_password,
        redis_ip: data.redis_ip,
        redis_port: data.redis_port,
        redis_password: data.redis_password,
        restful_ip: data.restful_ip,
        restful_port: data.restful_port,
        alarmProject: data.alarmProject,
        mode: data.mode,
        nodeUrls: data.nodeUrls
      },
    },
  };
  return await axiosRequest.post(`/dataSource/project`, params);
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
    description: data.description || '',
    guid: data.guid,
    projectData: {
      // 必填 数据库配置
      type: data.type, // 必填
      config: {
        //必填 自定义配置
        ip: data.ip,
        port: data.port,
        backIp: data.backIp,
        backPort: data.backPort,
        webPort: data.webPort,
        realPort: data.realPort,
        historyPort: data.historyPort,
        alarmPort: data.alarmPort,
        backRealPort: data.backRealPort,
        backHistoryPort: data.backHistoryPort,
        backAlarmPort: data.backAlarmPort,
        dbName: data.dbName,
        userName: data.userName,
        password: data.password,
        minConnectionNum: data.minConnectionNum,
        maxConnectionNum: data.maxConnectionNum,
        timeout: data.timeout,
        dataType: data.dataType,
        redundancy: data.redundancy,
        newWorkDateType: data.newWorkDateType,
        getVariableListMethod: data.getVariableListMethod,
        setVariableValueMethod: data.setVariableValueMethod,
        realPublishingThene: data.realPublishingThene,
        engineeringId: data.engineeringId,
        engineeringName: data.engineeringName,
        emqx_ip: data.emqx_ip,
        emqx_port: data.emqx_port,
        emqx_username: data.emqx_username,
        emqx_password: data.emqx_password,
        redis_ip: data.redis_ip,
        redis_port: data.redis_port,
        redis_password: data.redis_password,
        restful_ip: data.restful_ip,
        restful_port: data.restful_port,
        alarmProject: data.alarmProject,
        mode: data.mode,
        nodeUrls: data.nodeUrls
      },
    },
    status: data.status,
  };
  return await axiosRequest.put(`/dataSource/project`, params);
};

/**
 * 删除工程
 *
 * @param data 删除的工程信息
 * @returns
 */
export const deleteProjectServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  return await axiosRequest.delete(`/dataSource/project`, params);
};

/**
 * 测试连接
 *
 * @param data 测试的工程
 * @returns
 */
export const getDbTestServer = async (data) => {
  const params = {
    name: data.name,
    guid: data.guid,
    projectData: {
      type: data.type,
      config: {
        //必填 自定义配置
        ip: data.ip,
        port: data.port,
        backIp: data.backIp,
        backPort: data.backPort,
        webPort: data.webPort,
        realPort: data.realPort,
        historyPort: data.historyPort,
        alarmPort: data.alarmPort,
        backRealPort: data.backRealPort,
        backHistoryPort: data.backHistoryPort,
        backAlarmPort: data.backAlarmPort,
        dbName: data.dbName,
        userName: data.userName,
        password: data.password,
        minConnectionNum: data.minConnectionNum,
        maxConnectionNum: data.maxConnectionNum,
        timeout: data.timeout,
        dataType: data.dataType,
        redundancy: data.redundancy,
        newWorkDateType: data.newWorkDateType,
        getVariableListMethod: data.getVariableListMethod,
        setVariableValueMethod: data.setVariableValueMethod,
        realPublishingThene: data.realPublishingThene,
        engineeringId: data.engineeringId,
        engineeringName: data.engineeringName,
        emqx_ip: data.emqx_ip,
        emqx_port: data.emqx_port,
        redis_ip: data.redis_ip,
        redis_port: data.redis_port,
        restful_ip: data.restful_ip,
        restful_port: data.restful_port,
        mode: data.mode,
        nodeUrls: data.nodeUrls
      },
    },
  };
  return await axiosRequest.post(`/dataSource/dbTest`, params);
};

/**
 * 测试连接
 *
 * @param data 测试的工程
 * @returns
 */
export const getAlarmDbTestServer = async (data) => {
  const params = {
    name: data.name,
    guid: data.guid,
    projectData: {
      type: data.type,
      config: {
        //必填 自定义配置
        ip: data.ip,
        port: data.port,
        dbName: data.dbName,
        userName: data.userName,
        password: data.password,
        timeout: data.timeout,
      },
    },
  };
  return await axiosRequest.post(`/alarm/alarmHistorydbTest`, params);
};

/**
 * 测试连接
 *
 * @param data 测试的工程
 * @returns
 */
export const getVariableServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  return await axiosRequest.get(`/dataSource/getTagList`, params);
};

/**
 * 获取所有数据源
 *
 * @returns
 */
export const getAllDataSourceServer = async () => {
  return await axiosRequest.get(`/dataSource/getAllDataSource`, {});
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
    const { errorCode } = await axiosRequest.post(`/dataSource/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/dataSource/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/dataSource/share/all`, params);
    return errorCode;
  } catch (error) {
    return null;
  }
};
/**
 * 导入工程
 *
 * @param data 导入的工程信息
 * @returns
 */
export const importProjectServer = async (data) => {
  const formData = new FormData();
  formData.append('uploadFiles', data.file);
  formData.append('projectGroupId', data.projectGroupId);
  formData.append('name', data.name);
  try {
    return await axiosRequest.post(`/dataSource/importProject`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch (error) {
    return null;
  }
};

/**
 * 导出工程
 *
 * @param projectArr 导出的程信息
 * @returns
 */
export const exportProjectServer = async (projectArr) => {
  const params = {
    projectGroupId: projectArr[0].projectGroupId,
    guidArr: projectArr.map((item) => {
      return item.guid;
    }),
  };
  try {
    const {
      errorCode,
      data: { errorPros, successPros },
    } = await axiosRequest.post(`/dataSource/exportProject`, params);

    return {
      errorCode,
      errorPros,
      successPros,
    };
  } catch (error) {
    return null;
  }
};

// 获取全部报警工程
export const getAllProjectsServer = async () => {
  try {
    return await axiosRequest.get(`/alarm/allProjects`);
  } catch (error) {
    return null;
  }
};

// 获取数据源类型
export const getDataSourceOptionsServer = async () => {
  try {
    return await axiosRequest.get(`/dataSource/dataSourceOptions`);
  } catch (error) {
    return null;
  }
};
