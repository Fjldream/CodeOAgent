<script setup>
import { useI18n } from 'vue-i18n';
import { getGuid } from '@/utils/commonUtils';
import { regexValidator } from '@/utils/regexRules';

import { useClientMenuStore } from '@/stores/clientMenuStore.js';
import { useClientTranslationResourcey } from '@/composables/clientCompose/useClientTranslationResourcey';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();
const clientMenuStore = useClientMenuStore();
const { languageNameOptions } = useClientTranslationResourcey({ t, clientMenuStore });

const props = defineProps({
  dialogVisible: Boolean,
  tableColumns: {
    type: Array,
    default: [],
  },
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  customeLanguage: [
    regexValidator('safaText', t('plsInputSuccessLang')),
    { require: true, validator: validateDuplicate, trigger: 'blur' },
  ],
  languageId: [regexValidator('notEmpty', t('plsInputSuccessLang'))],
});

const form = reactive({
  paramList: [...props.tableColumns.map((item) => ({ ...item, id: item.languageId }))],
});
const selectOption = ref([]);
const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      emit('confirm', form.paramList);
    }
  });
};

//添加一组语言
/**
 * @function handleAddParam
 * @description 添加新参数
 * @returns null
 */
function handleAddParam() {
  form.paramList.push({
    id: `language_${getGuid()}`,
    languageId: '',
    customeLanguage: '',
  });
}

function validateDuplicate(rule, value, callback) {
  const customeLanguages = form.paramList.filter((item) => item.customeLanguage === value);
  const isDuplicate = customeLanguages.length > 1;
  if (isDuplicate) {
    callback(new Error(t('checkReplace')));
  }
  callback();
}

//删除一组数据
/**
 * @function handleDeleteParamList
 * @description 删除参数函数事件
 * @param {Object} row 行数据
 * @returns null
 */
function handleDeleteParamList(row) {
  form.paramList = form.paramList.filter((item) => item.id !== row.id);
}

watchEffect(() => {
  const options = [...languageNameOptions.value];
  const languageIds = form.paramList.map((item) => item.languageId);
  for (let index = 0; index < options.length; index++) {
    const optionItem = options[index];
    if (languageIds.includes(optionItem.languageId)) {
      optionItem.disabled = true;
    } else {
      optionItem.disabled = false;
    }
  }
  selectOption.value = options;
});
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('resourceManage')"
    :width="700"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <div class="param-list-con">
        <CustomStyleTable :showPagination="false" :tableData="form.paramList">
          <el-table-column :label="t('serialNumber')" align="center" show-overflow-tooltip type="index" width="55" />
          <el-table-column :label="t('selectLanguage')" align="center" show-overflow-tooltip>
            <template #default="{ row, $index }">
              <el-form-item :prop="`paramList.${$index}.languageId`" :rules="formRules.languageId">
                <el-select v-model="row.languageId" :placeholder="t('plsSetlect')">
                  <el-option
                    v-for="item in selectOption"
                    :key="item.languageId"
                    :disabled="item.disabled"
                    :label="item.label"
                    :value="item.languageId"
                  ></el-option>
                </el-select>
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column :label="t('quoteName')" align="center" prop="customeLanguage" show-overflow-tooltip>
            <template #default="{ row, $index }">
              <el-form-item :prop="`paramList.${$index}.customeLanguage`" :rules="formRules.customeLanguage">
                <el-input v-model="row.customeLanguage"></el-input>
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column :label="t('operate')" align="center" prop="paramList" show-overflow-tooltip>
            <template #default="scope">
              <el-button plain type="danger" @click="handleDeleteParamList(scope.row)">{{ t('delete') }}</el-button>
            </template>
          </el-table-column>
        </CustomStyleTable>
        <div
          :class="[
            'add-param-btn',
            {
              'add-param-btn-disabled': languageNameOptions.length === form.paramList.length,
            },
          ]"
          class="add-param-btn"
          @click="handleAddParam"
        >
          <el-icon>
            <IEpCirclePlusFilled />
          </el-icon>
        </div>
      </div>
      <div>
        <span>{{ t('quoteNameTip') }}</span>
      </div>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.el-button {
  width: 40px;
}

.param-list-con {
  width: 100%;
  border: 1px solid #dcdfe6;
  min-height: 400px;
  max-height: 400px;
  overflow-y: auto;

  .el-table .el-table__cell {
    padding: 2px 0 !important;
  }

  .el-input {
    height: 28px;

    .el-input__wrapper {
      box-shadow: none !important;
      border: 1px solid #dcdfe6;
      min-height: 28px !important;
    }
  }

  .el-button {
    height: 28px;
  }

  .add-param-btn {
    width: 100%;
    border: 1px dashed rgb(24, 144, 255);
    height: 36px;
    background: rgba(24, 144, 255, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;

    &:hover {
      background: rgba(24, 144, 255, 0.4);
    }
  }

  .add-param-btn-disabled {
    pointer-events: none;
    opacity: 0.5;
  }

  .el-icon {
    font-size: 15px;
    color: rgb(24, 144, 255);
  }
}
</style>
