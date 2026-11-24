<script setup>
import { useI18n } from 'vue-i18n';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';
import BaseAttrCom from '@/views/Main/AlarmView/AlarmDialogView/EditVariableDialogView/BaseAttrCom.vue';
import AlarmAttrCom from '@/views/Main/AlarmView/AlarmDialogView/EditVariableDialogView/AlarmAttrCom.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  formData: Object,
});
const emit = defineEmits(['update:dialogVisible', 'update:formData', 'confirm']);
const activeName = ref('base');
const baseRef = useTemplateRef('baseRef');
const alarmRef = useTemplateRef('alarmRef');

const tabPanes = shallowReactive([
  {
    label: t('baseAttr'),
    name: 'base',
  },
  {
    label: t('alarmAttr'),
    name: 'alarm',
  },
]);

const attrs = useAttrs();

const forwardAttrs = computed(() => {
  const { AlarmItem, AlarmEnable, Type, ...rest } = props.formData;

  return {
    alarmForm: {
      alarmForm: {
        ...AlarmItem,
        Type,
        AlarmEnable,
      },
    },
    baseForm: {
      baseForm: {
        ...rest,
        Type,
      },
    },
  };
});
const emitConfirm = () => {
  const baseForm = baseRef.value[0].getForm();
  const { AlarmEnable, ...rest } = alarmRef.value[0].getForm();

  emit('confirm', {
    ...baseForm,
    enable: AlarmEnable,
    alarmItem: rest,
  });
};
const chooseName = (row) => {
  emit('update:formData', {
    ...props.formData,
    Type: row.Type,
  });
};
</script>

<template>
  <CustomDialog
    :dialogVisible="dialogVisible"
    :title="t('editVariables')"
    :width="720"
    @confirm="emitConfirm"
    @update:dialogVisible="emit('update:dialogVisible', $event)"
  >
    <el-tabs v-model="activeName">
      <el-tab-pane v-for="row of tabPanes" :key="row.name" :label="row.label" :name="row.name">
        <div v-if="row.name === 'base'">
          <BaseAttrCom ref="baseRef" v-bind="forwardAttrs.baseForm" @chooseName="chooseName" />
        </div>
        <div v-if="row.name === 'alarm'">
          <AlarmAttrCom ref="alarmRef" v-bind="forwardAttrs.alarmForm" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </CustomDialog>
</template>
