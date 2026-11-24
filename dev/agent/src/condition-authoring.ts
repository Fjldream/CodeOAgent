// modified by jinlong.feng at 2026-11-23 KF条件事件脚本生成与验收
import {parse} from 'acorn';
import {HttpError} from './shared.ts';

const units = {s:1000, min:60000, hour:3600000} as const;
const invalid = (text:string) => new HttpError(400,text);
export type ConditionSettings = {expression:string; interval:number; unit:keyof typeof units; exist:string; out:string};
export const conditionSchema = {
  type:'object', additionalProperties:false, required:['expression','interval','unit','exist','out'],
  description:'条件事件专用；draft.code 放进入时正文，此处放条件、保持间隔、存在时和离开时正文。',
  properties:{
    expression:{type:'string',maxLength:2000,description:'只读布尔表达式，以 global["@variable:…"] 引用当前工程词典变量。'},
    interval:{type:'integer',minimum:1},unit:{type:'string',enum:Object.keys(units)},
    exist:{type:'string',minLength:1,maxLength:16000},out:{type:'string',minLength:1,maxLength:16000},
  },
};
export function conditionSettings(host:string, value:any):ConditionSettings|undefined {
  if (host!=='condition') {
    if(value!==undefined) throw invalid('仅 condition 宿主使用 condition 属性。');
    return;
  }
  if (!value || !Object.hasOwn(units,value.unit) || !Number.isSafeInteger(value.interval) || value.interval<1 ||
      value.interval*units[value.unit as keyof typeof units]>2147483647)
    throw invalid('条件事件需在 condition 内提供正整数 interval 和 s、min 或 hour。Node 此版本的 ms 会按秒调度。');
  for (const key of ['expression','exist','out'] as const) {
    if(typeof value[key]!=='string' || !value[key].trim() || value[key].length>(key==='expression'?2000:16000))
      throw invalid('condition.'+key+' 缺失或过长。code、exist、out 分别为三个阶段的独立函数正文。');
  }
  return {expression:value.expression,interval:value.interval,unit:value.unit,exist:value.exist,out:value.out};
}

type Variable = {kind:string;name:string;trigger?:unknown};
const comparisons=new Set(['===','!==','==','!=','>=','>','<=','<']);
const arithmetic=new Set(['+','-','*','/','%']);
export function bindCondition(input:string,bindings:Map<string,Variable>):string {
  let tree;
  try { tree=parse('('+input+'\n)',{ecmaVersion:'latest'}); }
  catch { throw invalid('条件表达式语法无效。请提交单个布尔表达式。'); }
  const statement=tree.body[0];
  if (tree.body.length!==1 || statement.type!=='ExpressionStatement') throw invalid('条件只允许一个表达式。');
  let used=false;
  function render(n:any):{code:string;boolean:boolean} {
    if (n.type==='Literal' && ['number','string','boolean'].includes(typeof n.value) && !n.regex &&
        !(typeof n.value==='number' && !Number.isFinite(n.value))) {
      return {code:JSON.stringify(n.value),boolean:typeof n.value==='boolean'};
    }
    if(n.type==='MemberExpression' && n.computed && n.object.name==='global' && n.property.type==='Literal') {
      const v=bindings.get(n.property.value);
      if(v?.kind!=='variable' || !v.trigger) throw invalid('条件变量未取得可核对的词典映射。选取环境中带 trigger 的变量引用。');
      used=true;
      return {code:'global['+JSON.stringify(v.name)+']',boolean:false};
    }
    if(n.type==='UnaryExpression' && ['!','+','-'].includes(n.operator)) {
      return {code:'('+n.operator+render(n.argument).code+')',boolean:n.operator==='!'};
    }
    if((n.type==='BinaryExpression' && (comparisons.has(n.operator)||arithmetic.has(n.operator))) ||
       (n.type==='LogicalExpression' && ['&&','||'].includes(n.operator))) {
      const left=render(n.left),right=render(n.right);
      return {code:'('+left.code+' '+n.operator+' '+right.code+')',boolean:comparisons.has(n.operator)||(n.type==='LogicalExpression' && left.boolean && right.boolean)};
    }
    throw invalid('请用已核对的 global[变量引用]、常量、比较或布尔组合。不支持调用函数、赋值或动态成员。');
  }
  const expression=render(statement.expression);
  if(!used || !expression.boolean) throw invalid('条件必须引用当前工程变量，并返回严格布尔值。请明确比较阈值或布尔状态。');
  if(/like/i.test(expression.code)) throw invalid('运行态会预处理表达式中的 LIKE 文本。请核对变量别名或条件写法。');
  return expression.code;
}
export function conditionText(expression:string,settings:ConditionSettings,bodies:string[]) {
  const parts=['条件事件 · 数据项：'+expression+' · 生效：是','存在时执行间隔：'+settings.interval+' '+settings.unit];
  for (const [i,phase] of ['进入时','存在时','离开时'].entries()) {
    const code=bodies[i];
    const fence='`'.repeat(Math.max(3,...Array.from(code.matchAll(/`+/g),m=>m[0].length+1)));
    parts.push(phase,fence+'javascript',code,fence);
  }
  return parts.join('\n');
}
// end
