<script setup>
import { useI18n } from 'vue-i18n';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import CustomCard from '@/components/CustomOverview/CustomCard/CustomCard.vue';

const { t } = useI18n();
const props = defineProps({
  titleName: {
    type: String,
    default: '',
  },
  titleIcon: {
    type: String,
    default: '',
  },
  subTitleValue: {
    type: Array,
    default: [],
  },
  steps: {
    type: Array,
    default: [],
  },
  expand: {
    type: Boolean,
    default: false,
  },
});
const emits = defineEmits(['toggle']);
</script>

<template>
  <div class="guide-wrapper" v-if="expand">
    <el-row align="middle" class="guide-header" justify="space-between">
      <el-col :span="20" class="guide-flex">
        <CustomIcon :name="titleIcon" class="mr-12" svgClass="overview-icon" />
        <span class="guide-title"> {{ titleName }}</span>
        <div class="guide-subtitle">
          <div v-for="(item, index) in subTitleValue" :key="index" class="df justify-every">
            <div>{{ item }}</div>
            <el-divider v-if="index < subTitleValue.length - 1" direction="vertical"></el-divider>
          </div>
        </div>
      </el-col>
      <el-col :span="4" class="guide-rigth" @click="emits('toggle')">
        <el-link type="info" underline="never">
          <el-icon class="mr-5"><IEpHide /></el-icon>
          {{ t('hide') }}
        </el-link>
      </el-col>
    </el-row>
    <el-row :gutter="10" align="middle" class="step-container" justify="start">
      <template v-for="(step, index) in steps" :key="index">
        <el-col :span="4" class="step-card">
          <CustomCard :iconName="step.iconName" :label="step.label" />
          <CustomIcon v-if="index < steps.length - 1" class="ml-10" name="arrow" svgClass="arrow-icon" />
        </el-col>
      </template>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.arrow-icon {
  width: 2.6em;
  height: 1.6em;
}

.guide-wrapper {
  background: linear-gradient(90deg, #2d6fff 0%, #0348dd 100%);
  backdrop-filter: blur(6.5px);
  padding: 30px 0 0 0;
  border-radius: 20px;
  margin-bottom: 20px;
  height: 200px;
}

.guide-header {
  color: white;
  padding: 0 25px 0 47px;
}

.guide-flex {
  display: flex;
  align-items: center;
}

.guide-title {
  font-weight: bold;
  font-size: 18px;
  margin-right: 46px;
}

.guide-subtitle {
  display: flex;
  align-items: center;

  span {
    text-align: left;
    font-size: 14px;
    color: #ffffffcc;
  }

  .el-divider {
    margin: 0 15px;
    border-color: #ffffffcc;
  }
}

.guide-rigth {
  text-align: right;

  .el-link {
    margin-left: 21px;
    color: #ffffff;
  }
}

.step-container {
  background: linear-gradient(180deg, #9fbaf2 0%, #ecf1fa 100%);
  padding: 18px 46px;
  border-radius: 20px;
  margin-top: 20px;
  height: 126px;
  display: flex;
  align-items: center;
  text-align: center;
}

.step-card {
  display: flex;
  align-items: center;
  text-align: center;
  width: 242px;
  height: 90px;
}

.guide-arrow {
  text-align: center;
  padding: 0 22px;
}

.overview-icon {
  width: 2em;
  height: 2em;
}
.card-flex {
  order: 1;
  flex: 1;
}
.card-right {
  order: 2;
}
</style>
