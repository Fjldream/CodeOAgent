import { axiosRequest } from '@/api/request.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';

// 获取报警工程
export const getAlarmProjectServer = async () => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/alarm/project`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建报警工程
export const createAlarmProjectServer = async (data) => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    name: data.name,
    description: data.description,
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
  };
  try {
    return await axiosRequest.post(`/alarm/project`, params);
  } catch (error) {
    return error;
  }
};

// 编辑报警工程
export const editAlarmProjectServer = async (data) => {
  const params = {
    name: data.name,
    description: data.description,
    guid: data.guid,
  };
  try {
    return await axiosRequest.put(`/alarm/project`, params);
  } catch (error) {
    return error;
  }
};

// 删除报警工程
export const deleteAlarmProjectServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  try {
    return await axiosRequest.delete(`/alarm/project`, params);
  } catch (error) {
    return error;
  }
};

// 添加共享
export const shareAlarmProjectServer = async (data) => {
  const params = {
    guid: data.guid,
    userIds: data.userIds,
  };
  try {
    const { errorCode } = await axiosRequest.post(`/alarm/share`, params);
    return errorCode;
  } catch (error) {
    return error;
  }
};

// 删除共享用户
export const deleteShareAlarmProjectServer = async (data) => {
  const params = {
    guid: data.guid,
    userIds: data.userIds,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/alarm/share`, params);
    return errorCode;
  } catch (error) {
    return error;
  }
};

// 删除所有共享用户
export const deleteAllShareAlarmProjectServer = async (data) => {
  const params = {
    guid: data.guid,
  };
  try {
    const { errorCode } = await axiosRequest.delete(`/alarm/share/all`, params);
    return errorCode;
  } catch (error) {
    return error;
  }
};

// 删除所有共享用户
export const exportAlarmProjectServer = async (guidArr) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    guidArr,
  };
  try {
    return await axiosRequest.post(`/alarm/exportProject`, params);
  } catch (error) {
    return error;
  }
};

// 删除所有共享用户
export const importAlarmProjectServer = async (formData) => {
  try {
    return await axiosRequest.post(`/alarm/importProject`, formData, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 获取数据词典组
export const getDataDirectoryGroupServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
  };

  try {
    return await axiosRequest.get(`/alarm/group`, params);
  } catch (error) {
    return error;
  }
};

// 创建数据词典组
export const createDataDirectoryGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    parentGroupId: data.parentGroupId,
    groupName: data.name,
    description: '',
  };

  try {
    return await axiosRequest.post(`/alarm/group`, params);
  } catch (error) {
    return error;
  }
};

// 编辑数据词典组
export const editDataDirectoryGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    parentGroupId: data.parentGroupId,
    groupName: data.name,
    groupId: data.groupId,
    description: '',
  };

  try {
    return await axiosRequest.put(`/alarm/group`, params);
  } catch (error) {
    return error;
  }
};

// 删除数据词典组
export const deleteDataDirectoryGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupIds: data.groupIds,
  };

  try {
    return await axiosRequest.delete(`/alarm/group`, params);
  } catch (error) {
    return error;
  }
};

// 获取数据词典
export const getDataDirectoryServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupId: alarmMenuStore.currentAlarmRow.id,
  };
  try {
    return await axiosRequest.get(`/alarm/tags`, params);
  } catch (error) {
    return error;
  }
};

// 删除数据词典
export const deleteDataDirectoryServer = async (tags) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    tags,
  };
  try {
    return await axiosRequest.delete(`/alarm/tags`, params);
  } catch (error) {
    return error;
  }
};

// 导出报警变量
export const exportDirectoryServer = async (tagIds) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    projectId: alarmMenuStore.currentAlarmEngineer.guid,
    tagIds,
  };
  try {
    return await axiosRequest.post(`/alarm/exportTags`, params);
  } catch (error) {
    return error;
  }
};
// 导入报警变量
export const importDirectoryServer = async (file) => {
  try {
    const alarmMenuStore = useAlarmMenuStore();
    const formData = new FormData();
    formData.append('projectId', alarmMenuStore.currentAlarmEngineer.guid);
    formData.append('groupId', alarmMenuStore.currentAlarmRow.id);
    formData.append('tagFile', file.raw);
    return await axiosRequest.post(`/alarm/importTags`, formData, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 编辑数据词典
export const editDataDirectoryServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    ...data,
  };
  try {
    return await axiosRequest.post(`/alarm/alarmConfig`, params);
  } catch (error) {
    return error;
  }
};

// 编辑数据词典
export const getSystemConfigServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
  };
  try {
    return await axiosRequest.get(`/alarm/systemConfig`, params);
  } catch (error) {
    return error;
  }
};

// 编辑数据词典
export const editSystemConfigServer = async (config) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    config,
  };
  try {
    return await axiosRequest.post(`/alarm/systemConfig`, params);
  } catch (error) {
    return error;
  }
};
// 快速添加数据词典
export const createDataDirectoryServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupId: alarmMenuStore.currentAlarmRow.id,
    dataSourceId: data[0].dataSourceItem.dataSourceId,
    tags: data.map((row) => {
      return {
        n: row.name,
        t: row.tagType,
        d: row.comment,
      };
    }),
  };
  try {
    return await axiosRequest.post(`/alarm/tags`, params);
  } catch (error) {
    return error;
  }
};

// 获取报警数据源
export const getDataSourceServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
  };

  try {
    return await axiosRequest.get(`/alarm/dataSource`, params);
  } catch (error) {
    return error;
  }
};

// 创建报警数据源
export const createDataSourceServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid, //报警工程ID
    dmInfo: {
      name: data.name, // 报警数据源名称
      dm_guid: data.dm_guid, // 数据源工程id
      dm_name: data.dm_name, //数据源工程名称
      dm_type: data.dm_type, // 数据源类型
      description: data.description,
    },
  };

  try {
    return await axiosRequest.post(`/alarm/dataSource`, params);
  } catch (error) {
    return error;
  }
};
// 编辑报警数据源
export const editDataSourceServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid, //报警工程ID
    dmInfo: {
      name: data.name, // 报警数据源名称
      id: data.id, // 报警数据源名称
      dm_guid: data.dm_guid, // 数据源工程id
      dm_name: data.dm_name, //数据源工程名称
      dm_type: data.dm_type, // 数据源类型
      description: data.description,
    },
  };

  try {
    return await axiosRequest.put(`/alarm/dataSource`, params);
  } catch (error) {
    return error;
  }
};

// 删除报警数据源
export const deleteDataSourceServer = async (dmInfoIds) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid, //报警工程ID
    dmInfoIds,
  };

  try {
    return await axiosRequest.delete(`/alarm/dataSource`, params);
  } catch (error) {
    return error;
  }
};

// 获取自定义报警组
export const getCustomGroupServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
  };

  try {
    return await axiosRequest.get(`/alarm/customGroup`, params);
  } catch (error) {
    return error;
  }
};

// 创建自定义报警组
export const createCustomGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    parentGroupId: data.parentGroupId,
    groupName: data.name,
  };

  try {
    return await axiosRequest.post(`/alarm/customGroup`, params);
  } catch (error) {
    return error;
  }
};

// 编辑自定义报警组
export const editCustomGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    parentGroupId: data.parentGroupId,
    groupName: data.name,
    groupId: data.id,
  };

  try {
    return await axiosRequest.put(`/alarm/customGroup`, params);
  } catch (error) {
    return error;
  }
};

// 删除自定义报警组
export const deleteCustomGroupServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupIds: data.groupIds,
  };

  try {
    return await axiosRequest.delete(`/alarm/customGroup`, params);
  } catch (error) {
    return error;
  }
};
// 分组下新建自定义报警规则
export const createCustomConfigServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupId: alarmMenuStore.currentAlarmRow.id,
    config: data.config,
  };

  try {
    return await axiosRequest.post(`/alarm/customConfig`, params);
  } catch (error) {
    return error;
  }
};

// 根据组id获取自定义报警项
export const getCustomConfigServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupId: alarmMenuStore.currentAlarmRow.id,
  };

  try {
    return await axiosRequest.get(`/alarm/customConfig`, params);
  } catch (error) {
    return error;
  }
};

// 编辑自定义报警项
export const editCustomConfigServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    groupId: alarmMenuStore.currentAlarmRow.id,
    alarmItemId: data.alarmItemId,
    config: data.config,
  };

  try {
    return await axiosRequest.put(`/alarm/customConfig`, params);
  } catch (error) {
    return error;
  }
};

// 删除自定义报警项
export const deleteCustomConfigServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    alarmItemIds: data.alarmItemIds,
  };

  try {
    return await axiosRequest.delete(`/alarm/customConfig`, params);
  } catch (error) {
    return error;
  }
};
// 报警规则脚本编辑
export const editCustomScriptServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    alarmItemId: data.alarmItemId,
    script: data.script,
  };

  try {
    return await axiosRequest.post(`/alarm/customScript`, params);
  } catch (error) {
    return error;
  }
};
// 报警规则脚本查询
export const getCustomScriptServer = async (data) => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
    alarmItemId: data.alarmItemId,
  };

  try {
    return await axiosRequest.get(`/alarm/customScript`, params);
  } catch (error) {
    return error;
  }
};
// 报警规则脚本查询
export const getAllTagsServer = async () => {
  const alarmMenuStore = useAlarmMenuStore();
  const params = {
    guid: alarmMenuStore.currentAlarmEngineer.guid,
  };

  try {
    return await axiosRequest.get(`/alarm/allTags`, params);
  } catch (error) {
    return error;
  }
};
