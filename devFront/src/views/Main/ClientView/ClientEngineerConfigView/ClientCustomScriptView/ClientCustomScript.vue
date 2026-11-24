<script setup>
import { genFileId } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';
import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { exportScriptJsonHandle, importScriptJsonHandle } from '@/utils/importExportUtils.js';
import { getGlobalScriptServer, setGlobalScriptServer } from '@/api/allRequest/clientAPI.js';
import { useConfirm } from '@/composables/useConfirm.js';
import { useClientScriptTree } from '@/composables/clientCompose/useClientScriptTree.js';

import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import ScriptMoveDialog from '@/views/Main/ClientView/ClientDialogView/ClientScriptMoveDialog.vue';

const { t } = useI18n();
const scriptEditorStore = useScriptEditorStore();
const clientMenuStore = useClientMenuStore();
const { addScriptEditorList, setVisible } = scriptEditorStore;
const { scriptEditorList, leftClickName } = storeToRefs(scriptEditorStore);

const { setClientScriptTree } = useClientScriptTree({ t, scriptEditorStore });
const tableColumns = computed(() => [
  {
    label: t('customScriptName'),
    props: 'name',
  },
  {
    label: t('descriptionInfo'),
    props: 'comment',
  },
]);

const description = ref('');
const tableData = ref([]);
const timerScriptName = ref('');
const selectRow = ref([]);
const uploadRef = useTemplateRef('uploadRef');
const moveVisible = ref(false);

watchEffect(async () => {
  const { id, path } = clientMenuStore.currentClientRow;
  await nextTick(async () => {
    if (path === 'client-custom-script') {
      await getTableData();
    }
  });
});
scriptEditorStore.$onAction(({ name, args, after }) => {
  if (name === 'saveEditorList') {
    after(async () => {
      await getTableData();
    });
  }
});

const getTableData = async () => {
  const { data } = await getGlobalScriptServer({ type: 'custom' });
  tableData.value = data.map((item, index) => {
    return {
      ...item,
      id: `custom_${item.name}_${index}`,
      type: 'custom',
    };
  });
};

const addHandle = () => {
  const name = `custom${tableData.value.length + 1}()`;
  openScriptEditor({
    id: name,
    name: name,
    comment: '',
    code: '',
    type: 'custom',
    operation: 'add',
  });
};

const EditHandle = (row) => {
  openScriptEditor({
    ...row,
    name: `${row.name}${row.params}`,
    type: 'custom',
    operation: 'edit',
  });
};

const deleteHandle = async (row) => {
  const names = row.map((item) => item.name);
  await useConfirm(t('sureForDeleteName', { name: names.join(',') }), t('tip'));
  await setGlobalScriptServer(
    { type: 'custom', operation: 'delete' },
    row.map((item) => item.name),
  );
  await getTableData();
  ElMessage.success(t('deleteSuccess'));
};

const exportHandle = async () => {
  const promiseAll = selectRow.value.map((item) =>
    exportScriptJsonHandle(
      {
        name: item.name,
        code: item.code,
        encrypt: item.encrypt,
        interval: item.interval,
        params: item.params,
        comment: item.comment,
      },
      `${item.name}.json`,
    ),
  );
  await Promise.all(promiseAll);
};
const tableRowDBClick = (row) => {
  openScriptEditor({
    ...row,
    name: `${row.name}${row.params}`,
    type: 'custom',
    operation: 'edit',
  });
};

const openScriptEditor = async (row) => {
  const hasScript = scriptEditorList.value.some((scriptEditor) => scriptEditor.id === row.id);
  if (!hasScript) {
    timerScriptName.value = row.name;
    description.value = row.comment;
    const editData = {
      ...row,
      name: timerScriptName,
      save: true,
      comment: description,
      isHover: true,
      group: `${leftClickName.value}`,
      clientCustomHeaderForm: {
        name: timerScriptName,
        comment: description,
      },
    };
    addScriptEditorList(editData);
    setVisible(true);
    await setClientScriptTree();
  } else {
    setVisible(true);
  }
};

const tableSelect = (row) => {
  selectRow.value = row;
};
/**
 * @function handleMoveScript
 * @description 移动脚本事件
 * @returns null
 */
const handleMoveScript = async () => {
  moveVisible.value = true;
};
// 文件上传
const fileChange = async (file) => {
  const data = await importScriptJsonHandle(file.raw);
  const bodyParams = {
    name: data.name,
    code: data.code,
    comment: data.comment,
    params: data.params,
    ID: data.ID,
  };
  const importScriptData = await setGlobalScriptServer({ type: 'custom', operation: 'add' }, bodyParams);
  if (importScriptData.errorCode === 0) {
    ElMessage.success(t('scriptImportTips'));
  }
  await getTableData();
};

// 默认清除文件
const exceedHandle = (files) => {
  uploadRef.value?.clearFiles();
  const file = files[0];
  file.uuid = genFileId();

  uploadRef.value?.handleStart(file);
};
async function handleScriptMove() {
  await getTableData();
}
</script>

<template>
  <div class="content">
    <header class="button df just-space mb-12">
      <el-button type="primary" @click="addHandle">
        <el-icon class="mr-5">
          <IEpCirclePlus />
        </el-icon>
        {{ t('create') }}
      </el-button>
      <el-button :disabled="selectRow.length === 0" type="danger" @click="deleteHandle(selectRow)">
        <el-icon class="mr-5">
          <IEpDelete />
        </el-icon>
        {{ t('delete') }}
      </el-button>
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        :on-change="fileChange"
        :on-exceed="exceedHandle"
        :show-file-list="false"
        accept=".json"
        class="ml-10"
      >
        <el-button>
          <el-icon class="mr-5">
            <IEpDownload />
          </el-icon>
          {{ t('import') }}
        </el-button>
      </el-upload>
      <el-button :disabled="selectRow.length === 0" class="ml-10" @click="exportHandle">
        <el-icon class="mr-5">
          <IEpUpload />
        </el-icon>
        {{ t('export') }}
      </el-button>
      <el-button :disabled="selectRow.length === 0" @click="handleMoveScript">
        {{ t('move') }}
      </el-button>
    </header>
    <CustomStyleTable
      :tableData="tableData"
      class="table-custom"
      max-height="calc(100vh - 152px)"
      row-key="id"
      @selectionChange="tableSelect"
      @tableRowDBClick="tableRowDBClick"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
      <el-table-column
        v-for="row of tableColumns"
        :label="row.label"
        :key="row.props"
        :prop="row.props"
        align="center"
        min-width="10%"
        show-overflow-tooltip
      />
      <el-table-column :label="t('operate')" align="center" width="160">
        <template #default="{ row }">
          <div class="df justify-every">
            <el-button link type="primary" @click="EditHandle(row)">
              <el-icon class="mr-5">
                <IEpEditPen />
              </el-icon>
              {{ t('edit') }}
            </el-button>
            <el-button link type="danger" @click="deleteHandle([row])">
              <el-icon class="mr-5">
                <IEpDelete />
              </el-icon>
              {{ t('delete') }}
            </el-button>
          </div>
        </template>
      </el-table-column>
    </CustomStyleTable>
  </div>
  <ScriptMoveDialog
    v-if="moveVisible"
    v-model:dialogVisible="moveVisible"
    :scriptType="6"
    :selectedScript="selectRow"
    @scriptMoveEvent="handleScriptMove"
  ></ScriptMoveDialog>
</template>

<style lang="scss" scoped>
.content {
  //width: calc(100vw - 480px);
  height: 100%;
  padding: 10px;
}
</style>
