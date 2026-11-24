// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import {randomUUID} from 'node:crypto';
export type Activity = {type:'activity';step:string;label:string;state:'running'|'done'|'failed';detail?:string};
export type Track = <T>(label:string, work:()=>Promise<T>, detail?:(value:T)=>string)=>Promise<T>;
export function trackActivity(record:(event:Activity)=>void):Track {
  return async (label,work,detail)=>{
    const step=randomUUID(),base={type:'activity' as const,step,label};
    record({...base,state:'running'});
    try{
      const value=await work();
      record({...base,state:'done',...(detail && {detail:detail(value)})});
      return value;
    }catch(e){record({...base,state:'failed'});throw e;}
  };
}
const labels:Record<string,string>={
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
 prepare_solution_script:'沿方案引用核对计算输入输出及函数',review_solution_script:'整理计算业务口径',
// end
 read_client_variables:'查看工程变量',explain_selected_script:'阅读当前脚本正文',inspect_calc_config:'读取计算工程配置',get_context:'核对当前工程入口',lookup_reference:'查阅 KF 操作说明',
 read_object:'读取选中对象',trace_refs:'追踪对象引用',find_objects:'查找工程对象',inspect_calc_results:'核对计算运行回执',inspect_alarm_rule:'核对报警规则',inspect_report_dataset:'核对报表数据集',
 inspect_control_binding:'核对控件绑定',read_runtime:'核对部署与运行状态',inspect_scene_binding:'核对场景部件绑定',read_alarm_samples:'查看采样与报警记录',
 inspect_collection_setup:'核对设备与点配置',inspect_script_environment:'核对脚本宿主',lookup_calc_runtime:'查阅计算接口',check_script_drafts:'校验脚本草稿',validate_candidate:'检查当前脚本',
 plan_solution:'核对方案开发步骤',prepare_calculation:'核对计算配置',inspect_calculation_io:'查找计算输入输出',compile_calculation_formula:'校验计算表达式',clarify_calculation_contract:'核对计算业务口径',
};
export const toolActivity=(name:string)=>labels[name]||'核对工程资料';
// end
