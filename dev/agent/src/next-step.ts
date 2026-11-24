// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
import type { Context } from './shared.ts';

// Each action has one user operation and an observable success criterion.
// UI labels come from the KF 3.6 development UI and the ordinary-user walkthrough.
// modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
const steps = {
  project: [
    '在开发中心打开「数采管理」，选择有访问权限的工程组，打开目标数采工程。新建工程时，选择「新建工程」并指定运行平台。',
    '进入工程后，左侧导航应显示「数采设备」和「数采变量」。',
  ],
  device: [
    '在数采工程打开「数采设备 → 新建设备」。选择与运行平台、通信协议匹配的驱动，按驱动要求填写设备地址并保存。',
    '在设备列表核对设备名称、驱动、激活状态和地址。',
  ],
  point: [
    '在数采工程打开「数采变量 → 新建」，选择已配置的设备，按设备点表和驱动要求填写测量项并保存。',
    '在变量列表核对目标点的关联设备、地址和数据类型。',
  ],
  monitor: [
    '在运维中心打开目标节点，选择运行中的数采 App，点击「监视」。输入点名后按回车，间隔至少一个采样周期读取两次。',
    '两次采样均应返回数值，质量符合驱动定义，第二次采样的源时间晚于第一次。记录点名及两次采样结果。',
  ],
  datasource: [
    '打开「数据源管理」，选择供本次工程使用的实时数据源。',
    '核对该数据源连接的数采工程和实例，两者应与已验证的采集端一致。',
  ],
  clientSource: [
    '在客户端工程打开「数据源管理」。若列表中已有目标实时数据源，使用现有连接。若尚未配置，添加该数据源。',
    '核对同一行的「名称」和「连接数据源」。前者是客户端工程内的连接名称，后者应为目标实时数据源。',
  ],
  clientPoint: [
    '在客户端工程打开「工程变量 → 快速添加」，选择已关联的实时数据源，勾选目标采集点并点击「确定」。',
    '按「变量名称」定位新增记录。「关联数据源名称」应为所选连接，「映射Tag名称」应与采集点名一致。',
  ],
  pageBinding: [
    '在页面编辑器选中目标控件，检查用于显示数值的属性，以及可配置的动态绑定或页面脚本事件。',
    '请提供属性面板中的属性名或事件名，以确定该控件的取值方式。',
  ],
  alarmSource: [
    '在报警工程的「数据源管理」中关联已核实的实时数据源，再打开「数据词典 → 快速添加」并选择该数据源。',
    '按点名查询，结果应包含目标测量点。',
  ],
  alarmRule: [
    '在报警工程的「数据词典」中选择目标点，打开「编辑 → 报警属性」，按业务要求配置限值报警并保存。',
    '重新打开该点的报警属性，核对启用状态、限值、延时和死区。',
  ],
  alarmRaise: [
    '在已部署的测试环境中，将测试点输入调整至报警触发范围，并保持至配置的延时结束。',
    '核对报警发生记录中的点名、状态、值和发生时间。',
  ],
  alarmRecover: [
    '将同一测试点的输入调整至恢复范围，并保持至配置的延时结束。',
    '核对同一报警的发生与恢复记录，确认恢复值和恢复时间与测试输入相符。',
  ],
  script: [
    '在计算工程打开「脚本」，按触发类型打开目标脚本，检查读取和写入所用的数据源连接及点名。',
    '分别将输入点和输出点与工程内的连接配置对照，确认读写方向和目标点一致。',
  ],
  scene: [
    '在客户端工程打开「3D资源管理」，双击目标场景，在独立编辑页中单选目标模型。',
    '核对场景名称及当前选中的模型，属性面板应显示该模型的属性。',
  ],
  report: [
    '在客户端工程打开「报表库」，选择目标报表、工作表和单元格。',
    '核对单元格所引用的数据集。采用静态内容的单元格直接核对其内容。',
  ],
  publish: [
    '在工程列表勾选目标工程并执行「发布」。工程已发布时执行「更新」。',
    '检查该工程行的发布状态，确认本次发布或更新已完成。',
  ],
  deployment: [
    '在运维中心打开「运维节点管理」，进入目标节点的 App 列表。',
    '定位本工程对应的实例，分别核对部署状态和进程状态。',
  ],
  clientRun: [
    '使用测试账号打开已部署的客户端画面。改变测试源点输入，同步记录源值和画面读数。',
    '至少核对两组不同输入。画面读数应随源值变化，数值与单位应符合已确认的换算关系。',
  ],
};

const questions = {
  source:
    '若已有数采点，请提供点名及该点在数采 App「监视」中的读取结果。若尚未建点，请提供设备或模拟器的通信协议。',
  protocol:
    '请提供设备或模拟器的通信协议。协议尚未确定时，请提供设备型号或软件名称，以及设置页显示的协议名称。',
  connection: '请提供通信协议要求的连接方式和参数。账号、密码及密钥保留在本地。',
  measurement: '请提供点表中目标测量项的地址、节点或主题，并注明数据类型、单位及倍率。',
  driver: '请提供驱动列表中与设备协议、运行平台匹配的驱动名称。',
  pointName: '请提供目标点名及其所属的数采工程或数据源名称。',
  conditions: '请分别说明报警触发与恢复的阈值、单位及持续时间。',
  control: '请提供目标控件属性面板中与显示内容相关的属性名或事件名。',
  app: '请提供目标测试节点、对应 App 的名称，以及当前部署状态和进程状态。',
  progress: '请说明最近已完成的操作及验证结果。若操作中断，请提供界面提示原文。',
  goal: '请明确下一项配置任务或需要验证的结果。',
};

export const replyStyle =
  '使用 KF 工程师向开发人员交付配置说明的书面中文。直接回答问题。说明操作时写清工程、界面路径和动作，随后给出能在界面对照的字段或结果。已有证据只陈述一次，沿用界面原名、数值和单位。缺少资料时说明所需字段。避免口语引导、反复设问、内部资料键和空泛的验收套话。';
// end
type Step = keyof typeof steps;
type Field = keyof typeof questions;
export type Guidance = { kind: 'step'; step: Step } | { kind: 'clarify'; fields: Field[] };

// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
// modified by jinlong.feng at 2026-11-21 KF助手模型统一答复
export const guideEntries: Record<string, string> = Object.fromEntries([
  ...Object.entries(steps).map(([key, lines]) => ['step:' + key, lines.join(' ')]),
  ...Object.entries(questions).map(([key, line]) => ['ask:' + key, line]),
]);
// end
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
export const guidanceContract = [
  // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
  // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
  // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
  // modified by jinlong.feng at 2026-11-22 KF报警规则回读
  // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
  // modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
  // modified by jinlong.feng at 2026-11-22 KF三维部件绑定回读
  // modified by jinlong.feng at 2026-11-22 KF三维旋转与颜色核对
  // modified by jinlong.feng at 2026-11-23 KF三维自旋转与闪烁核对
  '查 3D 部件的绑定、位移、旋转角度、条件颜色、自旋转转速或可见性闪烁的完整周期用 inspect_scene_binding。独立一行 [[inspect_scene_binding]] 展开本机明细。区分已保存事件、点监视、可见部件拾取和历史结果；没有两次匹配观察不能声称已验证变化。',
  // end
  // end
  // end
  '涉及报表单元格、数据集、查询参数、实际回包和显示值时使用 inspect_report_dataset；以独立一行 [[inspect_report_dataset]] 展示本机明细。没有上游实际入参回执时不可用已保存查询代替。历史回执不能证明当前部署。',
  // end
  '核对计算脚本读取点、写回目标、周期运行样本或请求式实际返回值时，用 inspect_calc_results。在其他工程入口也可查本对话回执。用独立一行 [[inspect_calc_results]] 展示本机点名和原始业务值。区分当前保存正文、观察时保存正文、实际返回、进程版本。prior 表示正文后来变更，uncertain 表示采样质量或源时间需复核。缺回执时给出采集操作。',
  // end
  '报警词条或实时报警窗中询问报警规则、为何发生或保持或恢复时，调用 inspect_alarm_rule。用独立一行 [[inspect_alarm_rule]] 展开对应配置和有权现场记录。只把同一词条、采样时规则及实际事件匹配的情况作为运行解释。区分当前保存规则与历史阈值。conflicts 大于零时指出现场与保存条件不一致并建议核对部署，complete 为零时禁止断言已观察完整生命周期。',
  // end
  '二维页面有单选控件、询问该控件应改的具体属性、事件或可选工程变量时，优先 inspect_control_binding；以单独一行 [[inspect_control_binding]] 展开本机核实的名称、界面路径和写法。用户明确给工程变量名时用 variable 筛选。已保存则转入 read_runtime 检查绑定事件版本与显示；选区未知先请单选。',
  // end
  '在数采工程指导建或核对设备、点时，用 inspect_collection_setup。按当前步骤选平台驱动或设备与点，用户已给的筛选项直接使用。用 [[inspect_collection_setup]] 展开本地结果；只向用户补问本步仍缺的厂家资料。允许的类型、保存的配置和目标实例采样分别举证。',
  // end
  '规划从空工程开始的方案、选择需要哪些工程或查可复用工程时，使用 plan_solution，按用户已说明的输入来源及交付目标取材。用户只问下一步时仅给当前操作和验证；明确要全流程再展开。未给的目标或来源保留未知。目录只表示当前可见候选，工程适用性、方案确认、部署与运行分别核对。',
  // end
  '客户端或二维编辑页需要定位尚未绑定的采集点、连接或单条映射时，使用 find_objects，指定 objectType 为 collectionPoint，把用户已提供的准确点名、设备名或数采工程作为筛选条件。未给名称可浏览；多个候选时请用户按设备或工程消歧。不要从客户端变量数量推断上游点不存在。用本轮工具的本地引用呈现具体结果。若映射已保存，区分控件显式读取、发布部署与运行画面，只有目标实例的画面观察可以确认显示已更新。',
  // end
  // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF计算脚本生成与用电量验算
  '只有明确要求已验过的日冻结表底差时使用 prepare_calculation。用户从其他入口明确要继续最近一次计算验收时可用 scope=lastCalculationReceipt，否则按当前工程。沿用对话中已确认的业务口径。客户明确按北京时间零点冻结累计表底取差时，可选择 beijing_day_difference；用 [[prepare_calculation]] 展开本机证据或生成的两类 KF 脚本。若输入不齐，说明缺的角色；脚本生成、保存、部署、运行分别核对。',
  // end
  // modified by jinlong.feng at 2026-11-23 KF通用计算表达式生成
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
  // modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
  // modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
  // modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
// modified by jinlong.feng at 2026-11-23 KF系统事件脚本生成与生命周期验收
  '业务需要写完整 JS 时首选 inspect_script_environment，读取宿主和工程引用；用 symbols 或 lookup_calc_runtime 查 KC 的使用约定。根据业务自行选择宿主、函数、控制流和输出结构，使用工程引用字符串编写完整正文并调用 check_script_drafts。先按已保存的函数签名和返回约定复用匹配函数。需要新增时一批提交 customFunction（definition.functionName、definition.parameters、code 函数体）和所需调用方；已存函数用其匿名引用，新函数在这批草稿中用 await global["@function:new"](...)。系统事件在一个 system 草稿提交 code、shutdown 两段无参正文，说明不同源码实现下的顺序和停机限制；依据目标实例的实测回执回答实际次数，缺少回执时说明尚待核实。条件事件在一个 condition 宿主草稿中提交三段独立 JS：code 为进入时，condition 中的 exist、out 为存在和离开，另填 expression、interval、unit。按实际变量选择布尔条件，未给保持周期或阶段业务动作时先核对。数据变化请求应按业务定位输入点、映射词典变量和独立输出；提交 dataChange 时单列 triggerRef。映射缺失或有多个合理输入时先向用户核对，说明数据项、生效配置及触发边界。对于实时点坏质量停写、恢复续写的周期要求，在 check_script_drafts 随稿提供 qualitySamples，以匿名点和合成正常、恢复数值验证。收到 revise 就根据诊断、出错行和本轮原稿修订，收到 checked 才用 [[check_script_drafts]] 展示本机正文。未核实的数据源语义或业务口径先询问。静态候选与实例实测分开。明确只要数值表达式时使用公式工具。',
// end
  // end
  // end
  // end
  // end
  // end
  '对于明确要求表达式计算的需求，先 inspect_calculation_io 读取当前工程或用户明确要求的 lastCalculationReceipt。用 [[inspect_calculation_io]] 展示本地点名和映射；模型只用匿名引用。不可按列表顺序猜输入和输出含义；用用户明确的引用或匹配位置定位，问清有歧义的分母、单位、边界及保留/置无效口径。只在业务口径尚缺时用 clarify_calculation_contract，按缺项提问后结束本轮，不能自行默认分母。若用户已给齐，自行从业务描述推导 expression 和必要的 when，用 compile_calculation_formula 生成两类宿主脚本。支持状态无记忆的实时数值表达式；历史窗口、持久状态等要求应指出缺少的运行机制。用 [[compile_calculation_formula]] 展开可复制正文。',
  // end
  '方案理解从当前有权对象和已确认清单起步，按需查引用。共享源仅证明依赖；工程归属或算法口径不明时询问开发人员，确认后才更新个人方案。不要求预选全部工程。',
// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
// modified by jinlong.feng at 2026-11-23 KF计算连接双端回执
// modified by jinlong.feng at 2026-11-23 KF计算词典同步回读
// modified by jinlong.feng at 2026-11-23 KF计算脚本依赖回读
// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
  '周期日历调度用 inspect_calc_config 核对选中脚本或完整名称。指定日期可传 calendarDate 和经确认的目标日期 nodeOffset；用 [[inspect_calc_config]] 展开本机规则、预计时刻及偏差。区别预计次数与目标 App 实测，后者需有时间戳、计数与写回的回执。',
// end
  '计算脚本依赖分别用 inspect_calc_config 查询 section=npm、normal、python，指定完整登记名可核对引用方式。按本机引用展开指定 App 的版本、读取或解释器和导入结果。配置清单只证明登记，失败需报告实际错误。不要把导入 ZIP 当作安装 Python 包。在计算数据词典单选 IO 变量时，用 inspect_calc_config 空参数核对该行、工程别名、设备点和同一对话实例样本，引用本机结果；区分配置初值、实例值和点的质量与源时间。计算开发先明确结果用途与消费者，按需用 inspect_calc_config 核对词典、别名和触发配置。为计算工程选择数据源或核对已保存连接时，查询 section=dataAccess、sourceChoices=true，根据可选、已关联、待核对三类结果指导。询问连接测试或实际读取时，用 inspect_calc_config 的 connectionReceipt=true 和 exactName=完整工程别名，分别报告开发态和每个运行实例的时间、结果、历史标记；缺回执说明取证步骤。省略 section 读取当前计算菜单，指名变量时使用 exactName。根据证据只补问会改变脚本的输入单位、采样窗、质量策略或输出契约。使用工具返回的当前菜单指引。实际触发、写回或请求回包需另用 inspect_calc_results 核对。',
// end
// end
// end
// end
  // end
  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
  // modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
  '编写脚本时先使用已取得的宿主、词典访问约定和 KC 用法。已查明或已明确未登记的符号沿用本轮结论；仍缺资料时用 lookup_calc_runtime 按准确 symbol 或 family 补查。登记项只有名称时保留参数和返回未核对。示例可经本地引用展开。区分词典全局值、宿主全局函数、请求局部参数；结合已保存的别名、词典和业务口径。',
  // end
  // end
  replyStyle,
  '按需调用只读工具，依据本轮问题组织正文。延续已完成的操作，优先给出当前需要执行的一步。',
  // end
  '项目现状须根据可访问证据说明，并区分历史摘要、本轮配置、部署和运行。若选区未变且已有证据，指导操作可沿用历史。要求复查、状态变化或必须确认当前值时重新读取。用户报告与工具事实分别说明。',
  '工具的匿名摘要可用于推理。需要展示其完整本地结果（例如变量名称清单）时在答复中写 [[read_client_variables]] 或对应工具名。引用必须独占一行，该行会替换为界面可见的完整事实，不再重复整张表或用作句中的链接。只引用成功调用过的工具。操作问题先给出指导，无须重复整张清单。',
  '具体界面操作、成功判据以以下已核实操作资料或 lookup_reference 为依据。示例名不代表已配置；未知的菜单、参数或运行结果不可猜测。只答当前问题。工程事实已有本地事实占位符可以完整回答时直接引用，勿重复，也无需附后续开发计划。分别写出事实和操作，单凭一个数据层的缺项，不可推测其他对象或其他层的状态，即使加上“可能”也不行。用简短中文段落，避免 Markdown 表格。不能从没有工程变量映射推断控件一定静态或运行值。外部目标点是否存在、数据源是否已关联均需核实。需要本地真实名称或清单时，使用已调用工具的 [[工具键]] 引用，例如 [[read_client_variables]]。',
  // modified by jinlong.feng at 2026-11-21 KF助手模型统一答复
  ...Object.entries(guideEntries).map(([key, material]) => key + ' ' + material),
  // end
].join('\n');

export const guideBasis = [
  ...Object.keys(steps).map((key) => 'step:' + key),
  ...Object.keys(questions).map((key) => 'ask:' + key),
];

export function knownBasis(key: string) {
  const [kind, name, ...extra] = key.split(':');
  return (
    !extra.length &&
    ((kind === 'step' && Object.hasOwn(steps, name)) || (kind === 'ask' && Object.hasOwn(questions, name)))
  );
}
// end
export function parseGuidance(value: unknown): Guidance | null {
  if (!value || typeof value !== 'object') return null;
  const decision = value as Record<string, unknown>;
  if (decision.kind === 'step' && typeof decision.step === 'string' && Object.hasOwn(steps, decision.step))
    return { kind: 'step', step: decision.step as Step };
  if (decision.kind !== 'clarify' || !Array.isArray(decision.fields)) return null;
  const fields = [...new Set(decision.fields)].filter(
    (id): id is Field => typeof id === 'string' && Object.hasOwn(questions, id),
  );
  // The source question chooses between an existing live point and a new device.
  // Ask for driver-specific details only after the user has identified that branch.
  if (fields.includes('source')) return { kind: 'clarify', fields: ['source'] };
  return fields.length ? { kind: 'clarify', fields: fields.slice(0, 2) } : null;
}

export function renderGuidance(decision: Guidance): string {
  if (decision.kind === 'clarify') return decision.fields.map((field) => questions[field]).join('\n');
  const [action, verify] = steps[decision.step];
  // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
  return action + '\n' + verify;
  // end
}

export function sameSelection(left: Context, right: Context) {
  return (
    !!left.object &&
    left.kind === right.kind &&
    left.projectId === right.projectId &&
    left.object === right.object &&
    // modified by jinlong.feng at 2026-11-22 KF报警规则回读
    (left.kind !== 'alarm' || left.group === right.group) &&
    // end
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    left.buttonName === right.buttonName &&
    // end
    left.control === right.control &&
    left.group === right.group &&
    left.dirty === right.dirty &&
    (!left.dirty || !!left.editor) &&
    JSON.stringify(left.cell) === JSON.stringify(right.cell) &&
    JSON.stringify(left.sceneView) === JSON.stringify(right.sceneView) &&
    JSON.stringify(left.editor) === JSON.stringify(right.editor)
  );
}

// end
