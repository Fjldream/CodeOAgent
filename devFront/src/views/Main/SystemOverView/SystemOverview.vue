<script setup>
import { useI18n } from 'vue-i18n';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomCard from '@/components/CustomOverview/CustomCard/CustomCard.vue';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';

const { t } = useI18n();
const systemConfigStore = useSystemConfigStore();

// vite专属方法,批量导入文件夹下的图片
const createClientImgList = Object.values(
  import.meta.glob('/src/assets/image/systemOverviewImg/clientCreate/*.png', {
    eager: true,
    import: 'default',
  }),
);
const createDatasourceImgList = Object.values(
  import.meta.glob('/src/assets/image/systemOverviewImg/datasourceCreate/*.png', {
    eager: true,
    import: 'default',
  }),
);
const createCaculateImgList = Object.values(
  import.meta.glob('/src/assets/image/systemOverviewImg/caculateCreate/*.png', {
    eager: true,
    import: 'default',
  }),
);
const createAlarmImgList = Object.values(
  import.meta.glob('/src/assets/image/systemOverviewImg/alarmCreate/*.png', {
    eager: true,
    import: 'default',
  }),
);
const createCollectionImgList = Object.values(
  import.meta.glob('/src/assets/image/systemOverviewImg/collectionCreate/*.png', {
    eager: true,
    import: 'default',
  }),
);
const showList = [
  {
    name: computed(() => t('leftMenus.clientEngineer')),
    icon: 'clientEngineer',
    showPath: 'client',
    clickFlag: false,
    clickUseItemFlag: false,
    functionIntroduction: [
      {
        title: computed(() => t('allCom')),
        description: computed(() => t('allComTips')),
      },
      {
        title: computed(() => t('dataLock')),
        description: computed(() => t('dataLockTips')),
      },
      {
        title: computed(() => t('crossPlat')),
        description: computed(() => t('crossPlatTips')),
      },
      {
        title: computed(() => t('collab')),
        description: computed(() => t('collabTips')),
      },
    ],

    useGuidance: [
      {
        label: computed(() => t('createClient')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createClientImgList,
      },
      {
        label: computed(() => t('addDataSource')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createClientImgList,
      },
      {
        label: computed(() => t('addVariablesPro')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createClientImgList,
      },
      {
        label: computed(() => t('desginInterface')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createClientImgList,
      },
      {
        label: computed(() => t('publishOrDeploy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createClientImgList,
      },
    ],
  },
  {
    name: computed(() => t('leftMenus.dataSourceEngineer')),
    clickUseItemFlag: false,
    clickFlag: false,
    icon: 'dataSourceEngineer',
    showPath: 'datasource',
    functionIntroduction: [
      {
        title: computed(() => t('industrialData')),
        description: computed(() => t('industrialDataTips')),
      },
      {
        title: computed(() => t('dbs')),
        description: computed(() => t('dbsTips')),
      },
      {
        title: computed(() => t('doubleDbs')),
        description: computed(() => t('doubleDbsTips')),
      },
      {
        title: computed(() => t('typeExtend')),
        description: computed(() => t('typeExtendTips')),
      },
    ],

    useGuidance: [
      {
        label: computed(() => t('createDatasourceProject')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createDatasourceImgList,
      },
      {
        label: computed(() => t('publishOrDeploy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createDatasourceImgList,
      },
    ],
  },
  {
    name: computed(() => t('leftMenus.calculationEngineer')),
    clickFlag: false,
    clickUseItemFlag: false,
    icon: 'calculationEngineer',
    showPath: 'calculate',
    functionIntroduction: [
      {
        title: computed(() => t('frameScript')),
        description: computed(() => t('frameScriptTips')),
      },
      {
        title: computed(() => t('allModeCalculate')),
        description: computed(() => t('allModeCalculateTips')),
      },
      {
        title: computed(() => t('openIntelligent')),
        description: computed(() => t('openIntelligentTips')),
      },
      {
        title: computed(() => t('collab')),
        description: computed(() => t('collabTips')),
      },
    ],
    useGuidance: [
      {
        label: computed(() => t('createCaculationProject')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCaculateImgList,
      },
      {
        label: computed(() => t('addDatasource')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCaculateImgList,
      },
      {
        label: computed(() => t('addVariables')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCaculateImgList,
      },
      {
        label: computed(() => t('editScript')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCaculateImgList,
      },
      {
        label: computed(() => t('publishOrDeploy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCaculateImgList,
      },
    ],
  },
  {
    name: computed(() => t('leftMenus.alarmEngineer')),
    clickFlag: false,
    clickUseItemFlag: false,
    icon: 'alarmEngineer',
    showPath: 'alarm',
    functionIntroduction: [
      {
        title: computed(() => t('polymorphicAlarm')),
        description: computed(() => t('polymorphicAlarmTips')),
      },
      {
        title: computed(() => t('customizableStorage')),
        description: computed(() => t('customizableStorageTips')),
      },
      {
        title: computed(() => t('intelligentAlarm')),
        description: computed(() => t('intelligentAlarmTips')),
      },
      {
        title: computed(() => t('integratedAlarmDisplay')),
        description: computed(() => t('integratedAlarmDisplayTips')),
      },
    ],
    useGuidance: [
      {
        label: computed(() => t('createAlarmProject')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createAlarmImgList,
      },
      {
        label: computed(() => t('addDatasource')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createAlarmImgList,
      },
      {
        label: computed(() => t('addVariables')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createAlarmImgList,
      },
      {
        label: computed(() => t('configureAlarmStrategy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createAlarmImgList,
      },
      {
        label: computed(() => t('publishOrDeploy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createAlarmImgList,
      },
    ],
  },
  {
    name: computed(() => t('leftMenus.collectionEngineer')),
    clickFlag: false,
    clickUseItemFlag: false,
    icon: 'collectionEngineer',
    showPath: 'collection',
    functionIntroduction: [
      {
        title: computed(() => t('deviceCompatibility')),
        description: computed(() => t('deviceCompatibilityTips')),
      },
      {
        title: computed(() => t('collectionArchitecture')),
        description: computed(() => t('collectionArchitectureTips')),
      },
      {
        title: computed(() => t('dataProcessing')),
        description: computed(() => t('dataProcessingTips')),
      },
    ],
    useGuidance: [
      {
        label: computed(() => t('installCollectionDriver')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCollectionImgList,
      },
      {
        label: computed(() => t('createCollection')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCollectionImgList,
      },
      {
        label: computed(() => t('addDeviceAndTags')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCollectionImgList,
      },
      {
        label: computed(() => t('configure')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCollectionImgList,
      },
      {
        label: computed(() => t('publishOrDeploy')),
        iconName: 'describe1',
        clickUseItemFlag: false,
        imageList: createCollectionImgList,
      },
    ],
  },
];

const moduleList = reactive(
  showList.filter((item) => systemConfigStore.mainRoutesConfig.some((row) => item.showPath.search(row) !== -1)),
);
const selectModuleFuncIn = ref([]);
const useGuidance = ref([]);
const stepNum = ref(0);
const carouselImgList = ref([]);

onMounted(() => {
  moduleList[0].clickFlag = true;
  selectModuleFuncIn.value = moduleList[0].functionIntroduction;
  useGuidance.value = moduleList[0].useGuidance;
  useGuidance.value[0].clickUseItemFlag = true;
  carouselImgList.value = useGuidance.value[0].imageList;
  systemConfigStore.getConfig();
});

const clickModuleItem = (row) => {
  useGuidance.value[stepNum.value].clickUseItemFlag = false;
  for (let i = 0; i < moduleList.length; i++) {
    moduleList[i].clickFlag = false;
  }
  row.clickFlag = true;
  selectModuleFuncIn.value = row.functionIntroduction;
  useGuidance.value = row.useGuidance;
  useGuidance.value[0].clickUseItemFlag = true;

  carouselImgList.value = useGuidance.value[0].imageList;
};

const clickUseGuidanceItem = (row, index) => {
  for (let i = 0; i < useGuidance.value.length; i++) {
    useGuidance.value[i].clickUseItemFlag = false;
  }
  row.clickUseItemFlag = true;
  carouselImgList.value = row.imageList;
  stepNum.value = index;
};
</script>

<template>
  <div class="layout-card contnet-overview">
    <div class="welcome-title">
      <span class="textContent1">
        {{ t('welcomTips', { product: systemConfigStore.config.productName }) }}
      </span>
      <span class="textContent2">
        {{ t('moreDetail') }}
        <el-link>{{ t('helpCenter') }}</el-link>
      </span>
    </div>
  </div>
  <el-row :gutter="20" class="mb-20 five-row">
    <el-col v-for="(item, index) in moduleList" :key="index" class="five-col">
      <div
        :class="['module-item', item.clickFlag ? 'click-background' : 'no-click-background']"
        @click="clickModuleItem(item)"
      >
        <CustomIcon :name="item.icon" class="module-icon" />
        <span>{{ item.name }}</span>
      </div>
    </el-col>
  </el-row>

  <div class="bottom-warp">
    <div class="title-item mb-12">{{ t('funcIntroduction') }}</div>

    <el-row :gutter="100" class="func-intro content-class">
      <el-col v-for="(item, index) in selectModuleFuncIn" :key="index" :span="6">
        <div class="func-item">
          <el-tooltip :content="item.title" :show-after="500" effect="light">
            <div class="func-item-title ellipsis">{{ item.title }}</div>
          </el-tooltip>
          <el-tooltip :content="item.description" :show-after="500" effect="light">
            <div class="func-item-description multiline-ellipsis">{{ item.description }}</div>
          </el-tooltip>
        </div>
      </el-col>
    </el-row>
    <div class="title-item mb-12">{{ t('useGuide') }}</div>
    <el-row class="step-container content-class">
      <el-col v-for="(item, index) in useGuidance" :key="item.label" :span="4" class="step-card">
        <CustomCard
          :class="{ 'use-item-color': item.clickUseItemFlag }"
          :iconName="item.iconName"
          :label="item.label"
          @click="clickUseGuidanceItem(item, index)"
        />
        <CustomIcon v-if="index < useGuidance.length - 1" class="ml-10" name="arrow" svgClass="arrow-icon" />
      </el-col>
    </el-row>

    <div class="title-item">{{ t('useGuide') }}</div>
    <el-row class="content-class" style="flex: 1">
      <el-col class="img-contnet">
        <el-carousel :interval="5000" height="100%" style="width: 100%; height: 100%">
          <el-carousel-item v-for="(imgSrc, index) of carouselImgList" :key="imgSrc">
            <el-image
              :initial-index="index"
              :preview-src-list="carouselImgList"
              :src="imgSrc"
              fit="fill"
              style="width: 100%; height: 100%"
            ></el-image>
          </el-carousel-item>
        </el-carousel>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.contnet-overview {
  background: url('@/assets/image/systemTitleImg.png') no-repeat center cadetblue;
  background-size: cover;
  margin-bottom: 20px;

  .welcome-title {
    display: flex;
    flex-direction: column;
    margin: 30px;
    color: var(--custom-ffffff-color);
    --el-text-color-regular: var(--custom-ffffff-color);

    .textContent1 {
      font-size: 20px;
      font-weight: 900;
      height: 25.14px;
      line-height: 25.14px;
    }

    .textContent2 {
      font-size: 14px;
      font-weight: 700;
      height: 14px;
      line-height: 14px;
    }
  }
}

.arrow-icon {
  width: 2.6em;
  height: 1.6em;
}

.module-item {
  min-height: 100px;
  max-width: 320px;
  border: 2px solid #f1f1f1;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-evenly;
  align-items: center;
  cursor: pointer;

  .module-icon {
    height: 30px;
    width: 37px;
  }

  span {
    font-size: 20px;
  }
}

.img-contnet {
  height: 100%;
  border-radius: 12px;
  padding: 10px 0;
}

.module-item:hover {
  box-shadow: 0 3px 4px rgba(0, 0, 0, 0.1);
}

.func-intro {
  .func-item {
    height: 100%;
    padding: 10px;
    display: flex;
    flex-direction: column;
    background: #ffffff26;
    border-radius: 12px;
    border: 1px solid #fff;

    .func-item-title {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      margin: 10px;
    }

    .func-item-description {
      font-size: 12px;
      font-weight: 400;
      margin-left: 10px;
    }
  }
}

.title-item {
  height: 14px;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
  line-height: 14px;
  padding: 20px;
}

.step-card {
  display: flex;
  align-items: center;
  text-align: center;
  height: 90px;
  margin-right: 10px;
}

.guide-arrow {
  text-align: center;
  padding: 0 22px;
}

.overview-icon {
  width: 2em;
  height: 2em;
}

.useGuidance-item:hover {
  box-shadow: 0 3px 4px rgba(0, 0, 0, 0.1);
}

.bottom-warp {
  background: linear-gradient(180deg, #dce7ff 0.21%, #e5edff 15.39%, #e6eeff 40.82%, #ebf2ff 69.1%, #fff 100%);
  border: 1px solid #7fa7ff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 340px);
}

.use-item-color {
  background: linear-gradient(180deg, #8aadff80 0%, #d9e5ff80 100%);
}

.click-background {
  background: linear-gradient(90deg, #598eff 0%, #0348dd 100%);
  color: var(--custom-ffffff-color);
}

.no-click-background {
  background: linear-gradient(90deg, #e6eeff 0%, #c6d8ff 100%);
  color: var(--custom-1f2937-color);
}

.content-class {
  width: 96%;
  padding: 0 32px;
}
.five-col {
  flex: 1;
}
.five-row {
  display: flex;
}
</style>
