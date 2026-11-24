import { ElMessage } from 'element-plus';

import { publishServer, unPublishServer, updateServer } from '@/api/allRequest/mainAPI.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';

export const useProjectOperate = ({ t, mainLeftMenusStore }) => {
  const loginUserStore = useLoginUserStore();
  const loadingText = ref();
  const isLoading = ref(false);
  //发布
  const publishProject = async (selectRows) => {
    loadingText.value = t('projectPublishing');
    isLoading.value = true;
    try {
      // 模拟异步发布操作
      const result = await publishServer({
        projectType: mainLeftMenusStore.leftRowSelect.projectType,
        guid: selectRows.guid,
      });
      if (result?.errorCode === 0) {
        ElMessage.success(t('publishSuccess'));
      }
      return result;
    } finally {
      isLoading.value = false;
      loadingText.value = '';
    }
  };
  //撤销发布
  const unPublishProject = async (selectRows) => {
    loadingText.value = t('projectUnPublishing');
    isLoading.value = true;
    try {
      // 模拟异步发布操作
      const result = await unPublishServer({
        projectType: mainLeftMenusStore.leftRowSelect.projectType,
        guid: selectRows.guid,
      });
      if (result?.errorCode === 0) {
        ElMessage.success(t('unPublishSuccess'));
      }
      return result;
    } finally {
      isLoading.value = false;
      loadingText.value = '';
    }
  };
  // 更新
  const updateProject = async (selectRows) => {
    loadingText.value = t('projectUpdating');
    isLoading.value = true;
    try {
      // 模拟异步更新操作
      const result = await updateServer({
        projectType: mainLeftMenusStore.leftRowSelect.projectType,
        guid: selectRows.guid,
      });
      if (result?.errorCode === 0) {
        ElMessage.success(t('updateSuccess'));
      }
    } finally {
      isLoading.value = false;
      loadingText.value = '';
    }
  };

  const getTagType = (row) => {
    if (row.status === 'published' || row.status === 'updated') {
      return 'success';
    }
    if (row.status === 'unUpdated') {
      return 'warning';
    }
    return 'info';
  };

  const hasPermission = (row) => {
    return row.shareUserIds.includes(loginUserStore.userInfo.userId) || row.createBy === loginUserStore.userInfo.userId;
  };

  const isCreator = (row) => {
    return row.createBy === loginUserStore.userInfo.userId;
  };

  // 使用禁止修改工程名称
  const isDisableProjectName = (dialogType, projectStatus) => {
    return dialogType && projectStatus !== 'unPublished';
  };
  return {
    isLoading,
    loadingText,
    publishProject,
    unPublishProject,
    updateProject,
    getTagType,
    hasPermission,
    isCreator,
    isDisableProjectName,
  };
};
