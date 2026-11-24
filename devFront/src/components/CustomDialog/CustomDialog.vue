<script setup>
import { useI18n } from 'vue-i18n';
import { debounce } from '@/utils/commonUtils.js';

const { t } = useI18n();
const $slots = useSlots();

const props = defineProps({
  title: String,
  width: Number,
  footerVisible: {
    type: Boolean,
    default: true,
  },
  confirmTitle: String,
  cancelTitle: String,
  defineDisable: {
    type: Boolean,
    default: false,
  },
});

const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: false,
});
const emits = defineEmits(['confirm', 'close']);

const emitClose = () => {
  dialogVisible.value = false;
  emits('close');
};

// 弹窗确认事件需要添加防抖函数
const confirmHandel = debounce(() => {
  emits('confirm');
}, 300);
</script>

<template>
  <el-dialog
    v-if="dialogVisible"
    :append-to-body="true"
    :before-close="emitClose"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :destroy-on-close="true"
    :draggable="true"
    v-model="dialogVisible"
    :title="title"
    :width="width"
    align-center
    class="custom-dialog"
  >
    <template #header v-if="$slots.header">
      <slot name="header"></slot>
    </template>
    <slot name="default"></slot>
    <template v-if="footerVisible" #footer>
      <el-button @click="emitClose">{{ props.cancelTitle ?? t('cancle') }}</el-button>
      <el-button :disabled="defineDisable" type="primary" @click="confirmHandel">
        {{ props.confirmTitle ?? t('define') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss">
.custom-dialog {
  padding: 20px;

  .el-dialog__body {
    flex: 1;
    overflow: hidden;

    .el-divider--vertical {
      border-left: 4px #48a2ff var(--el-border-style);
    }

    .text-right {
      text-align: right;
      width: 100%;
    }

    .el-form-item {
      margin-bottom: 0;

      .el-form-item__label-wrap {
        margin-bottom: 14px;
      }

      .el-form-item__content {
        margin-bottom: 14px;
      }
    }

    .el-form-item__label {
      font-size: 14px;
      margin: 0 0 0 15px;
    }

    .el-input__wrapper {
      font-size: 13px;
      min-height: 32px !important;
    }

    .el-textarea__inner {
      font-size: 13px;
      min-height: 72px !important;
    }

    .el-table__header th,
    .el-table__body tr {
      font-size: 13px;
    }

    .el-table__body .el-table__row:hover {
      background-color: #fff !important;
    }

    .el-checkbox {
      margin-right: 15px;
    }
  }

  .el-dialog__footer {
    padding-top: 12px;

    .el-button {
      font-size: 14px;
      width: 78px;
      height: 34px;
    }

    .el-button--primary {
      margin-left: 15px;
    }
  }

  .el-dialog__title {
    font-size: 16px;
    font-weight: bold;
  }
}
</style>
