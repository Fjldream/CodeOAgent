// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOverview} from '../src/project-overview.ts';
import {readContext} from '../src/shared.ts';
const groups:any={
 periods:[{GUID:'p',name:'P',periodType:'interval',interval:5,unit:'s',whetherenable:'是'}],
 APIs:[{GUID:'a',name:'A',functionName:'endpoint'}],
 dataChanges:[{GUID:'d',name:'D',expression:'cache'}],conditions:[{GUID:'c',name:'C',expression:'global["cache"] > 2',interval:3,unit:'s'}],
 functions:[{GUID:'f',name:'Helper',functionName:'calc',paramlist:'x'}],systemScripts:[{GUID:'s',name:'Startup'}],
 globalVars:[{name:'Source',type:'IO_Number',dataSourceName:'Line',dataSourceType:'RT',TagName:'T',value:4},{name:'cache',type:'Number'}],
 dataAccess:[{name:'Line',connectName:'Plant',type:'RT'}]
};
const bodies:any={s:'',p:'const alias="Line"; await KIOUpdateDatas(alias,[{N:"T",V:1}],[]); global.cache=global.calc(global.Source);',
 f:'return x * 2;',a:'OutParam.derived=global.cache;',d:'global.log = global.cache;',c:{in:'global.flag=true;',exist:'',out:'global.flag=false;'}};
const noReceipt=async()=>({dependencies:[],lines:[]});
test('同一工程的两个入口均覆盖六类正文、条件三段、映射、实参、调用与跨脚本读写，摘要仅含匿名状态',async()=>{
 const answers=[];
 for(const menu of ['calculate-global-variable','calculate-period-script']){
  const sections=new Set(),scripts=new Set();
  const r=await projectOverview(readContext({kind:'calculation',projectId:'q',calcMenu:menu,group:'child'}),async(path,params)=>{
    if(path.endsWith('scriptData')){scripts.add(params.scriptId);return {context:bodies[params.scriptId]};}
    assert.equal(params.groupId,'-1');sections.add(params.type);return groups[params.type];
  }, async(hashes)=>{assert.ok(hashes.has('APIs:a'));return {lines:['回执测试'],dependencies:[]};});
  assert.equal(sections.size,8);assert.equal(scripts.size,6);
  for(const s of ['Helper','C / 存在','C / 离开','由假转真','Line / T','Plant','响应字段 derived','回执测试','P` 调用 `Helper','写入 `变量 cache`，`A','x * 2'])assert.ok(r.answer.includes(s),s);
  assert.deepEqual(r.summary,{status:'inspected',localReference:'[[inspect_project_overview]]'});answers.push(r.answer);
 }
 assert.equal(answers[0],answers[1]);
});
test('区分空、读取失败、同名函数和不能解析的动态调用，不把词典初值标成实际结果',async()=>{
 const r=await projectOverview(readContext({kind:'calculation',projectId:'q'}),async(path,q)=>{
   if(path.endsWith('scriptData')){if(q.scriptId==='p')throw Error('storage');return {context:q.scriptId==='a'?'function nested(global){global.hidden=2;} global.calc();global[InParam.which]();':bodies[q.scriptId]??''};}
   return q.type==='functions'?[...groups.functions,{...groups.functions[0],GUID:'f2',name:'Other'}]:groups[q.type];
 },noReceipt);
 assert.equal(r.summary.status,'partial');assert.match(r.answer,/动态函数目标/);assert.match(r.answer,/P 正文读取失败/);assert.match(r.answer,/多条登记/);
 assert.doesNotMatch(r.answer,/写入 `hidden`/);assert.match(r.answer,/未取得.*运行回执/);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import {CalcJournal} from '../src/calc-journal.ts';
test('运行回执按账号、对话、工程、依赖权限和正文指纹逐项限定',async()=>{
 const dependency={kind:'calculation',projectId:'p',runtimeApp:'app',runtimeNode:'node'};
 const row=(script:string,digest:string)=>({kind:'request',script,dependencies:JSON.stringify([dependency]),result:JSON.stringify({title:script,appName:'instance',at:'sample time',qualified:true,digest,lines:['返回 '+script]})});
 const mock={chat:(owner:string,id:string)=>{assert.equal(owner,'owner');assert.equal(id,'chat');},db:{prepare:(sql:string)=>{assert.match(sql,/WHERE project=\? AND chat=\?/);return {all:(p:string,c:string)=>{assert.deepEqual([p,c],['p','chat']);return [row('fresh','a'),row('old','x'),row('denied','z')];}};}}};
 const journal=new CalcJournal(mock as any,{} as any);
 const r=await journal.overviewReceipts('owner','chat','p',new Map([['APIs:fresh','a'],['APIs:old','new']]),async rec=>rec.script!=='denied');
 assert.match(r.lines.join('\n'),/fresh.*正文与本次一致/);assert.match(r.lines.join('\n'),/old.*历史回执/);assert.doesNotMatch(r.lines.join('\n'),/denied/);
 assert.equal(r.dependencies.length,2);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算工程业务总览
import {trackActivity,type Activity} from '../src/query-activity.ts';
test('查询步骤在实际调用前发出，完成条数由结果给出，失败不会显示为完成',async()=>{
 const events:Activity[]=[];
 const trace=trackActivity(e=>events.push(e));
 const work=()=>projectOverview(readContext({kind:'calculation',projectId:'p'}),async(path,q)=>{
   if(q.type==='globalVars')assert.equal(events.at(-1)?.state,'running');
   return path.endsWith('scriptData')?{context:bodies[q.scriptId]}:groups[q.type];
 },noReceipt,trace);
 await work();assert.equal(events[0].label,'查看工程变量');assert.equal(events[1].detail,'2 个词典变量');
 assert.equal(events.filter(e=>e.state==='done').length,5);
 await assert.rejects(trace('核对运行回执',async()=>{throw Error('无法读取');}));
 assert.equal(events.at(-1)?.state,'failed');
});
// end
