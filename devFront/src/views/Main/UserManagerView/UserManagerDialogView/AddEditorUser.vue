<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules.js';
import { isObjectString } from '@/utils/commonUtils.js';
import { userStrongPassword } from '@/utils/passwordUtils.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useRolesStore } from '@/stores/rolesStore.js';

import LabelTitle from '@/components/LabelTitle/LabelTitle.vue';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import RoleAllocation from '@/views/Main/UserManagerView/UserManagerDialogView/RoleAllocation.vue';
import { getSecurity } from '@/api/allRequest/userManagerApi.js';

const { t } = useI18n();

const props = defineProps({
  title: String,
  dialogVisible: {
    type: Boolean,
    default: false,
  },
  editForm: Object,
});

const emits = defineEmits(['update:dialogVisible', 'confirm']);

const userStore = useLoginUserStore();
const rolesStore = useRolesStore();
const tableRef = useTemplateRef('tableRef');
const formRef = useTemplateRef('formRef');
const roleDialogVisible = ref(false);
const tableData = ref([]);
const securityData = ref(['admin']);
const userForm = reactive({
  userBan: props.editForm.userBan ? props.editForm.userBan : false,
  ...props.editForm,
  isMultiLogin: props.editForm.isMultiLogin === 1,
  isSSO: props.editForm.isSSO === 1,
  userType: props.editForm.userType ? props.editForm.userType : '03',
  passwordValidTime: props.editForm.passwordValidTime ? props.editForm.passwordValidTime : 0,
});

const ruleForm = reactive({
  password: [
    {
      required: true,
      message: t('passwordRule'),
      trigger: ['change', 'blur'],
    },
    {
      validator: (rule, value, callback) => {
        if (!userStrongPassword(value)) {
          return callback(new Error(t('passwordRule4')));
        }
        callback();
      },
      trigger: ['change', 'blur'],
    },
  ],
  confirmPassword: [
    {
      required: true,
      message: t('passwordRule2'),
      trigger: ['change', 'blur'],
    },
    {
      validator: (rule, value, callback) => {
        if (userForm.password !== value) {
          return callback(new Error(t('passwordRule3')));
        }
        callback();
      },
      trigger: ['change', 'blur'],
    },
  ],
  userName: [
    {
      required: true,
      message: t('userNameRule'),
      trigger: ['change', 'blur'],
    },
    {
      validator: (rule, value, callback) => {
        const isCurrent = securityData.value.some((row) => value.search(new RegExp(row, 'i')) !== -1);
        if (isCurrent) {
          return callback(new Error(t('userNameCheck')));
        }
        callback();
      },
    },
    regexValidator('userName', t('userListRule')),
  ],
  description: [regexValidator('', t('userListRule1'), false)],
  passwordValidTime: [
    {
      required: true,
      message: t('passwordValidTimeRule'),
      trigger: ['change', 'blur'],
    },
    { type: 'number', message: t('numberTips'), min: 0, max: 90, trigger: ['change', 'blur'] },
  ],
});

const maxHeight = computed(() => {
  const tableDataLength = tableData.value.length;

  if (tableDataLength === 0) {
    return '41px';
  }
  if (tableDataLength === 1) {
    return 'calc(176px - 86px)';
  }
  return 'calc(176px - 36px)';
});

nextTick(async () => {
  setTableData();
  setRoleNames();
  const {
    data: { blackList },
  } = await getSecurity();
  securityData.value = [...securityData.value, ...blackList.split(',')];
});

const setTableData = () => {
  const data = [];
  if (userForm?.extendField && isObjectString(userForm.extendField)) {
    const extendField = JSON.parse(userForm.extendField);
    for (const key in extendField) {
      data.push({
        field: key,
        content: extendField[key],
      });
    }
  }
  tableData.value = data;
};

const setRoleNames = () => {
  const roleIds = isObjectString(userForm.roles) ? JSON.parse(userForm.roles) : [];
  userForm.roleNames = roleIds.reduce((acc, curr, index) => {
    const roleInfo = rolesStore.roleList.find((role) => curr === role.roleId);
    acc += roleInfo?.roleName ?? '';
    if (index !== roleIds.length - 1) {
      acc += ',';
    }
    return acc;
  }, '');
};

const deleteSafeSet = (index) => {
  tableData.value.splice(index, 1);
};

const addSafeSet = async () => {
  const noInput = tableData.value.some((item) => !item.field || !item.content);
  if (noInput) {
    return ElMessage({
      type: 'warning',
      message: t('userListRule3'),
    });
  }
  tableData.value.push({
    field: `field${tableData.value.length + 1}`,
    content: `content${tableData.value.length + 1}`,
  });

  await nextTick();
  const tables = tableRef.value?.getTableRef();
  const scrollBody = tables.value?.$el.querySelector('.el-scrollbar__wrap');
  if (scrollBody) {
    tables.value?.setScrollTop(scrollBody.scrollHeight);
  }
};

const selectRoles = () => {
  roleDialogVisible.value = true;
};

const confirmHandle = (row) => {
  userForm.roleNames = row.map((item) => item.roleName);
  userForm.roles = JSON.stringify(row.map((item) => item.roleId));
  roleDialogVisible.value = false;
};

const userConfirmHandle = async () => {
  if (!formRef.value) {
    return;
  }
  let validateField = ['password', 'confirmPassword', 'userName', 'description', 'passwordValidTime'];

  if (userForm.userId) {
    validateField = ['userName', 'description', 'passwordValidTime'];
  }
  await formRef.value.validateField(validateField, (valid, field) => {
    if (!valid) {
      return;
    }
    const sendForm = { ...userForm, extendField: getExtendField() };
    sendForm.password = btoa(sendForm.password);
    emits('confirm', sendForm);
  });
};

const getExtendField = () => {
  return tableData.value.reduce((current, pre) => {
    if (!pre.field || !pre.content) {
      return current;
    }
    current[pre.field] = pre.content;
    return current;
  }, {});
};
</script>

<template>
  <CustomDialog
    :dialog-visible="dialogVisible"
    :title="title"
    :width="720"
    @confirm="userConfirmHandle"
    @update:dialog-visible="emits('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="userForm" :rules="ruleForm" label-position="right" label-width="auto">
      <el-row>
        <el-col :span="24">
          <LabelTitle :title="t('basicConfig')" />
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('userName')" prop="userName">
            <el-input v-model="userForm.userName" autocomplete="off"></el-input>
          </el-form-item>
        </el-col>
        <el-col v-if="!!!userForm.userId" :span="12">
          <el-form-item prop="password">
            <template #label>
              <div>
                {{ t('password') }}
                <el-popover :content="t('passwordRule1')" placement="top-start">
                  <template #reference>
                    <el-icon color="#0348dd"><IEpQuestionFilled /></el-icon>
                  </template>
                </el-popover>
              </div>
            </template>
            <el-input v-model="userForm.password" autocomplete="new-password" show-password type="password"></el-input>
          </el-form-item>
        </el-col>

        <el-col v-if="!!!userForm.userId" :span="12">
          <el-form-item :label="t('confirmPassword')" prop="confirmPassword">
            <el-input
              v-model="userForm.confirmPassword"
              show-password
              type="password"
              autocomplete="password"
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('userType')">
            <el-input v-if="userStore.userInfo.userType === '01'" v-model="userForm.userTypeStr" disabled></el-input>
            <el-select v-else v-model="userForm.userType" :placeholder="t('plsUserType')">
              <el-option :label="t('ordinaryUser')" value="03"></el-option>
              <el-option :label="t('secondaryManager')" value="05"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="t('description')" prop="description">
            <el-input v-model="userForm.description"></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <LabelTitle :title="t('safeConfig')" />
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('userBan')">
            <el-switch v-model="userForm.userBan" :active-value="false" :inactive-value="true"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="12" class="picker-width">
          <div class="label-flex">
            <el-checkbox v-model="userForm.userInvalid"></el-checkbox>
            <el-form-item :label="t('userLoseEffect')">
              <el-date-picker
                v-model="userForm.invalidDate"
                :disabled="!userForm.userInvalid"
                class="w-100"
                format="YYYY-MM-DD"
                type="date"
                value-format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
          </div>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('multiLogin')">
            <el-switch v-model="userForm.isMultiLogin" :active-value="true" :inactive-value="false"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('ssoLogin')">
            <el-switch v-model="userForm.isSSO" :active-value="true" :inactive-value="false"></el-switch>
          </el-form-item>
        </el-col>
        <el-col :span="12" class="form-content">
          <el-form-item :label="t('passwordEffectTime')" prop="passwordValidTime">
            <el-input v-model.number="userForm.passwordValidTime" :placeholder="t('addUserInputTip')"></el-input>
            <div class="ml-10">{{ t('dayTime') }}</div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('passwordEditTime')" prop="lastPasswordEditTime">
            <el-input v-model="userForm.lastPasswordEditTime" disabled></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <LabelTitle :title="t('extensionInfo')" />
        </el-col>
        <el-col :span="24" class="param-list-con mb-20">
          <CustomStyleTable ref="tableRef" :maxHeight="maxHeight" :showPagination="false" :tableData="tableData">
            <el-table-column :label="t('serialNumber')" align="center" type="index" width="55" />
            <el-table-column :label="t('field')" align="center" prop="field" show-overflow-tooltip>
              <template #default="scope">
                <el-input v-model="scope.row.field" required></el-input>
              </template>
            </el-table-column>
            <el-table-column :label="t('context')" align="center" prop="content" show-overflow-tooltip>
              <template #default="scope">
                <el-input v-model="scope.row.content" required></el-input>
              </template>
            </el-table-column>
            <el-table-column :label="t('operate')" align="center" prop="name" show-overflow-tooltip width="120">
              <template #default="scope">
                <el-button :disabled="scope.row.disable" plain type="danger" @click="deleteSafeSet(scope.$index)">
                  {{ t('delete') }}
                </el-button>
              </template>
            </el-table-column>
          </CustomStyleTable>
          <div class="add-param-btn" @click="addSafeSet">
            <el-icon>
              <IEpCirclePlusFilled />
            </el-icon>
          </div>
        </el-col>
        <el-col v-if="userStore.userInfo.userType !== '01'" :span="24">
          <LabelTitle :title="t('roleConifg')" />
        </el-col>
        <el-col v-if="userStore.userInfo.userType !== '01'" :span="24">
          <el-form-item :label="t('roleSelect')" class="form-content">
            <el-input v-model="userForm.roleNames" readonly></el-input>
            <el-button type="primary" @click="selectRoles">{{ t('select') }}</el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </CustomDialog>
  <RoleAllocation
    v-if="roleDialogVisible"
    ref="roleAllocationRef"
    v-model:dialogVisible="roleDialogVisible"
    :editForm="userForm"
    @roleConfirm="confirmHandle"
  />
</template>

<style lang="scss" scoped>
.param-list-con {
  height: 176px;
  border: 1px solid #dcdfe6;

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
.label-flex {
  display: flex;
  :deep(.el-form-item__label-wrap) {
    margin-left: 0px !important;
  }
}
</style>
<style lang="scss">
.picker-width {
  .el-date-editor.el-input {
    --el-date-editor-width: 100%;
  }
}

.form-content {
  .el-form-item__content {
    flex-wrap: nowrap;
  }
}
</style>
