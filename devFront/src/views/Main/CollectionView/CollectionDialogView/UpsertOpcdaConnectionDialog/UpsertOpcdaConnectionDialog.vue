<script setup>
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import {
  getDaServer,
  addDaServer,
  editDaServer,
  delDaServer,
  getDaDeviceServer,
} from '@/api/allRequest/collectionAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import AddOpcdaOpcdaConnectionDialog from '@/views/Main/CollectionView/CollectionDialogView/UpsertOpcdaConnectionDialog/AddOpcdaOpcdaConnectionDialog.vue';

const { t } = useI18n();

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: true,
});
const emit = defineEmits(['confirm']);
const dialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const dialogConnctionVisible = ref(false);
const editRows = ref({});
const daServerData = ref([]);
const selectRows = ref([]);

nextTick(async () => {
  await getDaServerList();
});

//获取设备列表
const getDaServerList = async () => {
  const data = await getDaServer();
  if (data) {
    daServerData.value = data;
  }
};
/**
 * @function handleSelectionChange
 * @description 处理表格选择改变事件
 * @param val
 * @return null
 */
function handleSelectionChange(val) {
  selectRows.value = val;
}

/**
 * @function handleDaServer
 * @param operate
 */
async function handleDaServer(operate) {
  switch (operate) {
    case 'add':
      dialogType.value = 'create';
      editRows.value = {};
      activeDialogComponent.value = AddOpcdaOpcdaConnectionDialog;
      dialogConnctionVisible.value = true;
      break;
    case 'del':
      const filterArr = selectRows.value.filter((item) => item.redundancyStyle !== 0);
      if (filterArr.length > 0) {
        ElMessage.warning(t('redundancyDelTooltip'));
        break;
      }
      await useConfirm(`${t(`sureForSelectRow`, { length: selectRows.value.length })}`, t('sureForDelete'));
      const idArr = selectRows.value.map((row) => row.id);
      const restful = await delDaServer({ idArr });
      if (restful?.errorCode === 0) {
        ElMessage.success(t('deleteSuccess'));
        await getDaServerList();
      }
      break;
    case 'edit':
      dialogType.value = 'edit';
      editRows.value = selectRows.value[0];
      activeDialogComponent.value = AddOpcdaOpcdaConnectionDialog;
      dialogConnctionVisible.value = true;
      break;
    default:
      break;
  }
}
// 确认及取消
const handleConfirm = async (data) => {
  if (dialogType.value === 'create') {
    const restful = await addDaServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      await getDaServerList();
      dialogConnctionVisible.value = false;
    }
  } else {
    // 判断从连接是否有设备
    const daDeviceList = await getDaDeviceServer({ connectName: data.redunDeviceName });
    if (data.redundancyStyle !== 0 && daDeviceList.length > 0) {
      ElMessage.warning(t('daRedunBackDeviceTooltip'));
      return;
    }
    const restful = await editDaServer({ ...data });
    if (restful?.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      await getDaServerList();
      dialogConnctionVisible.value = false;
    }
  }
};
const handleclose = async () => {
  emit('confirm');
};
</script>
<template>
  <CustomDialog
    v-model:dialogVisible="dialogVisible"
    :footerVisible="false"
    :title="t('connectionsManager')"
    :width="1368"
    @close="handleclose"
  >
    <main>
      <div class="tool-left">
        <el-button @click="handleDaServer('add')">
          <el-icon class="mr-5">
            <IEpCirclePlus />
          </el-icon>
          {{ t('create') }}
        </el-button>
        <el-button :disabled="selectRows.length !== 1" @click="handleDaServer('edit')">
          <el-icon class="mr-5">
            <IEpEdit />
          </el-icon>
          {{ t('edit') }}
        </el-button>
        <el-button type="danger" :disabled="!selectRows.length" @click="handleDaServer('del')">
          <el-icon class="mr-5">
            <IEpDelete />
          </el-icon>
          {{ t('delete') }}
        </el-button>
      </div>
      <div class="pt-12">
        <CustomStyleTable
          :tableData="daServerData"
          @selectionChange="handleSelectionChange"
          rowKey="id"
          class="table-custom"
          max-height="calc(20vh + 400px)"
        >
          <el-table-column align="center" type="selection" width="55" />
          <el-table-column :label="t('name')" align="center" prop="name" show-overflow-tooltip />
          <el-table-column label="IP" align="center" prop="ip" show-overflow-tooltip />
          <el-table-column :label="t('maxReconnects')" align="center" prop="maxReconnectNum" show-overflow-tooltip />
          <el-table-column :label="t('heartbeatCheckMs')" align="center" prop="heartInterval" show-overflow-tooltip />
          <el-table-column :label="t('redundancyStatus')" align="center" prop="redundancyStyle" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag v-if="row.redundancyStyle === 0">未配置</el-tag>
              <el-tag v-if="row.redundancyStyle === 1" type="success">主设备</el-tag>
              <el-tag v-if="row.redundancyStyle === 2" type="warning">从设备</el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="t('redundancyRelateDev')"
            align="center"
            prop="redunDeviceName"
            show-overflow-tooltip
          />
        </CustomStyleTable>
      </div>
    </main>
  </CustomDialog>

  <component
    :is="activeDialogComponent"
    v-if="dialogConnctionVisible"
    v-model:dialogVisible="dialogConnctionVisible"
    :rowData="{ ...editRows, dialogType }"
    @confirm="handleConfirm"
  />
</template>
<style lang="scss" scoped>
.el-dialog {
  main {
    min-height: 650px;
    max-height: 650px;
    padding-bottom: 20px;

    span {
      display: inline-block;
      margin-bottom: 10px;
    }

    :deep(.el-table) {
      max-height: 600px !important;

      .el-table__inner-wrapper {
        height: 600px !important;
      }
    }
  }
  .tool-left {
    display: flex;
    flex-direction: row;
    justify-content: left;
    .el-button:not(:first-child) {
      margin-left: 10px;
    }
  }
  .tool-right {
    display: flex;
    flex-direction: row;
    justify-content: right;

    .el-button {
      width: 80px;
    }
  }
  .el-tag {
    margin-bottom: 0px;
    line-height: 21px;
  }
}
</style>
