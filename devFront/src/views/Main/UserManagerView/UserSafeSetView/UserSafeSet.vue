<script setup>
import { useI18n } from 'vue-i18n';
import CustomStyleTable from '@/components/CustomStyleTable/CustomStyleTable.vue';
import { getSecurity, saveSecurityServer } from '@/api/allRequest/userManagerApi.js';
import { useConfirm } from '@/composables/useConfirm.js';

const { t } = useI18n();
const tableRef = useTemplateRef('tableRef');
const maxHeight = ref('calc(520px - 480px)');
const tableData = ref([
  {
    name: 'KingAdmin',
    disable: true,
  },
  {
    name: 'admin',
    disable: true,
  },
]);

const acceptForm = ref({
  lockingMinute: 5,
  lockingTotal: 5,
});

getSafeSet();

const ruleForm = reactive({
  lockingMinute: [
    {
      required: true,
      message: t('blockTimeRuleTip'),
      trigger: ['blur', 'change'],
    },
    {
      type: 'number',
      validator: (rule, value, callback) => {
        if (value < 1 || value > 600) {
          callback(new Error(t('blockTimeRuleTip2')));
        } else {
          callback();
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
  lockingTotal: [{ required: true }],
});

const options = reactive([
  {
    label: 3,
  },
  {
    label: 4,
  },
  {
    label: 5,
  },
  {
    label: 6,
  },
]);

maxHeight.value = computed(() => {
  let tableDataLength = tableData.value.length;
  if (tableDataLength >= 9) {
    tableDataLength = 9;
  }
  return `calc(520px - ${480 - tableDataLength * 49}px)`;
});
const addSafeSet = () => {
  const noInput = tableData.value.some((item) => !item.name);
  if (noInput) {
    return ElMessage({
      type: 'warning',
      message: t('userListRule3'),
    });
  }
  tableData.value.push({
    name: '',
    disable: false,
  });

  nextTick(() => {
    const tables = tableRef.value?.getTableRef();
    const scrollBody = tables.value?.$el.querySelector('.el-scrollbar__wrap');
    if (scrollBody) {
      tables.value?.setScrollTop(scrollBody.scrollHeight);
    }
  });
};

const deleteSafeSet = (index) => {
  tableData.value.splice(index, 1);
};

const saveUserSafeSet = async () => {
  const noInput = tableData.value.some((item) => !item.name);
  if (noInput) {
    return ElMessage({
      type: 'warning',
      message: t('userListRule3'),
    });
  }

  const confirmStr = await useConfirm(t('sureForSaveUserConfig'), t('tip'), 'warning');
  const blackList = tableData.value.map((item) => item.name).join(',');
  if (confirmStr === 'confirm') {
    const result = await saveSecurityServer({ ...acceptForm.value, blackList });
    if (result.errorCode === 0) {
      ElMessage({
        type: 'success',
        message: t('saveSuccess'),
      });
    }
  }
};

async function getSafeSet() {
  const { data: securityData } = await getSecurity();
  acceptForm.value = { ...securityData };
  for (const splitElement of securityData.blackList.split(',')) {
    const hasSecurity = tableData.value.some((elem) => elem.name === splitElement);
    if (!hasSecurity) {
      tableData.value.push({
        name: splitElement,
        disable: false,
      });
    }
  }
}
</script>

<template>
  <header>{{ t('userSafeConfig') }}</header>

  <el-main class="main">
    <header class="df mb-5">
      <div>{{ t('registerUserBlackList') }}</div>
      <div>{{ t('createUserTip') }}</div>
    </header>
    <div class="param-list-con mb-20">
      <CustomStyleTable ref="tableRef" :max-height="maxHeight" :showPagination="false" :tableData="tableData">
        <el-table-column :label="t('accountName')" align="center" prop="name" show-overflow-tooltip>
          <template #default="scope">
            <div class="el-form-item is-required asterisk-left el-form-item--label-right">
              <span class="el-form-item__label"> </span>
              <el-input v-model="scope.row.name" :disabled="scope.row.disable" required></el-input>
            </div>
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
    </div>
    <div>
      <div>{{ t('accountBlock') }}</div>
      <el-form :model="acceptForm" :rules="ruleForm" class="df mb64">
        <el-form-item :label="t('passwordInputNumbTip')" class="ml-32" prop="lockingTotal">
          <el-select v-model="acceptForm.lockingTotal" class="w160">
            <el-option v-for="item of options" :key="item.label" :label="item.label" :value="item.label"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('accountBlockTip')" class="ml-32" prop="lockingMinute">
          <el-input v-model.number="acceptForm.lockingMinute" :max="3" :min="1" class="w160 mr-6"></el-input>
          <div>{{ t('range1by600') }}</div>
        </el-form-item>
      </el-form>

      <div class="df end-flex">
        <el-button type="primary" @click="saveUserSafeSet">{{ t('save') }}</el-button>
      </div>
    </div>
  </el-main>
</template>

<style lang="scss" scoped>
.param-list-con {
  height: 520px;
  border: 1px solid #dcdfe6;

  .el-table .el-table__cell {
    padding: 2px 0;
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

.el-form-item {
  margin-bottom: 0;
}

.main {
  border: 1px solid #ddd;
  width: 85%;
  height: 92%;
}

.w160 {
  width: 160px;
}

.ml-32 {
  margin-left: 32px;
}

.mb64 {
  margin-bottom: 64px;
}

.end-flex {
  justify-content: flex-end;
}
</style>
