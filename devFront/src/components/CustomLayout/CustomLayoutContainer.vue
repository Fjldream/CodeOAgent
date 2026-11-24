<script setup>
import { useSlots } from 'vue';
import CustomLayoutTree from '@/components/CustomLayout/CustomLayoutTree.vue';

const slots = useSlots();
const props = defineProps({
  editGroupName: String,
  customLayoutClass: String,
  asideClass: {
    type: String,
    default: '',
  },
  contentClass: String,
  contentCardClass: String,
  mainContainClass: String,
});

const asideWidth = defineModel('asideWidth', {
  type: String,
  default: '220',
});

const emits = defineEmits([
  'subMenuClick',
  'menuRightClick',
  'menuClick',
  'treeMouseEnter',
  'addClick',
  'editClick',
  'deleteClick',
  'saveEdit',
  'clickBlack',
]);

const attrs = useAttrs();

const forwardAttrs = computed(() => {
  const { class: _c, ...rest } = attrs;
  return rest;
});
const subMenuClick = (row) => {
  emits('subMenuClick', row);
};

const menuRightClickHandle = (event, row, node) => {
  emits('menuRightClick', event, row, node);
};

const treeMouseEnterHandle = (row) => {
  emits('treeMouseEnter', row);
};

const menuClickHandle = (data, row, a, b) => {
  emits('menuClick', data, row, a, b);
};
const addClickHandle = (row) => {
  emits('addClick', row);
};
const editClickHandle = (row) => {
  emits('editClick', row);
};
const deleteClickHandle = (row) => {
  emits('deleteClick', row);
};
const saveEdit = (data, inputType) => {
  emits('saveEdit', data, inputType);
};
</script>

<template>
  <el-container :class="['content-container', customLayoutClass]" @click.stop="emits('clickBlack')">
    <el-splitter>
      <el-splitter-panel v-model:size="asideWidth" :min="asideWidth">
        <el-aside :class="asideClass" :width="asideWidth" class="asides">
          <slot name="left" />
          <slot name="tree-left">
            <CustomLayoutTree
              v-bind="forwardAttrs"
              @addClickHandle="addClickHandle"
              @deleteClickHandle="deleteClickHandle"
              @editClickHandle="editClickHandle"
              @menuRightClick="menuRightClickHandle"
              @saveEdit="saveEdit"
              @treeClickHandle="menuClickHandle"
              @treeMouseEnter="treeMouseEnterHandle"
            />
          </slot>
          <slot name="left-bottom" />
        </el-aside>
      </el-splitter-panel>
      <el-splitter-panel>
        <el-container :class="['main-container', contentClass]">
          <div :class="contentCardClass">
            <div v-if="slots['content-header']">
              <slot name="content-header" />
            </div>
            <main :class="['main-center', mainContainClass]">
              <div v-if="slots['content-header'] && slots['main']" class="main-slot-wrapper">
                <slot name="main" />
              </div>
              <slot name="main-content">
                <router-view />
              </slot>
            </main>
          </div>
        </el-container>
      </el-splitter-panel>
    </el-splitter>
  </el-container>
</template>

<style lang="scss">
.main-center {
  width: 100%;
  padding: 20px;
}
.el-splitter-panel {
  overflow: hidden;
}
.asides {
  height: 100%;
}
</style>
