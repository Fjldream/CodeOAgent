<!-- modified by jinlong.feng at 2026-11-23 KF计算工程业务总览 -->
<script setup>
import {computed,ref,watch} from 'vue';
import {ArrowRight,Check,Loading,Warning} from '@element-plus/icons-vue';
const props=defineProps({steps:{type:Array,required:true},active:Boolean});
const expanded=ref(false);
watch(()=>props.active,value=>{expanded.value=value;},{immediate:true});
const summary=computed(()=>{
  const running=props.steps.find(s=>s.state==='running');
  if(props.active && running)return '正在'+running.label;
  const complete=props.steps.filter(s=>s.state==='done').length;
  return complete===props.steps.length?'已完成 '+complete+' 项核对':'已完成 '+complete+' / '+props.steps.length+' 项核对';
});
</script>
<template>
  <div v-if="steps.length" class="query-activity">
    <button type="button" :aria-expanded="expanded" @click="expanded=!expanded"><ArrowRight :class="{expanded}"/><span aria-live="polite">{{ summary }}</span></button>
    <ul v-if="expanded">
      <li v-for="step in steps" :key="step.step">
        <Check v-if="step.state==='done'" aria-hidden="true"/>
        <Loading v-else-if="active && step.state==='running'" class="loading" aria-hidden="true"/>
        <Warning v-else aria-hidden="true"/>
        <span>{{ active && step.state==='running'?'正在':'' }}{{ step.label }}</span>
        <small v-if="step.detail">{{ step.detail }}</small>
        <small v-else-if="step.state==='failed'">未成功</small>
        <small v-else-if="!active && step.state==='running'">已中断</small>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.query-activity { margin:4px 0 8px; color:#53667d; font-size:12px; line-height:1.55; }
button { display:inline-flex; align-items:center; gap:6px; background:none; border:0; padding:3px 1px; cursor:pointer; font:inherit; color:inherit; }
button:hover {color:#244c7c;}
svg { width:13px; height:13px; flex:none; }
button svg {width:10px;}
.expanded {transform:rotate(90deg);}
ul {list-style:none; margin:3px 0 0 5px; padding:2px 0 2px 12px; border-left:1px solid #d5dfeb;}
li {display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 7px; margin:4px 0;}
li svg {align-self:center;}
li small {font-size:inherit; color:#596b80;}
.loading {animation:activity-spin 1.3s linear infinite;}
@keyframes activity-spin {to{transform:rotate(360deg);}}
@media(prefers-reduced-motion:reduce){.loading {animation:none;}}
</style>
<!-- end -->
