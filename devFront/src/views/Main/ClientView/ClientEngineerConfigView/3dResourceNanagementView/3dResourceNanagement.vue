<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { getSceneInfoServer } from '@/api/allRequest/clientAPI.js';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();
const userStore = useLoginUserStore();
const { guid } = clientMenuStore.currentClientEngineer;

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
watchEffect(async () => {
  const { path, update3dResource } = clientMenuStore.currentClientRow;
  if (path !== 'client-3d-resource-management') {
    return;
  }
  await nextTick(async () => {
    await getTableData();
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

const getTableData = async (id = clientMenuStore.currentClientRow.id) => {
  const { guid: projectId } = clientMenuStore.currentClientEngineer;
  const restful = await getSceneInfoServer({ projectId });
  if (restful?.errorCode === 0) {
    const { data } = restful;
    cardDate.value = data.map((item) => ({ ...item, name: item.filename.replace(/\.json$/, '') }));
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
  const { guid: GUID } = clientMenuStore.currentClientEngineer;
  const { tenantId } = userStore.userInfo;
  //打开图形模型页面编辑器
  window.open(`/kingclient/index.html?GUID=${GUID}&file3dName=${row.filename}&tenantId=${tenantId}`);
};

//点击操作
const cardClick = (name, event) => {
  //单选模式
  selected.value = [name];
};

//清除选中
const clearSelection = () => {
  selected.value = [];
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
</script>

<template>
  <div class="content">
    <header class="header-inline">
      <template v-for="(item, index) in clientMenuStore.currentClientTitle" :key="index">
        <div v-if="index < clientMenuStore.currentClientTitle.length - 1">
          <span class="text">{{ item }}</span>
          <span class="diagonal-divider"></span>
        </div>
        <div v-else>
          <span class="text-current">{{ item }}</span>
        </div>
      </template>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con"></div>
      <div class="search-input">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('plsInputKeywordSearch')"
          :suffix-icon="Search"
          style="width: 240px"
        />
        <el-button @click="refreshData" style="width: 36px">
          <el-icon class="mr-5"> <IEpRefresh /> </el-icon>
        </el-button>
      </div>
    </div>
    <div ref="scrollWrapper" class="card-grid" @scroll="onScroll" @click.self="clearSelection">
      <el-card
        v-for="item in visibleList"
        :key="item.name"
        :class="['select-card', { selected: selected.includes(item.name) }]"
        shadow="hover"
        @click="cardClick(item.name, $event)"
        @dblclick="rowDBClickHandle(item)"
      >
        <div class="card-content">
          <img
            :alt="t('imageUnLoad')"
            :src="`/api/client/get3dImg?imgPath=/${guid}/${item.imageName}&token=${userStore.accessToken}`"
          />
        </div>
        <template #footer>
          <el-text class="client-text" truncated>{{ item.name }}</el-text>
        </template>
      </el-card>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.content {
  width: 100%;
  height: 100%;
  .header-inline {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
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
  }
  .operate-list {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .button-list-con {
      display: flex;
      flex-wrap: wrap; // 按钮自动换行
      gap: 0; // 按钮之间的间距
      .el-button {
        border-radius: 4px;
      }
    }
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .search-box {
    min-width: 260px;
    margin-top: 8px;
    @media screen and (min-width: 768px) {
      margin-top: 0;
    }
    .search-input {
      width: 260px;
    }
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 15px;
    overflow: hidden auto;
    height: calc(100vh - 190px);
    grid-auto-rows: 119px;
  }
  .card-grid::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .card-grid::-webkit-scrollbar-thumb {
    background-color: #ececec;
    border-radius: 8px;
  }
  .card-grid::-webkit-scrollbar-track {
    background-color: transparent;
  }
  .select-card {
    width: 120px;
    height: 120px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .select-card.selected {
    background-color: #ecf5ff;
  }

  ::v-deep(.el-card__footer) {
    width: 100%;
    padding: 0.5em 0 0 0;
    border: none;
    span {
      background-color: #e8ecf2;
      display: block;
    }
  }
  .card-content {
    padding: 18px 0 10px 0;
    img {
      width: 64px;
      height: 64px;
    }
  }
  .client-text {
    margin: 0px;
  }
}
</style>
