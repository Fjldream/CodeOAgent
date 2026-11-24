<script setup>
import { useI18n } from 'vue-i18n';
import { regexValidator } from '@/utils/regexRules';
import { MoreFilled } from '@element-plus/icons-vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import GetProjectPageDialog from '@/views/Main/ClientView/ClientDialogView/GetProjectPageDialog.vue';
import GetProjectImgDialog from '@/views/Main/ClientView/ClientDialogView/GetProjectImgDialog.vue';

const { t } = useI18n();
// 响应式列表及选中行
const setDialogVisible = ref(false);
const setDialogType = ref('');
const activeDialogComponent = shallowRef(null); // 当前要显示的弹窗组件
const props = defineProps({
  dialogVisible: Boolean,
  rowData: Object,
});
const emit = defineEmits(['update:dialogVisible', 'confirm']);
// 表单控件
const formRef = ref(null);
const formRules = ref({
  title: [regexValidator('notEmpty', t('CorrectLabel'))],
  url: [regexValidator('', t('CorrectPath'), false)],
});
const defaultForm = {
  title: '',
  login: { customBK: { loginBackground: { name: '' } }, customPage: '', isCustom: false },
  logoff: {
    url: '',
  },
  redirection: {
    url: '',
  },
  option: '1',
};
const form = reactive({ ...defaultForm, ...props.rowData });
form.option = form.login.isCustom ? '2' : '1';

const emitConfirm = () => {
  formRef.value.validate((valid, errorFields) => {
    if (valid) {
      form.login.isCustom = form.option !== '1';
      if (form.login.isCustom && !form.login.customPage) {
        ElMessage.error(t('SetError'));
        return;
      }
      emit('confirm', form);
    }
  });
};
const handleLoginPage = () => {
  setDialogType.value = 'loginPage';
  activeDialogComponent.value = GetProjectPageDialog;
  setDialogVisible.value = true;
};
const handleLoginImg = () => {
  setDialogType.value = 'LoginImg';
  activeDialogComponent.value = GetProjectImgDialog;
  setDialogVisible.value = true;
};
const handleConfirm = (data) => {
  if (setDialogType.value === 'loginPage') {
    form.login.customPage = data.name;
  } else if (setDialogType.value === 'LoginImg') {
    form.login.customBK.loginBackground.name = data;
  }
  setDialogVisible.value = false;
};
</script>
<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('set')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-tabs type="border-card" class="client-tabs">
        <el-tab-pane :label="t('Label')">
          <el-form-item :label="t('MetaLabel')" prop="title">
            <el-input v-model="form.title" />
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane :label="t('LoginPage')">
          <el-radio-group v-model="form.option">
            <el-row>
              <el-col :span="24">
                <el-radio value="1">
                  <span>{{ t('SystemLoingPage') }}</span>
                </el-radio>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="t('LoginImg')">
                  <el-input readonly :disabled="form.option === '2'" v-model="form.login.customBK.loginBackground.name">
                    <template #append>
                      <el-button
                        :disabled="form.option === '2'"
                        :icon="MoreFilled"
                        style="line-height: normal"
                        @click="handleLoginImg"
                      >
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-radio value="2">
                  <span>{{ t('CustomPage') }}</span>
                </el-radio>
              </el-col>
              <el-col :span="24">
                <el-form-item :label="t('LoginPage')">
                  <el-input readonly :disabled="form.option === '1'" v-model="form.login.customPage">
                    <template #append>
                      <el-button
                        :disabled="form.option === '1'"
                        :icon="MoreFilled"
                        style="line-height: normal"
                        @click="handleLoginPage"
                      >
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </el-radio-group>
        </el-tab-pane>
        <el-tab-pane :label="t('ExitLoginPage')">
          <el-form-item :label="t('ExitLoginPath')" prop="url">
            <el-input v-model="form.logoff.url" />
          </el-form-item>
        </el-tab-pane>
        <el-tab-pane :label="t('redirection')">
          <el-form-item :label="t('redirection')" prop="url">
            <el-input v-model="form.redirection.url" />
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
    </el-form>
  </CustomDialog>
  <div class="dialog">
    <component
      :is="activeDialogComponent"
      v-if="setDialogVisible"
      v-model:dialogVisible="setDialogVisible"
      :guid="props.rowData.guid"
      @confirm="handleConfirm"
    />
  </div>
</template>
