<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useClientPageList } from '@/composables/clientCompose/useClientPageManage';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import ClientPageRecycleDialog from '@/views/Main/ClientView/ClientDialogView/ClientPageRecycleDialog.vue';
import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import PageManagerImportDialog from '@/views/Main/ClientView/ClientDialogView/PageManagerImportDialog.vue';
import LoadingComponent from '@/components/CustomLoading/LoadingComponent.vue';
import AddOrEditProjectDialog from '@/components/AddOrEditProjectDialog/AddOrEditProjectDialog.vue';
import ClientPageMoveDialog from '@/views/Main/ClientView/ClientDialogView/ClientPageMoveDialog.vue';

const { t } = useI18n();

const clientMenuStore = useClientMenuStore();
const dropdownHome = ref(null);
const {
  dialogVisible,
  searchKeyword,
  selectRows,
  filterData,
  maxHeight,
  formData,
  moveVisible,
  recycleVisible,
  recycleData,
  uploadRef,
  title,
  homeCommand,
  importDialogVisible,
  importData,
  loading,
  limit,
  copyPages,
  handleConfirm,
  handleCancelDialog,
  handleSelectionChange,
  createDialog,
  editDialog,
  openRecycle,
  openMove,
  handleMove,
  handleDelete,
  exportHandle,
  fileChange,
  exceedHandle,
  refreshData,
  handleRecycleRecover,
  handleRecycleDelete,
  handleRecycleVisible,
  tableRowDBClick,
  setHompage,
  handleCommand,
  getTableData,
  copyHandle,
  pasteHandle,
} = useClientPageList({ t, clientMenuStore, dropdownHome });
</script>

<template>
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
      <el-button type="primary" @click="createDialog">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('createPage') }}
      </el-button>
      <el-button :disabled="!selectRows.length" type="danger" @click="handleDelete(selectRows)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="limit"
        :on-change="fileChange"
        :on-exceed="exceedHandle"
        :show-file-list="false"
        accept=".json"
        class="ml-10"
        multiple
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="!selectRows.length" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button @click="openRecycle">
        <el-icon class="mr-5">
          <IEpSoldOut />
        </el-icon>
        {{ t('recover') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="openMove">
        <el-icon class="mr-5">
          <IEpSoldOut />
        </el-icon>
        {{ t('move') }}
      </el-button>
      <el-button :disabled="!selectRows.length" @click="copyHandle">
        <el-icon class="mr-5">
          <IEpCopyDocument />
        </el-icon>
        {{ t('copy') }}
      </el-button>
      <el-button :disabled="!copyPages.length" @click="pasteHandle">
        <el-icon class="mr-5">
          <IEpDocumentCopy />
        </el-icon>
        {{ t('paste') }}
      </el-button>
      <el-button :disabled="selectRows.length !== 1" @click="setHompage">
        <el-icon class="mr-5">
          <IEpStarFilled />
        </el-icon>
        <el-dropdown ref="dropdownHome" class="translation" trigger="contextmenu" @command="handleCommand">
          <span> {{ t('setHomePage') }}</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="(item, index) in homeCommand" :key="index" :command="item.value">
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-button>
    </div>
    <div class="search-box">
      <el-input
        v-model="searchKeyword"
        :placeholder="t('plsInputKeywordSearch')"
        :suffix-icon="Search"
        class="search-input"
        clearable
        size="default"
      />
      <el-button style="width: 36px" @click="refreshData">
        <el-icon class="mr-5">
          <IEpRefresh />
        </el-icon>
      </el-button>
    </div>
  </div>
  <CustomStyleTable
    :max-height="maxHeight"
    :tableData="filterData"
    class="table-custom"
    rowKey="id"
    @selectionChange="handleSelectionChange"
    @tableRowDBClick="tableRowDBClick"
  >
    <el-table-column align="center" type="selection" width="55" />
    <el-table-column :label="t('pageName')" align="left" min-width="25%" prop="name" show-overflow-tooltip>
      <template #default="{ row }">
        <el-row :gutter="0" align="middle" class="page-name">
          <el-col :span="2">
            <el-button link size="large" type="primary">
              <el-icon>
                <IEpPostcard />
              </el-icon>
            </el-button>
          </el-col>
          <el-col :span="20">
            <el-link type="primary" underline="never" @click="tableRowDBClick(row)">
              {{ row.name }}
            </el-link>
            <el-button v-if="row.homePage" link size="large" type="success">
              <el-icon>
                <IEpMonitor />
              </el-icon>
            </el-button>
            <el-button v-if="row.appHomePage" link size="large" type="success">
              <el-icon>
                <IEpIphone />
              </el-icon>
            </el-button>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column :label="t('description')" align="left" min-width="25%" prop="description" show-overflow-tooltip />
    <el-table-column :label="t('createInfo')" align="left" min-width="25%" show-overflow-tooltip sortable>
      <template #default="{ row }">
        <el-row :gutter="16" align="middle">
          <el-col :span="4">
            <CustomIcon name="userPerson" svgClass="userPerson-icon" />
          </el-col>
          <el-col :span="19">
            <span class="name-class">
              {{ row.user }}
            </span>
            <br />
            <span class="time-class">{{ row.createtime }}</span>
          </el-col>
        </el-row>
      </template>
    </el-table-column>
    <el-table-column :label="t('operate')" align="center" width="160">
      <template #default="{ row }">
        <div class="df justify-every">
          <el-link type="primary" @click="editDialog(row)">
            <el-icon class="mr-5">
              <IEpEditPen />
            </el-icon>
            {{ t('edit') }}
          </el-link>
          <el-link type="danger" @click="handleDelete([row])">
            <el-icon class="mr-5">
              <IEpDelete />
            </el-icon>
            {{ t('delete') }}
          </el-link>
        </div>
      </template>
    </el-table-column>
  </CustomStyleTable>

  <AddOrEditProjectDialog
    v-if="dialogVisible"
    v-model:dialog-visible="dialogVisible"
    :rowData="formData"
    :title="title"
    @confirm="handleConfirm"
    @update:dialogVisible="handleCancelDialog"
  />
  <ClientPageRecycleDialog
    v-if="recycleVisible"
    v-model:dialog-visible="recycleVisible"
    :recycleData="recycleData"
    @deletePages="handleRecycleDelete"
    @recoverPages="handleRecycleRecover"
    @update:dialogVisible="handleRecycleVisible"
  />
  <PageManagerImportDialog
    v-if="importDialogVisible"
    v-model:dialogVisible="importDialogVisible"
    :table-data="importData"
    @confirm="getTableData"
  />
  <ClientPageMoveDialog v-if="moveVisible" v-model:dialogVisible="moveVisible" @confirm="handleMove" />
  <LoadingComponent v-if="loading" :loading="loading" :loading-text="t('fileReading')" />
</template>

<style lang="scss" scoped>
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

.page-name {
  .el-button {
    padding: 5px;
  }

  .el-button + .el-button {
    margin: 0;
  }
}

.userPerson-icon {
  width: 2em;
  height: 2em;
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

.operate-button {
  .el-button {
    width: 48px;
    height: 21px;
    padding: 0; // 去掉内边距以保持设定高度
    font-size: 14px;
    line-height: 48px; // 垂直居中
    text-align: center;
    white-space: nowrap; // 防止文字换行
    overflow: hidden;
    text-overflow: ellipsis; // 超出隐藏（可选）
  }
}
</style>
