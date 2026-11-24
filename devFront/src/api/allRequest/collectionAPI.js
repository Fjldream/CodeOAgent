import { axiosRequest } from '@/api/request.js';
import { useCollectionMenuStore } from '@/stores/collectionMenuStore.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';

// 获取采集工程
export const getCollectionProjectServer = async () => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/project`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建采集工程
export const createCollectionProjectServer = async (data) => {
  const mainLeftMenusStore = useMainLeftMenusStore();
  const params = {
    name: data.name,
    description: data.description,
    projectGroupId: mainLeftMenusStore.leftRowSelect.guid,
    osType: data.osType,
  };
  try {
    return await axiosRequest.post(`/collect/project`, params);
  } catch (error) {
    return error;
  }
};

// 编辑采集工程
export const editCollectionProjectServer = async (data) => {
  const params = {
    name: data.name,
    description: data.description,
    guid: data.guid,
  };
  try {
    return await axiosRequest.put(`/collect/project`, params);
  } catch (error) {
    return error;
  }
};

// 删除采集工程
export const deleteCollectionProjectServer = async (data) => {
  const params = {
    projectId: data.projectId,
  };
  try {
    return await axiosRequest.delete(`/collect/project`, params);
  } catch (error) {
    return error;
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
    const { errorCode } = await axiosRequest.post(`/collect/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/collect/share`, params);
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
    const { errorCode } = await axiosRequest.delete(`/collect/share/all`, params);
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
  return await axiosRequest.post(`/collect/importProjects`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
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
  return await axiosRequest.post(`/collect/exportProject`, params, { timeout: 3 * 60 * 1000 });
};

// 获取设备变量组
export const getDeviceGroupServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    groupType: row.groupType,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/getGroupList`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建设备组
export const createDeviceGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupName: data.groupName,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    groupId: data.groupId,
  };
  try {
    return await axiosRequest.post(`/collect/createDeviceGroup`, params);
  } catch (error) {
    return error;
  }
};

// 编辑设备组
export const editDeviceGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupName: data.groupName,
    groupId: data.groupId,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    return await axiosRequest.put(`/collect/editDeviceGroup`, params);
  } catch (error) {
    return error;
  }
};

// 删除设备组
export const deleteDeviceGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupId: data.groupId,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    return await axiosRequest.delete(`/collect/delDeviceGroup`, params);
  } catch (error) {
    return error;
  }
};

// 获取设备下拉框参数
export const getDevicesPropertyServer = async () => {
  try {
    const { data } = await axiosRequest.get(`/collect/getDevicesProperty`);
    return data;
  } catch (error) {
    return error;
  }
};

// 获取驱动列表
export const getDriverListServer = async () => {
  try {
    const collectionMenuStore = useCollectionMenuStore();
    const params = {
      sysPlatform: collectionMenuStore.currentCollectionEngineer.sysPlatform || '',
      osType: collectionMenuStore.currentCollectionEngineer.osType || '',
    };
    const { data } = await axiosRequest.get(`/collect/getDriverList`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 获取设备列表
export const getDeviceServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/devices`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建设备
export const createDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: data.deviceName, //设备名称
    description: data.description, //描述
    OsType: data.OsType,
    active: data.active, //是否激活
    timeout: data.timeout, //超时
    deviceCollectTime: data.deviceCollectTime, // 采集频率
    reconnectInterval: data.reconnectInterval * 1000, // 重连间隔ms = 重连间隔s * 1000
    maxReconncetInterval: data.maxReconncetInterval * 1000 * 60 * 60, // 最大重连时间ms = 最大重连时间h * 1000 * 60 * 60
    devAddress: data.devAddress, // 设备地址
    driverName: data.driverName, // 驱动名称
    linkType: data.linkType, // 链路类别
    serialName: data.serialName, // 串口名称
    serialBaudRate: data.serialBaudRate, //波特率
    serialParity: data.serialParity, // 校验位
    serialDataBits: data.serialDataBits, // 数据位
    serialStopBits: data.serialStopBits, // 停止位
    frequencyControlMode: 0, // 变频模式
    frequencySwitchCondition: [], //  变频条件
    deviceGroup:
      collectionMenuStore.currentCollectionRow.id === 'deviceRoot'
        ? '设备'
        : collectionMenuStore.currentCollectionRow.name, // 设备组
    devNumber: 0, // 顺序号
    deviceProvider: data.deviceProvider, // 设备厂商
    systemPlatform: data.systemPlatform, //CPU架构
    company: data.company, // 网关厂商
    driverSeries: data.driverSeries, // 设备系列
    clsid: data.clsid, // 驱动ID
    redundancyStyle: 0, // 冗余类型
    redunDeviceName: '', // 冗余设备
    driverVersion: data.driverVersion, // 驱动版本
  };
  try {
    return await axiosRequest.post(`/collect/devices`, params);
  } catch (error) {
    return error;
  }
};

// 编辑设备
export const editDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: data.deviceName, //设备名称
    description: data.description, //描述
    deviceId: data.deviceId,
    OsType: data.OsType,
    active: data.active, //是否激活
    timeout: data.timeout, //超时
    deviceCollectTime: data.deviceCollectTime, // 采集频率
    reconnectInterval: data.reconnectInterval * 1000, // 重连间隔ms = 重连间隔s * 1000
    maxReconncetInterval: data.maxReconncetInterval * 1000 * 60 * 60, // 最大重连时间ms = 最大重连时间h * 1000 * 60 * 60
    devAddress: data.devAddress, // 设备地址
    driverName: data.driverName, // 驱动名称
    linkType: data.linkType, // 链路类别
    serialName: data.serialName, // 串口名称
    serialBaudRate: data.serialBaudRate, //波特率
    serialParity: data.serialParity, // 校验位
    serialDataBits: data.serialDataBits, // 数据位
    serialStopBits: data.serialStopBits, // 停止位
    frequencyControlMode: 0, // 变频模式
    frequencySwitchCondition: [], //  变频条件
    deviceGroup: data.deviceGroup, // 设备组
    devNumber: 0, // 顺序号
    deviceProvider: data.deviceProvider, // 设备厂商
    systemPlatform: data.systemPlatform, //CPU架构
    company: data.company, // 网关厂商
    driverSeries: data.driverSeries, // 设备系列
    clsid: data.clsid, // 驱动ID
    redundancyStyle: 0, // 冗余类型
    redunDeviceName: '', // 冗余设备
    driverVersion: data.driverVersion, // 驱动版本
  };
  try {
    return await axiosRequest.put(`/collect/devices`, params);
  } catch (error) {
    return error;
  }
};

// 删除设备前校验变量接口，双重确认
export const deleteDeviceValidateServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceIds: JSON.stringify(data.deviceIds),
  };
  try {
    return await axiosRequest.get(`/collect/delDeviceValidate`, params);
  } catch (error) {
    return error;
  }
};

// 删除设备
export const deleteDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceIds: data.deviceIds,
    deviceGroupId: collectionMenuStore.currentCollectionRow.actualId || '-1', // 设备组
  };
  try {
    return await axiosRequest.delete(`/collect/devices`, params);
  } catch (error) {
    return error;
  }
};

// 移动设备到组
export const moveDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceIds: data.deviceIds,
    targetDeviceGroupId: data.targetDeviceGroupId, // 设备组
  };
  try {
    return await axiosRequest.post(`/collect/moveDevice`, params);
  } catch (error) {
    return error;
  }
};

// 创建变量组
export const createVarGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupName: data.groupName,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    groupId: data.groupId,
  };
  try {
    return await axiosRequest.post(`/collect/createVarGroup`, params);
  } catch (error) {
    return error;
  }
};

// 编辑变量组
export const editVarGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupName: data.groupName,
    groupId: data.groupId,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    return await axiosRequest.put(`/collect/editVarGroup`, params);
  } catch (error) {
    return error;
  }
};

// 删除变量组
export const delVarGroupServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    groupId: data.groupId,
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    return await axiosRequest.delete(`/collect/deleteVarGroup`, params);
  } catch (error) {
    return error;
  }
};

// 获取变量列表
export const getVariableServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    groupId: collectionMenuStore.currentCollectionRow.actualId || '-1',
  };
  try {
    const { data } = await axiosRequest.get(`/collect/variables`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建变量
export const createVariableServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    tagName: data.tagName, // 名称
    description: data.description, // 描述
    tagGroupId: collectionMenuStore.currentCollectionRow.actualId || '-1', // 所属变量组ID
    deviceName: data.deviceName, // 关联设备
    regName: data.regName, // 寄存器名称
    regAddress: data.regAddress, // 寄存器地址
    accessType: data.accessType, // 读写类型
    regDataType: data.regDataType, // 寄存器数据类型
    tagDataType: data.tagDataType, // 转换数据类型
    collectTimeInterval: data.collectTimeInterval, // 采集频率（ms）
    storEnable: data.storEnable, // 存储使能
    storMode: data.storMode, // 存储模式
    storCycle: data.storCycle, // 存储周期（ms）
    spaceTimeName: '', // 时空名称
    spaceTimeTagName: '', // 时空变量名
    dataConvertType: data.dataConvertType, // 转换模式
    maxRawValue: data.maxRawValue, //原始最大值
    minRawValue: data.minRawValue, // 原始最小值
    maxValue: data.maxValue, // 工程最大值
    minValue: data.minValue, // 工程最小值
    nonLinearName: '', // 非线性表
    dataConvertCoefficient: data.dataConvertCoefficient, // 系数
    dataConvertDeviation: data.dataConvertDeviation, // 偏移
    dataCleaningType: 0, // 清洗模式
    valueRangeType: 0, // 值范围
    dataCleaningUpperLimit: 0, // 清晰最大值
    dataCleaningLowerLimit: 0, // 清洗最小值
    changeRate: 0, // 毛刺边界(%)
    deadbandRate: 0, //死区（%）
    tagType: 2,
    deviceId: data.deviceId, // 设备id
    channelDriver: data.channelDriver,
    deviceSeries: data.deviceSeries,
    stepSize: 1, // 寄存器步长
    nameStepSize: 1, // 名称步长
    number: 1, // 个数
    uaTrans: 0, //0 不转发 1 转发 OPCUA转发
    daTrans: 0, // OPCDA转发
    mqTrans: data.mqTrans, // MQTT转发
    mqInter: data.mqInter, //mqtt 间隔转发（秒）
  };
  try {
    return await axiosRequest.post(`/collect/variables`, params);
  } catch (error) {
    return error;
  }
};

// 编辑变量
export const editVariableServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    tagId: data.tagId,
    tagName: data.tagName, // 名称
    description: data.description, // 描述
    tagGroupId: data.tagGroup, // 所属变量组ID
    deviceName: data.deviceName, // 关联设备
    regName: data.regName, // 寄存器名称
    regAddress: data.regAddress, // 寄存器地址
    accessType: data.accessType, // 读写类型
    regDataType: data.regDataType, // 寄存器数据类型
    tagDataType: data.tagDataType, // 转换数据类型
    collectTimeInterval: data.collectTimeInterval, // 采集频率（ms）
    storEnable: data.storEnable, // 存储使能
    storMode: data.storMode, // 存储模式
    storCycle: data.storCycle, // 存储周期（ms）
    spaceTimeName: '', // 时空名称
    spaceTimeTagName: '', // 时空变量名
    dataConvertType: data.dataConvertType, // 转换模式
    maxRawValue: data.maxRawValue, //原始最大值
    minRawValue: data.minRawValue, // 原始最小值
    maxValue: data.maxValue, // 工程最大值
    minValue: data.minValue, // 工程最小值
    nonLinearName: '', // 非线性表
    dataConvertCoefficient: data.dataConvertCoefficient, // 系数
    dataConvertDeviation: data.dataConvertDeviation, // 偏移
    dataCleaningType: 0, // 清洗模式
    valueRangeType: 0, // 值范围
    dataCleaningUpperLimit: 0, // 清晰最大值
    dataCleaningLowerLimit: 0, // 清洗最小值
    changeRate: 0, // 毛刺边界(%)
    deadbandRate: 0, //死区（%）
    tagType: 2,
    deviceId: data.deviceId, // 设备id
    channelDriver: data.channelDriver,
    deviceSeries: data.deviceSeries,
    stepSize: 1, // 寄存器步长
    nameStepSize: 1, // 名称步长
    number: 1, // 个数
    uaTrans: 0, //0 不转发 1 转发 OPCUA转发
    daTrans: 0, // OPCDA转发
    mqTrans: data.mqTrans, // MQTT转发
    mqInter: data.mqInter, //mqtt 间隔转发（秒）
  };
  try {
    return await axiosRequest.put(`/collect/variables`, params);
  } catch (error) {
    return error;
  }
};

// 删除变量
export const deleteVariableServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    tagIds: data.tagIds,
  };
  try {
    return await axiosRequest.delete(`/collect/variables`, params);
  } catch (error) {
    return error;
  }
};

// 移动变量到组
export const moveVariableServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    varIds: data.varIds,
    targetVarGroupId: data.targetVarGroupId, // 设备组
  };
  try {
    return await axiosRequest.post(`/collect/moveVarToGroup`, params);
  } catch (error) {
    return error;
  }
};

// 获取寄存器列表
export const getRegistersServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: row.deviceName,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/registers`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 获取寄存器类型
export const getRegisterdatatypesServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: row.deviceName,
    regName: row.regName,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/registerdatatypes`, params);
    return data;
  } catch (error) {
    return error;
  }
};
// 获取变量基础属性数据
export const getVariableAttributeServer = async () => {
  try {
    const { data } = await axiosRequest.get(`/collect/getVarsProperty`, {});
    return data;
  } catch (error) {
    return error;
  }
};

// 获取网络配置
export const getNetWorkPropertyServer = async () => {
  try {
    const collectionMenuStore = useCollectionMenuStore();
    const params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
    };
    const { data } = await axiosRequest.get(`/collect/getNetWorkProperty`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 修改网络配置
export const modifyNetworkConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    data: {
      AutoEnable: data.AutoEnable,
      TransMode: data.TransMode,
      TransInterval: data.TransInterval,
      HistoryDataMode: data.HistoryDataMode,
      HistoryDataCacheNumber: data.HistoryDataCacheNumber,
      HistoryDataCacheTime: data.HistoryDataCacheTime,
      FileCacheMode: data.FileCacheMode,
      CacheFileSize: data.CacheFileSize,
      CacheFilePeriod: data.CacheFilePeriod,
      Active: data.Active,
      Mode: data.Mode,
      MasterOrSlave: data.MasterOrSlave,
      HostNameMaster1: data.HostNameMaster1,
      HostPortMaster1: data.HostPortMaster1,
      HeartInterval: data.HeartInterval,
      MaxErrorTimes: data.MaxErrorTimes,
      uncontained: data.uncontained,
      exposedPorts: data.exposedPorts,
    },
  };
  try {
    return await axiosRequest.post(`/collect/modifyNetworkConfig`, params);
  } catch (error) {
    return error;
  }
};

// 获取存储配置
export const getStorageListServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/getStorageList`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建存储配置
export const addStorageConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  let params;
  if (data.dbType === 6) {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      DataSourceName: data.DataSourceName,
      DeploymentMode: data.DeploymentMode,
      Description: data.Description,
      HostName: data.HostName,
      Port: data.Port,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      TimeOut: data.TimeOut,
    };
  } else if (data.dbType === 3) {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      DBName: data.DBName,
      DeploymentMode: data.DeploymentMode,
      Description: data.Description,
      HostName: data.HostName,
      Port: data.Port,
      UserName: data.UserName,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      Cache: data.Cache,
      CachePath: data.CachePath,
      CacheFileSize: data.CacheFileSize,
      TimeOut: data.TimeOutS,
      ReConnectInterval: data.ReConnectInterval,
      PartTimeInterval: data.PartTimeInterval,
      OneTableName: data.OneTableName,
      CreateSuperTableMode: 0,
      Model: data.Model,
    };
  } else {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      Description: data.Description,
      DBName: data.DBName,
      DataSourceName: data.DataSourceName,
      DeploymentMode: data.DeploymentMode,
      Model: data.Model,
      HostName: data.HostName,
      Port: data.Port,
      UserName: data.UserName,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      Cache: data.Cache,
      CachePath: data.CachePath,
      CacheFileSize: data.CacheFileSize,
      TimeOut: data.TimeOut,
      DockerHostName: '',
      TableStructrue: [],
      TableNames: [],
      TagGroupActive: '0',
      TagGroup: [],
      tabName: [],
      tabStrc: [],
      tagGroup: [],
    };
  }
  if (data.dbType === 11) {
    params.HisTDengineProjectName = data.HisTDengineProjectName;
    params.GroupNameEnable = data.GroupNameEnable;
    params.DataTypeEnable = data.DataTypeEnable;
    params.DataVersionEnable = data.DataVersionEnable;
  }
  if (data.dbType === 12) {
    params.ConnectInterval = data.ReConnectInterval;
  }
  try {
    return await axiosRequest.post(`/collect/addStorageConfig`, params);
  } catch (error) {
    return error;
  }
};

// 编辑存储配置
export const editStorageConfigByIdServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  let params;
  if (data.dbType === 6) {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      DataSourceName: data.DataSourceName,
      DeploymentMode: data.DeploymentMode,
      Description: data.Description,
      HostName: data.HostName,
      Port: data.Port,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      TimeOut: data.TimeOut,
      storageId: String(data.id),
    };
  } else if (data.dbType === 3) {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      DBName: data.DBName,
      DeploymentMode: data.DeploymentMode,
      Description: data.Description,
      HostName: data.HostName,
      Port: data.Port,
      UserName: data.UserName,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      Cache: data.Cache,
      CachePath: data.CachePath,
      CacheFileSize: data.CacheFileSize,
      TimeOut: data.TimeOutS,
      ReConnectInterval: data.ReConnectInterval,
      PartTimeInterval: data.PartTimeInterval,
      OneTableName: data.OneTableName,
      storageId: String(data.id),
      CreateSuperTableMode: 0,
      Model: data.Model,
    };
  } else {
    params = {
      projectId: collectionMenuStore.currentCollectionEngineer.guid,
      dbType: data.dbType,
      Active: data.Active,
      Description: data.Description,
      DBName: data.DBName,
      DataSourceName: data.DataSourceName,
      DeploymentMode: data.DeploymentMode,
      Model: data.Model,
      HostName: data.HostName,
      Port: data.Port,
      UserName: data.UserName,
      Password: data.Password,
      StorageInterval: data.StorageInterval,
      Cache: data.Cache,
      CachePath: data.CachePath,
      CacheFileSize: data.CacheFileSize,
      TimeOut: data.TimeOut,
      storageId: String(data.id),
      DockerHostName: '',
      TableStructrue: [],
      TableNames: [],
      TagGroupActive: '0',
      TagGroup: [],
      tabName: [],
      tabStrc: [],
      tagGroup: [],
    };
  }
  if (data.dbType === 11) {
    params.HisTDengineProjectName = data.HisTDengineProjectName;
    params.GroupNameEnable = data.GroupNameEnable;
    params.DataTypeEnable = data.DataTypeEnable;
    params.DataVersionEnable = data.DataVersionEnable;
  }
  if (data.dbType === 12) {
    params.ConnectInterval = data.ReConnectInterval;
  }
  try {
    return await axiosRequest.put(`/collect/editStorageConfigById`, params);
  } catch (error) {
    return error;
  }
};

// 删除存储配置
export const delStorageConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    storageIds: data.storageIds,
  };
  try {
    return await axiosRequest.delete(`/collect/delStorageConfig`, params);
  } catch (error) {
    return error;
  }
};

// 查询所有转发配置
export const getTransDBConfigServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/getTransDBConfig`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建转发配置
export const addTransConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    transType: data.transType,
    Provider: data.Provider, // 提供商
    ConnectMode: data.ConnectMode, // 连接模式 0 匿名无加密|1 匿名加密|2 非匿名无加密|3 非匿名加密
    BrokerAddr: data.BrokerAddr, // 转发地址
    KeepAlive: data.KeepAlive, // 心跳间隔(s)
    ReConnect: data.ReConnect, // 重连间隔(s)
    Qos: data.Qos, // 服务质量
    Username: data.Username,
    PassWord: data.PassWord,
    UsernameOfW: data.UsernameOfW, // 数据下设用户名
    PassWordOfW: data.PassWordOfW, // 数据下设密码
    CustomTopicEnable: data.CustomTopicEnable,
    YaKongTopicEnable: data.YaKongTopicEnable,
    SubscirbeCustomTopic: data.SubscirbeCustomTopic,
    PUBScanPeriod: data?.PUBScanPeriod || 1000, // 周期发布间隔(ms)
    MaxDataLeno: 65535, // 数据帧最大字节数(byte)
    WriteTimeGap: 1, // 数据下设最大接受时间偏差(s)
    BackupBrokerAddr: '', // 新增字段，支持双mqtt转发
    PUBEnable: data.PUBEnable, // 发布使能
  };

  try {
    return await axiosRequest.post(`/collect/addTransConfig`, params);
  } catch (error) {
    return error;
  }
};

// 编辑转发配置
export const editTransConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    transType: data.transType,
    Provider: data.Provider, // 提供商
    ConnectMode: data.ConnectMode, // 连接模式 0 匿名无加密|1 匿名加密|2 非匿名无加密|3 非匿名加密
    BrokerAddr: data.BrokerAddr, // 转发地址
    KeepAlive: data.KeepAlive, // 心跳间隔(s)
    ReConnect: data.ReConnect, // 重连间隔(s)
    Qos: data.Qos, // 服务质量
    Username: data.Username,
    PassWord: data.PassWord,
    UsernameOfW: data.UsernameOfW, // 数据下设用户名
    PassWordOfW: data.PassWordOfW, // 数据下设密码
    CustomTopicEnable: data.CustomTopicEnable,
    YaKongTopicEnable: data.YaKongTopicEnable,
    SubscirbeCustomTopic: data.SubscirbeCustomTopic,
    PUBScanPeriod: data?.PUBScanPeriod || 1000, // 周期发布间隔(ms)
    MaxDataLeno: 65535, // 数据帧最大字节数(byte)
    WriteTimeGap: 1, // 数据下设最大接受时间偏差(s)
    BackupBrokerAddr: '', // 新增字段，支持双mqtt转发
    PUBEnable: data.PUBEnable, // 发布使能
    storageId: data.ID,
  };

  try {
    return await axiosRequest.put(`/collect/editTransConfig`, params);
  } catch (error) {
    return error;
  }
};

// 删除转发配置
export const deleteTransConfigServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    storageIds: data.storageIds,
  };
  try {
    return await axiosRequest.delete(`/collect/deleteTransConfig`, params);
  } catch (error) {
    return error;
  }
};

// 查询OPCUA设备列表
export const uaDevicesServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/uaDevices`, params);
    return data;
  } catch (error) {
    return error;
  }
};

// 创建OPCUA设备
export const uaAddDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    opcServerName: data.opcServerName,
    url: data.url,
    username: data.username,
    password: data.password,
    recoverTime: data.recoverTime * 1000 * 60 * 60,
    reconnectTime: data.reconnectTime * 1000,
    publishInterval: data.publishInterval, // 发布间隔
    collectInterval: data.collectInterval,
    triggerType: data.triggerType, // 0|1|2 Satus|Status/Value|Status/Value/Timestamp
    lifetimeCount: data.lifetimeCount, // 生命周期计数
    maxKeepAliveCount: data.maxKeepAliveCount, // 最大保持活跃数
    maxNotificationsPerPublish: data.maxNotificationsPerPublish, //每次发布的最大数
    publishingEnabled: data.publishingEnabled, // 发布使能
    publishPriority: data.publishPriority, // 订阅优先级
    securityModeType: data.securityModeType, //
    messageSecurityModeType: data.messageSecurityModeType,
    authenticationType: data.authenticationType,
    sessionTimeOut: data.sessionTimeOut, // 会话超时时间
    browseMaxNum: data.browseMaxNum, // OPCUA 中用作每次浏览的最大数目
    addTagtoSubNum: data.addTagtoSubNum, // OPCUA 中用作每次添加到订阅的变量数
    regMaxNum: data.regMaxNum, // OPCUA 中用作每次读请求最大数目
    deadType: data.deadType,
    deadValue: data.deadValue,
  };

  try {
    return await axiosRequest.post(`/collect/uaAddDevice`, params);
  } catch (error) {
    return error;
  }
};

// 编辑OPCUA设备
export const uaEditDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceID: data.deviceID,
    opcServerName: data.opcServerName,
    url: data.url,
    username: data.username,
    password: data.password,
    recoverTime: data.recoverTime * 1000 * 60 * 60,
    reconnectTime: data.reconnectTime * 1000,
    publishInterval: data.publishInterval, // 发布间隔
    collectInterval: data.collectInterval,
    triggerType: data.triggerType, // 0|1|2 Satus|Status/Value|Status/Value/Timestamp
    lifetimeCount: data.lifetimeCount, // 生命周期计数
    maxKeepAliveCount: data.maxKeepAliveCount, // 最大保持活跃数
    maxNotificationsPerPublish: data.maxNotificationsPerPublish, //每次发布的最大数
    publishingEnabled: data.publishingEnabled, // 发布使能
    publishPriority: data.publishPriority, // 订阅优先级
    securityModeType: data.securityModeType, //
    messageSecurityModeType: data.messageSecurityModeType,
    authenticationType: data.authenticationType,
    sessionTimeOut: data.sessionTimeOut, // 会话超时时间
    browseMaxNum: data.browseMaxNum, // OPCUA 中用作每次浏览的最大数目
    addTagtoSubNum: data.addTagtoSubNum, // OPCUA 中用作每次添加到订阅的变量数
    regMaxNum: data.regMaxNum, // OPCUA 中用作每次读请求最大数目
    deadType: data.deadType,
    deadValue: data.deadValue,
  };

  try {
    return await axiosRequest.put(`/collect/uaEditDevice`, params);
  } catch (error) {
    return error;
  }
};

// 删除OPCUA设备
export const uaDelDevicesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceIds: data.deviceIds,
  };
  try {
    return await axiosRequest.delete(`/collect/uaDelDevices`, params);
  } catch (error) {
    return error;
  }
};
// OPCUA测试连接
export const uaConenctTestServer = async (data) => {
  const params = {
    opcServerName: data.opcServerName,
    url: data.url,
    username: data.username,
    password: data.password,
  };
  try {
    return await axiosRequest.post(`/collect/uaConenctTest`, params);
  } catch (error) {
    return error;
  }
};
// 查询OPCUA设备变量列表
export const getUaVarsListServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: row.deviceID,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/getUaVarsList`, params);
    return data;
  } catch (error) {
    return error;
  }
};
// 添加OPCUA变量
export const uaAddVariablesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: data.deviceID.toString(),
    deviceName: data.opcServerName,
    addData: data.addData,
  };
  try {
    return await axiosRequest.post(`/collect/uaAddVariables`, params);
  } catch (error) {
    return error;
  }
};
// 编辑OPCUA变量
export const uaEditVariablesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: data.deviceID.toString(),
    deviceName: data.deviceName,
    editData: data.editData,
  };
  try {
    return await axiosRequest.put(`/collect/uaEditVariables`, params);
  } catch (error) {
    return error;
  }
};
// 删除OPCUA设备
export const uaDelVarsServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: data.opcServerName,
    vars: data.vars,
  };
  try {
    return await axiosRequest.delete(`/collect/uaDelVars`, params);
  } catch (error) {
    return error;
  }
};

/**
 * 导入ua变量
 *
 * @returns
 * @param formData
 */
export const uaImportVarsServer = async (formData) => {
  return await axiosRequest.post(`/collect/uaImportVars`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
  });
};
// 导出ua变量
export const exportUaVarsServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: data.opcServerName,
    systemType: '0',
    allExportFlag: 0,
    fileType: 'csv',
    uaDevs: data.uaDevs,
  };
  try {
    return await axiosRequest.post(`/collect/exportUaVars`, params);
  } catch (error) {
    return error;
  }
};

// OPCUA节点查询
export const uaRootSourcesServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: row.deviceID.toString(),
    deviceName: row.opcServerName,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/uaRootSources`, params, { timeout: 60 * 1000 });
    return data;
  } catch (error) {
    return error;
  }
};

// 查询OPCDA连接列表
export const getDaServer = async () => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/daServer`, params);
    return data;
  } catch (error) {
    return error;
  }
};
// 创建OPCDA连接
export const addDaServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    name: data.name, //别名
    progID: data.progID, //prog ID
    ip: data.ip, // 远程服务器IP
    clsID: data.clsID,
    maxReconnectNum: data.maxReconnectNum, // 最大重连册数
    heartInterval: data.heartInterval, //心跳周期
    redundancyStyle: data.redundancyStyle,
    redunDeviceName: data.redunDeviceName,
  };

  try {
    return await axiosRequest.post(`/collect/daServer`, params);
  } catch (error) {
    return error;
  }
};

// 删除OPCDA连接
export const delDaServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    idArr: data.idArr,
  };
  try {
    return await axiosRequest.delete(`/collect/daServer`, params);
  } catch (error) {
    return error;
  }
};

// 编辑OPCDA
export const editDaServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    id: data.id,
    name: data.name, //别名
    progID: data.progID, //prog ID
    ip: data.ip, // 远程服务器IP
    clsID: data.clsID,
    maxReconnectNum: data.maxReconnectNum, // 最大重连册数
    heartInterval: data.heartInterval, //心跳周期
    redundancyStyle: data.redundancyStyle,
    redunDeviceName: data.redunDeviceName,
  };

  try {
    return await axiosRequest.put(`/collect/daServer`, params);
  } catch (error) {
    return error;
  }
};
// OPCDA测试连接
export const daConenctTestServer = async (data) => {
  const params = {
    ip: data.ip,
    progId: data.progID,
  };
  try {
    return await axiosRequest.get(`/collect/daTestConnect`, params);
  } catch (error) {
    return error;
  }
};
// 查询OPCDA设备列表
export const getDaDeviceServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    connectName: row.connectName,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/daDevice`, params);
    return data;
  } catch (error) {
    return error;
  }
};
// 创建OPCDA设备
export const addDaDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceName: data.deviceName, //设备名称
    description: data.description, //描述
    isOptimize: data.isOptimize,
    active: data.active,
    subMethod: data.subMethod, // 用作标记订阅0、轮询方式1
    perDeadZone: data.perDeadZone, // 百分比死区
    updateFrequency: data.updateFrequency, // 更新频率
    timeout: data.timeout, // 异步请求超时时间
    languageID: data.languageID, // 语言ID
    reconnectInterval: data.reconnectInterval * 1000, // 重连间隔ms = 重连间隔s * 1000
    maxReconncetInterval: data.maxReconncetInterval * 1000 * 60 * 60, // 最大重连时间ms = 最大重连时间h * 1000 * 60 * 60
    readMaximum: data.readMaximum, //单词读请求最大Item数
    writeMaximum: data.writeMaximum, // 单词写请求最大Item数
    connectName: data.connectName, //连接名称
  };

  try {
    return await axiosRequest.post(`/collect/daDevice`, params);
  } catch (error) {
    return error;
  }
};

// 删除OPCDA设备
export const delDaDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    idArr: data.idArr,
  };
  try {
    return await axiosRequest.delete(`/collect/daDevice`, params);
  } catch (error) {
    return error;
  }
};

// 编辑OPCDA设备
export const editDaDeviceServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    id: data.id,
    deviceName: data.deviceName, //设备名称
    description: data.description, //描述
    isOptimize: data.isOptimize,
    active: data.active,
    subMethod: data.subMethod, // 用作标记订阅0、轮询方式1
    perDeadZone: data.perDeadZone, // 百分比死区
    updateFrequency: data.updateFrequency, // 更新频率
    timeout: data.timeout, // 异步请求超时时间
    languageID: data.languageID, // 语言ID
    reconnectInterval: data.reconnectInterval * 1000, // 重连间隔ms = 重连间隔s * 1000
    maxReconncetInterval: data.maxReconncetInterval * 1000 * 60 * 60, // 最大重连时间ms = 最大重连时间h * 1000 * 60 * 60
    readMaximum: data.readMaximum, //单词读请求最大Item数
    writeMaximum: data.writeMaximum, // 单词写请求最大Item数
    connectName: data.connectName, //连接名称
  };

  try {
    return await axiosRequest.put(`/collect/daDevice`, params);
  } catch (error) {
    return error;
  }
};

// 查询OPCDA设备变量列表
export const getDaVariablesServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: row.id,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/daVariables`, params);
    return data;
  } catch (error) {
    return error;
  }
};
// 添加OPCDA变量
export const addDaVariablesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    deviceId: data.id,
    data: data.addData,
  };
  try {
    return await axiosRequest.post(`/collect/daVariables`, params);
  } catch (error) {
    return error;
  }
};
// 编辑OPCDA变量
export const editDaVariablesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const projectId = collectionMenuStore.currentCollectionEngineer.guid;
  const { deviceId } = data;
  const editData = {
    ...data.editData,
    projectId,
  };
  try {
    return await axiosRequest.put(`/collect/daVariables?projectId=${projectId}&deviceId=${deviceId}`, editData);
  } catch (error) {
    return error;
  }
};
// 删除OPCDA设备
export const delDaVariablesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    idArr: data.idArr,
  };
  try {
    return await axiosRequest.delete(`/collect/daVariables`, params);
  } catch (error) {
    return error;
  }
};
// OPCDA节点查询
export const daRootSourcesServer = async (row) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    connectId: row.connectId,
    deviceName: row.deviceName,
  };
  try {
    const { data } = await axiosRequest.get(`/collect/daRootSources`, params, { timeout: 60 * 1000 });
    return data;
  } catch (error) {
    return error;
  }
};
/**
 * 导入da变量
 *
 * @returns
 * @param formData
 */
export const daImportVarsServer = async (formData) => {
  return await axiosRequest.post(`/collect/daImportVars`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
  });
};
// 导出da变量
export const daExportVarsServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    systemType: '0',
    allExportFlag: 0,
    fileType: 'csv',
    daVars: data.daVars,
  };
  try {
    return await axiosRequest.post(`/collect/daExportVars`, params);
  } catch (error) {
    return error;
  }
};

/**
 * 安装驱动
 *
 * @returns
 * @param formData
 */
export const installDriverServer = async (formData) => {
  return await axiosRequest.post(`/collect/installDriver`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    timeout: 60 * 1000,
  });
};
// 卸载驱动
export const uninstallDriverServer = async (data) => {
  const params = {
    driverName: data.DriverName,
    deviceSeries: data.DeviceSeries,
    providerName: data.DriverCompany,
    sysPlatform: data.SysPlatform,
    driverVersion: data.DriverVersion,
    platformType: data.PlatformType,
  };
  try {
    return await axiosRequest.delete(`/collect/uninstallDriver`, params);
  } catch (error) {
    return error;
  }
};
/**
 * 导入设备
 *
 * @returns
 * @param formData
 */
export const importDevicesServer = async (formData) => {
  return await axiosRequest.post(`/collect/importDevices`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    timeout: 30000,
  });
};
// 导出设备
export const exportDevicesServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    systemType: '1',
    fileType: 'csv',
    deviceNames: data.deviceNames,
  };
  try {
    return await axiosRequest.post(`/collect/exportDevices`, params);
  } catch (error) {
    return error;
  }
};
/**
 * 导入变量
 *
 * @returns
 * @param formData
 */
export const importTagsServer = async (formData) => {
  return await axiosRequest.post(`/collect/importTags`, formData, {
    headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    timeout: 120000,
  });
};
// 导出变量
export const exportTagsServer = async (data) => {
  const collectionMenuStore = useCollectionMenuStore();
  const params = {
    projectId: collectionMenuStore.currentCollectionEngineer.guid,
    allExportFlag: false,
    fileType: 'csv',
    tagList: data.tagList,
  };
  try {
    return await axiosRequest.post(`/collect/exportTags`, params);
  } catch (error) {
    return error;
  }
};
// 导出驱动依赖文件
export const exportDriverDependencyServer = async (data) => {
  try {
    return await axiosRequest.post(`/collect/driverSettingDownload`, data);
  } catch (error) {
    return error;
  }
};
// 导入驱动依赖文件
export const importDriverDependencyServer = async (data) => {
  try {
    return await axiosRequest.post(`/collect/driverSettingUpload`, data, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 查询配置文件及点位目录
export const getDriverMapConfigServer = async (data) => {
  try {
    return await axiosRequest.get(`/collect/getDriverMapConfig`, data, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 查询点位映射文件列表
export const getPointMappingListServer = async (data) => {
  try {
    return await axiosRequest.get(`/collect/getPointMapList`, data, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 导入点位映射表
export const importPointMappingFileServer = async (data) => {
  try {
    return await axiosRequest.post(`/collect/updatePointMapping`, data, {
      headers: { 'Content-Type': 'multipart/form-data;charset=UTF-8' },
    });
  } catch (error) {
    return error;
  }
};
// 删除点位映射表
export const delPointMappingFileServer = async (params) => {
  try {
    return await axiosRequest.delete(`/collect/delPointMapping`, params);
  } catch (error) {
    return error;
  }
};
// 导出点位映射表
export const exportPointMappingServer = async (data) => {
  try {
    return await axiosRequest.post(`/collect/pointMappingFileDownload`, data);
  } catch (error) {
    return error;
  }
};
// 更新工程驱动文件
export const updateProjectDriverServer = async (data) => {
  try {
    return await axiosRequest.post(`/collect/updateProDriver`, data);
  } catch (error) {
    return error;
  }
};
