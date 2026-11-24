// modified by jinlong.feng at 2026-11-23 KF计算工程数据源选择
import test from 'node:test';
import assert from 'node:assert/strict';
import {Center} from '../src/center.ts';
import {projection} from '../src/opencode.ts';
import {readCalcQuery} from '../src/calc-config.ts';

const context = {kind:'calculation' as const, projectId:'calc', dirty:false, object:'',calcMenu:'calculate-data-source-management'};
function fixture(revoke=false) {
  const center = Object.create(Center.prototype) as Center;
  const aliases = [{name:'Alias',connectName:'Existing',type:'T'}];
  const rows = ['Free','Existing','Hidden','Ambiguous','Ambiguous'].map((name,i)=>({name,guid:'p'+i,type:'T',config:{password:'PRIVATE'}}));
  let checks=0;
  center.require = async () => {};
  center.call = async (_,path,query,body:any) => {
    if(path==='/calculation/projectJsonData') return aliases;
    if(path==='/dataSource/getAllDataSource') return rows;
    assert.equal(path,'/project/permissions');
    checks++;
    return {items:body.projects.map((p:any)=>({...p,hasProjectPermission:p.projectId!=='p2' && !(revoke && checks>1)}))};
  };
  return {center,aliases,rows};
}
test('有权平台源区分可选、已关联与名称歧义；实名仅进入本地证据',async()=>{
  const {center}=fixture();
  const ids:string[]=[];
  const e=await center.calcConfiguration('ordinary',context,readCalcQuery({sourceChoices:true}),d=>ids.push(d.projectId));
  assert.deepEqual(e.facts.map(f=>f.label),['可选','已关联','需核对','需核对']);
  assert.deepEqual(ids,['p0','p1','p3','p4']);
  assert.doesNotMatch(JSON.stringify(e),/Hidden|PRIVATE/);
  assert.doesNotMatch(JSON.stringify(projection(e)),/Existing|Alias|Free|Hidden|PRIVATE/);
  assert.equal(e.calcConfig?.runtimeVerified,false);
  const same=await center.calcConfiguration('ordinary',context,{sourceChoices:true,exactName:'Alias'});
  assert.deepEqual(same.facts,[e.facts[1]]);
});
test('空工程、精确名称超出首屏、类型漂移、撤权与非法入口',async()=>{
  const {center,aliases,rows}=fixture();
  aliases[0].type='Old';
  const changed=await center.calcConfiguration('ordinary',context,{sourceChoices:true,exactName:'Existing'});
  assert.equal(changed.facts[0].label,'需核对');
  aliases.length=0;
  for(let i=0;i<55;i++) rows.push({name:'N'+i,guid:'new'+i,type:'T',config:{password:'PRIVATE'}});
  const all=await center.calcConfiguration('ordinary',context,{sourceChoices:true});
  assert.equal(all.facts.length,24);
  const exact=await center.calcConfiguration('ordinary',context,{sourceChoices:true,exactName:'N54'});
  assert.equal(exact.facts[0].label,'可选');
  await assert.rejects(fixture(true).center.calcConfiguration('ordinary',context,{sourceChoices:true}),/权限已变更/);
  await assert.rejects(center.calcConfiguration('ordinary',context,{sourceChoices:true,section:'periods'}),/仅适用/);
  await assert.rejects(center.calcConfiguration('ordinary',{...context,kind:'client'},{sourceChoices:true}),/计算工程/);
});
// end
