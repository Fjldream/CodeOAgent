<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';

const { t } = useI18n();
const route = useRoute();
const mainLeftMenusStore = useMainLeftMenusStore();
const props = defineProps({
  expand: {
    type: Boolean,
    default: false,
  },
});
// 显示条件
const isShow = ref(true);

// 顶部图标名和路径文本
const currentPathArr = ref([]);
watchEffect(() => {
  const selectLeft = mainLeftMenusStore.leftRowSelect;

  const routeName = route.name;
  const showRoutes = ['main', 'client', 'datasource', 'calculate', 'alarm', 'collection'];
  isShow.value = showRoutes.includes(routeName);
  const pathArr = [];
  for (const mainLeftMenusElement of mainLeftMenusStore.mainLeftMenus) {
    if (mainLeftMenusElement?.children?.length) {
      const selectRow = mainLeftMenusElement?.children.some((row) => row.id === selectLeft.id);
      if (selectRow) {
        pathArr.push(mainLeftMenusElement.name, selectLeft?.name);
      }
    }
  }

  currentPathArr.value = pathArr;
});
const emits = defineEmits(['toggle']);
</script>

<template>
  <div v-if="isShow" class="header-inline">
    <div v-for="(item, index) in currentPathArr" :key="index">
      <span class="text">{{ item }}</span>
      <span v-if="index < currentPathArr.length - 1" class="diagonal-divider"></span>
    </div>
    <div class="card-right" v-if="expand" @click="emits('toggle')">
      <el-button link>
        <el-icon><IEpView /></el-icon>
        {{ t('useGuide') }}
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header-inline {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  position: relative;

  .diagonal-divider {
    background-color: #9ca3af;
    transform: rotate(35deg);
    margin: 0 8px;
    display: inline-block;
    width: 1px;
    height: 0.9em;
  }

  .icon {
    margin-right: 6px;
    font-size: 18px;
  }

  .text {
    font-size: 16px;
    color: #9ca3af;
    white-space: nowrap;
  }

  .text-current {
    font-size: 16px;
    color: #1f2937;
    white-space: nowrap;
  }
  .card-left {
    position: absolute;
    left: 0;
  }
  .card-right {
    position: absolute;
    right: 0;
  }
}
</style>
