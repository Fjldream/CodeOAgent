<!-- modified by jinlong.feng at 2026-11-23 KF计算工程业务总览 -->
<script setup>
import { computed, defineComponent, h } from 'vue';
import { inlineAnswer, replyBlocks } from './assistant-answer.js';
import AssistantCodeBlock from './AssistantCodeBlock.vue';

const props = defineProps({ text: { type: String, default: '' } });
const blocks = computed(() => replyBlocks(props.text));
const ReplyText = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props) {
    return () => inlineAnswer(props.value).map(token => h(token.tag, token.text));
  },
});
</script>
<template>
  <div class="answer">
    <template v-for="(block, i) in blocks" :key="i">
      <AssistantCodeBlock v-if="block.code !== undefined" :code="block.code" :language="block.language" />
      <component :is="block.kind" v-else-if="block.kind==='h4'||block.kind==='h5'"><ReplyText :value="block.text"/></component>
      <div v-else-if="block.kind==='table'" class="table-wrap" role="region" aria-label="答复表格" tabindex="0">
        <table><thead><tr><th v-for="(cell,n) in block.headers" :key="n" scope="col"><ReplyText :value="cell"/></th></tr></thead>
          <tbody><tr v-for="(row,r) in block.rows" :key="r"><td v-for="(cell,c) in row" :key="c"><ReplyText :value="cell"/></td></tr></tbody>
        </table>
      </div>
      <component :is="block.kind" v-else-if="block.kind==='ul'||block.kind==='ol'" :start="block.start">
        <li v-for="(line,n) in block.lines" :key="n"><ReplyText :value="line"/></li>
      </component>
      <p v-else><ReplyText :value="block.lines.join('\n')"/></p>
    </template>
  </div>
</template>
<style scoped>
.answer { min-width:0; max-width:84ch; line-height:1.72; color:inherit; overflow-wrap:anywhere; }
.answer > * { margin:0; }
.answer > * + * { margin-block-start:.65em; }
.answer h4 { margin-block-start:1.25em; padding-top:.72em; border-top:1px solid #dce4ee; font-size:1.05em; font-weight:680; color:#233b5d; }
.answer h4:first-child { margin:0; padding:0; border:0; }
.answer h5 { margin-block-start:1em; color:#344a64; font-size:1em; font-weight:650; }
.answer h4 + *, .answer h5 + * { margin-block-start:.28em; }
.answer p { white-space:pre-wrap; }
.answer ul,.answer ol { padding-inline-start:1.55em; }
.answer li { padding-inline-start:.15em; }
.answer li + li { margin-top:.25em; }
.answer li::marker { color:#596f89; }
.answer :deep(strong) { font-weight:650; }
.answer :deep(p code),.answer :deep(li code),.answer :deep(td code),.answer :deep(th code) { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.91em; color:#274969; background:#eff3f8; padding:.07em .22em; border-radius:3px; }
.table-wrap { max-width:100%; overflow-x:auto; }
.table-wrap:focus-visible { outline:2px solid #4379c4; outline-offset:2px; }
.answer table { border-collapse:collapse; font-size:.95em; }
.answer th,.answer td { text-align:start; vertical-align:top; border-bottom:1px solid #dce4ee; padding:.4em .7em; }
.answer th { color:#314d69; background:#f3f6fa; }
</style>
<!-- end -->
