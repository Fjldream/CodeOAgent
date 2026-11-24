<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import {
  createCustomConfigServer,
  getCustomConfigServer,
  editCustomConfigServer,
  deleteCustomConfigServer,
  getCustomScriptServer,
} from '@/api/allRequest/alarmAPI.js';
import { useAlarmMenuStore } from '@/stores/alarmMenuStore';
import { useScriptEditorStore } from '@/stores/scriptEditorStore';
import { useConfirm } from '@/composables/useConfirm';

import { useAlarmScriptTree } from '@/composables/alarmCompose/useAlarmScriptTree';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import AddOrEditCustomDialog from '@/views/Main/AlarmView/AlarmDialogView/AddOrEditCustomDialog.vue';

const { t } = useI18n();
const scriptEditorStore = useScriptEditorStore();
const { setAlarmScriptTree } = useAlarmScriptTree({ t, scriptEditorStore });
// 响应式列表及选中行
const dialogVisible = ref(false);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
// 搜索数据
const searchKeyword = ref('');
const editRows = ref([]);
//检索
const filterData = computed(() =>
  tableData.value.filter((item) => item.name.toLowerCase().includes(searchKeyword.value.toLowerCase())),
);

const alarmMenuStore = useAlarmMenuStore();
const tableData = ref([]);
const tableColumns = computed(() => [
  {
    label: t('alarmItemName'),
    props: 'name',
  },
  {
    label: 'ID',
    props: 'id',
  },
  {
    label: t('alarmText'),
    props: 'text',
  },
  {
    label: t('alarmDelay'),
    props: 'delayMs',
  },
  {
    label: t('alarmPriority'),
    props: 'priority',
  },
  {
    label: t('createTime'),
    props: 'createTime',
  },
  {
    label: t('modifyTime'),
    props: 'modifyTime',
  },
]);

watchEffect(async () => {
  const { id, path } = alarmMenuStore.currentAlarmRow;
  if (!id || path !== 'alarm-custom') {
    return;
  }
  await nextTick();
  await getTableData();
});

const scriptEditoringStore = useScriptEditorStore();
const { addScriptEditorList, setVisible } = scriptEditoringStore;
const { scriptEditorList } = storeToRefs(scriptEditoringStore);

const timerScriptName = ref('');
const selectRow = ref([]);

//创建
const createDialog = async (type) => {
  dialogType.value = 'create';
  editRows.value = [];
  activeDialogComponent.value = AddOrEditCustomDialog;
  dialogVisible.value = true;
};
//编辑
const editDialog = async (row) => {
  dialogType.value = 'edit';
  const {
    id,
    name,
    text,
    delayMs,
    priority,
    extend_field_string1,
    extend_field_string2,
    extend_field_string3,
    extend_field_string4,
    extend_field_string5,
    extend_field_string6,
    extend_field_string7,
    extend_field_string8,
    enable,
  } = row;
  const paramList = [
    { label: 'extend_field_string1', extend_field_string: extend_field_string1 },
    { label: 'extend_field_string2', extend_field_string: extend_field_string2 },
    { label: 'extend_field_string3', extend_field_string: extend_field_string3 },
    { label: 'extend_field_string4', extend_field_string: extend_field_string4 },
    { label: 'extend_field_string5', extend_field_string: extend_field_string5 },
    { label: 'extend_field_string6', extend_field_string: extend_field_string6 },
    { label: 'extend_field_string7', extend_field_string: extend_field_string7 },
    { label: 'extend_field_string8', extend_field_string: extend_field_string8 },
  ];
  editRows.value = {
    id,
    name,
    text,
    delayMs,
    priority,
    paramList,
    enable,
  };

  activeDialogComponent.value = AddOrEditCustomDialog;
  dialogVisible.value = true;
};
//删除
const deleteHandle = async (delRow) => {
  await useConfirm(t(`sureForSelectRow`, { length: delRow.length }), t('sureForDelete'));
  const ids = delRow.map((row) => row.id);
  const restful = await deleteCustomConfigServer({ alarmItemIds: ids });
  if (restful && restful.errorCode === 0) {
    ElMessage.success(t('deleteSuccess'));
    await getTableData();
  }
};
// 确认及取消
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const { name, text, delayMs, priority, paramList } = data;
    const params = {
      name,
      text,
      delayMs,
      priority,
      enable: true,
    };
    paramList.forEach((element) => {
      params[element.label] = element.extend_field_string;
    });
    const restful = await createCustomConfigServer({ config: params });
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getTableData();
    }
  } else {
    const { name, text, delayMs, priority, paramList, id, enable } = data;
    const params = {
      name,
      text,
      delayMs,
      priority,
      enable,
    };
    if (paramList) {
      paramList.forEach((element) => {
        params[element.label] = element.extend_field_string;
      });
    }
    const restful = await editCustomConfigServer({ alarmItemId: id, config: params });
    if (restful && restful.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      await getTableData();
    }
  }
  dialogVisible.value = false;
};

const tableRowDBClick = (row) => {
  openScriptEditor(row);
};

const openScriptEditor = async (row) => {
  const hasScript = scriptEditorList.value.some((scriptEditor) => scriptEditor.id === row.id);
  const { data: context } = await getCustomScriptServer({
    alarmItemId: row.id,
  });
  if (!hasScript) {
    timerScriptName.value = row.name;
    const editData = {
      ...row,
      save: true,
      isHover: true,
      group: scriptEditoringStore.leftClickName,
      code: context,
    };
    addScriptEditorList(editData);
    setVisible(true);
    await setAlarmScriptTree();
  } else {
    setVisible(true);
  }
};

const tableSelect = (row) => {
  selectRow.value = row;
};
// 获取表格数据
const getTableData = async () => {
  const { data } = await getCustomConfigServer();
  tableData.value = data;
};
const refreshData = async () => {
  await getTableData();
};
</script>

<template>
  <div class="content">
    <header class="mb-12 fz-16">
      <span>{{ t('customAlarm') }}</span>
    </header>
    <div class="operate-list mb-20">
      <div class="button-list-con">
        <el-button type="primary" @click="createDialog">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selectRow.length !== 1" type="primary" @click="editDialog(selectRow[0])">
          <el-icon class="mr-5">
            <IEpEdit />
          </el-icon>
          {{ t('edit') }}
        </el-button>
        <el-button :disabled="selectRow.length === 0" type="danger" @click="deleteHandle(selectRow)">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
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
      :tableData="filterData"
      @selectionChange="tableSelect"
      @tableRowDBClick="tableRowDBClick"
      max-height="calc(100% - 120px)"
      class="table-custom"
      rowKey="id"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column
        v-for="row of tableColumns"
        :key="row.props"
        :label="row.label"
        :prop="row.props"
        align="center"
        min-width="10%"
        show-overflow-tooltip
      />
      <el-table-column :label="t('takeEffect')" align="center" min-width="25%" prop="enable">
        <template #default="{ row }">
          <el-switch
            v-model="row.enable"
            active-color="#13ce66"
            inactive-color="#ff4949"
            @Change="
              () => {
                dialogType = 'edit';
                handleConfirm(row);
              }
            "
          />
        </template>
      </el-table-column>
    </CustomStyleTable>
  </div>
  <div class="dialog">
    <component
      :is="activeDialogComponent"
      v-if="dialogVisible"
      v-model:dialogVisible="dialogVisible"
      :rowData="{ ...editRows, dialogType }"
      :userList="userList"
      :resourceList="resourceList"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style lang="scss" scoped>
.content {
  height: 100%;
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
}
</style>
