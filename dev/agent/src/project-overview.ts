// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import {createHash,randomUUID} from 'node:crypto';
import {parse} from 'acorn';
import {type Track} from './query-activity.ts';
import {scriptBindings} from './js-bindings.ts';
import {describeBody,trigger} from './selected-script.ts';
import {HttpError,type Context,type Evidence} from './shared.ts';

const hosts={periods:'周期脚本',APIs:'请求式脚本',dataChanges:'数据变化',conditions:'条件事件',functions:'自定义函数',systemScripts:'系统事件'} as const;
type Host=keyof typeof hosts;
type Row=Record<string,any>;
type Read=(route:string,params:Record<string,string>)=>Promise<any>;
type Runtime=(hashes:Map<string,string>)=>Promise<{lines:string[];dependencies:Context[]}>;
type Node=any;
const sections=[...Object.keys(hosts),'globalVars','dataAccess'];
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const code=(value:unknown)=>'\x60'+String(value).replace(/[\x60\r\n]/g,' ')+'\x60';
const unique=(values:string[])=>[...new Set(values)];
const add=(set:Set<string>,value:string)=>{if(value)set.add(value);};

function bodyFacts(text:string,functions:Row[],dictionary:Row[],formals:string[]) {
  const reads=new Set<string>(),writes=new Set<string>(),calls=new Set<string>(),issues=new Set<string>();
  const pointReads=new Set<string>(),pointWrites=new Set<string>(),inputs=new Set<string>(),outputs=new Set<string>();
  const returns=new Set<string>();
  const result={reads,writes,calls,issues,pointReads,pointWrites,inputs,outputs,returns};
  if(!text.trim())return result;
  try {
    const ast=parse(text,{ecmaVersion:'latest',allowAwaitOutsideFunction:true,allowReturnOutsideFunction:true,ranges:true,locations:true});
    const parents=new WeakMap<Node,Node>(),nodes:Node[]=[];
    function visit(n:Node,p?:Node){if(!n?.type)return;nodes.push(n);if(p)parents.set(n,p);
      for(const child of Object.values(n)){if(Array.isArray(child))for(const c of child)visit(c,n);else if((child as Node)?.type)visit(child,n);}
    }
    visit(ast);
    const scope=scriptBindings(ast,parents);
    const external=(n:Node)=>n?.type==='Identifier'&&!formals.includes(n.name)&&!scope.declared(n)?n.name:undefined;
    const literal=(n:Node)=>{const v=scope.resolve(n);return v?.type==='Literal'&&typeof v.value==='string'?v.value:undefined;};
    const key=(n:Node)=>n.computed?literal(n.property):n.property.name;
    for(const n of nodes) {
      const p=parents.get(n);
      // A bare host variable is meaningful only as an unresolved reference, never as a property key or declaration.
      if(n.type==='Identifier' && external(n) && dictionary.some(v=>v.name===n.name) &&
          p && !['VariableDeclarator','FunctionDeclaration','FunctionExpression','CatchClause'].includes(p.type) &&
          !(p.type==='MemberExpression' && p.property===n && !p.computed) &&
          !(p.type==='Property' && p.key===n && !p.computed && !p.shorthand) && !(p.type==='CallExpression'&&p.callee===n)){
        const dest=p.type==='AssignmentExpression'&&p.left===n,update=p.type==='UpdateExpression';
        if(dest||update)writes.add(n.name);
        if(!dest||p.operator!=='=')reads.add(n.name);
      }
      if(n.type==='MemberExpression') {
        const root=external(n.object),k=key(n);
        if(!['global','InParam','OutParam'].includes(root))continue;
        if(!k){issues.add('动态成员名需运行时确定');continue;}
        const dest=p?.type==='AssignmentExpression'&&p.left===n,update=p?.type==='UpdateExpression';
        if(root==='global'){
          if(p?.type==='CallExpression' && p.callee===n)continue;
          if(dest||update)add(writes,k);
          if(!dest||p.operator!=='=')add(reads,k);
        } else if(root==='InParam')add(inputs,k);
        else if(dest||update)add(outputs,k);
      }
      if(n.type==='ReturnStatement'&&n.argument){
        let ancestor=p;
        while(ancestor && !['ArrowFunctionExpression','FunctionExpression','FunctionDeclaration'].includes(ancestor.type))ancestor=parents.get(ancestor);
        if(!ancestor)returns.add(text.slice(n.argument.start,n.argument.end).slice(0,100));
      }
      if(n.type!=='CallExpression')continue;
      const callee=n.callee;
      const member=callee.type==='MemberExpression' && external(callee.object)==='global';
      const fn=member?key(callee):external(callee);
      if(!fn){if(member)issues.add('动态函数目标待核对');continue;}
      const matches=functions.filter(f=>f.functionName===fn);
      if(matches.length===1)calls.add(matches[0].name);
      else if(matches.length>1)issues.add('函数 '+fn+' 有多条登记');
      const input=['KIOQueryDatas','AsynKIOQueryDatas'].includes(fn);
      if(!input&&!['KIOUpdateDatas','AsynKIOUpdateDatas'].includes(fn))continue;
      const alias=literal(n.arguments[0]), array=scope.resolve(n.arguments[1]);
      if(!alias||array?.type!=='ArrayExpression'){issues.add(fn+' 的连接或点集合需运行时确定');continue;}
      for(const element of array.elements){
        const props=element?.properties;
        const named=props?.filter((v:Node)=>v.type==='Property'&&!v.computed&&(v.key.name??v.key.value)==='N');
        const tag=input?literal(element):props?.every((v:Node)=>v.type==='Property'&&!v.computed)&&named?.length===1?literal(named[0].value):undefined;
        if(tag)(input?pointReads:pointWrites).add(JSON.stringify([alias,tag]));else issues.add(fn+' 包含动态点名');
      }
    }
  } catch {issues.add('部分正文无法静态解析');}
  return result;
}
const pointLabel=(id:string)=>{const [a,t]=JSON.parse(id);return a+' / '+t;};
const list=(set:Iterable<string>)=>[...set].map(code).join('、');
function mapping(v:Row,sources:Row[]){
  const aliases=sources.filter(s=>s.name===v.dataSourceName);
  if(!['IO_Number','IO_Boolean','IO_String'].includes(v.type)||!v.TagName||aliases.length!==1||!v.dataSourceType||aliases[0].type!==v.dataSourceType)return;
  return JSON.stringify([v.dataSourceName,v.TagName]);
}

export async function projectOverview(ctx:Context,read:Read,runtime:Runtime,track:Track=async(_label,work)=>work()) {
  if(!['calculation','period','request'].includes(ctx.kind))throw new HttpError(400,'请打开计算工程');
  const lists:Record<string,Row[]>={}, gaps:string[]=[];
  // ScriptService.getProjectJsonData returns all groups for -1, irrespective of the selected menu.
  async function listing(section:string){
    const rows=await read('/calculation/projectJsonData',{type:section,groupId:'-1'});
    if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.name!=='string'))throw new HttpError(502,'工程清单读取不完整：'+section);
    lists[section]=rows;
    return rows.length;
  }
  await track('查看工程变量',()=>listing('globalVars'),n=>n+' 个词典变量');
  await track('查看数据源连接',()=>listing('dataAccess'),n=>n+' 个工程别名');
  await track('查看六类脚本登记',()=>Promise.all(Object.keys(hosts).map(listing)),counts=>counts.reduce((a,b)=>a+b,0)+' 条登记');
  const sources=lists.dataAccess,dict=lists.globalVars;
  const hashes=new Map<string,string>();
  const bodyDigests:Record<string,string>={};
  type Script={host:Host;row:Row;phase?:'in'|'exist'|'out';facts:ReturnType<typeof bodyFacts>;steps:string[];name:string;empty:boolean};
  const scripts:Script[]=[];
  const entries=(Object.keys(hosts) as Host[]).flatMap(host=>lists[host].map(row=>({host,row})));
  async function load({host,row}:typeof entries[number]){
    if(!row.GUID||lists[host].filter(r=>r.GUID===row.GUID).length!==1){gaps.push(row.name+' 标识缺失或重复');return [];}
    let data;
    try{data=await read('/calculation/scriptData',{type:host,scriptId:row.GUID});}
    catch(e){if(e instanceof HttpError && [401,403].includes(e.status))throw e;gaps.push(row.name+' 正文读取失败');return [];}
    const phases=host==='conditions'?['in','exist','out'] as const:[undefined];
    const loaded:Script[]=[];
    for(const phase of phases){
      const body=phase?data?.context?.[phase]:data?.context;
      if(typeof body!=='string'){gaps.push(row.name+' 子段或正文缺失');continue;}
      const signature=sha(body);
      bodyDigests[[host,row.GUID,phase??''].join(':')]=signature;
      if(!phase)hashes.set(host+':'+row.GUID,signature);
      if(body.length>240000){gaps.push(row.name+' 正文超出静态分析范围');continue;}
      const params=host==='functions'?String(row.paramlist??'').split(',').map(v=>v.trim()):[];
      const facts=bodyFacts(body,lists.functions,dict,params);
      if(host==='dataChanges' && dict.some(v=>v.name===row.expression))facts.reads.add(row.expression);
      if(host==='conditions' && row.expression){
        const cond=bodyFacts(String(row.expression),[],dict,[]);
        for(const k of cond.reads)facts.reads.add(k);
      }
      const steps=describeBody(body);
      if(steps.status==='partial'||steps.status==='unparsed')facts.issues.add('当前正文只作部分解释');
      loaded.push({host,row,phase,facts,steps:steps.lines,name:(entries.filter(e=>e.row.name===row.name).length>1?hosts[host]+' / ':'')+row.name+(phase?' / '+({in:'进入',exist:'存在',out:'离开'}[phase]):''),empty:steps.status==='empty'});
    }
    return loaded;
  }
  await track('阅读脚本正文与调用关系',async()=>{
    for(let i=0;i<entries.length;i+=4)for(const group of await Promise.all(entries.slice(i,i+4).map(load)))scripts.push(...group);
    return scripts.length;
  },n=>n+' 段正文'+(gaps.length?'，部分待核对':''));
  const observed=await track('核对实际运行回执',()=>runtime(hashes));
  const active=scripts.filter(s=>!s.empty),paths:string[]=[],relations=new Set<string>(),producer=new Map<string,Set<string>>(),consumer=new Map<string,Set<string>>();
  function edge(table:Map<string,Set<string>>,key:string,label:string){if(!table.has(key))table.set(key,new Set());table.get(key)!.add(label);}
  const functionRows=active.filter(s=>s.host==='functions');
  function callChain(s:Script,seen:Set<Script>):string[] {
    return [...s.facts.calls].map(name=>{
      const targets=functionRows.filter(f=>f.row.name===name);
      if(targets.length!==1)return code(name);
      const target=targets[0];
      if(seen.has(target))return code(name)+'（递归）';
      if(seen.size>=5)return code(name)+'（更深调用见各脚本）';
      const nested=callChain(target,new Set([...seen,target]));
      return code(name)+(nested.length?' → '+nested.join('、'):'');
    });
  }
  for(const s of active){
    const f=s.facts,ins=[...f.reads,...[...f.pointReads].map(pointLabel),...[...f.inputs].map(v=>'请求入参 '+v)];
    const outs=[...f.writes,...[...f.pointWrites].map(pointLabel),...[...f.outputs].map(v=>'响应字段 '+v)];
    const rule=trigger(s.host,s.row,s.phase).split('；有效期')[0];
    const action=s.steps.find(line=>/写入|写回|请求写入/.test(line))?.trim();
    const path=[hosts[s.host]+' '+code(s.name),rule,ins.length?'读取 '+list(ins):'',f.calls.size?'调用 '+callChain(s,new Set([s])).join('、'):'',action && action.length<=140 ? action : '',outs.length?'写入 '+list(outs):'',f.returns.size?'返回 '+list(f.returns):''].filter(Boolean);
    if(path.length>1)paths.push(path.join(' → '));
    for(const v of f.calls)relations.add(code(s.name)+' 调用 '+code(v));
    for(const [set,table] of [[f.reads,consumer],[f.writes,producer]] as const)for(const k of set){
      edge(table,'变量 '+k,s.name);
      const rows=dict.filter(v=>v.name===k);const id=rows.length===1?mapping(rows[0],sources):undefined;
      // An IO mapping is a saved source reference. A local assignment alone is not a proven device write.
      if(id && table===consumer)edge(table,'点 '+pointLabel(id),s.name);
    }
    for(const id of f.pointReads)edge(consumer,'点 '+pointLabel(id),s.name);
    for(const id of f.pointWrites)edge(producer,'点 '+pointLabel(id),s.name);
    for(const issue of f.issues)gaps.push(s.name+'：'+issue);
  }
  for(const [k,writers] of producer)for(const w of writers)for(const r of consumer.get(k)||[])if(w!==r)relations.add(code(w)+' 写入 '+code(k)+'，'+code(r)+' 引用同一数据');
  const counts=(Object.keys(hosts) as Host[]).map(h=>hosts[h]+' '+lists[h].length).join('、');
  const origins=unique(active.filter(s=>s.host!=='functions').map(s=>hosts[s.host]));
  const readNames=unique(active.flatMap(s=>[...s.facts.inputs,...s.facts.reads,...[...s.facts.pointReads].map(pointLabel)]));
  const destinations=unique(active.flatMap(s=>[...s.facts.outputs,...s.facts.writes,...[...s.facts.pointWrites].map(pointLabel)]));
  const entryActions=unique(active.filter(s=>s.host!=='functions').map(s=>s.steps.find(line=>/写回|写入|请求写入|返回 /.test(line))?.trim()).filter((v): v is string=>!!v && v.length<=110));
  const summary=active.length?['已保存的非空逻辑'+(origins.length?'由'+origins.join('、')+'承载':'集中在自定义函数中'),readNames.length?'涉及输入 '+list(readNames.slice(0,8)):'',destinations.length?'结果涉及 '+list(destinations.slice(0,8)):''].filter(Boolean).join('，')+'。'+(entryActions.length?'其中可核对的处理是：'+entryActions.slice(0,2).join(' '):''):gaps.length?'已读部分未发现非空逻辑，仍有正文待核对。':'六类脚本中没有非空的已保存正文。';
  const lines=[summary,'','## 业务链路',...(paths.length?paths.map(p=>'- '+p):['可确认的处理步骤见下方脚本登记。']),...Array.from(relations,r=>'- '+r),'','## 脚本与触发条件',counts+'。'];
  for(const s of scripts){
    lines.push('','### '+s.name,trigger(s.host,s.row,s.phase));
    if(s.empty){lines.push('正文为空。');continue;}
    const steps=s.steps.slice(0,12);lines.push(...steps);
    if(s.steps.length>steps.length)lines.push('此处列出前 12 行处理步骤，完整分支可从脚本编辑器查看。');
  }
  lines.push('','## 数据词典与数据源');
  if(!sources.length&&!dict.length)lines.push('工程未登记词典变量和数据源。');
  for(const s of sources)lines.push('- 连接 '+code(s.name)+' → '+code(s.connectName||'关联目标待核对')+'（'+String(s.type||'类型待核对')+'）');
  for(const v of dict){
    const id=mapping(v,sources);
    lines.push('- '+code(v.name)+' · '+String(v.type||'类型待核对')+(id?' → '+code(pointLabel(id)):v.dataSourceName?' · 映射待核对 '+code(v.dataSourceName):'')+(v.value!==undefined?' · 配置初值 '+code(v.value):''));
  }
  if(gaps.length)lines.push('','## 静态分析边界',...unique(gaps).map(g=>'- '+g));
  lines.push('','## 实际运行记录',...(observed.lines.length?observed.lines:['当前对话未取得该计算工程可见的运行回执。以上为已保存的配置与正文。']));
  const evidence:Evidence={id:randomUUID(),at:new Date().toISOString(),layer:'saved',title:'计算工程业务逻辑总览',source:'calculation/projectJsonData + calculation/scriptData',facts:[{label:'脚本登记',value:counts},{label:'工程对象',value:'数据词典 '+dict.length+'，数据源 '+sources.length}],gaps:unique(gaps),references:[],digest:sha(JSON.stringify([sections.map(k=>lists[k]),Object.entries(bodyDigests).sort()]))};
  return {answer:lines.join('\n'),evidence,dependencies:observed.dependencies,summary:{status:gaps.length?'partial':'inspected',localReference:'[[inspect_project_overview]]'}};
}
// end
