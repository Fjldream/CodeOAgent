<!-- modified by jinlong.feng at 2026-11-20 KF开发助手M1 -->
<script setup>
// modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import { assistantJson, assistantRequest, consumeEvents } from './api.js';
import { Expand, FullScreen, CopyDocument } from '@element-plus/icons-vue';
import AssistantCodeBlock from './AssistantCodeBlock.vue';
// modified by jinlong.feng at 2026-11-23 KF对话轮次导航
import TurnNavigator from './TurnNavigator.vue';
// end
import AssistantReply from './AssistantReply.vue';
import AssistantSidebar from './AssistantSidebar.vue';
// end
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
import {
  Aim,
  ArrowDown,
  ArrowRight,
  Back,
  ChatLineRound,
  CircleCheck,
  Close,
  DocumentChecked,
  EditPen,
  FolderOpened,
  Minus,
  Plus,
  Tickets,
  Top,
  VideoPause,
} from '@element-plus/icons-vue';
import { useAssistantWindow } from './useAssistantWindow.js';
// end
const props = defineProps({
  context: { type: Object, required: true },
  token: { type: Function, required: true },
  embedded: Boolean,
  // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
  minimized: Boolean,
  // end
});
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
const emit = defineEmits(['close', 'minimize', 'restore']);
// end
const plans = ref([]),
  owner = ref(''),
  model = ref(false),
  planId = ref(''),
  chatId = ref(''),
  data = ref(null),
  tab = ref('chat');
const question = ref(''),
  error = ref(''),
  working = ref(false),
  running = ref(''),
  progress = ref(''),
  partial = ref(''),
  scrollBox = ref(null);
const form = ref(''),
  name = ref(''),
  loading = ref(true);
const expanded = ref('');
const currentPlan = computed(() => plans.value.find((p) => p.id === planId.value));
const confirmed = computed(() => data.value?.proposals.filter((p) => p.status === 'confirmed') ?? []);
const pending = computed(() => data.value?.proposals.filter((p) => p.status === 'pending') ?? []);
// modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
// modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
const {
  surface,
  handle,
  dock,
  geometry,
  windowRect,
  maximized,
  toggleMaximized,
  startDrag,
  moveDrag,
  endDrag,
  moveByKey,
  minimize,
} = useAssistantWindow(props, owner, emit);
const compact = computed(() => windowRect.value.w < 640);
const sidebarCollapsed = ref(false);
const mobileSidebar = ref(false);
const sidebarVisible = computed(
  () => !!owner.value && (compact.value ? mobileSidebar.value : !sidebarCollapsed.value),
);
const codeReading = shallowRef(null);
let codeOpener;
function closeCode() {
  codeReading.value = null;
  const opener = codeOpener;
  codeOpener = null;
  nextTick(() => opener?.isConnected && opener.focus({ preventScroll: true }));
}
provide('kfAssistantCodeReader', {
  open(block, opener) {
    codeOpener = opener;
    codeReading.value = block;
    nextTick(() => surface.value?.querySelector('[data-close-code]')?.focus({ preventScroll: true }));
  },
  close: closeCode,
  release(block) {
    if (block === codeReading.value) closeCode();
  },
});
watch(compact, () => {
  mobileSidebar.value = false;
});
watch(owner, () => {
  sidebarCollapsed.value = stored(sessionStorage, scopeKey() + '.sidebar') === 'closed';
});
function toggleSidebar() {
  if (compact.value) mobileSidebar.value = !mobileSidebar.value;
  else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    remember(sessionStorage, scopeKey() + '.sidebar', sidebarCollapsed.value ? 'closed' : '');
  }
  if (sidebarVisible.value) loadWorkspace().catch(showError);
}
function openThread(plan, chat) {
  mobileSidebar.value = false;
  tab.value = 'chat';
  if (chat !== chatId.value) void choose(plan, chat);
  else form.value = '';
}
function startNaming(type) {
  mobileSidebar.value = false;
  editName(type);
}
// end
const contextLabel = computed(() => props.context.label || props.context.object || '开发中心');
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import { currentEditorText, captureRuntime, observerTab } from './runtime-observation.js';
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import QueryActivity from './QueryActivity.vue';
const liveActivity=ref(new Map());
function turnActivities(turn){
  const steps=new Map((turn.activities||[]).map(step=>[step.step,step]));
  if(running.value===turn.id)for(const [id,step] of liveActivity.value){
    if(steps.get(id)?.state!=='done' && steps.get(id)?.state!=='failed')steps.set(id,step);
  }
  return [...steps.values()];
}
// end
import { snapshotContext } from './editor-context.js';
import ContextTools from './ContextTools.vue';
const isObject = computed(() => props.context.kind !== 'general');
const kindLabels = {
  page: '二维页面',
  period: '周期脚本',
  request: '请求式脚本',
  client: '客户端工程',
  calculation: '计算工程',
  collection: '数采工程',
  alarm: '报警工程',
  datasource: '数据源',
  scene: '3D 场景',
  report: '报表',
};
// end
const canAsk = computed(() => model.value && !working.value && !running.value && !!question.value.trim());
// modified by jinlong.feng at 2026-11-20 KF助手浮窗试点交付
function isComposing(event) {
  return event.isComposing || event.keyCode === 229 || event.target?.composing === true;
}
function minimizeOnEscape(event) {
  if (isComposing(event)) return;
  event.preventDefault();
  // modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
  if (codeReading.value) closeCode();
  else if (compact.value && mobileSidebar.value) mobileSidebar.value = false;
  else minimize();
  // end
}
// end
function submitOnEnter(event) {
  // modified by jinlong.feng at 2026-11-20 KF助手浮窗试点交付
  if (isComposing(event) || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
  // end
  if (canAsk.value) {
    event.preventDefault();
    void send('ask');
  }
}
function switchTab(id) {
  form.value = '';
  // modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
  mobileSidebar.value = false;
  tab.value = id;
  // end
  if (id === 'history') loadWorkspace().catch(showError);
  if (id === 'plan' && chatId.value) refresh().catch(showError);
}
// end
let generation = 0,
  readSequence = 0,
  controller,
  disposed = false;
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
const api = (path, payload, signal) => assistantJson(props.token(), path, payload, signal);
import {listenForConnectionTests} from './connection-test.js';
const stopConnectionListener=listenForConnectionTests(projectId=>{
  if(!chatId.value || props.context.kind!=='calculation' || props.context.projectId!==projectId) return;
  const chat=chatId.value, token=props.token(), context={kind:'calculation',projectId,dirty:false,object:''};
  return async (alias,sourceId,configStamp)=>{
    const {ticket}=await assistantJson(token,'connection-captures/begin',{mode:'development',context,chatId:chat,alias,sourceId,configStamp},AbortSignal.timeout(8000));
    return errorCode=>assistantJson(token,'connection-captures/finish',{chatId:chat,ticket,observation:{errorCode}},AbortSignal.timeout(8000));
  };
});
onBeforeUnmount(stopConnectionListener);
// end
const scopeKey = () => 'kf.assistant.selection.' + owner.value;
const draftKey = (c = props.context) =>
  scopeKey() + '.draft.' + chatId.value + '.' + [c.kind, c.projectId, c.object].join('/');
function stored(storage, key) {
  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
}
function remember(storage, key, value) {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    /* storage can be disabled */
  }
}
function selection() {
  const pref = JSON.stringify([planId.value, chatId.value]);
  remember(sessionStorage, scopeKey(), pref);
  remember(localStorage, scopeKey(), pref);
}
function saveDraft(event) {
  remember(sessionStorage, draftKey(), event.target.value);
}
function recoverDraft() {
  question.value = stored(sessionStorage, draftKey());
}
// modified by jinlong.feng at 2026-11-23 KF助手对话底部跟随
const chatVisible = computed(() =>
  Boolean(data.value && !loading.value && !props.minimized && !form.value && !codeReading.value && tab.value === 'chat'),
);
const latestTurn = computed(() => data.value?.turns.at(-1));
// modified by jinlong.feng at 2026-11-23 KF对话轮次导航
const followLatest=ref(true);
function rememberScroll(){
  const box=scrollBox.value;
  if(box)followLatest.value=box.scrollHeight-box.clientHeight-box.scrollTop<=20;
}
watch(chatId,()=>{followLatest.value=true;});
function showLatestMessage() {
  if(!followLatest.value)return;
// end
  const box = scrollBox.value;
  if (chatVisible.value && box) box.scrollTop = box.scrollHeight;
}
watch([chatVisible, scrollBox], ([visible, box], previous, onCleanup) => {
  if (!visible || !box) return;
  showLatestMessage();
  const observer = new ResizeObserver(showLatestMessage);
  observer.observe(box);
  onCleanup(() => observer.disconnect());
}, { flush: 'post' });
watch(
  [chatId, () => latestTurn.value?.id, () => latestTurn.value?.status, () => latestTurn.value?.answer, progress, partial],
  showLatestMessage,
  { flush: 'post' },
);
// end
function showError(e) {
  if (!disposed && e.name !== 'AbortError') error.value = e.message || '助手服务暂不可用';
}
async function loadWorkspace() {
  const result = await api('workspace');
  if (disposed) return;
  owner.value = result.owner;
  plans.value = result.plans;
  model.value = result.modelEnabled;
}
async function init() {
  loading.value = true;
  error.value = '';
  try {
    await loadWorkspace();
    if (disposed) return;
    let remembered;
    try {
      remembered = JSON.parse(
        stored(sessionStorage, scopeKey()) || stored(localStorage, scopeKey()) || 'null',
      );
    } catch {
      /* invalid preference */
    }
    const p = plans.value.find((p) => p.id === remembered?.[0]) || plans.value[0];
    if (p) await choose(p.id, p.chats.find((c) => c.id === remembered?.[1])?.id || p.chats[0]?.id);
  } catch (e) {
    showError(e);
  } finally {
    loading.value = false;
  }
}
async function refresh(id = chatId.value) {
  if (!id) return;
  const seq = generation,
    request = ++readSequence,
    result = await api('chats/' + id);
  if (!disposed && id === chatId.value && seq === generation && request === readSequence) {
    data.value = result;
    return result;
  }
}
async function reveal(id) {
  if (expanded.value === id) {
    expanded.value = '';
    return;
  }
  expanded.value = '';
  try {
    const result = await refresh();
    if (result?.turns.some((row) => row.id === id && row.evidence)) expanded.value = id;
  } catch (e) {
    showError(e);
  }
}
async function revisit() {
  if (document.visibilityState !== 'visible' || !chatId.value) return;
  try {
    // modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗
    const result = await refresh();
    if (result && !result.turns.some((turn) => turn.id === expanded.value && turn.evidence)) {
      expanded.value = '';
    }
    // end
  } catch (e) {
    data.value = null;
    showError(e);
  }
}
async function choose(p, c) {
  generation++;
  controller?.abort();
  running.value = '';
  working.value = false;
  partial.value = '';
  expanded.value = '';
  error.value = '';
  progress.value = '';
  planId.value = p;
  chatId.value = c;
  data.value = null;
  form.value = '';
  selection();
  recoverDraft();
  try {
    await refresh(c);
    if (chatId.value !== c || disposed) return;
    const live = data.value?.turns.find((t) => t.status === 'active');
    // modified by jinlong.feng at 2026-11-23 KF助手对话底部跟随
    if (live) void follow(live.id, c);
    // end
  } catch (e) {
    showError(e);
  }
}
async function create() {
  if (working.value || !name.value.trim()) return;
  working.value = true;
  error.value = '';
  try {
    const isPlan = form.value === 'plan';
    const result = await api(isPlan ? 'plans' : 'plans/' + planId.value + '/chats', {
      title: name.value.trim(),
    });
    await loadWorkspace();
    tab.value = 'chat';
    await choose(isPlan ? result.id : planId.value, isPlan ? result.chatId : result.id);
  } catch (e) {
    showError(e);
  } finally {
    working.value = false;
  }
}
function editName(type) {
  form.value = type;
  name.value = '';
  error.value = '';
}
async function follow(id, c) {
  controller?.abort();
  const guard = new AbortController();
  controller = guard;
  const seq = generation;
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
  liveActivity.value=new Map();
// end
  running.value = id;
  partial.value = '';
  let after = 0;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (guard.signal.aborted) return;
      try {
        const response = await assistantRequest(
          props.token(),
          'runs/' + id + '/events?after=' + after,
          undefined,
          guard.signal,
        );
        await consumeEvents(response, (e) => {
          after = e.seq;
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
          if(e.type==='activity')liveActivity.value.set(e.step,e);
// end
          if (e.type === 'status') progress.value = e.message;
          // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
          if (e.type === 'observe-screen' && e.tab === observerTab) {
            const token = props.token();
            void (async () => {
              const current = await snapshotContext(props.context);
              if (
                current.projectId !== e.projectId ||
                current.control !== e.control ||
                current.object !== e.page
              )
                return;
              const editorObservation = currentEditorText(current);
              const observation = await captureRuntime(token, current);
              if (!guard.signal.aborted && generation === seq && props.token() === token)
                await assistantJson(
                  token,
                  'runs/' + id + '/screen',
                  { ticket: e.ticket, observation, editorObservation },
                  guard.signal,
                );
            })().catch(() => {});
          }
          // end
          // modified by jinlong.feng at 2026-11-23 KF助手对话底部跟随
          if (e.type === 'delta') partial.value += e.text;
          // end
        });
        await refresh(c);
        if (!data.value?.turns.some((t) => t.id === id && t.status === 'active')) break;
      } catch (e) {
        if (guard.signal.aborted) throw e;
        if (attempt === 2) throw e;
      }
      await new Promise((r) => setTimeout(r, 450));
    }
  } catch (e) {
    showError(e);
  } finally {
    if (seq === generation && !disposed) {
      running.value = '';
      partial.value = '';
      // modified by jinlong.feng at 2026-11-23 KF助手对话底部跟随
      progress.value = '';
      // end
    }
  }
}
async function send(intent) {
  if (working.value || running.value || !chatId.value) return;
  const q =
    intent === 'lookup'
      ? '核对当前对象的已保存配置'
      : intent === 'propose'
        ? '根据本次配置读回整理一项方案提议'
        : question.value.trim();
  if (!q) return;
// modified by jinlong.feng at 2026-11-23 KF对话轮次导航
  followLatest.value=true;
// end
  const c = chatId.value,
    seq = generation,
    key = draftKey(),
    ctx = { ...props.context };
  const attemptKey = key + '.attempt';
  // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
  working.value = true;
  let context;
  try {
    context = await snapshotContext(ctx);
  } catch (error) {
    working.value = false;
    showError(error);
    return;
  }
  if (seq !== generation || disposed) return;
  const signature = JSON.stringify([intent, q, context]);
  // end
  let last;
  try {
    last = JSON.parse(stored(sessionStorage, attemptKey) || 'null');
  } catch {
    /* stale preference */
  }
  const requestId = last?.signature === signature ? last.requestId : crypto.randomUUID();
  remember(sessionStorage, attemptKey, JSON.stringify({ signature, requestId }));
  working.value = true;
  error.value = '';
  try {
    // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    const token = props.token();
    const browserTab =
      intent === 'ask' && context.kind === 'page' && context.control ? observerTab : undefined;
    if (generation !== seq || disposed || props.token() !== token) return;
    const { id } = await api('chats/' + c + '/turns', {
      requestId,
      question: q,
      intent,
      context,
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
      ...(intent==='ask' && context.dirty && context.editor?.digest && typeof ctx.scriptText==='string' && {scriptDraft:ctx.scriptText}),
// end
      browserTab,
    });
    // end
    // end
    remember(sessionStorage, attemptKey, '');
    if (intent === 'ask') {
      remember(sessionStorage, key, '');
      if (key === draftKey()) question.value = '';
    }
    if (generation !== seq || disposed) return;
    await refresh(c);
    await follow(id, c);
  } catch (e) {
    showError(e);
  } finally {
    if (generation === seq) working.value = false;
  }
}
async function decide(id, decision) {
  if (working.value) return;
  working.value = true;
  error.value = '';
  try {
    await api('proposals/' + id + '/decision', { decision });
    await refresh();
  } catch (e) {
    showError(e);
    await refresh().catch(showError);
  } finally {
    working.value = false;
  }
}
async function cancel() {
  try {
    await api('runs/' + running.value + '/cancel', {});
  } catch (e) {
    showError(e);
  }
}
watch(() => [props.context.kind, props.context.projectId, props.context.object], recoverDraft);
onMounted(() => {
  void init();
  window.addEventListener('focus', revisit);
  document.addEventListener('visibilitychange', revisit);
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  controller?.abort();
  window.removeEventListener('focus', revisit);
  document.removeEventListener('visibilitychange', revisit);
});
</script>
<!-- modified by jinlong.feng at 2026-11-20 KF助手浮动对话窗 -->
<template>
  <div
    ref="surface"
    class="assistant-float"
    :class="{ 'in-editor': embedded, 'is-docked': minimized }"
    :style="embedded ? undefined : geometry"
  >
    <button
      v-show="minimized"
      ref="dock"
      class="assistant-dock"
      title="恢复开发助手"
      aria-label="恢复开发助手"
      @click="emit('restore')"
    >
      <span class="kf-mark" aria-hidden="true">KF</span><span>{{ running ? '正在回复' : '开发助手' }}</span
      ><span class="restore-arrow" aria-hidden="true">↗</span>
    </button>
    <!-- modified by jinlong.feng at 2026-11-20 KF助手浮窗试点交付 -->
    <section
      v-show="!minimized"
      class="kf-assistant"
      role="dialog"
      aria-modal="false"
      aria-label="开发助手"
      @keydown.esc.stop="minimizeOnEscape"
    >
      <!-- end -->
      <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
      <header class="window-bar">
        <div
          ref="handle"
          class="window-handle"
          tabindex="0"
          role="group"
          aria-label="移动开发助手窗口，使用方向键或拖动，Shift 加方向键调整大小"
          title="拖动移动，双击最大化，Shift 加方向键调整大小"
          @pointerdown="startDrag($event)"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @lostpointercapture="endDrag"
          @keydown="moveByKey"
          @dblclick="toggleMaximized"
        >
          <span class="kf-mark" aria-hidden="true">KF</span><strong>开发助手</strong
          ><span class="window-context">{{ contextLabel }}</span>
        </div>
        <div class="window-controls">
          <button type="button" aria-label="最小化开发助手" title="最小化到右下角" @click="minimize">
            <Minus />
          </button>
          <button
            type="button"
            :aria-label="maximized ? '还原窗口' : '最大化窗口'"
            :title="maximized ? '还原窗口' : '最大化窗口'"
            @click="toggleMaximized"
          >
            <component :is="maximized ? CopyDocument : FullScreen" />
          </button>
          <button type="button" aria-label="关闭开发助手" title="关闭" @click="emit('close')">
            <Close />
          </button>
        </div>
      </header>
      <div v-show="!codeReading" class="assistant-body">
        <AssistantSidebar
          v-if="sidebarVisible"
          :plans="plans"
          :plan-id="planId"
          :chat-id="chatId"
          :busy="working"
          @choose="openThread"
          @create="startNaming"
          @history="switchTab('history')"
          @collapse="toggleSidebar"
        />
        <button
          v-if="compact && sidebarVisible"
          class="sidebar-scrim"
          aria-label="关闭会话导航"
          @click="toggleSidebar"
        />
        <div class="assistant-main">
          <div v-if="owner" class="thread-heading">
            <button
              v-if="!sidebarVisible"
              class="icon-button"
              title="展开会话栏"
              aria-label="展开会话栏"
              @click="toggleSidebar"
            >
              <Expand />
            </button>
            <button
              v-if="currentPlan && data && tab === 'chat' && !form"
              class="thread-name"
              aria-label="切换方案或对话"
              :title="currentPlan.title + ' / ' + data.title"
              @click="switchTab('history')"
            >
              {{ data.title }}<ArrowDown />
            </button>
            <strong v-else>{{
              form
                ? form === 'plan'
                  ? '新建方案'
                  : '新建对话'
                : tab === 'plan'
                  ? '方案清单'
                  : tab === 'history'
                    ? '对话历史'
                    : '对话'
            }}</strong>
            <button
              v-if="currentPlan && !form"
              class="view-action"
              @click="switchTab(tab === 'chat' ? 'plan' : 'chat')"
            >
              <component :is="tab === 'chat' ? Tickets : ChatLineRound" />{{
                tab === 'chat' ? '方案清单' : '返回对话'
              }}
              <span v-if="tab === 'chat' && pending.length" class="pending-count">{{ pending.length }}</span>
            </button>
          </div>
          <!-- end -->
          <div v-if="error" class="error" role="alert">
            {{ error }} <button v-if="!data" class="text-button" @click="init">重试</button>
          </div>
          <!-- modified by jinlong.feng at 2026-11-23 KF对话轮次导航 -->
          <div class="conversation-layout">
            <TurnNavigator v-if="chatVisible" :turns="data.turns" :scroller="scrollBox" @navigate="followLatest=false" />
            <main ref="scrollBox" class="conversation" @scroll.passive="rememberScroll">
          <!-- end -->
            <p v-if="loading" class="muted">正在读取个人工作区…</p>
            <form v-else-if="form" class="name-form" @submit.prevent="create">
              <button type="button" class="text-button back" @click="form = ''"><Back />返回</button>
              <label
                >{{ form === 'plan' ? '新方案名称' : '新对话名称'
                }}<input v-model="name" maxlength="80" autofocus required
              /></label>
              <div class="actions">
                <button class="primary" :disabled="working || !name.trim()">创建</button
                ><button type="button" class="secondary" @click="form = ''">取消</button>
              </div>
            </form>
            <div v-else-if="!currentPlan && owner" class="empty-state">
              <FolderOpened class="empty-icon" />
              <h2>创建第一个方案</h2>
              <p>同一方案里的对话，可以从不同工程接着聊。</p>
              <button class="primary" @click="editName('plan')"><Plus />新建方案</button>
            </div>
            <template v-else-if="currentPlan && tab === 'history'">
              <div class="section-heading">
                <h2>对话历史</h2>
                <button class="text-button" @click="editName('plan')"><Plus />新建方案</button>
              </div>
              <button class="secondary new-chat" @click="editName('chat')">
                <EditPen />在此方案新开对话
              </button>
              <div v-for="p in plans" :key="p.id" class="group">
                <h3><FolderOpened />{{ p.title }}</h3>
                <button
                  v-for="c in p.chats"
                  :key="c.id"
                  class="history-row"
                  :class="{ current: c.id === chatId }"
                  @click="
                    tab = 'chat';
                    choose(p.id, c.id);
                  "
                >
                  <ChatLineRound /><span>{{ c.title }}</span
                  ><small v-if="c.id === chatId">当前</small><ArrowRight v-else />
                </button>
              </div>
            </template>
            <template v-else-if="data && tab === 'plan'">
              <div class="planbar">
                <FolderOpened /><span>{{ currentPlan.title }}</span
                ><small>第 {{ data.revision }} 版</small>
              </div>
              <h2>已确认清单</h2>
              <p v-if="!confirmed.length" class="muted">确认后的方案条目会出现在这里。</p>
              <div v-for="p in confirmed" :key="p.id" class="item">
                <CircleCheck />
                <div>
                  <p>{{ p.body }}</p>
                  <small>第 {{ p.version }} 版</small>
                </div>
              </div>
              <h2 v-if="pending.length" class="pending-heading">待本人确认</h2>
              <article v-for="p in pending" :key="p.id" class="proposal">
                <small>新增 · 基于第 {{ p.base }} 版</small>
                <p>{{ p.body }}</p>
                <div class="actions">
                  <button
                    class="primary"
                    :disabled="working || p.base !== data.revision"
                    @click="decide(p.id, 'confirmed')"
                  >
                    确认加入清单</button
                  ><button class="secondary" :disabled="working" @click="decide(p.id, 'rejected')">
                    拒绝
                  </button>
                </div>
                <small v-if="p.base !== data.revision">方案已更新，请重新核对并生成提议。</small>
              </article>
            </template>
            <template v-else-if="data">
              <div v-if="!data.turns.length" class="empty-state chat-empty">
                <ChatLineRound class="empty-icon" />
                <!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
                <p>
                  {{
                    isObject
                      ? '可以先核对当前对象的已保存配置。'
                      : '进入工程，或在数据源管理中单选一个工程，即可核对已保存配置。'
                  }}
                </p>
                <!-- end -->
              </div>
              <!-- modified by jinlong.feng at 2026-11-23 KF对话轮次导航 -->
              <article v-for="turn in data.turns" :key="turn.id" :data-turn-id="turn.id" class="turn">
              <!-- end -->
                <!-- modified by jinlong.feng at 2026-11-23 KF对话文档格式适配 -->
                <div v-if="turn.question" class="question"><AssistantReply :text="turn.question" /></div>
                <!-- end -->
                <div class="reply-author">
                  <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
                  <span class="kf-mark reply-mark" aria-hidden="true">KF</span><strong>KF 助手</strong>
                  <!-- end -->
                  <!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
                  <small v-if="kindLabels[turn.context?.kind]">{{ kindLabels[turn.context.kind] }}</small>
                  <!-- end -->
                </div>
                <!-- modified by jinlong.feng at 2026-11-20 KF助手模型统一答复 -->
                <small
                  v-if="turn.source && turn.status !== 'active'"
                  class="reply-source"
                  :title="[...(turn.source.tools || []), ...(turn.source.basis || [])].join(' · ')"
                >
                  来源 · {{ turn.source.label }}
                </small>
                <!-- end -->
                <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
                <!-- modified by jinlong.feng at 2026-11-23 KF计算工程业务总览 -->
                <QueryActivity v-if="turn.activities?.length || (running===turn.id && liveActivity.size)" :steps="turnActivities(turn)" :active="turn.status==='active'"/>
                <!-- end -->
                <AssistantReply
                  :text="
                    turn.answer ||
                    (turn.status === 'interrupted'
                      ? '本轮已中断，可重新提问。'
                      : turn.status === 'active'
                        ? '正在处理…'
                        : '')
                  "
                />
                <!-- end -->
                <div v-if="turn.evidence" class="evidence">
                  <button
                    type="button"
                    class="text-button"
                    :aria-expanded="expanded === turn.id"
                    @click="reveal(turn.id)"
                  >
                    <DocumentChecked />查看已保存配置证据<component
                      :is="expanded === turn.id ? ArrowDown : ArrowRight"
                    />
                  </button>
                  <div v-if="expanded === turn.id" class="evidence-detail">
                    <!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
                    <small>{{ turn.evidence.at }} · {{ turn.evidence.id }}</small>
                    <p v-if="turn.evidence.digest">
                      来源 {{ turn.evidence.source }} · 指纹 {{ turn.evidence.digest.slice(0, 12) }}
                    </p>
                    <!-- end -->
                    <dl>
                      <template v-for="(f, i) in turn.evidence.facts" :key="i"
                        ><dt>{{ f.label }}</dt>
                        <dd>{{ f.value }}</dd></template
                      >
                    </dl>
                    <p v-for="g in turn.evidence.gaps" :key="g">{{ g }}</p>
                  </div>
                </div>
                <button
                  v-if="data.proposals.some((p) => p.run === turn.id)"
                  class="text-button"
                  @click="tab = 'plan'"
                >
                  <Tickets />查看方案差异<ArrowRight />
                </button>
              </article>
              <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
              <AssistantReply v-if="partial" :text="partial" class="streaming-reply" />
              <p v-else-if="progress && !liveActivity.size" class="live" role="status">{{ progress }}</p>
              <!-- end -->
            </template>
            </main>
          <!-- modified by jinlong.feng at 2026-11-23 KF对话轮次导航 -->
          </div>
          <!-- end -->
          <footer v-if="data && tab === 'chat' && !form" class="composer-area">
            <div v-if="isObject" class="quick-actions">
              <button :disabled="working || !!running" @click="send('lookup')">
                <DocumentChecked />核对已保存配置</button
              ><button :disabled="working || !!running" @click="send('propose')">
                <Tickets />整理方案提议
              </button>
            </div>
            <!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
            <div class="composer">
              <!-- end -->
              <textarea
                v-model="question"
                rows="2"
                :placeholder="model ? '向开发助手提问…' : '模型未启用，可先记下问题…'"
                aria-label="向开发助手提问"
                @input="saveDraft"
                @keydown.enter="submitOnEnter"
              />
              <div class="composer-toolbar">
                <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
                <ContextTools :key="context.kind" :context="context" :token="token" :chat-id="chatId" />
                <!-- end -->
                <div class="context" :title="contextLabel">
                  <Aim /><span>{{ contextLabel }}</span>
                </div>
                <div class="send-tools">
                  <!-- modified by jinlong.feng at 2026-11-20 KF助手模型统一答复 -->
                  <small :title="model ? '自由提问由模型回答，每条回复单独标注来源' : '仍可核对已保存配置'">{{
                    model ? '模型已启用' : '只读查询'
                  }}</small>
                  <!-- end -->
                  <button v-if="running" class="send" title="取消回复" aria-label="取消回复" @click="cancel">
                    <VideoPause />
                  </button>
                  <button
                    v-else
                    class="send"
                    :disabled="!canAsk"
                    aria-label="发送"
                    :title="model ? '发送 · Enter' : '云端模型未启用'"
                    @click="send('ask')"
                  >
                    <Top />
                  </button>
                </div>
              </div>
            </div>
            <small v-if="context.dirty" class="unsaved">有未保存修改 · 当前查询读取上次保存的版本</small>
          </footer>
          <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
        </div>
      </div>
      <AssistantCodeBlock
        v-if="codeReading"
        :code="codeReading.code"
        :language="codeReading.language"
        :title="codeReading.title"
        reading
      />
      <template v-if="!maximized">
        <span
          v-for="edge in ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']"
          :key="edge"
          class="resize-edge"
          :data-edge="edge"
          aria-hidden="true"
          @pointerdown.prevent="startDrag($event, edge)"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @lostpointercapture="endDrag"
        />
      </template>
      <!-- end -->
    </section>
  </div>
</template>
<style scoped src="./assistant-window.css"></style>
<!-- end -->
<!-- end -->
