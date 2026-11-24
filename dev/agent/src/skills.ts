// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// Source baseline: KF 3.6 development UI, saved-object readers, and the ordinary-user water station walkthrough.
const skills = {
  solution: [
    '方案与续做',
    // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
    '打开开发助手，首次使用先创建个人方案。在对话中说明已有输入和交付目标，或在「工程工具 → 方案起步」选择条件。切换工程后可在「历史」选回原方案的对话。',
    // end
    '先列输入、生产者、消费者与验收条件，确认提议后再读回清单版本。',
  ],
  collection: [
    '数采配置',
    '数采工程 → 数采设备，再到数采变量查看设备、点名、寄存器和读写类型。',
    '在目标数采 App 的监视中核对值、质量和源时间；设备列表只能证明配置存在。',
  ],
  datasource: [
    '数据源与接口',
    '数据源管理 → 单选工程，核对适配器类型。工程内连接另查本地别名和目标实例。',
    '实时订阅、查询与写回分别核验；点名相同仍需核对来源。',
  ],
  calculation: [
    '计算脚本',
    '计算管理 → 工程 → 脚本，按触发方式选择周期性或请求式计算脚本。',
    '先核对宿主、连接别名和显式读写。保存后重读，再用已知输入核对目标实例的输出。',
  ],
  alarm: [
    '报警',
    '报警工程 → 数据源管理，核对别名；数据词典 → 编辑 → 报警属性，核对阈值、优先级和延时。',
    '向测试点提供触发及恢复条件，在事件源和客户端报警窗分别核对点名、值和时间。',
  ],
  page: [
    '二维客户端',
    '客户端工程 → 页面管理，点击页面名打开独立编辑标签，单选控件。',
    '核对控件名称、绑定或脚本路径。运行画面需要单独打开目标客户端 App 验证。',
  ],
  scene: [
    '3D 客户端',
    '客户端工程 → 3D资源管理，双击场景，在新标签页核对场景文件。',
    // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
    '在原生 3D 编辑器打开目标场景并单选模型，然后点开发助手核对。分别查看 Center 场景文件、编辑器现场和选中对象坐标。运行时绑定另在目标客户端验证。',
    // end
  ],
  report: [
    '趋势与报表',
    '客户端工程 → 报表库 → 报表名，选择工作表中的目标单元格。',
    // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
    // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
    '选中单元格后点“工程工具 → 追踪上游”。自定义数据集按标识追到请求式计算脚本。打开该脚本的工程工具可取“报表数据集脚本示例”。核对查询条件的 RequestType、InParam 及返回行中的字段，最后在运行报表读取目标格。',
    // end
    // end
  ],
  runtime: [
    '发布与联调',
    '开发中心工程列表发布或更新。运维中心 → 运维节点管理 → 目标节点，按 App 核对部署与进程。',
    '节点部署报告、加载版本、业务样本与运行页面分别核验。只有进程状态时保留业务结果未知。',
  ],
};
export const waterSteps = [
  [
    '数采',
    '在数采设备中选择测试驱动，建立压力输入点和可写的结果点。',
    '在目标数采监视中分别核对点名、读写类型、源时间和质量。',
  ],
  [
    '实时数据源',
    '新建工业数据源，选择测试数采工程和实例。在计算工程内建立连接别名。',
    '从客户端或计算侧读同一别名映射的源点，记录点名和时间。',
  ],
  [
    '计算',
    '在周期性脚本按有效采样周期读压力，累计五次有效样本后将均值写回独立结果点。',
    '先验证样本不足和坏质量，再用两组已知输入复算均值，记录写回值与时间。',
  ],
  [
    '报警',
    '将压力点加入报警词典，启用高限报警。本案例测试高限为 600 kPa，延时、死区均为零。',
    '在测试数据上分别给出 600 和 560 kPa，核对发生和恢复事件、源点与事件时间。',
  ],
  [
    '客户端',
    '在工程变量中映射输入与结果点，在页面绑定文字控件；给报警窗配置独立的报警事件源。',
    '在编辑器单选控件核对引用，给运行账号配置页面访问权限。',
  ],
  [
    '发布与联调',
    '从各工程列表发布或更新，在运维节点按目标 App 部署并启动，再重新打开运行客户端。',
    '同时核对压力、均压、报警发生与恢复。记录节点、App、时间与画面，逐项确认方案清单。',
  ],
];
const byKind: Record<string, keyof typeof skills> = {
  general: 'solution',
  collection: 'collection',
  datasource: 'datasource',
  calculation: 'calculation',
  period: 'calculation',
  request: 'calculation',
  alarm: 'alarm',
  client: 'page',
  page: 'page',
  scene: 'scene',
  report: 'report',
};
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { calcMenuGuide } from './calc-config.ts';
export function readSkill(kind: string, topic?: string, calcMenu?: string) {
  const menu = kind === 'calculation' && !topic && calcMenuGuide(calcMenu);
  if (menu) return { version: 'KF3.6/2026-11-23', title: menu[0], steps: [menu[1]] };
  // end

  if (topic === 'water')
    return {
      version: 'KF3.6/2026-11-20',
      title: '供水站 · 从空工程到联调',
      steps: waterSteps.map(
        ([name, action, verify], i) => i + 1 + '. ' + name + ' · ' + action + ' 验证：' + verify,
      ),
    };
  const selected = topic === 'runtime' ? 'runtime' : (byKind[kind] ?? 'solution');
  const [title, action, verify] = skills[selected];
  return { version: 'KF3.6/2026-11-20', title, steps: [action, verify] };
}
// end
