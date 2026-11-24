<script setup>
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import { useI18n } from 'vue-i18n';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import { getRoleListServer } from '@/api/allRequest/rolesAPI.js';
import { isObjectString } from '@/utils/commonUtils.js';

const { t } = useI18n();
const props = defineProps({
  title: String,
  dialogVisible: {
    type: Boolean,
    default: true,
  },
  editForm: Object,
});

const emit = defineEmits(['update:dialogVisible', 'roleConfirm', 'confirm']);

const tableData = ref([]);
const selectRow = ref([]);
const roleAllocationRef = useTemplateRef('roleAllocationRef');

nextTick(async () => {
  await getRoleList();
  await setDefaultCheck();
});

const getRoleList = async () => {
  const { data } = await getRoleListServer();
  tableData.value = data;
};

const setDefaultCheck = async () => {
  const tableRefs = roleAllocationRef.value.getTableRef();

  const roleIds = isObjectString(props.editForm.roles) ? JSON.parse(props.editForm.roles) : [];
  for (const row of tableData.value) {
    if (roleIds.includes(row.roleId)) {
      await nextTick();
      tableRefs.toggleRowSelection(row, true);
    }
  }
};
const selectionChange = (row) => {
  selectRow.value = row;
};

const confirm = () => {
  emit('roleConfirm', [...selectRow.value]);
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title="t('roleAllocate')"
    :width="960"
    @confirm="confirm"
    @update:dialog-visible="emit('update:dialogVisible', $event)"
  >
    <el-main>
      <CustomStyleTable
        ref="roleAllocationRef"
        :table-data="tableData"
        max-height="50vh"
        row-key="roleId"
        @selectionChange="selectionChange"
      >
        <el-table-column align="center" type="selection" width="55" />
        <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
        <el-table-column :label="t('role')" align="center" prop="roleName" show-overflow-tooltip />
        <el-table-column :label="t('description')" align="center" prop="description" show-overflow-tooltip />
      </CustomStyleTable>
    </el-main>
  </CustomDialog>
</template>

<style lang="scss" scoped>
.container {
  height: 65vh;
  border: 1px solid #e1e1e1;

  .aside-tree {
    border-right: 1px solid #e1e1e1;
  }

  .mt-10 {
    margin-top: 10px;
  }

  .el-main {
    padding: 0;
  }
}
</style>
