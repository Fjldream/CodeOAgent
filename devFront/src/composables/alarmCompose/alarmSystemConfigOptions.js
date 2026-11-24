import { useI18n } from 'vue-i18n';

import { getAlarmDbTestServer } from '@/api/allRequest/dataSourceAPI';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore.js';

export const alarmSystemConfigOptions = () => {
  //测试连接
  const { t } = useI18n();

  const testConnection = async (data) => {
    const alarmMenuStore = useAlarmMenuStore();

    data.guid = alarmMenuStore.currentAlarmEngineer.guid;

    const restful = await getAlarmDbTestServer(data);
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('testConnectSuccess'));
    }
  };
  return {
    testConnection,
  };
};
