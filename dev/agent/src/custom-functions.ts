// modified by jinlong.feng at 2026-11-23 KF自定义函数生成与调用验收
import {parse} from 'acorn';
import {analyze} from 'eslint-scope';
import {HttpError} from './shared.ts';

const invalid=(message:string)=>new HttpError(400,message);
export type Definition={functionName:string;parameters:string[]};
export const definitionSchema={
  type:'object',additionalProperties:false,required:['functionName','parameters'],
  properties:{functionName:{type:'string',description:'新增函数的可调用名（建议标识符），与已有全局对象不能同名。'},
    parameters:{type:'array',items:{type:'string'},description:'有序形参名；无参填 []。'}},
};
export function functionDefinition(host:string,raw:any):Definition|undefined {
  if(host!=='customFunction') {
    if(raw!==undefined) throw invalid('仅新增自定义函数时提供 definition。');
    return;
  }
  if(!raw || typeof raw.functionName!=='string' || !/^[\p{L}_][\p{L}\p{N}_]{0,63}$/u.test(raw.functionName) ||
     !Array.isArray(raw.parameters) || !raw.parameters.every((n:any)=>typeof n==='string' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n)) ||
     new Set(raw.parameters).size!==raw.parameters.length) throw invalid('新增函数需提供 definition.functionName 和不重复的有序 definition.parameters。');
  try {parse('(async function '+raw.functionName+'('+raw.parameters.join(',')+'){"use strict";})',{ecmaVersion:'latest'});}
  catch {throw invalid('函数名或形参不是合法的 JS 标识符，或与严格模式保留字冲突。');}
  if(raw.parameters.some((n:string)=>['global','InParam','OutParam','RequestID','Token','endResponse'].includes(n)))
    throw invalid('请避免用宿主注入名称作为形参。');
  return {functionName:raw.functionName,parameters:raw.parameters};
}

// Expose positions and a bounded structural summary. Comments, code, names and literal values stay local.
export function returnContract(code:string,params:string[]) {
  try {
    const ast:any=parse('(async function('+params.join(',')+'){\n'+code+'\n})',{ecmaVersion:'latest'});
    const body=ast.body[0].expression.body.body;
    const hasValueReturn=(node:any):boolean=>{
      if(!node || typeof node!=='object' || /Function|Class/.test(node.type??'')) return false;
      if(node.type==='ReturnStatement') return node.argument!=null;
      return Object.values(node).some(value=>hasValueReturn(value));
    };
    if(!hasValueReturn(body)) return {returns:'undefined'};
    if(body.length===1 && body[0].type==='ReturnStatement'){
      const arg=body[0].argument, position=(node:any)=>node?.type==='Identifier'?params.indexOf(node.name)+1:0;
      if(!arg)return {returns:'undefined'};
      if(position(arg))return {returns:'argument',positions:[position(arg)]};
      if(arg.type==='BinaryExpression' && [arg.left,arg.right].every(position))
        return {returns:'binary operation',operation:arg.operator,positions:[position(arg.left),position(arg.right)]};
      if(arg.type==='CallExpression' && arg.callee.object?.name==='Math' && !arg.callee.computed &&
         ['abs','round','floor','ceil','min','max','trunc','hypot'].includes(arg.callee.property.name) && arg.arguments.every(position))
        return {returns:'math operation',operation:'Math.'+arg.callee.property.name,positions:arg.arguments.map(position)};
    }
  } catch { /* Other saved signatures or bodies require a developer-confirmed contract. */ }
  return {returns:'需核对返回约定'};
}

export function formalDiagnostics(d:Definition,code:string,known:(name:string)=>boolean) {
  try {
    const ast:any=parse('(async function('+d.parameters.join(',')+'){\n'+code+'\n})',{ecmaVersion:'latest',ranges:true,locations:true});
    const scopes=analyze(ast,{ecmaVersion:2024,sourceType:'script',fallback:'iteration',impliedStrict:true});
    return [...new Set(scopes.globalScope.through.filter((ref:any)=>!known(ref.identifier.name))
      .map((ref:any)=>'L'+(ref.identifier.loc.start.line-1)+' '+ref.identifier.name+' 未在函数签名、局部作用域或 KF 宿主中声明。请核对有序形参。'))];
  } catch {return ['请检查函数形参与正文中的重复声明或语法错误。'];}
}
// end
