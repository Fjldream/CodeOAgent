// modified by jinlong.feng at 2026-11-23 KF选中脚本通用解释
import {createHash, randomUUID} from 'node:crypto';
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
import {calendarReport} from './calendar.ts';
import {sectionForMenu} from './calc-config.ts';
import {HttpError, type Context, type Evidence} from './shared.ts';

const hostNames = {periods:'周期脚本',APIs:'请求式计算脚本',conditions:'条件事件',functions:'自定义函数',dataChanges:'数据变化脚本',systemScripts:'系统事件'} as const;
type Host = keyof typeof hostNames;
type Row = Record<string,any>;
type Read = (path:string, params:Record<string,string>)=>Promise<any>;
const phases = {in:'进入',exist:'存在',out:'离开'} as const;
export function selectedHost(ctx: Context): Host | undefined {
  if (!ctx.object) return;
  const section = ctx.kind==='period' ? 'periods' : ctx.kind==='request' ? 'APIs' :
    ctx.kind==='calculation' ? sectionForMenu(ctx.calcMenu) : undefined;
  if (section && Object.hasOwn(hostNames,section)) return section as Host;
}
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
export function trigger(host:Host,row:Row,phase?:keyof typeof phases) {
  let rule:string;
  switch(host) {
    case 'periods': {
      const bounds=[row.startTime && '开始 '+row.startTime,row.endTime && '结束 '+row.endTime].filter(Boolean);
      const localDay = /^(\d{4}-\d{2}-\d{2})(?:[ T]|$)/.exec(String(row.startTime))?.[1];
      const sameDay = localDay && String(row.endTime).startsWith(localDay) && !/Z|[+-]\d\d:\d\d$/.test(String(row.startTime)+String(row.endTime));
      rule=row.periodType==='calendar' ? calendarReport(row,sameDay?localDay:undefined).filter(s=>!s.startsWith('节点约')).join('。') :
        row.periodType==='interval' ? '按固定间隔 '+row.interval+' '+row.unit+' 调度'+(row.times!=null?'（执行次数配置 '+row.times+'）':'') : '周期调度方式待核对';
      if(bounds.length) rule+='；有效期：'+bounds.join('，');
      break;
    }
    case 'APIs':rule='调用方请求 '+(row.functionName||row.name)+' 时执行';break;
    case 'functions':rule='调用方调用 '+(row.functionName||row.name)+' 时执行，登记形参 '+(Array.isArray(row.paramlist)?row.paramlist.map((p:any)=>typeof p==='object'?p.name??p.paramName:p).join('、'):row.paramlist||'无');break;
    case 'dataChanges':rule='所选词典变量 '+row.expression+' 被赋予与旧值严格不等的新值时触发';break;
    case 'conditions':rule='条件 '+row.expression+'，'+({in:'由假转真时进入',exist:'持续成立时按 '+row.interval+' '+row.unit+' 的间隔执行',out:'由真转假时离开'}[phase!]);break;
    case 'systemScripts':rule='由计算宿主的「'+row.name+'」生命周期处理入口调用；实际调用次数需看目标实例记录';break;
  }
  return (row.whetherenable!=null?'生效配置「'+row.whetherenable+'」。':'')+rule;
}

// end
type Node = any;
// Preserve JavaScript expressions when translating them would lose their evaluation semantics.
export function describeBody(source:string) {
  if(!source.trim()) return {status:'empty',lines:['正文为空，没有配置执行语句。']};
  let ast:Node;
  try { ast=parse(source,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true,allowAwaitOutsideFunction:true,ranges:true}); }
  catch {return {status:'unparsed',lines:['所选正文无法解析为 JavaScript，无法可靠解释执行路径。']};}
  const globals=new WeakSet<object>();
  try {
    const scopes=analyze(ast,{ecmaVersion:2024,sourceType:'script',nodejsScope:true,fallback:'iteration'});
    for(const r of scopes.globalScope!.through) globals.add(r.identifier);
  } catch { /* Unresolved calls retain their literal JavaScript spelling. */ }
  const raw=(n:Node)=>n?source.slice(n.start,n.end):'';
  const name=(n:Node)=>n?.type==='Identifier' && globals.has(n)?n.name:undefined;
  const prop=(n:Node)=>n.computed?n.property.type==='Literal'?String(n.property.value):undefined:n.property.name;
  function value(n:Node):string {
    if(!n)return '';
    if(n.type==='MemberExpression' && name(n.object)==='global' && prop(n)!==undefined) return '全局变量 '+prop(n);
    if(n.type==='MemberExpression' && ['InParam','OutParam'].includes(name(n.object)) && prop(n)!==undefined)
      return (name(n.object)==='InParam'?'请求输入 ':'响应字段 ')+prop(n);
    if(n.type==='AwaitExpression') return '等待'+value(n.argument);
    if(n.type==='BinaryExpression' || n.type==='LogicalExpression') return '（'+value(n.left)+' '+n.operator+' '+value(n.right)+'）';
    if(n.type==='ConditionalExpression') return '按 '+value(n.test)+' 取值，成立时取 '+value(n.consequent)+'，否则取 '+value(n.alternate);
    if(n.type==='CallExpression') {
      const fn=name(n.callee), args=n.arguments.map(raw).join('，');
      if(n.callee.type==='MemberExpression' && name(n.callee.object)==='Date' && prop(n.callee)==='now' && !n.arguments.length)return '当前时间戳（毫秒）';
      if(fn==='KIOQueryDatas' && n.arguments.length>=3)return fn+' 从连接 '+raw(n.arguments[0])+' 查询 '+raw(n.arguments[1])+'，样本填入 '+raw(n.arguments[2])+'，表达式取返回码';
      if(fn==='AsynKIOQueryDatas')return '调用 '+fn+' 异步查询（'+args+'），结果交给回调';
      if(fn==='KIOUpdateDatas'||fn==='AsynKIOUpdateDatas')return '调用 '+fn+' 向连接 '+raw(n.arguments[0])+' 请求写入 '+raw(n.arguments[1])+'，回执参数 '+raw(n.arguments[2]);
      if(n.callee.type==='MemberExpression' && name(n.callee.object)==='Math') {
        const meaning=({max:'取最大值',min:'取最小值',round:'四舍五入',abs:'取绝对值',floor:'向下取整',ceil:'向上取整'} as Record<string,string>)[prop(n.callee)??''];
        if(meaning)return meaning+'（'+n.arguments.map(value).join('，')+'）';
      }
    }
    return raw(n);
  }
  let partial=false,limited=false,length=0;
  const lines:string[]=[];
  function emit(indent:number,text:string){
    if(lines.length>=90 || length>=10500){limited=true;return;}
    if(text.length>700){text=text.slice(0,700)+'…';limited=true;}
    lines.push('  '.repeat(Math.min(indent,8))+text);length+=text.length;
  }
  function statement(n:Node,depth:number){
    if(!n||limited)return;
    if(depth>32){partial=true;emit(depth,'更深的嵌套未展开。');return;}
    const line=(s:string)=>emit(depth,s);
    const next=(node:Node)=>statement(node,depth+1);
    switch(n.type) {
      case 'BlockStatement': for(const s of n.body)statement(s,depth);return;
      case 'EmptyStatement':return;
      case 'VariableDeclaration':
        for(const v of n.declarations)line(v.init?'将 '+value(v.init)+' 存入局部变量 '+raw(v.id)+'。':'声明局部变量 '+raw(v.id)+'。');return;
      case 'ExpressionStatement':{
        const e=n.expression;
        if(e.type==='AssignmentExpression') {
          const dst=value(e.left),rhs=value(e.right);
          if(e.operator==='=')line('将 '+rhs+' 写入 '+dst+'。');
          else if(['&&=','||=','??='].includes(e.operator))line('按条件赋值 '+raw(e)+'，满足该运算符的条件时才写入 '+dst+'。');
          else line('读取 '+dst+' 的原值，与 '+rhs+' 做 '+e.operator.slice(0,-1)+' 运算，结果写回 '+dst+'。');
        } else if(e.type==='AwaitExpression')line(value(e)+'。');
        else if(e.type==='UpdateExpression')line('将 '+value(e.argument)+(e.operator==='++'?' 加 1':' 减 1')+' 并写回。');
        else if(e.type==='CallExpression'){
          const fn=name(e.callee);
          if(fn==='endResponse')line('调用 '+raw(e)+' 结束本次请求并交付响应。');
          else if(fn==='KIOUpdateDatas'||fn==='AsynKIOUpdateDatas')line('调用 '+fn+' 请求向数据源 '+raw(e.arguments[0])+' 写入 '+raw(e.arguments[1])+'。');
          else if(fn==='KIOQueryDatas'||fn==='AsynKIOQueryDatas')line(value(e)+'。');
          else line('调用 '+raw(e)+'。');
        } else line('执行 '+raw(e)+'。');
        return;
      }
      case 'IfStatement':line('若 '+value(n.test)+'：');next(n.consequent);if(n.alternate){line('否则：');next(n.alternate);}return;
      case 'ReturnStatement':line(n.argument?'返回 '+value(n.argument)+'。':'结束当前函数。');return;
      case 'ThrowStatement':line('抛出 '+value(n.argument)+'。');return;
      case 'TryStatement':line('尝试执行：');next(n.block);if(n.handler){line('捕获异常 '+raw(n.handler.param)+' 后：');next(n.handler.body);}if(n.finalizer){line('最终执行：');next(n.finalizer);}return;
      case 'FunctionDeclaration':line('定义 '+raw(n.id)+'('+n.params.map(raw).join(', ')+')，被调用时：');next(n.body);return;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': case 'WhileStatement':
        line('循环 '+source.slice(n.start,n.body.start).trim()+'：');next(n.body);return;
      case 'DoWhileStatement':line('先执行循环体，再按 '+raw(n.test)+' 判断是否继续：');next(n.body);return;
      case 'SwitchStatement':line('按 '+raw(n.discriminant)+' 选择分支（遵循 JS 穿透规则）：');for(const c of n.cases){line(c.test?'case '+raw(c.test):'default');for(const s of c.consequent)next(s);}return;
      case 'BreakStatement':case 'ContinueStatement':line('执行 '+raw(n)+'。');return;
      default:partial=true;line('此语句保留原式：'+raw(n));return;
    }
  }
  for(const s of ast.body)statement(s,0);
  if(limited)lines.push('内容较长，以上仅展开部分正文。');
  return {status:partial||limited?'partial':'analyzed',lines};
}

const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export async function explainSelection(ctx:Context,read:Read,draft?:string) {
  const host=selectedHost(ctx);
  if(!host)throw new HttpError(400,'请在计算工程中打开一条脚本。');
  const phase=ctx.scriptPhase;
  if(host==='conditions' && !phase)throw new HttpError(400,'未收到条件事件当前子页。');
  const rows=await read('/calculation/projectJsonData',{type:host,groupId:ctx.group||'-1'});
  if(!Array.isArray(rows))throw new HttpError(502,'脚本登记读取失败。');
  const matches=rows.filter(r=>r.GUID===ctx.object);
  if(matches.length!==1)throw new HttpError(404,'所选脚本未在该工程分组唯一登记。');
  const {context}=await read('/calculation/scriptData',{type:host,scriptId:ctx.object});
  const saved=host==='conditions'?context?.[phase!]:context;
  if(typeof saved!=='string')throw new HttpError(502,'当前选区的已保存正文不可用。');
  const same=ctx.editor?.digest===hash(saved) || (!!ctx.editor?.lineDigest && ctx.editor.lineDigest===hash(saved.replace(/\r\n?/g,'\n').replace(/\n+$/,'')));
  if(draft!==undefined && (typeof draft!=='string'||!ctx.editor?.digest||hash(draft)!==ctx.editor.digest))throw new HttpError(409,'编辑稿与本轮选区指纹不一致，请从当前标签重新提问。');
  const text=draft??saved, dirty=draft!==undefined&&!same;
  const scope=dirty?'当前编辑稿；触发配置取自已保存登记':same?'当前编辑器与已保存正文一致':ctx.dirty||ctx.editor?.digest?'已保存正文；与当前编辑稿的一致性未确认':'已保存正文';
  const title=hostNames[host]+'「'+matches[0].name+'」'+(phase?' · '+phases[phase]+'时':'');
  const result=describeBody(text);
  const answer=[title+'（'+scope+'）','执行条件：'+trigger(host,matches[0],phase),...result.lines].join('\n');
  const evidence:Evidence={id:randomUUID(),at:new Date().toISOString(),layer:'saved',source:'calculation/scriptData',title,digest:hash(saved),facts:[{label:'已保存执行条件',value:trigger(host,matches[0],phase)}],references:[],gaps:[scope,'本次说明来自静态分析；实际执行次数与写入结果需查运行回执。']};
  return {answer,evidence,summary:{host,status:result.status,localReference:'[[explain_selected_script]]'}};
}
// end
