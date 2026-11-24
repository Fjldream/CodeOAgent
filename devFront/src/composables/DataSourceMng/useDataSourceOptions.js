import { useI18n } from 'vue-i18n';
import { getDbTestServer, getAllProjectsServer, getDataSourceOptionsServer } from '@/api/allRequest/dataSourceAPI';

export const useDataSourceOptions = () => {
  const { t } = useI18n();
  const getDateSourceOptions = async () => {
    const optionsRes = await getDataSourceOptionsServer();
    if (optionsRes && optionsRes.errorCode === 0) {
      return optionsRes.data.map((item) => {
        if (item.value === '工业数据源_网络模式' || item.value === 'AlarmEngineering') {
          item.label = t(`${item.label}`);
        }
        return item;
      });
    } else {
      return [];
    }
  };

  const DateTypeCheckboxs = [
    { value: '1', label: t('realTimeType'), type: 1 },
    { value: '2', label: t('historyType'), type: 2 },
    { value: '3', label: t('alarmType'), type: 3 },
  ];
  const NewWorkDateSourcesOptions = [
    { value: 'KingIOServerWindows3.8', label: 'KingIOServerWindows3.8' },
    { value: 'KingIOServerLinux', label: 'KingIOServerLinux' },
    { value: 'KingScadaWindows3.8', label: 'KingScadaWindows3.8' },
    { value: 'KHFDBServer', label: 'KHFDBServer' },
  ];
  const getVariableMethodOptions = [
    { value: 'restful', label: 'restful' },
    { value: 'mqtt', label: 'mqtt' },
    { value: 'redis', label: 'redis' },
  ];
  const realWriteMethodOptions = [
    { value: 'restful', label: 'restful' },
    { value: 'mqtt', label: 'mqtt' },
  ];
  //测试连接
  const testConnection = async (data) => {
    const restful = await getDbTestServer(data);
    if (restful && restful.errorCode === 0) {
      if (restful.data === true) {
        ElMessage.success(t('testConnectSuccess'));
      } else {
        typeof restful.data === 'string'
          ? ElMessage.error(t(`${restful.data}`))
          : ElMessage.error(t('testConnectError'));
      }
    }
  };

  // 获取全部报警工程
  const getAllProjects = async (data) => {
    return await getAllProjectsServer(data);
  };

  return {
    DateTypeCheckboxs,
    NewWorkDateSourcesOptions,
    getVariableMethodOptions,
    realWriteMethodOptions,
    testConnection,
    getAllProjects,
    getDateSourceOptions,
  };
};
