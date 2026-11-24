<script setup>
import { useI18n } from 'vue-i18n';
import { MoreFilled } from '@element-plus/icons-vue';
import {
  getProjectFileServer,
  saveModuleImgServer,
  saveProjectDataServer,
  delImgServer,
} from '@/api/allRequest/clientAPI.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const userStore = useLoginUserStore();
const activeName = ref('0');
const imgName = ref('');
const uploadRef = ref(null);
const imgUrl = ref(null);
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
const columnCount = 5;

//计算总行数
const totalRows = computed(() => Math.ceil(cardDate.value.length / columnCount));

const props = defineProps({
  dialogVisible: Boolean,
  guid: String,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);

nextTick(async () => {
  await getTableData();
});
const getTableData = async () => {
  let pageList = [];
  const type = 15;
  const name = 'ImgResourceManager';
  const restful = await getProjectFileServer({ type, name, guid: props.guid });
  if (restful?.errorCode === 0) {
    pageList = restful.data.projectRes;
  }
  cardDate.value = pageList;
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
//更新visibleList数据（根据 scrollTop算出索引）
const updateVisibleList = () => {
  const startRow = Math.max(startRowIndex.value - buffer, 0);
  const endRow = Math.min(startRowIndex.value + visibleRowCount.value + buffer, totalRows.value);
  const start = startRow * columnCount;
  const end = endRow * columnCount;
  visibleList.value = cardDate.value.slice(start, end);
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
const handleLoading = async (uploadFile) => {
  const reader = new FileReader();
  const file = uploadFile.raw;
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    imgUrl.value = e.target.result;
    imgName.value = file.name;
    uploadRef.value?.clearFiles();
  };
};
const handleAdd = async () => {
  const isName = cardDate.value.some((item) => item.name === imgName.value);
  if (isName) {
    ElMessage.error(t('checkReplace'));
    return;
  }
  const params = {
    name: imgName.value,
    guid: props.guid,
    type: 16,
    postData: imgUrl.value,
  };
  const restful = await saveModuleImgServer(params);
  if (restful?.errorCode === 0) {
    const projectRes = cardDate.value.map((item) => ({ name: item.name }));
    projectRes.push({ name: imgName.value });
    const paramData = {
      projectRes: projectRes,
    };
    const type = 15;
    const name = 'ImgResourceManager';
    const setImgResourceRestful = await saveProjectDataServer({ name, paramData, projectId: props.guid, type });
    if (setImgResourceRestful?.errorCode === 0) {
      imgUrl.value = null;
      imgName.value = null;
      await getTableData();
      ElMessage.success(t('addSuccess'));
    }
  }
};
const handleDelete = async () => {
  const currentName = selected.value[0];
  const projectRes = cardDate.value.filter((item) => item.name !== currentName).map((item) => ({ name: item.name }));
  const paramData = {
    projectRes: projectRes,
  };
  const type = 15;
  const name = 'ImgResourceManager';
  const setImgResourceRestful = await saveProjectDataServer({ name, paramData, projectId: props.guid, type });
  if (setImgResourceRestful?.errorCode === 0) {
    const params = {
      imgPath: `${props.guid}/${currentName}`,
    };
    const restful = await delImgServer(params);
    if (restful?.errorCode === 0) {
      await getTableData();
      ElMessage.success(t('deleteSuccess'));
    }
  }
};
const handleCancle = async () => {
  emit('confirm');
};
const handleConfirm = (data) => {
  emit('confirm', selected.value[0]);
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :footerVisible="false"
    :title="t('imgResourceSelector')"
    :width="740"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-tabs v-model="activeName" type="border-card" class="client-tabs">
      <el-tab-pane :label="t('resources')">
        <div ref="scrollWrapper" class="card-grid" @scroll="onScroll" @click.self="clearSelection">
          <el-card
            v-for="item in visibleList"
            :key="item.name"
            :class="['select-card', { selected: selected.includes(item.name) }]"
            shadow="hover"
            @click="cardClick(item.name, $event)"
          >
            <div class="card-content">
              <el-image
                :src="`/api/client/img?imgPath=/${props.guid}/${item.name}&token=${userStore.accessToken}`"
                fit="fill"
              />
            </div>
            <template #footer>
              <el-text class="client-text" truncated>{{ item.name }}</el-text>
            </template>
          </el-card>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="t('loading')">
        <div class="client-loading">
          <el-row>
            <el-col :span="24">
              <span style="font-weight: 700">{{ t('attribute') }}</span>
            </el-col>
            <el-col :span="24">
              <div class="client-flax" style="margin-left: 35px">
                <span style="margin-right: 5px; width: 70px">{{ t('resourcesName') }}</span>
                <el-input readonly v-model="imgName"> </el-input>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="client-flax">
                <span style="margin-right: 5px; font-weight: 700">{{ t('image') }}</span>
                <el-upload
                  ref="uploadRef"
                  :auto-upload="false"
                  :limit="1"
                  :on-change="handleLoading"
                  :show-file-list="false"
                  accept=".png,.jpg"
                  class="ml-10"
                >
                  <el-button :icon="MoreFilled" style="line-height: normal"> </el-button>
                </el-upload>
              </div>
            </el-col>
            <el-col :span="24" class="client-image">
              <el-image :src="imgUrl" fit="fill" style="width: 100%; height: 100%" />
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
    <div class="client-button-list">
      <el-button @click="handleCancle">
        <el-icon class="mr-5">
          <IEpClose />
        </el-icon>
        {{ t('cancle') }}
      </el-button>
      <el-button :disabled="activeName !== '0' || selected.length !== 1" @click="handleConfirm">
        <el-icon class="mr-5">
          <IEpCheck />
        </el-icon>
        {{ t('define') }}
      </el-button>
      <el-button :disabled="activeName !== '0' || selected.length !== 1" type="danger" @click="handleDelete">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-button :disabled="activeName === '0' || !imgName" type="primary" @click="handleAdd">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('add') }}
      </el-button>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.client-tabs {
  min-height: 480px;
}
.client-loading {
  .el-col {
    padding: 5px 0;
  }
}
.client-flax {
  display: flex;
  align-items: center;
  flex-direction: row;
}
.client-button-list {
  display: flex;
  flex-direction: row-reverse;
  margin-top: 10px;
  gap: 0px; // 按钮之间的间距
  .el-button {
    border-radius: 4px;
    margin-left: 12px;
  }
}
.client-image {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  overflow: hidden auto;
  height: calc(100vh - 505px);
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
  .el-image {
    width: 45px;
    height: 45px;
  }
}
.client-text {
  margin: 0 5px;
}
</style>
