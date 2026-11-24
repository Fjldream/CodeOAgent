import { h } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { Bell } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

import { useWebSocketClient } from '@/composables/useWebSocketClient.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { isObjectString } from '@/utils/commonUtils.js';

export const useScriptPlaceholderWS = () => {
  const { t } = useI18n();
  const notificationRef = ref();

  const userStore = useLoginUserStore();
  const wsUrl = `${location.protocol.replace('http', 'ws')}//${location.host}/placeholder`;

  const client = ref();
  client.value = useWebSocketClient({ url: wsUrl });
  client.value.onMessage((message) => {
    if (!isObjectString(message)) {
      return;
    }
    const { code, data } = JSON.parse(message);
    // 处理返回的信息
    switch (code) {
      case 1002:
        const sendTitle = `${data.userNameBy}${t('remindReleasePlaceholder')}`;
        const sendTip = `${data.projectType}-${data.projectName}-${data.scriptType}:${data.scriptName}`;
        openNotification(sendTitle, sendTip);
        break;
      case 1003:
        if (data.success) {
          ElMessage.success(t('remindHasSend'));
          return;
        }
        ElMessage.warning(t('remindSendField'));
        break;
      default:
        break;
    }
  });

  // 建立连接时
  client.value.connect((isConnectSuccess) => {
    if (isConnectSuccess) {
      client.value.send(
        JSON.stringify({
          code: 1000,
          data: {
            userId: userStore.userInfo.userId,
            userName: userStore.userInfo.userName,
            tenantId: userStore.userInfo.tenantId,
          },
        }),
      );
    }
  });
  // 响应通知释放点击事件
  const handleNoticeRelease = (row, projectName) => {
    client.value.send(
      JSON.stringify({
        code: 1001,
        data: {
          userId: row.lockedBy,
          userName: row.lockedByName,
          userIdBy: userStore.userInfo.userId,
          userNameBy: userStore.userInfo.userName,
          projectName: projectName,
          projectType: '计算工程',
          scriptId: row.scriptId,
          scriptName: row.scriptName,
          scriptType: row.scriptType,
        },
      }),
    );
  };

  const openNotification = (title, message) => {
    const notificationInstances = {};

    const handleButtonClick = (id) => {
      if (notificationInstances[id]) {
        notificationInstances[id].close();
        delete notificationInstances[id];
      }
    };

    const id = new Date().getTime();
    const customMessage = () => {
      return h('div', [
        h(
          'p',
          {
            style: 'font-weight: bold;font-size: 14px;color: black;',
          },
          message,
        ),
        h(
          'div',
          {
            style: 'display: flex; justify-content: flex-end;',
          },
          [
            h(
              ElButton,
              {
                type: 'text',
                onClick: () => handleButtonClick(id),
              },
              t('getIt'),
            ),
          ],
        ),
      ]);
    };

    notificationRef.value = ElNotification({
      title: title,
      icon: Bell,
      message: customMessage,
      duration: 0,
      showClose: true,
      position: 'top-right',
      customClass: 'custom-title-notification',
    });
    notificationInstances[id] = notificationRef.value;
  };

  return {
    client,
    handleNoticeRelease,
  };
};
