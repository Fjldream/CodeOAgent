<!-- modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据 -->
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
// modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
import CalcCapture from './CalcCapture.vue';
// end
import { assistantJson } from './api.js';
// modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗
import AssistantCodeBlock from './AssistantCodeBlock.vue';
// end
import { observePoint } from './monitor-point.js';
// modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
import { captureRuntime, currentEditorText } from './runtime-observation.js';
// end
// modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
import { identifyMonitorSample } from './monitor-point.js';
import { captureAlarm } from './runtime-observation.js';
const stopAlarm = ref(false);
// end
// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
// modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
import ReportCapture from './ReportCapture.vue';
import SceneCapture from './SceneCapture.vue';
const sceneChoices = ref([]);
// end
// end
import { snapshotContext } from './editor-context.js';
const props = defineProps({ context: Object, token: Function, chatId: String });
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
const canReverse = computed(() => ['page', 'period', 'request'].includes(props.context.kind));
const canTrace = computed(() => canReverse.value || props.context.kind === 'report');
watch(canReverse, (enabled) => {
  if (!enabled && action.value === 'reverse') action.value = 'lookup_reference';
});
// end
const action = ref('lookup_reference'),
  term = ref(''),
  lines = ref([]),
  busy = ref(false),
  expanded = ref(false);
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
const dependencyMember=ref('');
const isDependency=computed(()=>['calculate-npm-dependencies','calculate-normal-dependencies','calculate-py-dependencies'].includes(props.context.calcMenu));
watch([dependencyMember,()=>props.context.calcMenu],clear);
watch(()=>props.context.calcMenu,()=>{dependencyMember.value='';if(action.value==='dependency_receipts'){term.value='';if(!isDependency.value)action.value='lookup_reference';}});
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
const calendarDate = ref('');
const nodeOffset = ref('');
const isCalendarMenu = computed(() => props.context.kind === 'period' || props.context.calcMenu === 'calculate-period-script');
watch([calendarDate, nodeOffset], clear);
watch(() => props.context.projectId, () => { calendarDate.value = ''; nodeOffset.value = ''; });
// end
const device = ref('');
// end
const project = ref('');
const clientPointsAvailable = computed(() => ['client', 'page'].includes(props.context.kind));
watch(clientPointsAvailable, (available) => {
  if (!available && action.value === 'clientPoints') action.value = 'lookup_reference';
});
watch(
  () => props.context.projectId,
  () => {
    device.value = '';
    project.value = '';
  },
);
watch([device, project], clear);
// end
// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
watch(
  [
    () => props.context.projectId,
    () => props.context.kind,
    () => props.context.object,
    () => props.context.control,
    () => props.context.group,
    () => props.chatId,
  ],
  () => {
    if (action.value === 'inspect_alarm_rule') {
      clear();
      term.value = '';
      if (props.context.kind !== 'alarm' && !(props.context.kind === 'page' && props.context.control))
        action.value = 'lookup_reference';
    }
  },
);
// end
const bindingVariable = ref('');
watch(bindingVariable, clear);
watch(
  [
    () => props.context.kind,
    () => props.context.projectId,
    () => props.context.object,
    () => props.context.control,
    () => props.chatId,
  ],
  () => {
    bindingVariable.value = '';
    if (
      action.value === 'inspect_control_binding' &&
      (props.context.kind !== 'page' || !props.context.control)
    )
      action.value = 'lookup_reference';
  },
);
// end
const setupView = ref('drivers');
const setupDriver = ref('');
const setupRegister = ref('');
function resetSetup() {
  if (action.value === 'inspect_collection_setup') {
    device.value = '';
    term.value = '';
  }
  setupView.value = 'drivers';
  setupDriver.value = '';
  setupRegister.value = '';
}
watch([setupView, setupDriver, setupRegister], clear);
watch([() => props.context.projectId, () => props.chatId], resetSetup);
watch(
  () => props.context.kind,
  (kind) => {
    if (kind !== 'collection' && action.value === 'inspect_collection_setup')
      action.value = 'lookup_reference';
  },
);
// end
const solutionInput = ref('unknown');
const solutionGoals = ref([]);
const solutionDirectory = ref('');
const inputLabels = {
  unknown: '尚未确定',
  device: '待接入设备',
  point: '已建采集点',
  realtime: '已有实时数据源',
  events: '已有报警事件源',
  history: '历史数据',
  database: '关系库',
  static: '静态内容',
};
const goalLabels = {
  monitor: '监视采集点',
  screen: '二维画面',
  calculate: '派生计算',
  alarm: '产生报警',
  alarmWindow: '显示报警窗',
  report: '报表',
  scene: '3D 场景',
};
const directoryLabels = {
  collection: '数采工程',
  datasource: '数据源',
  client: '客户端工程',
  calculation: '计算工程',
  alarm: '报警工程',
};
watch([solutionInput, solutionGoals, solutionDirectory], clear);
watch(
  () => props.chatId,
  () => {
    solutionInput.value = 'unknown';
    solutionGoals.value = [];
    solutionDirectory.value = '';
  },
);
// end
const isScript = computed(() => ['period', 'request'].includes(props.context.kind));
const example = ref('');
let generation = 0,
  activeMonitor;
const instances = ref([]),
  instanceId = ref('');
onBeforeUnmount(() => clear());
function clear() {
  // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  generation++;
  sceneChoices.value = [];
  // end
  activeMonitor?.abort();
  activeMonitor = undefined;
  lines.value = [];
  example.value = '';
  busy.value = false;
}
watch(
  () => [
    props.context.kind,
    props.context.projectId,
    props.context.object,
    props.context.control,
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    props.context.calcMenu,
    props.context.group,
    // end
    props.context.sceneView?.path,
    props.context.sceneView?.item?.tag,
    props.context.cell?.sheet,
    // end
    props.context.cell?.row,
    props.context.cell?.column,
    props.context.editor?.sequence,
  ],
  clear,
);
watch(
  () => props.context.projectId,
  () => {
    instances.value = [];
    instanceId.value = '';
    term.value = '';
    if (action.value === 'monitor_point') action.value = 'lookup_reference';
  },
);
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
watch([() => props.context.calcMenu, () => props.context.group], () => {
  if (action.value === 'inspect_calc_config') {
    term.value = '';
    if (!props.context.calcMenu && !isScript.value) action.value = 'lookup_reference';
  }
});
// end
watch(action, clear);
watch([instanceId, term], clear);
watch(canTrace, (enabled) => {
  if (!enabled && ['forward', 'reverse'].includes(action.value)) action.value = 'lookup_reference';
});
watch(() => props.chatId, clear);
// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
watch(
  () => props.context.kind,
  (kind) => {
    if (kind !== 'request' && action.value === 'report_example') action.value = 'lookup_reference';
  },
);
watch(isScript, (script) => {
  // end
  if (!script && ['validate_candidate', 'script_example'].includes(action.value))
    action.value = 'lookup_reference';
});
async function inspect() {
  clear();
  const ticket = generation,
    selected = action.value,
    entry = props.context;
  busy.value = true;
  try {
    const context = await snapshotContext(entry);
    const payload = { context };
    // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    // modified by jinlong.feng at 2026-11-22 KF报警规则回读
    // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
    // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
    // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
    if (selected === 'inspect_scene_binding') {
      const token = props.token();
      const result = await assistantJson(token, 'tools/' + selected, { context, chatId: props.chatId });
      if (ticket === generation && props.token() === token) {
        lines.value = result.lines;
        sceneChoices.value = result.choices;
      }
      return;
    }
    if (selected === 'inspect_calc_results' || selected === 'inspect_report_dataset') {
      // end
      const token = props.token();
      const result = await assistantJson(token, 'tools/' + selected, { context, chatId: props.chatId });
      // end
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    if (selected === 'inspect_alarm_rule') {
      const token = props.token(),
        query =
          !(context.kind === 'alarm' && context.object) && term.value.trim()
            ? { tag: term.value.trim() }
            : {};
      const result = await assistantJson(token, 'tools/inspect_alarm_rule', {
        context,
        query,
        chatId: props.chatId,
      });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    if (selected === 'inspect_control_binding') {
      const token = props.token();
      const query = bindingVariable.value.trim() ? { variable: bindingVariable.value.trim() } : {};
      const result = await assistantJson(token, 'tools/inspect_control_binding', { context, query });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
    // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
    if (selected === 'calculation_inventory') {
      const token = props.token();
      const result = await assistantJson(token, 'tools/inspect_calculation_io', {context});
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    if (['generate_period','generate_request'].includes(selected)) {
      const token = props.token();
      const method = 'beijing_day_difference';
      const result = await assistantJson(token, 'tools/prepare_calculation', {context,query:{method}});
      if (ticket === generation && props.token() === token) {
        const scripts = result.scripts;
        lines.value = scripts ? result.lines.slice(0,-4) : result.lines;
        if (scripts) example.value = selected === 'generate_period' ? scripts.period : scripts.request;
      }
      return;
    }
    // end
    if (selected === 'lookup_calc_runtime') {
      const token = props.token();
      const query = term.value.trim() ? { symbol: term.value.trim() } : {};
      const result = await assistantJson(token, 'tools/' + selected, { context, query });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
    if(selected==='dependency_receipts'){
      const token=props.token();
      const r=await assistantJson(token,'tools/inspect_calc_config',{context,chatId:props.chatId,query:{...(term.value.trim() && {exactName:term.value.trim()}),...(dependencyMember.value.trim() && {member:dependencyMember.value.trim()})}});
      if(ticket===generation && token===props.token()){lines.value=r.lines;example.value=r.probe;}
      return;
    }
    if(selected==='dictionary_receipts'){
// end
      if(!entry.object || entry.calcMenu!=='calculate-global-variable') throw Error('请先在数据词典勾选一个 IO 变量。');
      const token=props.token();
      const r=await assistantJson(token,'tools/inspect_calc_config',{context,chatId:props.chatId,query:{}});
      if(ticket===generation && token===props.token()){lines.value=r.lines;example.value=r.probe;}
      return;
    }
    if(selected === 'connection_receipts') {
// end
      const token=props.token();
      const result=await assistantJson(token,'tools/inspect_calc_config',{context,chatId:props.chatId,query:{connectionReceipt:true,exactName:term.value.trim()}});
      if(ticket===generation && token===props.token()) lines.value=result.lines;
      return;
    }
    if (selected === 'inspect_calc_config') {
// end
      const token = props.token();
      const query = term.value.trim() ? { exactName: term.value.trim() } : {};
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
      if (isCalendarMenu.value && calendarDate.value) {
        query.calendarDate = calendarDate.value;
        if (nodeOffset.value.trim()) query.nodeOffset = nodeOffset.value.trim();
      }
// end
      if (context.calcMenu === 'calculate-data-source-management') query.sourceChoices = true;
      const result = await assistantJson(token, 'tools/inspect_calc_config', { context, query });
// end
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    if (selected === 'inspect_collection_setup') {
      const token = props.token();
      const fields =
        setupView.value === 'drivers'
          ? { driver: setupDriver.value }
          : { device: device.value, register: setupRegister.value, tag: term.value };
      const query = { view: setupView.value };
      for (const [key, value] of Object.entries(fields)) {
        if (value.trim()) query[key] = value.trim();
      }
      const result = await assistantJson(token, 'tools/inspect_collection_setup', { context, query });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    if (selected === 'plan_solution') {
      const token = props.token();
      const query = { input: solutionInput.value, goals: [...solutionGoals.value] };
      if (solutionDirectory.value) query.directory = solutionDirectory.value;
      const result = await assistantJson(token, 'tools/plan_solution', { context, query });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    // end
    // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
    if (selected === 'alarm_samples') {
      const token = props.token();
      const chat = props.chatId;
      if (!chat || !term.value.trim()) throw new Error('请选择对话并填写完整采集点名。');
      const path = 'chats/' + encodeURIComponent(chat) + '/alarm-';
      const current = () => ticket === generation && props.token() === token;
      stopAlarm.value = false;
      const route = await assistantJson(token, path + 'start', { context, tag: term.value.trim() });
      if (!current()) return;
      activeMonitor = new AbortController();
      const entries = [];
      const started = Date.now();
      let gap = '';
      while (current() && !stopAlarm.value && entries.length < 60 && Date.now() - started < 90000) {
        let sample;
        try {
          const reading = await observePoint(route.monitor, token, activeMonitor.signal);
          sample = identifyMonitorSample(route.monitor, reading);
          const window = await captureAlarm(route.targets);
          entries.push({ sample, window });
        } catch (error) {
          if (sample) entries.push({ sample, window: null });
          gap = error.message;
          break;
        }
        if (!current()) return;
        lines.value = ['已观察 ' + entries.length + ' 笔，可在目标运行页复现报警变化后结束并保存。'];
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      if (!current()) return;
      if (!entries.length) throw new Error(gap || '本次未取得有效观察。');
      const result = await assistantJson(token, path + 'finish', { ticket: route.ticket, entries });
      if (current()) lines.value = [...(gap ? [gap] : []), '已保存到本段对话。', ...result.lines];
      return;
    }
    // end
    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    if (selected === 'clientPoints') {
      const query = { objectType: 'collectionPoint' };
      if (term.value.trim()) query.tag = term.value.trim();
      if (device.value.trim()) query.device = device.value.trim();
      if (project.value.trim()) query.project = project.value.trim();
      const token = props.token();
      const result = await assistantJson(token, 'tools/find_objects', { context, query });
      if (ticket === generation && props.token() === token) lines.value = result.lines;
      return;
    }
    if (selected === 'find_objects') payload.term = term.value.trim();
    // end
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    if (selected === 'read_runtime') {
      const token = props.token();
      payload.editorObservation = currentEditorText(context);
      payload.browserObservation = await captureRuntime(token, context);
      if (ticket !== generation || props.token() !== token) return;
    }
    // end
    if (selected === 'water') payload.topic = 'water';
    if (selected === 'validate_candidate') payload.code = entry.scriptText;
    if (selected === 'monitor_point') {
      const token = props.token();
      if (!instanceId.value) {
        const status = await assistantJson(token, 'tools/read_runtime', payload);
        if (ticket !== generation) return;
        instances.value = status.apps;
        lines.value = [
          status.apps.length ? '选择目标 App，输入完整点名，再点查询。' : '当前工程没有可核实的有权实例。',
        ];
        return;
      }
      const target = await assistantJson(token, 'tools/monitor_point', {
        ...payload,
        appId: instanceId.value,
        tag: term.value.trim(),
      });
      if (ticket !== generation) return;
      activeMonitor = new AbortController();
      let sample;
      try {
        sample = await observePoint(target, token, activeMonitor.signal);
      } catch (error) {
        if (ticket !== generation) return;
        const status = await assistantJson(token, 'tools/read_runtime', payload);
        const current = status.apps.find((app) => app.appId === target.appId);
        if (ticket === generation && props.token() === token)
          lines.value = [error.message, '目标 App 进程：' + (current?.process ?? '未知')];
        return;
      }
      if (ticket !== generation) return;
      const latest = await assistantJson(token, 'tools/monitor_point', {
        ...payload,
        appId: target.appId,
        tag: target.tag,
      });
      if (
        target.nodeId !== latest.nodeId ||
        target.ip !== latest.ip ||
        target.port !== latest.port ||
        target.appName !== latest.appName
      )
        throw new Error('目标实例在监视期间发生变更，请重新读取。');
      if (ticket === generation && props.token() === token)
        lines.value = [
          target.appName + ' / ' + target.tag,
          '值 ' + sample.value + ' · 质量 ' + sample.quality,
          '源时间 ' + sample.time,
          '读取时间 ' + sample.at,
        ];
      return;
    }
    const tracing = ['forward', 'reverse'].includes(selected);
    if (tracing) Object.assign(payload, { chatId: props.chatId, direction: selected });
    // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
    const aliases = { water: 'lookup_reference', report_example: 'script_example' };
    if (selected === 'report_example') payload.purpose = 'report';
    const tool = tracing ? 'trace_refs' : aliases[selected] || selected;
    // end
    const result = await assistantJson(props.token(), 'tools/' + tool, payload);
    if (ticket !== generation) return;
    switch (selected) {
      case 'lookup_reference':
      case 'water':
        lines.value = [result.title + ' · ' + result.version, ...result.steps];
        break;
      case 'find_objects':
        lines.value = result.length ? result.map((x) => x.name) : ['当前范围没有匹配对象。'];
        break;
      // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
      case 'report_example':
      case 'script_example':
        // end
        example.value = result.code;
        lines.value = [result.host, result.instructions, ...result.samples];
        break;
      case 'validate_candidate':
        lines.value = [
          result.scope,
          ...result.issues,
          ...result.edges.map((e) => e.direction + ' · ' + e.alias + ' / ' + e.tag),
          '尚未在 KF 宿主执行。',
        ];
        break;
      case 'forward':
      case 'reverse':
        lines.value = [...result.trails.map((row) => row.path + ' · ' + row.status), ...result.gaps];
        break;
      case 'read_runtime':
        lines.value = [
          result.at,
          // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
          '发布记录：' + ((result.publications || result.publishedVersions)?.join('、') || '版本未知'),
          ...(result.screen?.lines || []),
          // end
          ...result.apps.map(
            (app) =>
              app.name +
              ' · ' +
              app.deployed +
              ' · ' +
              // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
              app.process +
              (app.configuredVersion ? ' · App 配置的工程版本 ' + app.configuredVersion : '') +
              // end
              '（' +
              app.nodeId +
              ' / ' +
              app.appId +
              '）',
          ),
          ...result.gaps,
        ];
        break;
    }
  } catch (error) {
    if (ticket === generation) lines.value = [error.message];
  } finally {
    if (ticket === generation) busy.value = false;
  }
}
</script>
<template>
  <details
    class="context-tools"
    @toggle="
      expanded = $event.target.open;
      if (!expanded) clear();
    "
  >
    <summary>工程工具</summary>
    <div v-if="expanded" class="tools-body">
      <div class="tools-row">
        <select v-model="action" aria-label="工程工具">
          <option value="lookup_reference">操作指引</option>
          <!-- modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导 -->
          <option value="plan_solution">方案起步</option>
          <!-- end -->
          <option value="water">供水站联调步骤</option>
          <option v-if="context.kind !== 'general'" value="find_objects">查找对象</option>
          <!-- modified by jinlong.feng at 2026-11-21 KF客户端采集点核对 -->
          <option v-if="clientPointsAvailable" value="clientPoints">查采集点与变量映射</option>
          <option v-if="canTrace" value="forward">追踪上游</option>
          <!-- end -->
          <!-- modified by jinlong.feng at 2026-11-20 KF助手现场证据补验 -->
          <option v-if="canReverse" value="reverse">反查本方案</option>
          <!-- end -->
          <!-- modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对 -->
          <option v-if="context.kind !== 'general'" value="read_runtime">
            {{ context.kind === 'page' ? '核对发布与运行画面' : '部署与进程' }}
          </option>
          <!-- end -->
          <!-- modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查 -->
          <option v-if="context.kind === 'page' && context.control" value="alarm_samples">
            联查采样与报警
          </option>
          <!-- end -->
          <!-- modified by jinlong.feng at 2026-11-22 KF设备与点配置指导 -->
          <!-- modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导 -->
          <!-- modified by jinlong.feng at 2026-11-22 KF报警规则回读 -->
          <!-- modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读 -->
          <!-- modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对 -->
          <!-- modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读 -->
          <option v-if="chatId" value="inspect_report_dataset">报表数据集回读</option>
          <option v-if="chatId" value="inspect_scene_binding">三维部件绑定回读</option>
          <!-- end -->
          <!-- end -->
          <option v-if="chatId" value="inspect_calc_results">计算脚本回读</option>
          <!-- end -->
          <option
            v-if="context.kind === 'alarm' || (context.kind === 'page' && context.control)"
            value="inspect_alarm_rule"
          >
            报警规则回读
          </option>
          <!-- end -->
          <option v-if="context.kind === 'page' && context.control" value="inspect_control_binding">
            二维控件绑定
          </option>
          <!-- end -->
          <!-- modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发 -->
          <!-- modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发 -->
          <!-- modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算 -->
          <option v-if="['client','page','calculation','period','request'].includes(context.kind)" value="calculation_inventory">核对计算输入和工程变量</option>
          <option v-if="context.kind === 'calculation' || isScript" value="generate_period">日冻结表底差 · 生成周期性脚本</option>
          <option v-if="context.kind === 'calculation' || isScript" value="generate_request">日冻结表底差 · 生成请求式脚本</option>
          <!-- end -->
          <option v-if="context.kind === 'calculation' || isScript" value="lookup_calc_runtime">
            计算运行接口
          </option>
          <!-- end -->
<!-- modified by jinlong.feng at 2026-11-23 KF计算连接双端回执 -->
          <option v-if="context.calcMenu || isScript" value="inspect_calc_config">计算配置回读</option>
<!-- modified by jinlong.feng at 2026-11-23 KF计算词典同步回读 -->
          <option v-if="chatId && (context.kind==='calculation' || isScript)" value="connection_receipts">数据源连接回执</option>
<!-- modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读 -->
          <option v-if="chatId && context.calcMenu==='calculate-global-variable' && context.object" value="dictionary_receipts">所选 IO 变量与实例读数</option>
          <option v-if="chatId && isDependency" value="dependency_receipts">脚本依赖与运行回执</option>
<!-- end -->
<!-- end -->
<!-- end -->
          <!-- end -->
          <option v-if="context.kind === 'collection'" value="inspect_collection_setup">设备与点配置</option>
          <!-- end -->
          <option v-if="context.kind === 'collection'" value="monitor_point">读取实时点值</option>
          <option v-if="isScript" value="validate_candidate">静态检查当前脚本</option>
          <!-- modified by jinlong.feng at 2026-11-20 KF助手现场证据补验 -->
          <option v-if="isScript" value="script_example">可复制脚本示例</option>
          <option v-if="context.kind === 'request'" value="report_example">报表数据集脚本示例</option>
          <!-- end -->
        </select>
        <select
          v-if="action === 'monitor_point' && instances.length"
          v-model="instanceId"
          aria-label="目标 App"
        >
          <option disabled value="">选择 App</option>
          <option v-for="item in instances" :key="item.appId" :value="item.appId">
            {{ item.name }} · {{ item.process }} · {{ item.nodeId }}
          </option>
        </select>
        <!-- modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查 -->
        <input
          v-if="['monitor_point', 'alarm_samples'].includes(action)"
          v-model="term"
          aria-label="完整点名"
          placeholder="完整点名"
          maxlength="160"
          @keydown.enter.prevent="inspect"
        />
        <!-- end -->
        <!-- modified by jinlong.feng at 2026-11-22 KF报警规则回读 -->
        <input
          v-if="action === 'inspect_alarm_rule' && !(context.kind === 'alarm' && context.object)"
          v-model="term"
          aria-label="报警点名"
          placeholder="完整报警点名（可选）"
          maxlength="160"
          @keydown.enter.prevent="inspect"
        />
        <!-- end -->
        <input
          v-if="action === 'find_objects'"
          v-model="term"
          aria-label="对象名称"
          maxlength="160"
          placeholder="对象名称"
          @keydown.enter.prevent="inspect"
        />
        <!-- modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查 -->
        <button v-if="busy && action === 'alarm_samples'" type="button" @click="stopAlarm = true">
          结束并保存
        </button>
        <button v-else type="button" :disabled="busy" @click="inspect">
          {{ busy ? '正在查询…' : action === 'alarm_samples' ? '开始联查' : '查询' }}
        </button>
        <!-- end -->
      </div>
      <!-- modified by jinlong.feng at 2026-11-21 KF客户端采集点核对 -->
      <!-- modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导 -->
      <!-- modified by jinlong.feng at 2026-11-22 KF设备与点配置指导 -->
      <!-- modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导 -->
      <!-- modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读 -->
      <!-- modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对 -->
      <!-- modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读 -->
      <ReportCapture
        v-if="context.kind === 'report' && context.cell && action === 'inspect_report_dataset'"
        :key="JSON.stringify([chatId, context.projectId, context.object, context.cell])"
        :chat-id="chatId"
        :context="context"
        :token="token"
        @recorded="lines = $event"
      />
      <SceneCapture
        v-if="context.kind === 'scene' && action === 'inspect_scene_binding'"
        :key="
          JSON.stringify([chatId, context.projectId, context.sceneView?.path, context.sceneView?.item?.tag])
        "
        :chat-id="chatId"
        :context="context"
        :token="token"
        :choices="sceneChoices"
        @recorded="lines = $event"
      />
      <!-- end -->
      <!-- end -->
<!-- modified by jinlong.feng at 2026-11-23 KF计算词典同步回读 -->
<!-- modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读 -->
      <template v-if="action==='dependency_receipts' && isDependency">
        <label class="tools-row">完整登记名<input v-model="term" placeholder="留空查看本类全部依赖" maxlength="200" /></label>
        <label v-if="context.calcMenu!=='calculate-npm-dependencies'" class="tools-row">同包文件<input v-model="dependencyMember" placeholder="留空使用登记入口" maxlength="128" /></label>
      </template>
      <CalcCapture
        v-if="(isDependency && action==='dependency_receipts' && example) || (isScript && action === 'inspect_calc_results') || (context.calcMenu==='calculate-global-variable' && context.object && action==='dictionary_receipts')"
        :key="JSON.stringify([chatId, context.projectId, context.kind, context.calcMenu, context.group, context.object, term, dependencyMember])"
        :chat-id="chatId"
        :dependency="action==='dependency_receipts' ? {name:term.trim(),member:dependencyMember.trim()} : undefined"
        :context="context"
        :token="token"
        @recorded="lines = $event"
      />
<!-- end -->
<!-- end -->
      <!-- end -->
      <label v-if="action === 'inspect_control_binding'" class="tools-row"
        >工程变量名
        <input
          v-model="bindingVariable"
          maxlength="160"
          placeholder="留空列出有权候选"
          @keydown.enter.prevent="inspect"
        />
      </label>
      <!-- end -->
      <!-- modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发 -->
      <!-- modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发 -->
      <label v-if="action === 'lookup_calc_runtime'" class="tools-row"
        >运行函数或宿主
        <input
          v-model="term"
          maxlength="100"
          placeholder="例如 KIOQueryDatas、global，留空查分类"
          @keydown.enter.prevent="inspect"
        />
      </label>
      <!-- end -->
<!-- modified by jinlong.feng at 2026-11-23 KF计算连接双端回执 -->
      <label v-if="action==='connection_receipts'" class="tools-row">工程连接别名
        <input v-model="term" maxlength="200" placeholder="完整工程别名" @keydown.enter.prevent="inspect" />
      </label>
<!-- end -->
      <!-- modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度 -->
      <template v-if="action === 'inspect_calc_config' && isCalendarMenu">
        <label class="tools-row">节点日期<input v-model="calendarDate" type="date" /></label>
        <label v-if="calendarDate" class="tools-row">当日节点 UTC 偏移<input v-model="nodeOffset" maxlength="6" placeholder="例如 +08:00" /></label>
      </template>
      <!-- end -->
      <label v-if="action === 'inspect_calc_config'" class="tools-row"
        >配置项名称
        <input
          v-model="term"
          maxlength="200"
          placeholder="完整名称，留空列出当前范围"
          @keydown.enter.prevent="inspect"
        />
      </label>
      <!-- end -->
      <fieldset v-if="action === 'inspect_collection_setup'" class="solution-options">
        <legend>查询范围</legend>
        <label
          >配置项
          <select v-model="setupView">
            <option value="drivers">工程平台与驱动</option>
            <option value="point">设备、寄存器与点</option>
          </select>
        </label>
        <label v-if="setupView === 'drivers'"
          >驱动关键词
          <input
            v-model="setupDriver"
            placeholder="留空列出候选"
            maxlength="160"
            @keydown.enter.prevent="inspect"
          />
        </label>
        <template v-else>
          <label
            >设备名<input
              v-model="device"
              placeholder="完整名称，可选"
              maxlength="160"
              @keydown.enter.prevent="inspect"
          /></label>
          <label
            >寄存器名<input
              v-model="setupRegister"
              placeholder="可选"
              maxlength="160"
              @keydown.enter.prevent="inspect"
          /></label>
          <label
            >采集点名<input
              v-model="term"
              placeholder="完整名称，可单独查询"
              maxlength="160"
              @keydown.enter.prevent="inspect"
          /></label>
        </template>
      </fieldset>
      <!-- end -->
      <fieldset v-if="action === 'plan_solution'" class="solution-options">
        <legend>方案起步条件</legend>
        <label
          >输入来源
          <select v-model="solutionInput">
            <option v-for="(label, key) in inputLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <div class="solution-goals" role="group" aria-label="交付目标">
          <label v-for="(label, key) in goalLabels" :key="key">
            <input v-model="solutionGoals" type="checkbox" :value="key" />{{ label }}
          </label>
        </div>
        <label
          >查找候选
          <select v-model="solutionDirectory">
            <option value="">仅查看步骤</option>
            <option v-for="(label, key) in directoryLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
      </fieldset>
      <!-- end -->
      <div v-if="action === 'clientPoints'" class="tools-row">
        <input
          v-model="term"
          aria-label="准确点名"
          placeholder="点名（可选）"
          maxlength="160"
          @keydown.enter.prevent="inspect"
        />
        <input
          v-model="device"
          aria-label="目标设备"
          placeholder="设备（可选）"
          maxlength="160"
          @keydown.enter.prevent="inspect"
        />
        <input
          v-model="project"
          aria-label="数采工程"
          placeholder="数采工程（可选）"
          maxlength="160"
          @keydown.enter.prevent="inspect"
        />
      </div>
      <ul v-if="lines.length" aria-live="polite">
        <!-- end -->
        <li v-for="(line, index) in lines" :key="index">{{ line }}</li>
      </ul>
      <!-- modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 -->
      <AssistantCodeBlock v-if="example" :code="example" title="KF 脚本正文" selectable-example />
      <!-- end -->
    </div>
  </details>
</template>
<style scoped>
.context-tools {
  font: inherit;
  font-size: 12px;
  color: #394d64;
}
summary {
  cursor: pointer;
  width: max-content;
  padding: 4px 0;
}
/* modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导 */
.solution-options {
  display: grid;
  gap: 6px;
  margin: 6px 0;
  padding: 6px;
  border: 1px solid #c7d2dd;
}
.solution-goals {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 12px;
}
.solution-goals label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
/* end */
.tools-body {
  padding: 5px 0;
}
.tools-row {
  display: flex;
  gap: 6px;
}
select,
input,
button {
  border: 1px solid #c7d2dd;
  border-radius: 5px;
  background: white;
  color: inherit;
  font: inherit;
  padding: 3px 5px;
}
input {
  min-width: 0;
  flex: 1;
}
textarea {
  box-sizing: border-box;
  width: 100%;
  resize: vertical;
  font:
    12px/1.5 ui-monospace,
    monospace;
  color: inherit;
}
button {
  cursor: pointer;
}
ul {
  max-height: 102px;
  overflow: auto;
  margin: 5px 0;
  padding-left: 18px;
  overflow-wrap: anywhere;
}
/* modified by jinlong.feng at 2026-11-23 KF开发助手双栏代码浮窗 */
.context-tools summary { color: #385377; border-radius: 5px; padding: 4px 6px; white-space: nowrap; }
.context-tools[open] summary, .context-tools summary:hover { background: #eaf0ff; }
.tools-body { position: absolute; z-index: 2; bottom: calc(100% + 5px); left: 0; right: 0; max-height: min(48cqh, 360px); overflow: auto; overscroll-behavior: contain; padding: 12px; border: 1px solid #ccd8ef; border-radius: 9px; background: white; box-shadow: 0 5px 22px #20396522; }
.tools-row { flex-wrap: wrap; }
.tools-row select { max-width: 100%; }
/* end */
</style>
<!-- end -->
