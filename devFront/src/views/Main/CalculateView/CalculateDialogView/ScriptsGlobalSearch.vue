<script setup>
import { Search } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { scriptSearchServer } from '@/api/allRequest/calculationAPI.js';
import { useScriptGlobalSearch } from '@/composables/CalculateMng/useScriptGlobalSearch.js';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const { handleLeaveForScriptEditor } = useScriptGlobalSearch({ t });

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => true,
  },
});
const emits = defineEmits(['update:dialogVisible']);
const searchContent = ref('');
const tableData = ref([]);
const tableLoading = ref(false);

/**
 * @function handleSearchBtn
 * @description 搜索按钮
 * @returns null
 */
async function handleSearchBtn() {
  if (searchContent.value) {
    tableLoading.value = true;
    const { data } = await scriptSearchServer(searchContent.value);
    tableLoading.value = false;
    tableData.value = data.map((element, i) => {
      element.seriesNo = i;
      element.name = element.scriptName.split('.')[0].split('_').slice(1).join('_');
      return element;
    });
  }
}
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('scriptSearch')"
    :footerVisible="false"
    :width="720"
    @update:dialogVisible="emits('update:dialogVisible', $event)"
  >
    <div class="global-search-con">
      <el-input
        v-model="searchContent"
        :placeholder="t('searchContent')"
        @keyup.enter="handleSearchBtn"
        style="width: 240px"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearchBtn"></el-button>
        </template>
      </el-input>
      <CustomStyleTable :pageSizes="[10, 20]" :tableData="tableData" max-height="450px" :loading="tableLoading">
        <el-table-column :label="t('serialNumber')" :width="55" align="center" prop="seriesNo" show-overflow-tooltip />
        <el-table-column :label="t('scriptName')" align="center" prop="name" show-overflow-tooltip />
        <el-table-column
          :label="t('scriptPath')"
          align="center"
          min-width="65%"
          prop="scriptPath"
          show-overflow-tooltip
        />
        <el-table-column :label="t('operate')" :width="150" align="center" show-overflow-tooltip>
          <template #default="scope">
            <span class="operation-btn" @click="handleLeaveForScriptEditor(scope.row)">{{ t('goOn') }}</span>
          </template>
        </el-table-column>
      </CustomStyleTable>
    </div>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.global-search-con {
  .el-button {
    width: 40px;
    background: white;
    border: 1px solid #c0c4cc;
    height: 100%;
    line-height: 1px;
    border-left: none;
  }

  .el-input {
    width: 100% !important;
    margin-bottom: 15px;

    :deep(.el-input__wrapper) {
      box-shadow: none !important;
      min-height: 28px !important;
      border: 1px solid #c0c4cc;
      border-radius: 0px;
      border-right: none;
    }
  }
  .operation-btn {
    cursor: pointer;
    color: #0348dd;
  }
}
</style>
