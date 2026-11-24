import { ElMessageBox } from 'element-plus';

import { t } from '@/i18n/index.js';

export const useConfirm = async (
  message = t('sureForOperate'),
  title = t('operateSure'),
  type = 'warning',
  confirmButtonText = t('define'),
  cancelButtonText = t('cancle'),
) => {
  return ElMessageBox.confirm(message, title, {
    confirmButtonText,
    cancelButtonText,
    type,
  });
};
