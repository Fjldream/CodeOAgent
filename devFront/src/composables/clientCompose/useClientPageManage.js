import { ElMessage } from 'element-plus';

import {
  batchGetPageFileServer,
  createPageServer,
  deletePageBatchServer,
  getMultiSeatServer,
  getPagesServer,
  handlePageRecordMngServer,
  saveProjectDataServer,
  setAppNameServer,
  setDefaultNameServer,
  updatePageServer,
  pastePageServer,
  movesToGroupServer,
} from '@/api/allRequest/clientAPI';
import { useConfirm } from '@/composables/useConfirm';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { exportScriptJsonHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';

export const useClientPageList = ({ t, clientMenuStore, dropdownHome }) => {
  const userStore = useLoginUserStore();
  const maxHeight = ref('calc(100vh - 190px)');
  // 表单ref
  const formRef = ref(null);

  // 表单数据
  const formData = reactive({
    name: '',
    description: '',
    id: '',
  });
  const changeTimer = ref(null);
  // 回收站显示
  const recycleVisible = ref(false);
  const moveVisible = ref(false);
  const recycleData = ref([]);
  const tableData = ref([]);
  const uploadRef = useTemplateRef('uploadRef');
  const copySelectedData = ref([]);
  // 响应式列表及选中行
  const dialogVisible = ref(false);
  const dialogType = ref('');
  const title = ref('');
  // 搜索数据
  const searchKeyword = ref('');
  // 复选框选中行
  const selectRows = ref([]);

  const limit = ref(100);
  const importDialogVisible = ref(false);
  const loading = ref(false);
  const importData = ref([]);
  const isCopy = ref(false);
  const copyPages = ref([]);

  const homeCommand = computed(() => {
    return [
      {
        label: t('PCHomePage'),
        value: 0,
      },
      {
        label: t('phoneHomePage'),
        value: 1,
      },
    ];
  });
  //检索
  const filterData = computed(() =>
    tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
  );
  watchEffect(async () => {
    const { id, level } = clientMenuStore.currentClientRow;
    // modified by jinlong.feng at 2026-11-20 KF开发助手M1
    const rootSelected = id === 'client-page-management';
    // end
    await nextTick(async () => {
      if (level && level > 1) {
        await getTableData([id]);
      // modified by jinlong.feng at 2026-11-20 KF开发助手M1
      } else if (level || rootSelected) {
      // end
        await getTableData();
      }
    });
  });
  //创建
  const createDialog = async () => {
    dialogType.value = 'create';
    title.value = t('createPage');
    Object.assign(formData, {});
    dialogVisible.value = true;
  };
  //编辑
  const editDialog = async (row) => {
    const { guid } = clientMenuStore.currentClientEngineer;
    const multiParams = [
      {
        handSeatFlag: false,
        itemId: row.id,
        projectId: guid,
        token: userStore.userInfo.userName,
        type: 3,
      },
    ];
    const flag = await getMultiSeatServer(multiParams);
    if (flag.data.message.some((item) => item === true)) {
      await ElMessageBox.alert(t('pageIsEdit'), t('tip'), {
        type: 'error',
      });
      return;
    }
    dialogType.value = 'edit';
    Object.assign(formData, row);
    title.value = t('editPage');
    dialogVisible.value = true;
  };
  //打开恢复弹窗
  const openRecycle = async () => {
    await getPageRecordMng();
    recycleVisible.value = true;
  };
  //打开移动弹窗
  const openMove = async () => {
    moveVisible.value = true;
  };
  // 确认及取消
  const handleConfirm = async (data) => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const isRootGroup = !clientMenuStore.currentClientRow.parent;
    const groupId = clientMenuStore.currentClientRow.id;
    if (dialogType.value === 'create') {
      const params = { ...data, projectId, groupId };
      const createPageRestful = await createPageServer(params);
      if (createPageRestful && createPageRestful.errorCode === 0) {
        const guid = createPageRestful.data.data.id;
        const operation = 'add';
        const type = 3;
        const paramData = {
          name: params.name,
          guid: guid,
        };
        const restful = await saveProjectDataServer({ ...params, paramData, operation, type });
        if (restful?.errorCode === 0) {
          ElMessage.success(t('createSuccess'));
          await getTableData(isRootGroup ? [] : [groupId]);
        } else {
          ElMessage.error(t('createError'));
        }
      } else {
        ElMessage.error(createPageRestful.message);
      }
    } else {
      const params = { ...data, projectId };
      const updatePageRestful = await updatePageServer(params);
      if (updatePageRestful?.errorCode === 0) {
        const name = filterData.value.find((item) => item.id === data.id)?.name || null;
        const operation = 'edit';
        const type = 3;
        const { name: newName, id: guid } = data;
        const paramData = {
          name: name,
          guid: guid,
          newName: newName,
          description: params.description,
        };
        const restful = await saveProjectDataServer({ ...params, name, paramData, operation, type });
        if (restful?.errorCode === 0) {
          ElMessage.success(t('editSuccess'));
          await getTableData(isRootGroup ? [] : [groupId]);
        }
      }
    }
    Object.assign(formData, { name: '', description: '', id: '' });
    dialogVisible.value = false;
  };

  /**
   * @function handleCancelDialog
   * @description 表单弹窗取消事件
   * @return null
   */
  function handleCancelDialog() {
    Object.assign(formData, { name: '', description: '', id: '' });
    dialogVisible.value = false;
  }

  // 复选框选中的行的数据改变
  const handleSelectionChange = (val) => {
    selectRows.value = val;
  };
  //删除
  const handleDelete = async (delRow) => {
    const toDeleteRows = delRow;
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const isRootGroup = !clientMenuStore.currentClientRow.parent;
    const groupId = clientMenuStore.currentClientRow.id;
    await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
    const params = delRow.map((item) => ({
      handSeatFlag: false,
      itemId: item.id,
      projectId: projectId,
      token: userStore.userInfo.userName,
      type: 3,
    }));
    const flag = await getMultiSeatServer(params);
    if (flag.data.message.some((item) => item === true)) {
      await ElMessageBox.alert(t('pageIsEdit'), t('tip'), {
        type: 'error',
      });
      return;
    }
    const pages = toDeleteRows.map((row) => row.name);
    const restful = await deletePageBatchServer({ projectId, pages });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('deleteSuccess'));
      await getTableData(isRootGroup ? [] : [groupId]);
    } else {
      ElMessage.error(t('deleteError'));
    }
  };
  //导出
  const exportHandle = async () => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const pageArr = selectRows.value.map((row) => row.name);
    const restful = await batchGetPageFileServer({ pageArr, projectId });
    if (restful?.errorCode === 0) {
      for (const valueElement of restful.data.success) {
        await exportScriptJsonHandle(valueElement, `${valueElement.pagePrototype.name}.json`);
      }
    } else {
      ElMessage.error(t('exportError'));
    }
  };
  // 文件上传
  const fileChange = async (file, fileList) => {
    if (!loading.value) {
      loading.value = true;
    }
    clearTimeout(changeTimer.value);
    changeTimer.value = setTimeout(() => {
      importPageHandle(fileList);
    }, 100);
  };

  const exceedHandle = async (files, uploadFiles) => {
    if (!loading.value) {
      loading.value = true;
    }
    const allFiles = [...uploadFiles, ...files].splice(0, limit.value).map((file) => {
      return {
        raw: file,
      };
    });
    await importPageHandle(allFiles);
  };

  const importPageHandle = async (fileList) => {
    try {
      const pageList = [];
      for (const element of fileList) {
        const data = await importScriptJsonHandle(element.raw);
        if (!data?.pageProperty?.name && !data?.pagePrototype?.name) {
          return ElMessage.error(t('importPageTips'));
        }
        pageList.push({
          data,
          name: data?.pageProperty?.name || data.pagePrototype.name,
        });
      }
      importData.value = pageList;
      importDialogVisible.value = true;
      uploadRef.value?.clearFiles();
    } catch (e) {
      ElMessage.error(t('importPageTips'));
    } finally {
      loading.value = false;
    }
  };
  const getTableData = async (ids) => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const result = await getPagesServer({ projectId, ids });
    if (result?.errorCode === 0) {
      const setData = result.data.message.Pages;
      const { appHomePage, default: homePage } = result.data.message;
      let count = 0;
      for (const page of setData) {
        if (count === 2) {
          break;
        }
        if (page.name === appHomePage) {
          count++;
          page.appHomePage = appHomePage;
        }
        if (page.name === homePage) {
          count++;
          page.homePage = homePage;
        }
      }

      tableData.value = setData;
    }
  };

  //移动
  const handleMove = async (row) => {
    const toMoveRows = selectRows.value;
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const isRootGroup = !clientMenuStore.currentClientRow.parent;
    const groupId = clientMenuStore.currentClientRow.id;
    const params = toMoveRows.map((item) => ({
      handSeatFlag: false,
      itemId: item.id,
      projectId: projectId,
      token: userStore.userInfo.userName,
      type: 3,
    }));
    const flag = await getMultiSeatServer(params);
    if (flag.data.message.some((item) => item === true)) {
      await ElMessageBox.alert(t('pageIsEdit'), t('tip'), {
        type: 'error',
      });
      return;
    }
    const names = toMoveRows.map((data) => data.name);
    const restful = await movesToGroupServer({ projectId, names, selectGroupId: row.id });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('operateSuccess'));
      await getTableData(isRootGroup ? [] : [groupId]);
    }
    moveVisible.value = false;
  };
  const refreshData = async () => {};
  const handleCopy = async () => {};
  const handlePast = async () => {};
  const setHompage = async () => {
    dropdownHome.value?.handleOpen();
  };
  const handleCommand = async (value) => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const isRootGroup = !clientMenuStore.currentClientRow.parent;
    const groupId = clientMenuStore.currentClientRow.id;
    const data = selectRows.value[0];
    if (value) {
      const restful = await setAppNameServer({ ...data, projectId });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('setSuccess'));
        await getTableData(isRootGroup ? [] : [groupId]);
      }
    } else {
      const restful = await setDefaultNameServer({ ...data, projectId });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('setSuccess'));
        await getTableData(isRootGroup ? [] : [groupId]);
      }
    }
  };
  //获取恢复页面列表
  const getPageRecordMng = async () => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const params = {
      operate: 'getRecyclePageManager',
      projectId: projectId,
    };
    const restful = await handlePageRecordMngServer({ params });
    if (restful?.errorCode === 0) {
      recycleData.value = JSON.parse(restful.data.mes);
    }
  };

  /**
   * @function handleRecycleRecover
   * @description 回收站恢复事件
   * @return null
   */
  async function handleRecycleRecover(idArr) {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const isRootGroup = !clientMenuStore.currentClientRow.parent;
    const groupId = clientMenuStore.currentClientRow.id;
    const selectData = idArr.map((item) => item.ID);
    const params = {
      operate: 'restoreRecyclePages',
      selectData: selectData,
      projectId: projectId,
    };
    const restful = await handlePageRecordMngServer({ params });
    if (restful?.errorCode === 0) {
      await getPageRecordMng();
      await getTableData(isRootGroup ? [] : [groupId]);
      ElMessage.success(t('replaceSuccess'));
    }
  }

  /**
   * @function handleRecycleDelete
   * @description 回收站删除事件
   * @return null
   */
  async function handleRecycleDelete(idArr) {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const selectData = idArr.map((item) => item.ID);
    const params = {
      operate: 'clearRecyclePages',
      selectData: selectData,
      projectId: projectId,
    };
    const restful = await handlePageRecordMngServer({ params });
    if (restful?.errorCode === 0) {
      await getPageRecordMng();
      ElMessage.success(t('deleteSuccess'));
    }
  }

  /**
   * @function handleRecycleVisible
   * @description 关闭回收站弹窗
   * @return null
   */
  function handleRecycleVisible() {
    recycleVisible.value = false;
  }

  const tableRowDBClick = async (row) => {
    const { guid } = clientMenuStore.currentClientEngineer;
    const params = [
      {
        handSeatFlag: false,
        itemId: row.id,
        projectId: guid,
        token: userStore.userInfo.userName,
        type: 3,
      },
    ];
    const flag = await getMultiSeatServer(params);
    if (flag.data.message[0]) {
      //打开客户端页面编辑器
      await ElMessageBox.alert(t('pageIsEdit'), t('tip'), {
        type: 'error',
      });
      return;
    }
// modified by jinlong.feng at 2026-11-20 KF开发助手M1
    const pageQuery=new URLSearchParams({GUID:guid,pageName:row.name});
    window.open('/kingclient/index.html?'+pageQuery.toString(),'_blank');
// end
  };
  const copyHandle = () => {
    isCopy.value = true;
    copyPages.value = [...selectRows.value];
    ElMessage({
      type: 'success',
      message: t('copySuccess'),
    });
  };
  const pasteHandle = async () => {
    if (!isCopy.value) {
      return false;
    }
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const { id: groupId, level } = clientMenuStore.currentClientRow;
    const result = await getPagesServer({ projectId });
    if (result.errorCode === 0) {
      const allPages = result.data.message.Pages;
      const allPageNames = allPages.map((item) => item.name);
      const postData = copyPages.value.map((items) => {
        let copyName = `${items.name}_1`;
        while (allPageNames.includes(copyName)) {
          copyName = `${copyName}_1`;
        }
        allPageNames.push(copyName);
        const pageInfo = allPages.filter((element) => element.name === items.name);
        return {
          name: copyName,
          projectId,
          groupId,
          description: pageInfo[0].description,
          copyName: items.name,
        };
      });
      const pasteResult = await pastePageServer(postData);
      if (pasteResult.errorCode === 0) {
        ElMessage.success(t('pasteSuccess'));
      }
    }
    if (level > 1) {
      await getTableData([groupId]);
    } else {
      await getTableData();
    }
    isCopy.value = false;
    copyPages.value = [];
  };

  return {
    dialogVisible,
    dialogType,
    searchKeyword,
    selectRows,
    filterData,
    copySelectedData,
    maxHeight,
    formRef,
    formData,
    title,
    moveVisible,
    recycleVisible,
    recycleData,
    uploadRef,
    homeCommand,
    importDialogVisible,
    importData,
    loading,
    limit,
    copyPages,
    handleConfirm,
    handleCancelDialog,
    handleSelectionChange,
    createDialog,
    editDialog,
    openRecycle,
    openMove,
    handleMove,
    handleDelete,
    handleCopy,
    handlePast,
    exportHandle,
    fileChange,
    exceedHandle,
    refreshData,
    handleRecycleRecover,
    handleRecycleDelete,
    handleRecycleVisible,
    tableRowDBClick,
    setHompage,
    handleCommand,
    getTableData,
    copyHandle,
    pasteHandle,
  };
};
