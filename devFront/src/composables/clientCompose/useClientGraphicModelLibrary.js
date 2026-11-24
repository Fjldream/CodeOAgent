import { render, createVNode } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  batchDeleteModuleServer,
  batchExportModuleServer,
  batchUpdateModuleServer,
  saveProjectDataServer,
  updateModuleImgServer,
  editModuleServer,
  pasteGraphicServer,
  getPagesServer,
  getMultiSeatServer,
} from '@/api/allRequest/clientAPI';
import { batchZIPDownloadHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';
import { useConfirm } from '@/composables/useConfirm';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import UpsertGraphicModeDialog from '@/views/Main/ClientView/ClientDialogView/UpsertGraphicModeDialog.vue';
import ClientGraphicRepeat from '@/views/Main/ClientView/ClientDialogView/ClientGraphicRepeat.vue';

export const useClientGraphicModelLibrary = ({ t, clientMenuStore, appContext }) => {
  const userStore = useLoginUserStore();
  const { getGraphicModeFile, getDiffusionManager } = clientMenuStore;
  const changeTimer = ref(null);
  const uploadRef = useTemplateRef('uploadRef');
  // 选中卡片
  const selected = ref([]);
  // 模型列表 - 后期接口获取
  const cardDate = ref([]);
  //默认一列的间距
  const cardHeight = ref(133.333);
  //当前可视数据
  const visibleList = ref([]);
  //容器Dom元素引用
  const scrollWrapper = ref(null);
  //虚拟滚动参数
  const totalHeigth = ref(0); //所有数据撑起来高度
  const startRowIndex = ref(0); //当前滚动区域内起始索引
  const visibleRowCount = ref(0); //当前容器做多显示多少条
  const startOffset = ref(0); //实际渲染区的translateY偏移量
  //缓冲列数据，防止空白
  const buffer = 3;
  //一行显示10个数据
  const columnCount = 10;
  const copyGraphic = ref([]);
  const isCopy = ref(false);
  // 响应式列表及选中行
  const dialogVisible = ref(false);
  const dialogType = ref('');
  const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
  // 搜索数据
  const searchKeyword = ref('');
  //检索模型
  const filterData = computed(() => {
    return cardDate.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()));
  });
  //计算总行数
  const totalRows = computed(() => Math.ceil(filterData.value.length / columnCount));
  const selectData = computed(() => {
    const setId = new Set([...selected.value]);
    return cardDate.value.filter((item) => setId.has(item.name));
  });

  const isRootGroup = computed(() => {
    return clientMenuStore.currentClientRow.id === 'client-graphic-model-library';
  });

  const imgBase = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAC9JREFUWEft0EERAAAMwrDhXzSTwSdV0Eva9obFAAECBAgQIECAAAECBAgQILAWeDFMf6H5tiP5AAAAAElFTkSuQmCC`;

  watchEffect(async () => {
    const { id, path, updateGraphic } = clientMenuStore.currentClientRow;
    if (path !== 'client-graphic-model-library') {
      return;
    }
    await nextTick(async () => {
      await getTableData(id);
    });
  });

  watch(filterData, () => {
    startRowIndex.value = 0;
    totalHeigth.value = totalRows.value * cardHeight.value;
    if (scrollWrapper.value) {
      scrollWrapper.value.scrollTop = 0;
    }
    updateVisibleList();
  });
  //创建
  const createDialog = async () => {
    if (clientMenuStore.currentClientRow.id === 'client-graphic-model-library') {
      ElMessage.info(t('noRootDir'));
      return;
    }
    dialogType.value = 'create';
    activeDialogComponent.value = UpsertGraphicModeDialog;
    dialogVisible.value = true;
  };
  //编辑
  const editDialog = async () => {
    dialogType.value = 'edit';
    activeDialogComponent.value = UpsertGraphicModeDialog;
    dialogVisible.value = true;
  };
  // 确认及取消
  const handleConfirm = async (data) => {
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    //先判断是否重名
    const { modeList, paramData } = await getGraphicModelList();
    if (!paramData) {
      ElMessage.error(t('operateError'));
      return;
    }
    const modeNames = modeList.map((item) => item.name);
    if (modeNames.includes(data.name)) {
      ElMessage.error(t('modelReplace'));
      return;
    }
    if (dialogType.value === 'create') {
      //先添加到模型管理json
      const groupName = clientMenuStore.currentClientRow.name;
      if (paramData['图形模型库'].hasOwnProperty(groupName)) {
        paramData['图形模型库'][groupName].mode.push({
          img: data.name,
          name: data.name,
          json: data.name,
        });
      } else {
        ElMessage.error(t('createError'));
        return;
      }
      let type = 7;
      const name = 'GraphicModelManager';
      const saveMngRestful = await saveProjectDataServer({ name, paramData, projectId, type });
      if (saveMngRestful && saveMngRestful.errorCode === 0) {
        //保存模型数据
        const operation = 'add';
        type = 11;
        const saveJsonRestful = await saveProjectDataServer({ ...data, name: data.name, projectId, operation, type });
        if (saveJsonRestful && saveJsonRestful.errorCode === 0) {
          //创建模型时更新图片，临时修改后续后台创建
          const params = {
            imgName: data.name,
            modelGroup: groupName,
            name: 'GraphicModelManager',
            guid: projectId,
            type: 7,
            flag: false,
            postData: imgBase,
          };
          await updateModuleImgServer(params);
          ElMessage.success(t('createSuccess'));
          await getTableData();
        } else {
          ElMessage.error(t('createError'));
        }
      } else {
        ElMessage.error(t('createError'));
      }
    } else {
      if (data.name === data.json) {
        return;
      }
      const restful = await editModuleServer({
        name: data.json,
        newName: data.name,
        modelGroup: data.group,
        guid: projectId,
      });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('editSuccess'));
        await getTableData();
      }
    }
    dialogVisible.value = false;
  };

  const getGraphicModelList = async () => {
    const modeList = [];
    const paramData = await getGraphicModeFile();
    if (paramData) {
      const GraphicModelManager = paramData['图形模型库'];
      for (const groupName in GraphicModelManager) {
        const group = GraphicModelManager[groupName];
        if (Array.isArray(group.mode)) {
          group.mode.forEach((item) => {
            modeList.push({
              group: groupName,
              ...item,
            });
          });
        }
      }
    }
    return { modeList, paramData };
  };
  const getTableData = async (id = clientMenuStore.currentClientRow.id) => {
    const { modeList, paramData } = await getGraphicModelList();
    if (paramData) {
      if (id === 'client-graphic-model-library') {
        cardDate.value = modeList;
      } else {
        cardDate.value = modeList.filter((item) => item.group === id);
      }
    }
    //获取第一个卡片真是高度
    const firstCardEl = scrollWrapper.value?.querySelector('.select-card');
    if (firstCardEl) {
      const style = window.getComputedStyle(firstCardEl);
      const marginBottom = parseInt(style.marginBottom) || 0;
      cardHeight.value = firstCardEl.offsetHeight + marginBottom + 13.333;
    }
    visibleRowCount.value = Math.ceil(scrollWrapper.value.clientHeight / cardHeight.value);
    totalHeigth.value = totalRows.value * cardHeight.value;
    updateVisibleList();
  };

  const refreshData = async () => {
    await getTableData();
  };
  /**
   * @function rowDBClickHandle
   * @description 卡片双击函数
   * @param {Array} row 行数据
   * @returns null
   */
  const rowDBClickHandle = async (row) => {
    const { guid } = clientMenuStore.currentClientEngineer;
    const params = [
      {
        handSeatFlag: false,
        itemId: row.name,
        projectId: guid,
        token: userStore.userInfo.userName,
        type: 8,
      },
    ];
    const flag = await getMultiSeatServer(params);
    if (flag.data.message[0]) {
      //打开客户端页面编辑器
      await ElMessageBox.alert(t('modelIsEdit'), t('tip'), {
        type: 'error',
      });
      return;
    }
    //打开图形模型页面编辑器
    window.open(`${location.origin}${location.pathname}kingclient/index.html?GUID=${guid}&graphicName=${row.name}`);
  };

  //点击操作
  const cardClick = (name, event) => {
    const isCtrl = event.ctrlKey || event.metaKey;
    if (isCtrl) {
      //多选模式
      if (selected.value.includes(name)) {
        selected.value = selected.value.filter((item) => item !== name);
      } else {
        selected.value.push(name);
      }
    } else {
      //单选模式
      selected.value = [name];
    }
  };

  //清除选中
  const clearSelection = () => {
    selected.value = [];
  };
  //删除模型
  const handleDelete = async () => {
    const toDeleteRows = selectData.value;
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    try {
      await useConfirm(`${t(`sureForSelectRow`, { length: toDeleteRows.length })}`, t('sureForDelete'));
      const namesToDelete = toDeleteRows.map((row) => row.name);
      //先修改到模型管理json
      const { modeList, paramData } = await getGraphicModelList();
      if (!paramData) {
        ElMessage.error(t('deleteError'));
        return;
      }
      const modeNames = modeList.map((item) => item.name);
      const diffModeList = namesToDelete.filter((item) => !modeNames.includes(item));
      if (diffModeList.length) {
        ElMessage.error(t('modelDelete'));
        return;
      }
      const deleteErr = [];
      const deletePageErr = new Set();
      const { page } = await getDiffusionManager();
      const pageResult = await getPagesServer({ projectId });
      if (!pageResult || pageResult.errorCode !== 0 || !pageResult.data || !pageResult.data.message) {
        ElMessage.info(t('deleteError'));
        return;
      }
      const { Pages } = pageResult.data.message;
      const namesToDeleteCopy = JSON.parse(JSON.stringify(namesToDelete));
      for (const key in page) {
        const diffPage = page[key];
        if (diffPage.length > 0) {
          for (const item of diffPage) {
            const { guid } = item;
            const found = modeList.find((el) => el.guid == guid);
            if (found) {
              const { name } = found;
              const index = namesToDeleteCopy.indexOf(name);
              if (index != -1) {
                namesToDelete.splice(index, 1);
                deleteErr.push(name);
                const pageObj = Pages.find((pageItem) => pageItem.id === key);
                pageObj && deletePageErr.add(pageObj.name);
              }
            }
          }
        }
      }
      for (const index in paramData['图形模型库']) {
        const group = paramData['图形模型库'][index];
        if (Array.isArray(group.mode)) {
          group.mode = group.mode.filter((item) => !namesToDelete.includes(item.name));
        }
      }
      if (namesToDelete.length > 0) {
        const type = 7;
        const name = 'GraphicModelManager';
        const saveMngRestful = await saveProjectDataServer({ name, paramData, projectId, type });
        if (saveMngRestful && saveMngRestful.errorCode === 0) {
          const guid = projectId;
          const projectInfo = { name: namesToDelete, type: 11, guid };
          const restful = await batchDeleteModuleServer({ projectInfo });
          if (restful && restful.errorCode === 0) {
            selected.value = [];
            if (deleteErr.length > 0) {
              ElMessage.error(
                t('partialFailure', { modeName: deleteErr.join(','), pageName: Array.from(deletePageErr).join(',') }),
              );
            } else {
              ElMessage.success(t('deleteSuccess'));
            }
            await getTableData();
          } else {
            ElMessage.error(t('deleteError'));
          }
        } else {
          ElMessage.error(t('deleteError'));
        }
      } else {
        ElMessage.error(
          t('partialFailure', { modeName: deleteErr.join(','), pageName: Array.from(deletePageErr).join(',') }),
        );
      }
    } catch (error) {
      ElMessage.info(t('cancleDlete'));
    }
  };

  //更新visibleList数据（根据 scrollTop算出索引）
  const updateVisibleList = () => {
    const startRow = Math.max(startRowIndex.value - buffer, 0);
    const endRow = Math.min(startRowIndex.value + visibleRowCount.value + buffer, totalRows.value);
    const start = startRow * columnCount;
    const end = endRow * columnCount;
    visibleList.value = filterData.value.slice(start, end);
    startOffset.value = startRow * cardHeight.value;
  };
  //滚动懒加载
  const onScroll = (e) => {
    const el = e.target;
    const { scrollTop } = el;
    const scrollBottom = scrollTop + el.clientHeight;
    const nearTop = scrollTop <= cardHeight.value * 1.5;
    const nearBottom = el.scrollHeight - scrollBottom <= cardHeight.value * 1.5;
    const maxRow = totalRows.value - visibleRowCount.value;
    if (nearTop) {
      startRowIndex.value = Math.max(startRowIndex.value - buffer, 0);
      requestAnimationFrame(updateVisibleList);
    } else if (nearBottom) {
      startRowIndex.value = Math.min(startRowIndex.value + buffer, maxRow);
      requestAnimationFrame(updateVisibleList);
    }
  };

  //导出
  const exportHandle = async () => {
    const { guid } = clientMenuStore.currentClientEngineer;
    const toExportRows = selectData.value;
    const names = toExportRows.map((row) => row.name);
    //先执行压缩zip
    const { errorCode, data } = await batchExportModuleServer({ guid, names });
    if (errorCode === 0) {
      const downlandFiles = [
        {
          url: data,
          fileName: `graphicMode${new Date().getTime()}.zip`,
        },
      ];
      await batchZIPDownloadHandle(downlandFiles);
    } else {
      ElMessage.error(t('exportError'));
    }
  };
  // 文件上传
  const fileChange = async (file, fileList) => {
    clearTimeout(changeTimer.value);
    changeTimer.value = setTimeout(async () => {
      const { guid: projectId } = clientMenuStore.currentClientEngineer;
      //枚举最新模型
      const { modeList, paramData } = await getGraphicModelList();
      if (!paramData) {
        ElMessage.error(t('importError'));
        return;
      }
      const cardSet = new Set(modeList.map((item) => item.name));
      const guidSet = new Set(modeList.map((ele) => ele.guid));
      const groupName = clientMenuStore.currentClientRow.name;
      if (!paramData['图形模型库'].hasOwnProperty(groupName)) {
        ElMessage.error(t('importError'));
        return;
      }
      const modeFileList = [];
      const repeatList = [];
      for (let index = 0; index < fileList.length; index++) {
        const element = fileList[index];
        let data = await importScriptJsonHandle(element.raw);
        data = data.hasOwnProperty('errorCode') ? data.data : data;
        let { name, guid } = data.modlePrototype;
        //当前先判断模型guid相等的需要替换原有模型
        if (guidSet.has(guid)) {
          const oldName = [...cardSet][[...guidSet].indexOf(guid)];
          const oldGroupObj = modeList.find((item) => item.name === oldName);
          const repeatInfo = {
            newName: name,
            oldName,
            newGroup: groupName,
            oldGroup: oldGroupObj ? oldGroupObj.group : '',
            data,
            id: guid,
          };
          repeatList.push(repeatInfo);
          continue;
        }
        //如果是名称相等，guid不相等的情况下不替换旧模型，需要作为一个新模型处理
        if (cardSet.has(name)) {
          name = `${name}${new Date().getTime()}`;
          data.name = name;
          data.pageProperty.name = name;
          data.modlePrototype.name = name;
        }
        paramData['图形模型库'][groupName].mode.push({
          img: imgBase,
          name: name,
          json: name,
          guid,
        });
        const obj = {
          modelInfo: {
            name: name,
            type: 11,
            json: name,
            guid: projectId,
          },
          data: JSON.stringify(data),
        };
        modeFileList.push(obj);
      }
      let rowData = [];
      if (repeatList.length > 0) {
        rowData = await openCustomDialog({ tableList: repeatList }, appContext);
      }
      if (rowData.length > 0) {
        rowData.map((item) => {
          //如果存在guid相同的模型，但是分组不同，需要把旧模型在之前分组删除后再去新分组替换之前模型
          if (item.newGroup && item.oldGroup && item.newGroup !== item.oldGroup) {
            const oldModes = paramData['图形模型库'][item.oldGroup].mode;
            const index = oldModes.findIndex((model) => model.name === item.oldName);
            if (index !== -1) {
              oldModes.splice(index, 1);
            }
          }
          //如果存在替换的模型新名称和之前已经存在的模型名称存在时需要单独处理
          if (cardSet.has(item.newName) && item.newName !== item.oldName) {
            const name = `${item.newName}${new Date().getTime()}`;
            item.newName = name;
            item.data.name = name;
            item.data.pageProperty.name = name;
            item.data.modlePrototype.name = name;
          }
          const repeatObj = {
            modelInfo: {
              name: item.newName,
              type: 11,
              json: item.newName,
              guid: projectId,
              id: item.id,
              oldName: item.oldName,
            },
            data: JSON.stringify(item.data),
          };
          modeFileList.push(repeatObj);
          const modes = paramData['图形模型库'][groupName].mode;
          const len = modes.length;
          if (len) {
            for (let ele = 0; ele < len; ele++) {
              if (modes[ele].name == item.oldName) {
                modes[ele].name = item.newName;
                modes[ele].json = item.newName;
                break;
              }
              //最后一次遍历的时候如果还没有和旧模型名称相等的就作为新模型添加进去
              if (ele == len - 1) {
                paramData['图形模型库'][groupName].mode.push({
                  img: imgBase,
                  name: item.newName,
                  json: item.newName,
                  guid: item.id,
                });
              }
            }
          } else {
            paramData['图形模型库'][groupName].mode.push({
              img: imgBase,
              name: item.newName,
              json: item.newName,
              guid: item.id,
            });
          }
        });
      }
      if (modeFileList.length > 0) {
        const restful = await batchUpdateModuleServer({ modeFileList });
        if (restful && restful.errorCode === 0) {
          const type = 7;
          const name = 'GraphicModelManager';
          const saveMngRestful = await saveProjectDataServer({ name, paramData, projectId, type });
          if (saveMngRestful && saveMngRestful.errorCode === 0) {
            ElMessage.success(t('importSuccess'));
            await getTableData();
          }
        }
      }
      uploadRef.value?.clearFiles();
    }, 100);
  };
  const openCustomDialog = (props = {}, appContext) => {
    return new Promise((resolve, reject) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const close = () => {
        render(null, container);
        container.remove();
      };
      const vnode = createVNode(ClientGraphicRepeat, {
        visible: true,
        ...props,
        'onUpdate:visible': (val) => {
          if (!val) close();
        },
        onSave: async (selectedData) => {
          try {
            await ElMessageBox.confirm(t('modelSaveTips'), t('tip'), {
              confirmButtonText: t('define'),
              cancelButtonText: t('cancle'),
              type: 'warning',
            });
            close();
            resolve(selectedData);
          } catch (error) {}
        },
        onRemove: () => {
          close();
          resolve([]);
        },
      });
      if (appContext) {
        vnode.appContext = appContext;
      }
      render(vnode, container);
    });
  };
  // 复制
  const copyHandle = () => {
    isCopy.value = true;
    copyGraphic.value = [...selectData.value];
    ElMessage({
      type: 'success',
      message: t('copySuccess'),
    });
  };
  // 粘贴
  const pasteHandle = async () => {
    if (!isCopy.value) {
      return false;
    }
    const { guid: projectId } = clientMenuStore.currentClientEngineer;
    const { id: groupId, level } = clientMenuStore.currentClientRow;
    const { modeList } = await getGraphicModelList();
    const allGraphicNames = modeList.map((item) => item.name);
    const postData = copyGraphic.value.map((items) => {
      let copyName = `${items.name}_1`;
      while (allGraphicNames.includes(copyName)) {
        copyName = `${copyName}_1`;
      }
      allGraphicNames.push(copyName);
      return {
        name: copyName,
        projectId,
        groupId,
        copyName: items.name,
        img: imgBase,
      };
    });
    const pasteResult = await pasteGraphicServer(postData);
    if (pasteResult.errorCode === 0) {
      ElMessage.success(t('pasteSuccess'));
    }
    if (level > 1) {
      await getTableData(groupId);
    } else {
      await getTableData();
    }
    isCopy.value = false;
    copyGraphic.value = [];
  };
  return {
    selected,
    selectData,
    visibleList,
    scrollWrapper,
    dialogVisible,
    dialogType,
    activeDialogComponent,
    searchKeyword,
    uploadRef,
    isRootGroup,
    copyGraphic,
    createDialog,
    editDialog,
    handleConfirm,
    handleDelete,
    refreshData,
    rowDBClickHandle,
    cardClick,
    clearSelection,
    onScroll,
    exportHandle,
    fileChange,
    copyHandle,
    pasteHandle,
  };
};
