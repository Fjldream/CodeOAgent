// modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {draftQuery,checkSubmission,bindDraftFunctions} from '../src/script-authoring.ts';
import {returnContract} from '../src/custom-functions.ts';

const definitions=[{host:'customFunction',definition:{functionName:'Evaluate',parameters:['left','right']},code:'return left-right;'}];
const existing=new Map<string,any>([['@function:old',{kind:'function',name:'Previous',parameters:['x']}]]);
test('新函数先绑定再核对两类调用方，保留参数顺序、零值和签名',()=>{
  const drafts=draftQuery({drafts:[{host:'request',code:'OutParam.v=await global["@function:new"](InParam.x,0);endResponse(RequestID);'},
    {host:'period',code:'const x=await global["@function:old"](0); return await global["@function:new"](x,1);'},...definitions]}).drafts;
  const bound=bindDraftFunctions(drafts,existing,new Set(['Previous']));
  for (const d of drafts) assert.deepEqual(checkSubmission(d,bound).errors,[]);
  assert.match(checkSubmission(drafts[0],bound).code!,/global\["Evaluate"\]/);
  assert.throws(()=>bindDraftFunctions(drafts,existing,new Set(['Evaluate'])));
  assert.throws(()=>draftQuery({drafts:[{...definitions[0],definition:{functionName:'Eval ok',parameters:[]}}]}));
});
test('未登记形参、失效函数、漏等异步及错误实参数量返回诊断',()=>{
  const [d]=draftQuery({drafts:definitions}).drafts;
  assert.ok(checkSubmission({...d,code:'return lft-right;'},existing).errors.some(e=>e.includes('lft')));
  for(const code of ['const x=global["@function:old"](2);','await global["@function:old"]();','await global["@function:gone"](2);'])
    assert.ok(checkSubmission({host:'period',code},existing).errors.length);
  assert.deepEqual(returnContract('return total - used;',['used','total']),{returns:'binary operation',operation:'-',positions:[2,1]});
  assert.deepEqual(returnContract('return Math.abs(amount);',['amount']),{returns:'math operation',operation:'Math.abs',positions:[1]});
  assert.deepEqual(returnContract('function inner(){return 2;};',[]),{returns:'undefined'});
  assert.deepEqual(returnContract('return "私有值";',[]),{returns:'需核对返回约定'});
});
test('节点模块按 functionName 注册，按位置传值，调用方等到真实异步返回',async()=>{
  const path=new URL('../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/service/globalScriptMng/customFunction/customFunction.js',import.meta.url);
  const func=async(a:number,b:number)=>a-b;
  const sandbox:any={module:{},__dir:'',global:{execProjectPath:'fixture'},customFuncdata:{functions:[{name:'显示名',functionName:'Callable',file:'file.js',expression:'Callable(a,b)'}]},
    require:(p:string)=>p.endsWith('/core/utils')?{fileUtil:{syncReadFile:()=>''}}:p.endsWith('scriptGuard.js')?{SCRIPT_TYPE:{},reportScriptLoadError:()=>assert.fail()}:func};
  vm.runInNewContext(readFileSync(path,'utf8'),sandbox);sandbox.module.exports.init();
  assert.equal(sandbox.global.Callable,func);assert.equal(sandbox.global['显示名'],undefined);
  assert.equal(await sandbox.global.Callable(0,3),-3);
});
// end
