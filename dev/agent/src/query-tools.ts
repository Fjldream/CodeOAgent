// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// All tools are confined to the project and editor captured for this turn.
// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
import { readStartQuery, startSchema, type StartQuery } from './solution-start.ts';
// end
// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
import { readSetupQuery, setupSchema, type SetupQuery } from './collection-setup.ts';
// end
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
import { bindingSchema, readBindingQuery, type BindingQuery } from './control-binding.ts';
// end
// modified by jinlong.feng at 2026-11-22 KF报警规则回读
import { alarmRuleSchema, readRuleQuery, type RuleQuery } from './alarm-rule.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { calcSchema, readCalcQuery, type CalcQuery } from './calc-config.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { readRuntimeQuery, runtimeSchema, type RuntimeQuery } from './calc-runtime.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
import { generationSchema, generationQuery } from './calc-generation.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
import {
  formulaQuery,
  formulaScope,
  formulaSchema,
  formulaInventorySchema,
  clarificationSchema,
  clarificationQuery,
} from './formula.ts';
// end
// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
import {authorContextSchema,authorQuery,draftSchema,draftQuery} from './script-authoring.ts';
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
import {readReview,reviewSchema} from './solution-script.ts';
// end
export const queryTools = {
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  prepare_solution_script:'从本段方案总览继续计算开发，回读关联工程和宿主，查实际输入、输出、复用函数以及前轮待确认口径。',
  review_solution_script:'核对业务需求、选择已查到的引用与宿主，向用户提问或提供口径供下一轮确认。',
// end
  inspect_script_environment:'编写完整 JS 前查当前计算工程的绑定、六类宿主和 KC 注册表。symbols 可按需指定最多12个函数以批量取用法。',
  check_script_drafts:'提交模型自己编写的完整 JS 正文。返回语法、宿主、KC 参数、工程引用诊断；若需修订，结合原稿和诊断重新提交。仅在本机展示已绑定的正文。',
// end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  clarify_calculation_contract:
    '已查工程证据后，按实际仍缺的1至3个业务字段生成澄清问题，返回本机引用，等待开发人员答复。',
  inspect_calculation_io:
    '通用计算生成第一步，读当前工程或本段最近计算回执的工程、已有变量及关联设备。模型获得匿名引用与读写属性；matchedQuestionOffsets 是本轮问题中匹配的匿名点位置。多义时问开发人员。',
  compile_calculation_formula:
    '将模型提出的数值公式编译成 KF 周期写回及请求回包。根据本次查询的引用、用户已确认的输入角色、公式和输出契约填参。仅生成候选。缺少影响公式的口径先提问。',
  // end
  prepare_calculation:
    '从当前计算或客户端工程的已保存连接追踪有权设备点和变量。先用 inventory 读取，开发人员确认北京时间日初冻结表底差后，才以 beijing_day_difference 生成两类脚本。本机展示脚本全文。',
  // end
  // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
  lookup_calc_runtime:
    '按函数族或符号查 KF 运行接口的参数、结果交付方式、副作用与源码。verification.status 为 source-only 时，只有源码依据，目标 App 的实际行为待验证。也可查 global 词典与脚本宿主。',
  // end
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  inspect_calc_config:
    '按当前计算菜单和分组读取已保存配置，或指定类别和完整名称。可核对词典映射、数据源、周期配置及其他脚本或依赖的清单。',
  // end
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
  // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
  // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  inspect_scene_binding:
    '核对当前3D单选部件在各个页面布局保存的变量和属性，或从原对话查同一部件的两次运行点值、位置、实际轴角、画刷颜色、自旋转实测转速或可见性闪烁完整周期。',
  // end
  // end
  // end
  inspect_report_dataset:
    '从当前报表单元格核对数据集、成员、请求式脚本和已保存查询，读取本段对话授权可见的查询回执和画面值。',
  // end
  inspect_calc_results:
    '从选中的计算脚本核对当前已保存的读点、写回目标和同段对话的运行回执。在其他入口查本段对话最近的周期采样及请求式实际返回。只读历史观察，不调用运行脚本。',
  // end
  inspect_alarm_rule:
    '从报警词典选中行或二维实时报警窗读取已保存规则；按需按完整点名消歧。核对同段对话中与这条规则对应的触发、保持和恢复样本。实名、阈值和结果在本机展开。',
  // end

  // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
  // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  inspect_control_binding:
    '单选二维控件后查动态文字绑定，指定可选工程变量名或浏览。检查有权源、读点、工程变量、控件类型、页面事件和已保存脚本，给出本机具体操作与引用。',
  // end
  inspect_collection_setup:
    '当前数采工程的设备与点配置。查本平台驱动候选，或按准确点名/设备/寄存器逐级读回允许的类型、点地址与换算。设备手册及通信实测分别核对。',
  // end
  plan_solution:
    '方案起步及跨工程设计。从空入口或已有工程，按客户已说明的输入来源和交付目标给出所需工程、操作顺序及各步验收。已有点或源请区分。只有需要寻找可复用工程时指定 directory 读取该类候选，真实名称仅本地展开。',
  // end
  // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
  read_client_variables:
    '查询当前客户端工程各组的已保存工程变量、内置数量和映射数量。用于变量是否存在、数量和清单。',
  // end
  // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
  // modified by jinlong.feng at 2026-11-21 KF采样与报警事件联查
  read_alarm_samples:
    '读取本段对话保存的最近一批数采监视与原生报警窗联查，返回是否观察到发生、保持、恢复。实际采样值、质量、源时间、报警值与限值仅在本机展开。用户查询结果时以独立一行 [[read_alarm_samples]] 展示。',
  // end
  // modified by jinlong.feng at 2026-11-23 KF发布与运行页面版本核对
  read_runtime:
    '按当前权限核对发布记录、节点部署、进程和本轮运行画面。询问改动是否生效或画面值不符时使用。分别对照普通账号的 App 配置版本、保存页面、App 提供的页面、当前标签已加载的页面和实际显示；整包指纹缺失时保留未知。',
  // end
  // end
  get_context: '取得当前入口、对象类别及编辑观察能力。',
  lookup_reference: '取得当前模块在 KF 3.6 开发态的操作路径和验证步骤。',
  // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
  find_objects:
    '列出当前对象；在客户端可用 objectType=collectionPoint 从未绑定的画面查有权采集点、实时源连接和工程变量映射。按用户给定的点名、设备或数采工程筛选。',
  // end
  trace_refs: '沿当前页面或脚本读写引用查找已保存上游，返回覆盖摘要。',
  validate_candidate: '在当前计算宿主静态检查已保存脚本。',
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
  inspect_solution_overview: "跨工程解释当前方案做什么、工程间数据流、开发人员说过的需求和已确认清单。沿已保存引用核对并按出处分别回答。",
// end
  inspect_project_overview: "从计算工程任意菜单读取整个工程所有分组的六类脚本正文、数据词典、数据源及本段对话中该工程的实际回执，解释整个工程做什么、业务链路、函数调用和输出。",
// end
  explain_selected_script: '解释当前脚本编辑器中选定的完整 JS。用户想知道此段做什么、什么时候执行、读了什么、如何计算、写到哪里，先调用本工具。它会定位当前标签并在本机解析正文，给出业务步骤与触发规则。',
// end
  read_object: '读回本轮选中对象的已保存配置和证据。',
} as const;
export type QueryTool = keyof typeof queryTools;
export const toolNames = Object.keys(queryTools) as QueryTool[];
export function isQueryTool(name: unknown): name is QueryTool {
  return typeof name === 'string' && Object.hasOwn(queryTools, name);
}
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
const calculationEntries = ['calculation', 'period', 'request'];
const clientEntries = ['client', 'page', 'scene', 'report'];
const projectEntries = [...calculationEntries, ...clientEntries, 'collection', 'datasource', 'alarm'];
const solutionEntries = [...projectEntries, 'general'];
// Cross-project receipt readers recheck both the originating project and the instance.
const toolEntries: Record<QueryTool, readonly string[]> = {
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  clarify_calculation_contract:[...calculationEntries,'client','page'],
  inspect_calculation_io:[...calculationEntries,'client','page'],
  compile_calculation_formula:[...calculationEntries,'client','page'],
  // end
  prepare_calculation: [...calculationEntries,'client','page'],
  // end
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  lookup_calc_runtime: calculationEntries,
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  inspect_script_environment:calculationEntries, check_script_drafts:projectEntries,
// end
  // end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  prepare_solution_script:projectEntries,review_solution_script:projectEntries,
// end
  inspect_calc_config: calculationEntries,
  validate_candidate: ['period', 'request'],
  inspect_collection_setup: ['collection'],
  read_client_variables: clientEntries,
  inspect_control_binding: ['page'],
  inspect_alarm_rule: ['alarm', 'page'],
  trace_refs: ['page', 'period', 'request', 'report'],
// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
// modified by jinlong.feng at 2026-11-23 KF方案级业务总览
  inspect_solution_overview: projectEntries,
// end
  inspect_project_overview: calculationEntries,
// end
  explain_selected_script:calculationEntries,
// end
  read_object: projectEntries,
  read_runtime: projectEntries,
  find_objects: projectEntries,
  plan_solution: solutionEntries,
  lookup_reference: solutionEntries,
  get_context: solutionEntries,
  inspect_report_dataset: solutionEntries,
  inspect_scene_binding: solutionEntries,
  inspect_calc_results: solutionEntries,
  read_alarm_samples: solutionEntries,
};
export function supportedTool(name: QueryTool, kind: string) {
  return toolEntries[name].includes(kind);
}
export function entryTools(kind: string) {
  return toolNames.filter((name) => supportedTool(name, kind));
}
// end
export const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
// end
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
export type PointQuery = { objectType: 'collectionPoint'; tag?: string; device?: string; project?: string };
export function pointTool(name: QueryTool) {
  return name === 'find_objects' || name === 'trace_refs';
}
export function querySchema(name: QueryTool, kind?: string) {
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  if (name === 'clarify_calculation_contract') return clarificationSchema;
  if (name === 'inspect_calculation_io') return formulaInventorySchema;
  if (name === 'compile_calculation_formula') return formulaSchema;
  // end
  if (name === 'prepare_calculation') return generationSchema;
  // end
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
  if(name==='prepare_solution_script')return {type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:['new','amend','continue'],description:'新计算任务用 new；修改已有任务的目标或口径用 amend；确认或补充已追问的资料用 continue。'}}};
  if(name==='review_solution_script')return reviewSchema;
// end
// end
  if (name === 'inspect_script_environment') return authorContextSchema;
  if(name === 'check_script_drafts')return draftSchema;
  if (name === 'lookup_calc_runtime') return runtimeSchema;
  // end
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  if (name === 'inspect_calc_config') return calcSchema;
  // end
  // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
  // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  if (name === 'inspect_alarm_rule') return alarmRuleSchema;
  // end
  if (name === 'inspect_control_binding') return bindingSchema;
  // end
  if (name === 'inspect_collection_setup') return setupSchema;
  // end
  if (name === 'plan_solution') return startSchema;
  // end
  if (!pointTool(name) || (kind && !['client', 'page'].includes(kind))) return emptySchema;
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      objectType: {
        type: 'string',
        enum: ['collectionPoint'],
        description: '从客户端查有权采集点、连接及单条映射。普通对象查询省略全部参数。',
      },
      tag: { type: 'string', maxLength: 160, description: '用户提供的准确采集点名，可省略以浏览候选' },
      device: { type: 'string', maxLength: 160, description: '需消歧时提供设备名' },
      project: { type: 'string', maxLength: 160, description: '需消歧时提供数采工程名称或标识' },
    },
  };
}
export function readPointQuery(name: QueryTool, args: unknown): PointQuery | undefined {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('工具参数无效');
  const fields = Object.entries(args);
  if (!fields.length) return;
  if (!pointTool(name) || (args as any).objectType !== 'collectionPoint') throw new Error('工具参数无效');
  const query: PointQuery = { objectType: 'collectionPoint' };
  for (const [key, value] of fields) {
    if (key === 'objectType') continue;
    if (
      (key !== 'tag' && key !== 'project' && key !== 'device') ||
      typeof value !== 'string' ||
      !value.trim() ||
      value.length > 160 ||
      /[\x00-\x1f]/.test(value)
    )
      throw new Error('筛选条件无效');
    query[key] = value.trim();
  }
  return query;
}
// end

// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
// modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
// modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
export type QueryArguments =
  | {mode:string}
// end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
  | ReturnType<typeof readReview>
// end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  | RuntimeQuery | ReturnType<typeof authorQuery> | ReturnType<typeof draftQuery>
  // end
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  | CalcQuery
  // end
  | PointQuery
  | StartQuery
  | SetupQuery
  | BindingQuery
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  | ReturnType<typeof clarificationQuery>
  | ReturnType<typeof formulaQuery>
  | ReturnType<typeof formulaScope>
  // end
  | ReturnType<typeof generationQuery>
  // end
  | RuleQuery;
// end

// end
// end
export function readQueryArguments(name: QueryTool, args: unknown): QueryArguments | undefined {
  // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  if (name === 'inspect_alarm_rule') return readRuleQuery(args);
  // end
  if (name === 'inspect_control_binding') return readBindingQuery(args);
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  if (name === 'clarify_calculation_contract') return clarificationQuery(args);
  if (name === 'inspect_calculation_io') return formulaScope(args);
  if (name === 'compile_calculation_formula') return formulaQuery(args);
  // end
  if (name === 'prepare_calculation') return generationQuery(args);
  // end
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
  if(name==='prepare_solution_script'){
    const mode=(args as {mode?:string}|null)?.mode;
    if(mode!==undefined && !['new','continue','amend'].includes(mode))throw new Error('未知计算任务模式');
    return mode?{mode}:undefined;
  }
  if(name==='review_solution_script')return readReview(args);
// end
// end
  if (name === 'inspect_script_environment')return authorQuery(args);
  if(name === 'check_script_drafts')return draftQuery(args);
  if (name === 'lookup_calc_runtime') return readRuntimeQuery(args);
  // end
  // end
  if (name === 'inspect_calc_config') return readCalcQuery(args);
  // end
  if (name === 'inspect_collection_setup') return readSetupQuery(args);
  // end
  return name === 'plan_solution' ? readStartQuery(args) : readPointQuery(name, args);
}
// end
