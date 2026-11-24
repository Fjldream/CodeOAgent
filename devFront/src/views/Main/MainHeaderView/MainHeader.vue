<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useLangStore } from '@/stores/langStore.js';
import { useLoginUserStore } from '@/stores/loginUserStore.js';
import { useConfirm } from '@/composables/useConfirm.js';

import CustomIcon from '@/components/CustomIcon/CustomIcon.vue';
import OemConifgDialog from '@/views/Main/MainDialogView/OemConifgDialog.vue';
import ChangePasswordDialog from '@/components/ChangePasswordDialog/ChangePasswordDialog.vue';

// modified by jinlong.feng at 2026-11-20 KF开发助手M1
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import { assistantState } from '@/assistant/entry.js';
// end
import { assistantEnabled } from '@/assistant/api.js';
// end
const { t } = useI18n();

const router = useRouter();

const langStore = useLangStore();
const { switchLang } = langStore;
const userStore = useLoginUserStore();
const emit = defineEmits(['toggleMenu']);

const dialogVisible = ref(false);
const configDialogVisible = ref(false);
const menuShow = ref(true);

const foldClass = computed(() => {
  return !menuShow.value ? 'fold-class' : '';
});

const isAdminUser = computed(() => {
  const adminUserTypeEnum = ['01', '02'];
  return adminUserTypeEnum.some((userType) => userStore.userInfo.userType === userType);
});
const logout = () => {
  ElMessage.success(t('logouted'));
  router.replace('/login');
};
//帮助
const handleHelp = () => {
  open('/api/help.html', '_blank');
};
//语言切换
const changLanguage = (label) => {
  switchLang(label);
};
//执行修改或者退出
const handleCommand = async (command) => {
  if (command === 1) {
    configDialogVisible.value = true;
  } else if (command === 2) {
    dialogVisible.value = true;
  } else {
    await useConfirm(t('logoutTips'), t('tip'), 'warning');
    logout();
  }
};

const toggleMenuHandle = () => {
  menuShow.value = !menuShow.value;
  emit('toggleMenu');
};
</script>

<template>
  <div class="navbar">
    <!-- 左侧收缩菜单 -->
    <el-tooltip :content="t('toggleMenu')" :show-after="500" placement="right">
      <div class="hamburger-container" tabindex="0" @click="toggleMenuHandle">
        <!-- 这里是汉堡菜单图标 -->
        <CustomIcon :class="foldClass" name="foldUp" />
      </div>
    </el-tooltip>

    <!-- 右侧操作区域 -->
    <div class="navbar-right">
<!-- modified by jinlong.feng at 2026-11-20 KF开发助手M1 -->
<!-- modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗 -->
      <el-button v-if="assistantEnabled" plain @click="assistantState = 'open'">开发助手</el-button>
<!-- end -->
<!-- end -->
      <!-- 帮助 -->
      <div @click="handleHelp">
        <div class="combining">
          <el-tooltip :content="t('helpCenter')" :show-after="500" effect="light" placement="top">
            <CustomIcon class="mr-0" name="help" />
          </el-tooltip>
        </div>
      </div>
      <!-- 消息 -->
      <el-dropdown @command="changLanguage">
        <CustomIcon class="translate-icon" name="translate" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="item in langStore.laguageCommand" :key="item.value" :command="item.value">
              {{ item.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-divider class="vertical-divider" direction="vertical" />
      <!-- 用户名和退出按钮容器，带线框 -->
      <div class="user-logout-wrapper">
        <el-dropdown ref="dropdownLaguage" class="translation" trigger="click" @command="handleCommand">
          <div class="combining">
            <CustomIcon name="user" style="height: 29px; width: 29px" />
            <div class="username">{{ userStore.userInfo.userName }}</div>
            <el-icon class="el-icon-right">
              <IEpArrowDown />
            </el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="1" v-if="isAdminUser">
                {{ t('systemConfig') }}
              </el-dropdown-item>
              <el-dropdown-item :command="2">
                {{ t('changPassword') }}
              </el-dropdown-item>
              <el-dropdown-item :command="3">
                {{ t('userLogout') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
  <OemConifgDialog v-if="configDialogVisible" v-model:dialogVisible="configDialogVisible" />
  <ChangePasswordDialog
    v-if="dialogVisible"
    v-model:dialogVisible="dialogVisible"
    :userId="userStore.userInfo.userId"
  ></ChangePasswordDialog>
</template>

<style lang="scss" scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 62px;
  background-image: url('@/assets/image/titleBg.png');
  border-bottom: 1px solid #e4e7ed;

  .navbar-about {
    font-size: 16px;
  }

  .hamburger-container {
    cursor: pointer;
    display: flex;
    align-items: center;
    height: 62px;
    padding: 0 20px;
    color: #333;

    &:hover {
      background-color: #e9efff;
    }
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .vertical-divider {
    border-color: #9ca3af;
  }

  .translation {
    cursor: pointer;
    display: flex;
    align-items: center;

    ::v-deep(.el-dropdown-menu__item) {
      padding: 5px 40px;
    }
  }

  .translate-icon {
    width: 1.5em;
    height: 1.5em;
  }

  /* 新增的线框容器 */
  .user-logout-wrapper {
    display: flex;
    align-items: center;
    border: 0px solid #d1d5db; /* 线的颜色，可按需调整 */
    border-radius: 4px;
    padding: 4px 8px;
    gap: 8px;
  }

  /* 图标加文本 */
  .combining {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 12px;
    padding: 0 6px;
    user-select: none;
    cursor: pointer;
  }

  /* 用户名字体 */
  .username {
    font-weight: 500;
    font-size: 14px;
    color: #1f2937; /* 灰色字体 */
  }

  .fold-class {
    transform: rotate(180deg);
  }
}
</style>
