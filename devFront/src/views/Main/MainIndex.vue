<script setup>
import { getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

import router from '@/router/index.js';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';
import { useRefreshToken } from '@/composables/useRefreshToken.js';
import { getGuid, getTagChildren } from '@/utils/commonUtils.js';
import { useConfirm } from '@/composables/useConfirm.js';
import {
  createProjectGroupServer,
  deleteProjectGroupServer,
  editProjectGroupServer,
} from '@/api/allRequest/mainAPI.js';
import { releaseMultiSeatServer } from '@/api/allRequest/clientAPI.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';

import CustomOverview from '@/components/CustomOverview/CustomOverview.vue';
import MainLable from '@/components/Main/MainLable.vue';
import CustomLayoutContainer from '@/components/CustomLayout/CustomLayoutContainer.vue';
import MainHeader from '@/views/Main/MainHeaderView/MainHeader.vue';
import CollapseLeft from '@/components/CustomLayout/CollapseLeft.vue';

const { t } = useI18n();
const mainLeftMenusStore = useMainLeftMenusStore();
const systemConfigStore = useSystemConfigStore();
const loginUserStore = useLoginUserStore();

const { setLoginInfo } = loginUserStore;
const { proxy } = getCurrentInstance();
const route = useRoute();

const isMainHeaderShow = ref(true);
// 启动轮询token刷新
useRefreshToken();

const { setLeftRowSelect, getLeftMenu, handleToggle } = mainLeftMenusStore;
const isCollapse = ref(false);
const asideWidth = ref('220');
const isShow = ref(false);
const defaultExpandKeys = ref([]);
const selectNode = ref();

nextTick(async () => {
  await getLeftMenu();
  proxy.$crossTab.onMessage(handleMessage);
});
const overviewSteps = computed(() => {
  return {
    calculation: [
      {
        iconName: 'describe1',
        label: t('createCaculationProject'),
      },
      {
        iconName: 'describe2',
        label: t('addDatasource'),
      },
      {
        iconName: 'describe3',
        label: t('addVariables'),
      },
      {
        iconName: 'describe4',
        label: t('editScript'),
      },
      {
        iconName: 'describe5',
        label: t('publishOrDeploy'),
      },
    ],
    client: [
      {
        iconName: 'describe1',
        label: t('createClientProject'),
      },
      {
        iconName: 'describe2',
        label: t('addDatasource'),
      },
      {
        iconName: 'describe3',
        label: t('addVariables'),
      },
      {
        iconName: 'describe4',
        label: t('desginInterface'),
      },
      {
        iconName: 'describe5',
        label: t('publishOrDeploy'),
      },
    ],
    dataSource: [
      {
        iconName: 'describe1',
        label: t('createDatasourceProject'),
      },
      {
        iconName: 'describe2',
        label: t('publishOrDeploy'),
      },
    ],
    alarm: [
      {
        iconName: 'describe1',
        label: t('createAlarmProject'),
      },
      {
        iconName: 'describe2',
        label: t('addDatasource'),
      },
      {
        iconName: 'describe3',
        label: t('addVariables'),
      },
      {
        iconName: 'describe4',
        label: t('configureAlarmStrategy'),
      },
      {
        iconName: 'describe5',
        label: t('publishOrDeploy'),
      },
    ],
    collection: [
      {
        iconName: 'describe1',
        label: t('installCollectionDriver'),
      },
      {
        iconName: 'describe2',
        label: t('createCollection'),
      },
      {
        iconName: 'describe3',
        label: t('addDeviceAndTags'),
      },
      {
        iconName: 'describe4',
        label: t('configure'),
      },
      {
        iconName: 'describe5',
        label: t('publishOrDeploy'),
      },
    ],
  };
});

const overviewData = computed(() => {
  const obj = {};
  switch (mainLeftMenusStore.leftRowSelect.projectType) {
    case 0:
      obj.steps = overviewSteps.value.calculation;
      obj.subTitleValue = [t('javascriptLang'), t('interFormat'), t('calculateDev'), t('timeDebug')];
      obj.titleName = t('leftMenus.calculationEngineer');
      obj.titleIcon = 'calculationEngineer';
      break;
    case 1:
      obj.steps = overviewSteps.value.client;
      obj.subTitleValue = [t('dropCom'), t('modelCom'), t('deviceCom'), t('teamDev')];
      obj.titleName = t('leftMenus.clientEngineer');
      obj.titleIcon = 'clientEngineer';
      break;
    case 2:
      obj.steps = overviewSteps.value.collection;
      obj.subTitleValue = [
        t('deviceCompatibility'),
        t('collectionArchitecture'),
        t('dataProcessing'),
        t('crossPlatform'),
      ];
      obj.titleName = t('leftMenus.collectionEngineer');
      obj.titleIcon = 'collectionEngineer';
      break;
    case 3:
      obj.steps = overviewSteps.value.dataSource;
      obj.subTitleValue = [t('productDatasource'), t('dbs'), t('doubleDbs'), t('editText')];
      obj.titleName = t('leftMenus.dataSourceEngineer');
      obj.titleIcon = 'dataSourceEngineer';
      break;
    case 4:
      obj.steps = overviewSteps.value.alarm;
      obj.subTitleValue = [
        t('polymorphicAlarm'),
        t('customizableStorage'),
        t('intelligentAlarm'),
        t('integratedAlarmDisplay'),
      ];
      obj.titleName = t('leftMenus.alarmEngineer');
      obj.titleIcon = 'alarmEngineer';
      break;
    default:
      obj.steps = [];
      break;
  }
  return obj;
});

watchEffect(() => {
  const routeName = route.name;
  const showRoutes = ['main', 'client', 'datasource', 'calculate', 'alarm', 'collection'];
  isShow.value = showRoutes.includes(routeName);
});

/**
 * 处理菜单点击事件
 *
 * @param {object} row - 被点击的行数据
 */
const menuClickHandle = async (row) => {
  if (selectNode.value?.name === row.name) {
    return;
  }
  setBlackHandle();
  if (row.children) {
    return;
  }
  setLeftRowSelect(row);
  await router.push({ name: row.path });
};

const setBlackHandle = () => {
  if (selectNode.value) {
    getTagChildren(mainLeftMenusStore.mainLeftMenus, mainLeftMenusStore.mainLeftMenus[0]);
    selectNode.value = '';
  }
};
const toggleMenu = () => {
  isCollapse.value = !isCollapse.value;
  if (isCollapse.value) {
    asideWidth.value = '66';
  } else {
    asideWidth.value = '240';
  }
};

const treeMouseEnterHandle = (data) => {
  // root树不能删除/修改
  const parentIds = [
    'clientEngineer',
    'dataSourceEngineer',
    'calculationEngineer',
    'alarmEngineer',
    'collectionEngineer',
  ];
  if (parentIds.includes(data.id)) {
    data.addIcon = true;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }
  if (mainLeftMenusStore.defaultIds.includes(data.id)) {
    data.addIcon = false;
    data.editIcon = false;
    data.deleteIcon = false;
    return;
  }
  if (parentIds.includes(data.parent?.id)) {
    data.addIcon = false;
    data.editIcon = true;
    data.deleteIcon = true;
  }
};

const addClickHandle = (row) => {
  selectNode.value = {
    id: getGuid(),
    name: '',
    parent: { ...row },
  };
  if (!row.children || !Array.isArray(row.children)) {
    row.children = [];
  }
  row.children.push({ ...selectNode.value });
};

const editClickHandle = (row) => {
  selectNode.value = row;
};

const deleteClickHandle = async (data) => {
  if (loginUserStore.userInfo.userType !== '02') {
    ElMessage.warning(t('noGroupPermise'));
    await getLeftMenu();
    return;
  }
  await useConfirm(t('sureForDeleteProjectGroup', { name: data.name }), t('tip'));

  const res = await deleteProjectGroupServer({
    ...data,
  });
  if (res && res.errorCode === 0) {
    ElMessage.success(t('deleteProjectGroupSuccess'));
  }

  await getLeftMenu();
};

const saveEditHandle = async (row, inputType) => {
  if (loginUserStore.userInfo.userType !== '02') {
    ElMessage.warning(t('noGroupPermise'));
    await getLeftMenu();
    return;
  }
  selectNode.value = '';
  if (!row.name) {
    await getLeftMenu();
    return false;
  }
  if (inputType === 'create') {
    const { errorCode } = await createProjectGroupServer({
      ...row,
      projectType: row.parent.projectType,
    });
    if (errorCode === 0) {
      ElMessage.success(t('createProjectGroupSuccess'));
    }
  } else {
    const { errorCode } = await editProjectGroupServer({
      ...row,
      projectType: row.parent.projectType,
    });
    if (errorCode === 0) {
      ElMessage.success(t('editProjectGroupSuccess'));
    }
  }
  await getLeftMenu();
};

/**
 * @function handleReleaseOeration
 * @description 释放占位事件
 * @return null
 * @param data
 */
async function handleReleaseOeration(data) {
  const postData = [
    {
      handSeatFlag: data.handSeatFlag,
      itemId: data.itemId,
      projectId: data.projectId,
      token: data.token,
      type: data.type,
    },
  ];
  await releaseMultiSeatServer(postData);
}

const handleMessage = (event) => {
  switch (event?.key) {
    case 'client-release-multiseat':
      handleReleaseOeration(event.data);
      break;
    case 'refreshToken':
      if (loginUserStore.loginInfo.userId !== event.data.userId) {
        return;
      }
      setLoginInfo({ ...loginUserStore.loginInfo, ...event.data });
      break;
    default:
  }
};
</script>

<template>
  <CustomLayoutContainer
    :asideWidth="asideWidth"
    :defaultExpandKeys="defaultExpandKeys"
    :expandOnClick="true"
    :left-menus="mainLeftMenusStore.mainLeftMenus"
    :nodeClickKey="mainLeftMenusStore.leftRowSelect.id"
    :selectNode="selectNode"
    asideClass="main-layout-left"
    content-card-class="content-card"
    content-class="center"
    customLayoutClass="layout-container"
    node-key="id"
    svgClass="svg-icon"
    treeClass="main-custom-tree"
    @addClick="addClickHandle"
    @clickBlack="setBlackHandle"
    @deleteClick="deleteClickHandle"
    @editClick="editClickHandle"
    @menuClick="menuClickHandle"
    @saveEdit="saveEditHandle"
    @treeMouseEnter="treeMouseEnterHandle"
  >
    <template #left>
      <header v-if="!isCollapse" class="main-header">
        <div class="header-left">
          <el-image :src="systemConfigStore.homeLogoImageUrl" alt="KingDevClient" class="header-left-img" />
        </div>
        <div class="header-right">
          <div class="header-right-top">{{ systemConfigStore.config.productName }}</div>
          <div class="header-right-bottom">
            {{
              systemConfigStore.config.productInfo === '管控一体化全组态平台'
                ? t('mainTitle')
                : systemConfigStore.config.productInfo
            }}
          </div>
        </div>
      </header>
    </template>
    <template #tree-left>
      <CollapseLeft v-if="isCollapse" />
    </template>
    <template v-if="isMainHeaderShow" #content-header>
      <MainHeader @toggle-menu="toggleMenu" />
    </template>
    <template v-if="isShow" #main>
      <div v-if="mainLeftMenusStore.projectTypeArr.includes(mainLeftMenusStore.leftRowSelect.projectType)">
        <CustomOverview
          :steps="overviewData.steps"
          :subTitleValue="overviewData.subTitleValue"
          :titleIcon="overviewData.titleIcon"
          :titleName="overviewData.titleName"
          :expand="!mainLeftMenusStore.expand"
          @toggle="handleToggle()"
        />
      </div>
      <MainLable :expand="mainLeftMenusStore.expand" @toggle="handleToggle()" />
    </template>
  </CustomLayoutContainer>
</template>

<style lang="scss">
.layout-container {
  box-sizing: border-box;
  overflow: hidden;
  height: 100vh;

  .main-layout-left {
    height: 100vh;

    .svg-icon {
      width: 32px;
      height: 32px;
    }

    .el-sub-menu__title,
    .el-menu-item {
      height: calc(4vh); // 每个菜单项占屏幕高度的 3%
      line-height: calc(4vh); // 保证垂直居中
      min-height: 24px;
      max-height: 40px;
    }

    .el-menu--vertical {
      padding: 10px 0 0 0;
    }

    .main-custom-tree {
      font-size: 14px;
      color: #434343;
      background: linear-gradient(180deg, #eaf0ff 0%, #d9e5ff 100%);
      height: calc(100vh - 104px);
      overflow-y: auto;
      overflow-x: hidden;

      .el-tree-node__content {
        height: 48px;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        .el-icon {
          order: 2;
        }

        &:hover {
          background-color: #0348dd1c !important; // 移入背景色
        }
      }

      .is-current {
        & > .el-tree-node__content {
          background-color: #0348dd1a; // 选中背景色
          color: #0348dd;
        }
      }
    }
  }

  .el-header {
    padding: 0;
  }

  .header-left-img {
    width: 35px;
    height: 34px;
    margin: 2px 10px 0 0;
  }

  .header-right-top {
    font-size: 18px;
    font-weight: 700;
  }

  .header-right-bottom {
    font-size: 10px;
    font-weight: 500;
  }

  .center {
    align-items: center;
    justify-content: center;
    background: conic-gradient(
      from 63deg at 72.36% 236.62%,
      #898989 111.60000085830688deg,
      #e6f0f9 220deg,
      #f0faff 243deg,
      #f6f7ff 235deg,
      #f2f9ff 268deg,
      #ecf0f9 286deg,
      #fdf9f7 312deg,
      #fbf5f7 160deg
    );
  }

  .main-layout-left,
  .main-layout-left .el-menu-layout:not(.el-menu--collapse) {
    background: linear-gradient(180deg, #eaf0ff 0%, #d9e5ff 100%);
    border: none;
    border-radius: 5px 0 0 5px;
  }

  .main-header {
    padding: 16px 0 29px 15px;
    border-radius: 5px;
    display: flex;
    align-items: center;
  }

  .content-card {
    width: 100%;
    height: 100%;

    .el-card__body {
      padding: 0;
    }

    .main-contain-class {
      padding: 12px;
      height: calc(100vh - 70px);
      box-shadow: var(--el-box-shadow-light);
    }

    .no-box-shadow {
      padding: 0;
      height: calc(100vh - 70px);
      box-shadow: none;
    }
  }

  .main-custom-tree {
    .el-tree-node__children {
      .el-tree-node__content {
        padding-left: 31px !important;
      }
    }
  }
  .main-custom-tree {
    .el-tree-node.is-expanded.is-focusable {
      .ml-12 {
        font-weight: bold;
      }
    }
  }
}
</style>
