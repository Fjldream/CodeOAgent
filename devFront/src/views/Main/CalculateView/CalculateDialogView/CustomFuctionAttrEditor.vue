<script setup>
import { useI18n } from 'vue-i18n';
import { getNowStr } from '@/utils/dayjsUtil.js';
import { regexValidator } from '@/utils/regexRules.js';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';

const { t } = useI18n();

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    default: () => false,
  },
  isModify: {
    type: Boolean,
    default: () => false,
  },
  editData: {
    type: Object,
    default: {},
  },
});
// emit事件定义
const emit = defineEmits(['changeVisible', 'submitCustomFunction']);
const defDialogVisible = computed({
  get() {
    return props.dialogVisible;
  },
  set(newVal) {
    emit('changeVisible', newVal);
  },
});
// 表单ref
const customFuncFormRef = ref(null);
// 表单数据
const customFuncFormData = reactive({
  name: '',
  functionName: '',
  description: '',
  GUID: '',
  createTime: '',
  modifyTime: '',
  paramList: [],
  valid: false,
});

const customFuncFormRules = {
  id: [{ required: true, message: t('plsInputGuid'), trigger: 'blur' }],
  name: [
    regexValidator('noXss', t('illegalInput'), true, ['blur']),
    regexValidator('safaText', t('createScriptRule'), true, ['blur']),
  ],
  functionName: [
    regexValidator('noXss', t('illegalInput'), true, ['blur']),
    regexValidator('safaText', t('createScriptRule'), true, ['blur']),
  ],
  createTime: [regexValidator('noXss', t('illegalInput'), true, ['change'])],
  modifyTime: [regexValidator('noXss', t('illegalInput'), true, ['change'])],
  description: [regexValidator('noXss', t('illegalInput'), false, ['blur'])],
  paramsList: [{ validator: checkParamsList, trigger: 'change' }],
};

handleInitCreate();

/**
 * @function checkParamsList
 * @description 自定义单独做参数列表表单验证
 * @returns null
 */
function checkParamsList(rule, value, callback) {
  const xssReg = /^(?!.*(<|>|script|on\w+=|javascript:)).*$/i;
  const variableReg = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  for (let i = 0; i < customFuncFormData.paramList.length; i++) {
    const objData = customFuncFormData.paramList[i];
    if (!xssReg.test(objData.paramName) || !xssReg.test(objData.description)) {
      return callback(t('illegalInput'));
    }
    if (!variableReg.test(objData.paramName)) {
      return callback(t('variablesIillegal'));
    }
    if (objData.length > 50) {
      return callback(t('descriptionRuleA'));
    }
  }
  callback();
}

/**
 * @function handleInitCreate
 * @description 打开弹窗初始化
 * @returns null
 */
function handleInitCreate() {
  if (!props.editData.GUID) {
    Object.assign(customFuncFormData, {
      name: '',
      functionName: '',
      description: '',
      createTime: getNowStr(),
      modifyTime: getNowStr(),
      paramList: [],
      valid: false,
    });
  } else {
    Object.assign(customFuncFormData, {
      ...props.editData,
      paramList: props.editData.paramlist.split(',').map((paramName, index) => {
        return { seriesNo: index + 1, paramName, description: '' };
      }),
    });
  }
}

/**
 * @function handleAddParam
 * @description 添加新参数
 * @returns null
 */
function handleAddParam() {
  customFuncFormData.paramList.push({
    seriesNo: customFuncFormData.paramList.length + 1,
    paramName: '',
    description: '',
  });
}

/**
 * @function handleSubmitCustomFunc
 * @description 提交事件函数
 * @returns null
 */
function handleSubmitCustomFunc() {
  customFuncFormRef.value.validate((valid) => {
    if (valid) {
      emit('submitCustomFunction', JSON.parse(JSON.stringify(customFuncFormData)), props.isModify);
      emit('changeVisible', false);
    }
  });
}

/**
 * @function handleDeleteParamList
 * @description 删除参数函数事件
 * @param {Object} row 行数据
 * @returns null
 */
function handleDeleteParamList(row) {
  customFuncFormData.paramList = customFuncFormData.paramList.filter((item) => item.seriesNo !== row.seriesNo);
}
</script>
<template>
  <CustomDialog
    v-model:dialog-visible="defDialogVisible"
    :title="props.isModify ? t('editCustomFunction') : t('createCustomFunction')"
    :width="720"
    @confirm="handleSubmitCustomFunc"
  >
    <main>
      <el-form ref="customFuncFormRef" :model="customFuncFormData" :rules="customFuncFormRules" label-width="auto">
        <el-form-item :label="t('scriptName')" prop="name">
          <el-input v-model="customFuncFormData.name"></el-input>
        </el-form-item>
        <el-form-item :label="t('functionName')" prop="functionName">
          <el-input v-model="customFuncFormData.functionName"></el-input>
        </el-form-item>
        <el-form-item :label="t('paramsList')" prop="paramsList">
          <div class="param-list-con">
            <CustomStyleTable :showPagination="false" :tableData="customFuncFormData.paramList">
              <el-table-column
                :label="t('serialNumber')"
                align="center"
                show-overflow-tooltip
                type="index"
                width="55"
              />
              <el-table-column :label="t('name')" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-input v-model="row.paramName"></el-input>
                </template>
              </el-table-column>

              <el-table-column :label="t('operate')" align="center" prop="paramList" show-overflow-tooltip width="120">
                <template #default="{ row }">
                  <el-button plain type="danger" @click="handleDeleteParamList(row)">{{ t('delete') }}</el-button>
                </template>
              </el-table-column>
            </CustomStyleTable>
            <div class="add-param-btn" @click="handleAddParam">
              <el-icon>
                <IEpCirclePlusFilled />
              </el-icon>
            </div>
          </div>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('createTime')" prop="createTime">
              <el-input v-model="customFuncFormData.createTime" :disabled="true"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('modifyTime')" prop="modifyTime">
              <el-input v-model="customFuncFormData.modifyTime" :disabled="true"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="t('description')" prop="description">
          <el-input v-model="customFuncFormData.description" type="textarea"></el-input>
        </el-form-item>
      </el-form>
    </main>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.el-button {
  width: 40px;
}

.param-list-con {
  width: 100%;
  border: 1px solid #dcdfe6;
  min-height: 200px;
  max-height: 400px;
  overflow-y: scroll;

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

  .el-icon {
    font-size: 15px;
    color: rgb(24, 144, 255);
  }
}
</style>
