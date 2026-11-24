<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { getCurrentInstance } from 'vue';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useClientGraphicModelLibrary } from '@/composables/clientCompose/useClientGraphicModelLibrary';

const clientMenuStore = useClientMenuStore();
const { t } = useI18n();
const { appContext } = getCurrentInstance();
const {
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
} = useClientGraphicModelLibrary({ t, clientMenuStore, appContext });
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
      <div class="button-list-con">
        <el-button type="primary" @click="createDialog" v-if="!isRootGroup">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selected.length !== 1" type="primary" @click="editDialog" v-if="!isRootGroup">
          <el-icon class="mr-5">
            <IEpEditPen />
          </el-icon>
          {{ t('edit') }}
        </el-button>
        <el-button :disabled="!selected.length" type="danger" @click="handleDelete">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
        <el-upload ref="uploadRef" :auto-upload="false" :limit="50" :on-change="fileChange" :show-file-list="false"
          accept=".json" class="ml-10" multiple v-if="!isRootGroup">
          <el-button>
            <el-icon class="mr-5">
              <IEpDownload />
            </el-icon>
            {{ t('import') }}
          </el-button>
        </el-upload>
        <el-button :disabled="!selected.length" @click="exportHandle" v-if="!isRootGroup">
          <el-icon class="mr-5">
            <IEpUpload />
          </el-icon>
          {{ t('export') }}
        </el-button>
        <el-button :disabled="!selected.length" @click="copyHandle" v-if="!isRootGroup">
          <el-icon class="mr-5">
            <IEpCopyDocument />
          </el-icon>
          {{ t('copy') }}
        </el-button>
        <el-button :disabled="!copyGraphic.length" @click="pasteHandle" v-if="!isRootGroup">
          <el-icon class="mr-5">
            <IEpDocumentCopy />
          </el-icon>
          {{ t('paste') }}
        </el-button>
      </div>
      <div class="search-input">
        <el-input v-model="searchKeyword" :placeholder="t('plsInputKeywordSearch')" :suffix-icon="Search"
          style="width: 240px" />
        <el-button @click="refreshData" style="width: 36px">
          <el-icon class="mr-5">
            <IEpRefresh />
          </el-icon>
        </el-button>
      </div>
    </div>
    <div ref="scrollWrapper" class="card-grid" @scroll="onScroll" @click.self="clearSelection">
      <el-card v-for="item in visibleList" :key="item.name"
        :class="['select-card', { selected: selected.includes(item.name) }]" shadow="hover"
        @click="cardClick(item.name, $event)" @dblclick="rowDBClickHandle(item)">
        <div class="card-content">
          <img :alt="t('imageUnLoad')" :src="item.img" />
        </div>
        <template #footer>
          <el-text class="client-text" truncated>{{ item.name }}</el-text>
        </template>
      </el-card>
    </div>
    <component :is="activeDialogComponent" v-if="dialogVisible" v-model:dialogVisible="dialogVisible"
      :rowData="{ ...selectData[0], ...{ dialogType } }" @confirm="handleConfirm" />
  </div>
</template>

<style lang="scss" scoped>
.content {
  width: calc(100vw - 480px);
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
      gap: 0px; // 按钮之间的间距

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
    padding: 0.3em 0 0 0;
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
