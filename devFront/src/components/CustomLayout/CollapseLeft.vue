<script setup>
import { useMainLeftMenusStore } from '@/stores/mainLeftMenusStore.js';
import router from '@/router/index.js';
import { useSystemConfigStore } from '@/stores/systemConfigStore.js';

import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';

const mainLeftMenusStore = useMainLeftMenusStore();

const systemConfigStore = useSystemConfigStore();
const { setLeftRowSelect } = mainLeftMenusStore;
const isVisible = ref(false);

const treeData = ref([]);
const virtualRef = shallowRef({ getBoundingClientRect: () => new DOMRect() });
const defaultProps = markRaw({
  children: 'children',
  label: 'name',
});

const clickHandle = (row, el) => {
  if (!row.children) {
    setLeftRowSelect(row);
    router.push({ name: row.path });
    return;
  }
  virtualRef.value = {
    getBoundingClientRect: () => new DOMRect(el.clientX + 10, el.clientY, 0, 0),
    clientWidth: 0,
    clientHeight: 0,
  };
  treeData.value = row.children;
  isVisible.value = true;
};

const menuMouseEnter = () => {
  isVisible.value = false;
};
const nodeClick = (row) => {
  setLeftRowSelect(row);
  router.push({ name: row.path });
};
</script>

<template>
  <div class="collapse-left">
    <div>
      <el-image :src="systemConfigStore.homeLogoImageUrl" alt="KingDevClient" class="header-left-img" />
    </div>
    <el-tooltip
      v-for="item of mainLeftMenusStore.mainLeftMenus"
      :key="item.id"
      :content="item.name"
      :show-after="500"
      effect="light"
      placement="right-end"
    >
      <div class="icon-content" @mouseenter="menuMouseEnter" @click.prevent="clickHandle(item, $event)">
        <CustomIcon :name="item.icon" />
      </div>
    </el-tooltip>
  </div>
  <el-popover
    v-if="isVisible"
    :virtual-ref="virtualRef"
    :visible="isVisible"
    placement="right-start"
    trigger="click"
    virtual-triggering
    width="260"
    @mouseleave="isVisible = false"
  >
    <el-tree :data="treeData" :props="defaultProps" @node-click="nodeClick"></el-tree>
  </el-popover>
</template>

<style lang="scss" scoped>
.collapse-left {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .icon-content {
    width: 32px;
    height: 32px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background-color: #fff;
    }
  }

  .header-left-img {
    width: 100%;
    margin: 20px auto;
  }
}
</style>
