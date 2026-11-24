<script setup>
import { useI18n } from 'vue-i18n';
import { Search } from '@element-plus/icons-vue';
import { regexValidator } from '@/utils/regexRules';
import { searchTree } from '@/utils/commonUtils.js';

import CustomDialog from '@/components/CustomDialog/CustomDialog.vue';

const { t } = useI18n();
const props = defineProps({
  dialogVisible: Boolean,
  resourceList: Object,
  rowData: Object,
  defaultProps: {
    type: Object,
    default: () => {
      return { children: 'children', label: 'name' };
    },
  },
});
const dialogVisible = defineModel('dialogVisible', {
  type: Boolean,
  default: false,
});
const emit = defineEmits(['confirm']);
const treeRef = useTemplateRef('treeRef');
// 表单控件
const formRef = ref(null);
const searchValue = ref('');
const formRules = ref({
  name: [regexValidator('safaName', t('plsInputSuccessScriptName'))],
  comment: [regexValidator('', t('plsInputSuccessDes'), false)],
});
const expandedKeys = ref([]);
const defaultForm = {
  id: '',
  name: '',
  comment: '',
  status: true,
  resourceList: props.resourceList,
};
const form = reactive(props.rowData.dialogType === 'edit' ? { ...defaultForm, ...props.rowData } : { ...defaultForm });
const originTree = structuredClone(toRaw(form.resourceList));

nextTick(() => {
  treeRef.value.setCheckedKeys(props.rowData.resourceAuthInfo ?? []);
});
const checkChange = (nodes) => {
  if (!nodes.leaf) {
    expandedKeys.value.push(nodes.id);
  }
};
const checkNode = (nodes, key) => {
  expandedKeys.value.push(nodes.id);
  const selectNode = key.checkedKeys.includes(nodes.id);
  let checkedId = treeRef.value.getCheckedKeys(true);
  const currentNodes = treeRef.value.getNode(nodes);
  if (selectNode) {
    if (nodes.name === '操作权限') {
      const editResource = treeRef.value.getNode(nodes);
      const interViewId = editResource.parent.children.find((el) => el.label === '访问权限')?.data?.id;
      // 选中操作权限，则需要同时选中访问权限
      if (!checkedId.includes(interViewId)) {
        checkedId.push(interViewId);
        treeRef.value.setCheckedKeys(checkedId);
      }
      return;
    }

    if (currentNodes.parent?.data?.name === '操作权限') {
      const editResource = treeRef.value.getNode(currentNodes.parent.data);
      const interViewId = editResource.parent.children.find((el) => el.label === '访问权限')?.data?.id;
      if (!checkedId.includes(interViewId)) {
        checkedId.push(interViewId);
        treeRef.value.setCheckedKeys(checkedId);
      }
    }
    return;
  }
  if (nodes.name === '访问权限') {
    const editResource = treeRef.value.getNode(nodes).nextSibling.data;
    //   存在操作权限
    if (editResource) {
      const ids = editResource.children.map((items) => {
        return items.id;
      });
      // 若不选访问权限，则操作权限也不选
      checkedId = checkedId.filter((items) => items !== editResource.id && !ids.includes(items));
      treeRef.value.setCheckedKeys(checkedId);
    }
  }
};

const emitConfirm = () => {
  searchValue.value = '';
  searchHandle();
  nextTick(() => {
    formRef.value.validate((valid, errorFields) => {
      if (valid) {
        form.resourceAuthInfo = treeRef.value.getCheckedKeys();
        emit('confirm', form);
      }
    });
  });
};

const searchHandle = (row) => {
  const filterResult = recursiveSearch(originTree, row, props.defaultProps.label);
  if (filterResult.length > 0 && row) {
    if (filterResult[0].name === 'all') {
      form.resourceList = filterResult[0].children;
    }
  } else {
    form.resourceList = filterResult;
  }
  nextTick(() => {
    treeRef.value?.setData(form.resourceList);
    expandedKeys.value = getAllIds(filterResult);
  });
};

function recursiveSearch(tree, keyword, label = 'name') {
  if (!tree || !Array.isArray(tree)) {
    return [];
  }
  if (!keyword) {
    return tree;
  }

  return searchTree(structuredClone(tree), label, keyword);
}

function getAllIds(tree) {
  return tree.flatMap((row) => [row.id, ...getAllIds(row.children || [])]);
}
</script>
<template>
  <CustomDialog
    v-model:dialogVisible="dialogVisible"
    :title="form.dialogType === 'edit' ? t('editAccessPolicy') : t('createAccessPolicy')"
    :width="520"
    @confirm="emitConfirm"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="auto">
      <el-form-item :label="t('name')" prop="name">
        <el-input v-model="form.name"></el-input>
      </el-form-item>
      <el-form-item :label="t('description')" prop="comment">
        <el-input v-model="form.comment"></el-input>
      </el-form-item>
      <el-form-item :label="t('enable')">
        <el-switch v-model="form.status" active-color="#13ce66" inactive-color="#ff4949" />
      </el-form-item>
      <el-form-item :label="t('visitPermission')">
        <el-input class="mb-8" :suffix-icon="Search" @change="searchHandle" v-model="searchValue"></el-input>
        <div class="safe-object-tree">
          <el-tree-v2
            :height="366"
            ref="treeRef"
            :check-on-click-node="false"
            :data="form.resourceList"
            :expand-on-click-node="false"
            :props="defaultProps"
            :default-expanded-keys="expandedKeys"
            highlight-current
            node-key="id"
            show-checkbox
            @check="checkNode"
            @check-change="checkChange"
          />
        </div>
      </el-form-item>
    </el-form>
  </CustomDialog>
</template>
<style lang="scss" scoped>
.safe-object-tree {
  display: inline-block;
  width: 100%;
  height: 380px;
  border: 1px solid #e1e1e1;
  overflow: auto;
  padding: 5px;
}

::v-deep(.el-tree-node__content) {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .el-tree-node__label {
    //order: 1;
    flex: 1;
  }

  .el-checkbox {
    //order: 2;
  }
}
</style>
