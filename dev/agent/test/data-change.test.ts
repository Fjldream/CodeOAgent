// modified by jinlong.feng at 2026-11-23 KF数据变化脚本生成与触发验收
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {dictionaryTrigger, draftQuery, checkDraft} from '../src/script-authoring.ts';

const ref = '@variable:1234567890abcdef';
const bindings = new Map<string, any>([
  ['@source:a',{kind:'source',name:'Connection'}],
  ['@point:p',{kind:'point',name:'Value',sourceRef:'@source:a',read:true}],
  [ref,{kind:'variable',name:'Observed',trigger:{mode:'mapped',pointRef:'@point:p'}}],
]);
test('触发点必须对应有权读取的唯一词典映射，允许内存类型', () => {
  const row = {name:'输入',type:'IO_Number',TagName:'Value',dataSourceName:'Connection',dataSourceType:'KIO'};
  const select = (rows=[row], refs=bindings) => dictionaryTrigger(row, rows, [{name:'Connection',type:'KIO'}], new Set(['Connection']), refs);
  assert.deepEqual(select(),{mode:'mapped',pointRef:'@point:p'});
  assert.equal(select([row,{...row,name:'Duplicate'}]),undefined);
  assert.equal(select([row],new Map()),undefined);
  for (const type of ['Number','String','Boolean']) assert.deepEqual(dictionaryTrigger({...row,type},[],[],new Set(),bindings),{mode:'memory'});
});
test('数据项和完整脚本分别绑定，诊断错误参数、自身写回和已撤回的引用', () => {
  const d={host:'dataChange',code:'return global["'+ref+'"];',triggerRef:ref};
  assert.deepEqual(draftQuery({drafts:[d]}).drafts,[d]);
  assert.throws(()=>draftQuery({drafts:[{...d,triggerRef:undefined}]}));
  assert.throws(()=>draftQuery({drafts:[{...d,host:'period'}]}));
  const success=checkDraft('dataChange',d.code,bindings,ref);
  assert.equal(success.expression,'Observed');
  assert.equal(success.code,'return global["Observed"];');
  for(const code of ['return InParam.V;','global["'+ref+'"]++;']) assert.ok(checkDraft('dataChange',code,bindings,ref).errors.length);
  assert.ok(checkDraft('dataChange','return;',new Map(),ref).errors.length);
});
test('KF 原始订阅、词典 setter 和事件分发共同决定触发次数及参数', () => {
  const root=new URL('../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/',import.meta.url);
  const events:any[]=[];
  const variable={name:'Observed',value:0,TagName:'Tag'};
  let listener:any;
  const bus={onEvent(_name:string,f:any){listener=f;},emitEvent(_name:string,[v]:any[]){listener(v);}};
  const sandbox:any={global:{},__dir:'',execProjectPath:'fixture',globalVar:{globalVars:[variable]},dataChangedata:{dataChanges:[{expression:'Observed',file:'handler'}]}};
  sandbox.require=(path:string)=>{
    if(path.endsWith('/core/utils'))return {myEvent:bus};
    if(path.endsWith('/core/enums'))return {enumMsg:{},enumCode:{}};
    if(path.endsWith('scriptGuard.js'))return {SCRIPT_TYPE:{},safeRunScript(_t:any,_n:any,fn:any,args:any[]){fn(...args);},reportScriptLoadError(...args:any[]){throw Error(String(args));}};
    if(path==='fixture/handler')return (argument:string)=>events.push([argument,sandbox.global.Observed]);
    return {init(){}};
  };
  function load(path:string){ sandbox.module={exports:{}};vm.runInNewContext(readFileSync(new URL(path,root),'utf8'),sandbox);return sandbox.module.exports; }
  load('init/globalScript.js')();
  load('service/globalScriptMng/dataChangeEventScript/dataChangeScript.js').globalvavchange();
  const io=load('service/interface/kio_interface.js');
  for(const [V,Q] of [[0,'Good'],[4,'Good'],[4,'Good'],[6,'Bad'],[4,'Good'],[6,'Bad'],[9,'Good'],['9','Good']]) io.subCallback({N:'Tag',V,Q},[variable]);
  assert.deepEqual(events,[['Global',4],['Global',9],['Global','9']]);
});
// end
