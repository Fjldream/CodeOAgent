<script setup>
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useReportEditorStore } from '@/stores/reportEditorStore.js';
import { getDataSetServer, createDateItemServer, editDataItemServer } from '@/api/allRequest/clientAPI';
import AceEditor from '@/components/AceEditor/AceEditor.vue';
import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const reportEditorStore = useReportEditorStore();
const { t } = useI18n();
const props = defineProps({ modelValue: Boolean, activeTab: String, editTreeNode: Object, mode: String });
const emit = defineEmits(['update:modelValue', 'confirm', 'closed']);
const formRef = ref(null);
const aceEditorRef = ref(null);
const clickTreeNode = ref(null);
const dataSetList = ref([]);
const dataSetTree = ref([
  {
    label: t('dataSet'),
    id: 1,
    children: [],
  },
  {
    label: t('operator'),
    id: 2,
    children: [{ label: '+' }, { label: '-' }, { label: '*' }, { label: '/' }],
  },
]);
const form = reactive({
  name: '',
  script: '',
});
const resetForm = () => {
  Object.assign(form, {
    name: '',
    script: '',
  });
  emit('update:modelValue', false);
  emit('close');
};

const cssVars = {
  '--header-height': '250px',
  '--ace-height': '400px',
};

nextTick(async () => {
  await initDataSet();
  if (props.editTreeNode) {
    const dataSet = dataSetTree.value[0].children;
    dataSetList.value = dataSet.filter((item) => props.editTreeNode.dataSetList.includes(item.id));
    Object.assign(form, props.editTreeNode);
  }
});
const initDataSet = async () => {
  const dataSet = await getDataSetServer(props.activeTab);
  if (dataSet.errorCode === 0) {
    const children = [];
    for (let index = 0; index < dataSet.data.length; index++) {
      const childrenMumber = [];
      if (dataSet.data[index].tagList.length) {
        dataSet.data[index].tagList.map((item) => childrenMumber.push({ label: item }));
      }
      children.push({ label: dataSet.data[index].name, id: dataSet.data[index].id, children: childrenMumber });
    }
    dataSetTree.value[0].children = children;
  }
};
const nodeClickHandle = (data, node) => {
  clickTreeNode.value = node;
};
const treeDblClickHandle = (row) => {
  if (isClean(clickTreeNode.value.data.label) && !clickTreeNode.value.data.hasOwnProperty('id')) {
    dataSetList.value.push({ label: clickTreeNode.value.parent.data.label, id: clickTreeNode.value.parent.data.id });
  }
  if (!clickTreeNode.value.data.hasOwnProperty('id')) {
    aceEditorRef.value?.insertTextAtCursor(
      isClean(clickTreeNode.value.data.label)
        ? `$$${clickTreeNode.value.parent.data.label}.${clickTreeNode.value.data.label}`
        : clickTreeNode.value.data.label,
    );
  }
};

function isClean(label) {
  return !/[+\-*/]/i.test(label);
}

async function submit() {
  const { script } = form;
  const dataSetFilter = dataSetList.value.filter((item) => {
    return script.includes(`${item.label}.`);
  });
  const dataSetIds = dataSetFilter.map((item) => {
    return item.id;
  });
  const dataSet = [...new Set(dataSetIds)];
  const regexName = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
  if (!form.name || !regexName.test(form.name)) {
    ElMessage.error(t('dataSetItemNameValidator'));
    return;
  }
  const dataItemObj = {
    reportId: props.activeTab,
    name: form.name,
    dataSetList: dataSet,
    script: form.script,
  };
  if (props.mode === 'add') {
    const data = await createDateItemServer(dataItemObj);
    if (data.errorCode === 0) {
      ElMessage.success(t('createSuccess'));
      resetForm();
    }
  } else {
    dataItemObj.id = form.id;
    const data = await editDataItemServer(dataItemObj);
    if (data.errorCode === 0) {
      ElMessage.success(t('editSuccess'));
      resetForm();
    }
  }
  emit('confirm');
}
</script>
<template>
  <CustomDialog
    :style="cssVars"
    :dialogVisible="modelValue"
    :title="mode === 'add' ? t('addDataItem') : t('editDataItem')"
    :width="700"
    class="custom-dialog"
    @update:model-value="(val) => emit('update:modelValue', val)"
    @close="resetForm"
    @confirm="submit"
  >
    <el-form ref="formRef" :model="form" label-width="100px">
      <el-form-item :label="t('dataItemName')" prop="name" required>
        <el-input v-model="form.name" :placeholder="t('enterDataItemName')" />
      </el-form-item>
      <el-form-item :label="t('calculationConfig')" required>
        <AceEditor class="flex-6" ref="aceEditorRef" v-model="form.script" />
        <div class="flex-1">
          <el-tree
            class="tree"
            :data="dataSetTree"
            @dblclick="treeDblClickHandle"
            default-expand-all
            @node-click="nodeClickHandle"
          >
          </el-tree>
        </div>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
<style scoped lang="scss">
.tree {
  border: 1px solid #dcdfe6;
  height: 400px;
  width: 120px;
  overflow: auto;
}
.query-mode {
  padding: 3px 0;
}
.start-time {
  padding: 3px 0;
}
.end-time {
  padding: 3px 0px;
}
.interval {
  padding: 3px 0px;
}
.querybox {
  border: 1px solid #dcdfe6;
  height: 200px;
}
.querybox-tree {
  padding-top: 6px;
  width: 30%;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}
.querybox-right {
  width: 70%;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}
.query-mode-group {
  display: inline-flex;
  gap: 24px;
}
.flex-1 {
  flex: 1;
}
.flex-6 {
  flex: 6;
}
</style>
