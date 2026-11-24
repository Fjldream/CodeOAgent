<script setup>
import { useI18n } from 'vue-i18n';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';

const { t } = useI18n();
const props = defineProps({
  iconName: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '100%',
  },
  shadow: {
    type: String,
    default: 'never',
  },
});
</script>

<template>
  <el-card :shadow="shadow" :style="{ width, height }" class="custom-card">
    <el-row>
      <el-col :span="10">
        <CustomIcon :name="iconName" class="overview-icon" />
      </el-col>
      <el-col :span="14" class="content-col">
        <el-tooltip :content="label" :show-after="500">
          <div class="ellipsis w-100 label">{{ label }}</div>
        </el-tooltip>
        <el-link class="ellipsis" type="primary" underline="never">
          {{ t('detailDescription') }}
        </el-link>
      </el-col>
    </el-row>
  </el-card>
</template>

<style lang="scss" scoped>
.custom-card {
  background: linear-gradient(180deg, #ffffff80 0%, #ffffff40 100%);
  padding: 6px;
  border-radius: 12px;

  .el-link {
    color: #0348dd;

    :deep(.el-link__inner) {
      font-size: 12px;
    }
  }

  .content-col {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-direction: column;
  }

  :deep(.el-descriptions) {
    .el-descriptions__body {
      background: transparent;
    }

    .el-descriptions__cell {
      padding-bottom: 4px;
    }
  }

  .overview-icon {
    width: 115px;
    height: 78px;
  }
  .label {
    text-align: justify;
  }
}
</style>
