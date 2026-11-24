<!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
<script setup>
import { computed, inject, onBeforeUnmount, ref } from 'vue';
import { CopyDocument, FullScreen, Back } from '@element-plus/icons-vue';

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: 'JavaScript' },
  title: { type: String, default: '' },
  selectableExample: Boolean,
  reading: Boolean,
});
const viewer = inject('kfAssistantCodeReader');
const feedback = ref('');
let resetFeedback;
const isJavaScript = computed(() => /^(?:js|javascript|jsx|ts|typescript|json)$/i.test(props.language));
const languageLabel = computed(() =>
  /^(?:javascript|js)$/i.test(props.language) ? 'JavaScript' : props.language,
);
const rows = computed(() => props.code.split(/\r\n|\r|\n/));
const tokenPattern =
  /(\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:async|await|break|case|catch|const|continue|else|false|finally|for|function|if|let|new|null|return|throw|true|try|var|while)\b)/g;
function tokens(line) {
  if (!isJavaScript.value) return [line];
  return line.split(tokenPattern);
}
function color(token) {
  if (token.startsWith('//')) return 'comment';
  if (/^['"]/.test(token)) return 'string';
  return 'keyword';
}
async function copy() {
  const original = props.code;
  try {
    await navigator.clipboard.writeText(original);
    feedback.value = '已复制';
  } catch {
    const previous = document.activeElement;
    const field = document.createElement('textarea');
    field.value = original;
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      feedback.value = document.execCommand('copy') ? '已复制' : '请选中代码复制';
    } catch {
      feedback.value = '请选中代码复制';
    } finally {
      field.remove();
      previous?.focus?.({ preventScroll: true });
    }
  }
  clearTimeout(resetFeedback);
  resetFeedback = setTimeout(() => {
    feedback.value = '';
  }, 2200);
}
onBeforeUnmount(() => {
  clearTimeout(resetFeedback);
  viewer.release(props);
});
</script>

<template>
  <section
    class="code-output"
    :class="{ 'reading-code': reading }"
    :aria-label="title || languageLabel + ' 代码'"
  >
    <header class="code-toolbar">
      <span class="code-symbol" aria-hidden="true">&lt;/&gt;</span>
      <strong>{{ title || languageLabel }}</strong>
      <small v-if="title">{{ languageLabel }}</small>
      <div class="code-actions">
        <button type="button" @click="copy">
          <CopyDocument /><span aria-live="polite">{{ feedback || '复制' }}</span>
        </button>
        <button v-if="reading" type="button" data-close-code @click="viewer.close"><Back />收起</button>
        <button v-else type="button" @click="viewer.open(props, $event.currentTarget)">
          <FullScreen />展开
        </button>
      </div>
    </header>
    <textarea
      v-if="selectableExample && !reading"
      readonly
      aria-label="KF 脚本正文"
      :value="code"
      @focus="$event.target.select()"
      spellcheck="false"
    />
    <div v-else class="code-scroll" tabindex="0" aria-label="代码正文">
      <div class="code-lines">
        <div v-for="(line, index) in rows" :key="index" class="code-row">
          <span class="line-number" aria-hidden="true">{{ index + 1 }}</span>
          <code class="source-line"
            ><span
              v-for="(token, part) in tokens(line)"
              :key="part"
              :class="part % 2 ? color(token) : undefined"
              v-text="token"
          /></code>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-output {
  --code-border: #d5dff2;
  min-width: 0;
  margin: 10px 0;
  overflow: hidden;
  border: 1px solid var(--code-border);
  border-radius: 9px;
  color: #22314f;
  background: #f6f8fd;
}
.code-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  min-height: 35px;
  background: #edf2fc;
  border-bottom: 1px solid var(--code-border);
  font-size: 12px;
}
.code-toolbar strong {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.code-toolbar small,
.code-symbol {
  color: #576b91;
}
.code-symbol {
  font: 600 12px/1 monospace;
}
.code-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.code-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 4px;
  padding: 4px 6px;
  background: none;
  color: #324d79;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.code-actions button:hover {
  background: #dce6fa;
}
.code-actions svg {
  width: 14px;
  height: 14px;
}
.code-scroll,
textarea {
  overflow: auto;
  max-height: 280px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.code-lines,
textarea {
  margin: 0;
  padding: 9px 0;
  white-space: pre;
  tab-size: 2;
  font:
    13px/1.65 'SFMono-Regular',
    Consolas,
    'Liberation Mono',
    monospace;
  text-align: left;
}
.code-lines {
  width: max-content;
  min-width: 100%;
  background: transparent;
  color: inherit;
}
code {
  font: inherit;
  color: inherit;
  background: transparent;
}
.code-row {
  display: flex;
  min-height: 1.65em;
}
.line-number {
  flex: none;
  width: 4ch;
  margin-right: 12px;
  padding-right: 7px;
  text-align: right;
  color: #71809b;
  user-select: none;
  border-right: 1px solid #e0e7f5;
}
.source-line {
  padding-right: 14px;
}
.keyword {
  color: #244bc0;
}
.string {
  color: #106952;
}
.comment {
  color: #6a758a;
}
textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 76px;
  height: 110px;
  resize: vertical;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 8px 12px;
}
.reading-code {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 0;
  border-radius: 0;
  margin: 0;
}
.reading-code .code-scroll {
  flex: 1;
  max-height: none;
}
</style>
<!-- end -->
