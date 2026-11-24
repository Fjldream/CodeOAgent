<script setup>
import { computed, ref, watch } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import { useScriptEditorStore } from '@/stores/scriptEditorStore.js';

// 语言模式
import 'ace-builds/src-noconflict/mode-javascript';

// 主题
import 'ace-builds/src-noconflict/theme-xcode';

// 自动补全支持
import 'ace-builds/src-noconflict/snippets/javascript';
import 'ace-builds/src-noconflict/ext-language_tools';

// 搜索的依赖
import 'ace-builds/src-noconflict/ext-searchbox';
// 格式化：使用 prettier（仅 JS/JSON 可用）
import prettier from 'prettier/standalone';
import parserBabel from 'prettier/plugins/babel';
import parserEstree from 'prettier/plugins/estree';

import ace from 'ace-builds/src-noconflict/ace';
// 配置 Ace 的模块路径（指向 public/ace 目录）
ace.config.set('basePath', '/ace');
ace.config.setModuleUrl('ace/mode/javascript_worker', '/ace/worker-javascript.js');

const JavascriptMode = ace.require('ace/mode/javascript').Mode;
const JavascriptHighlightRules = ace.require('ace/mode/javascript_highlight_rules').JavaScriptHighlightRules;

const scriptEditorStore = useScriptEditorStore();

const props = defineProps({
  modelValue: { type: String, default: '' },
  onSave: { type: Function },
  fullScreen: { type: Boolean, default: false },
});

// 控制参数
const theme = ref('xcode');
const editorInstance = ref(null);
const codeProxy = ref(props.modelValue);
const aceRef = useTemplateRef('aceRef');

const emit = defineEmits(['update:modelValue', 'editor-ready']);

watch(
  () => props.modelValue,
  (val) => {
    if (val !== codeProxy.value) {
      codeProxy.value = val;
    }
  },
);
watch(codeProxy, (val) => emit('update:modelValue', val));

nextTick(() => {
  updateComleter(scriptEditorStore.keyWordList);
});

class CustomHighlightRules extends JavascriptHighlightRules {
  constructor() {
    super();
    const keywordList = [...scriptEditorStore.keyWordList.map((e) => e.caption), 'global', '$System'];
    this.keywordRules = this.createKeywordMapper(
      {
        'custom-keyword': keywordList.join('|'),
        variable: 'self',
      },
      'identifier',
    );

    this.$rules.start.unshift({
      token: this.keywordRules,
      regex: '[a-zA-Z_$][a-zA-Z0-9_$]*\\b',
    });
  }
}

class CustomMode extends JavascriptMode {
  constructor() {
    super();
    this.HighlightRules = CustomHighlightRules;
  }
}

const editorOptions = computed(() => ({
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: true,
  behavioursEnabled: true,
  fontSize: 14,
  showPrintMargin: false,
  showGutter: true,
  tabSize: 2,
  useWorker: false,
  highlightActiveLine: true,
  highlightSelectedWord: true,
  wrap: true,
  cursorStyle: 'ace',
  displayIndentGuides: true,
}));

/**
 * 在光标处添加文本
 */
const insertTextAtCursor = (text) => {
  if (!editorInstance.value) {
    return;
  }
  const pos = editorInstance.value.getCursorPosition();
  editorInstance.value.session.insert(pos, text);
};

/**
 * 更新自动补全
 */
const updateComleter = (keyWordList) => {
  const langTools = ace.require('ace/ext/language_tools');
  const commonCompleter = {
    getCompletions(editor, session, pos, prefix, callback) {
      if (prefix.length === 0) {
        return callback(null, []);
      }

      const completions = keyWordList.map((row) => ({
        caption: row.caption,
        value: row.value,
        meta: 'Local',
        score: 1000,
      }));
      callback(null, completions);
    },
  };
  langTools.addCompleter(commonCompleter);
};
/**
 * 异步格式化代码
 *
 * @returns 格式化后的代码字符串或原代码字符串
 */
const formatCode = async () => {
  try {
    const formatted = await prettier.format(codeProxy.value, {
      parser: 'babel', // 使用 Babel 解析器
      plugins: [parserBabel, parserEstree], // 显式加载 Babel 插件
      semi: false, // 可选：自定义规则
      singleQuote: true, // 可选：自定义规则
    });
    codeProxy.value = formatted; // 确保直接赋值字符串，而不是 Promise
    return formatted; // 返回格式化后的字符串
  } catch (err) {
    return codeProxy.value; // 出错时返回原代码
  }
};

/**
 * 添加注释功能
 */
const addComment = () => {
  const editor = editorInstance.value;
  if (!editor) return;

  // 获取选区范围
  const selection = editor.getSelectionRange();
  if (selection.isEmpty()) {
    // 如果未选择内容，则对当前行切换注释
    const { row } = editor.getCursorPosition();
    const range = editor.session.getAWordRange(row, 0);
    editor.selection.setRange(range);
  }

  // 执行 togglecomment 命令，自动判断是注释还是取消注释
  editor.execCommand('togglecomment');
};

const saveCode = () => {
  props.onSave();
};

const indent = () => {
  const editor = editorInstance.value;
  if (!editor) return;
  editor.execCommand('indent');
};

const outdent = () => {
  const editor = editorInstance.value;
  if (!editor) return;
  editor.execCommand('outdent');
};

const findHandle = () => {
  const editor = editorInstance.value;
  if (editor) editor.execCommand('find');
};

const replaceHandle = () => {
  const editor = editorInstance.value;
  if (editor) editor.execCommand('replace');
};

/**
 * 设置自定义代码补全器
 *
 * @returns 无返回值
 */
const setupCustomCompleter = () => {
  const langTools = ace.require('ace/ext/language_tools');

  const commonCompleter = {
    getCompletions(editor, session, pos, prefix, callback) {
      if (prefix.length === 0) {
        callback(null, []);
        return;
      }

      const completions = [
        { caption: 'console.log', value: 'console.log($1)', meta: 'function', score: 1000 },
        { caption: 'setTimeout', value: 'setTimeout(() => {\n\t$0\n}, ${1:delay})', meta: 'function', score: 900 },
        { caption: 'setInterval', value: 'setInterval(() => {\n\t$0\n}, ${1:delay})', meta: 'function', score: 900 },
        {
          caption: 'fetch',
          value: "fetch('${1:url}')\n\t.then(response => response.json())\n\t.then(data => {\n\t\t$0\n\t})",
          meta: 'function',
          score: 800,
        },
      ];

      callback(null, completions);
    },
  };

  langTools.addCompleter(commonCompleter);
};
/**
 * 初始化编辑器处理函数
 *
 * @param editor 编辑器实例
 */
const handleEditorInit = (editor) => {
  // 将传入的editor赋值给editorInstance
  editorInstance.value = editor;
  editorInstance.value.session.setMode(new CustomMode());
  // 设置自定义补全器
  setupCustomCompleter();

  // 触发editor-ready事件，将editor作为参数传递
  emit('editor-ready', editor);

  // 格式化代码
  editor.commands.addCommand({
    name: 'formatCode',
    bindKey: { win: 'Ctrl-Shift-F', mac: 'Command-Shift-F' },
    exec: formatCode,
    readOnly: false,
  });

  // 注释
  editor.commands.addCommand({
    name: 'toggleComment',
    bindKey: { win: 'Ctrl-/', mac: 'Command-/' },
    exec: addComment,
    readOnly: false,
  });

  // 保存
  editor.commands.addCommand({
    name: 'toggleComment',
    bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
    exec: saveCode,
    readOnly: false,
  });

  // 全屏切换
  editor.commands.addCommand({
    name: 'toggleFullscreen',
    bindKey: { win: 'F11', mac: 'F11' },
    exec: toggleFullscreen,
    readOnly: true,
  });

  // 自动补全触发
  editor.commands.addCommand({
    name: 'showAutocomplete',
    bindKey: { win: 'Ctrl-Space', mac: 'Ctrl-Space' },
    exec: (editorInst) => {
      editorInst.execCommand('startAutocomplete');
    },
    readOnly: false,
  });

  editor.commands.addCommand({
    name: 'showFind',
    bindKey: { win: 'Ctrl-F', mac: 'Command-F' },
    exec: findHandle,
    readOnly: true,
  });

  editor.commands.addCommand({
    name: 'showReplace',
    bindKey: { win: 'Ctrl-H', mac: 'Command-Option-F' }, // Mac 上 Ctrl+H 会被系统占用
    exec: replaceHandle,
    readOnly: true,
  });
};

/**
 * 切换全屏状态
 *
 * 该函数用于切换当前页面的全屏状态。如果当前是全屏状态，则退出全屏；如果当前不是全屏状态，则进入全屏。
 * 如果存在编辑器实例，则在全屏状态切换后延时100毫秒调用编辑器的resize方法以调整尺寸。
 */
const toggleFullscreen = () => {
  // 如果存在编辑器实例
  if (editorInstance.value) {
    // 延迟100毫秒后调用编辑器实例的resize方法
    setTimeout(() => editorInstance.value.resize(), 100);
  }
};
// 明确暴露哪些内容给父组件
defineExpose({
  toggleFullscreen,
  formatCode,
  addComment,
  saveCode,
  indent,
  outdent,
  findHandle,
  replaceHandle,
  insertTextAtCursor,
});
</script>
<template>
  <div ref="aceRef" :class="['editor-container', { fullscreen: props.fullScreen }]">
    <VAceEditor
      v-model:value="codeProxy"
      :options="editorOptions"
      :theme="theme"
      class="editor"
      lang="javascript"
      @init="handleEditorInit"
    />
  </div>
</template>
<style lang="scss" scoped>
.editor-container {
  height: 100%;
  width: 100%;
  border: 1px solid var(--el-border-color);
}

.editor {
  width: 100%;
  height: var(--ace-height);

  ::v-deep(.ace_scroller) {
    font-family: Monaco, Menlo, 'Ubuntu Mono', Consolas, 'Source Code Pro', source-code-pro, monospace !important;
  }
}

.fullscreen {
  height: calc(100vh - var(--header-height)); /* 减去工具栏高度 */
  width: 100vw;

  .editor {
    height: 100%;
    width: 100%;
  }
}
</style>

<style lang="scss">
.ace_content {
  cursor: text;
}

.ace_editor {
  .ace_custom-keyword {
    color: #2d6fff;
    font-weight: bold;
  }
}
</style>
