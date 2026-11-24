// modified by jinlong.feng at 2026-11-23 KF周期脚本日历调度
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {calcConfig, readCalcQuery} from '../src/calc-config.ts';
import {calendarReport} from '../src/calendar.ts';
const base = {name:'X', GUID:'p', pattern:'day', triggerTime:'10:05:00', startTime:'2024-01-01T00:00:00Z', endTime:'', whetherenable:'是', periodType:'calendar'};
function report(extra, date='2026-11-23') { return calendarReport({...base,...extra}, date, '+08:00').join('\n'); }
test('四种模式对照节点原生日期判定，跨平闰月、周日和年度末周', () => {
  const path = '../../../kf-reference/KingFusion3.6_Node/kingexedb/kingcalculation/exe/lib/service/globalScriptMng/periodicScript/periodScript.js';
  const host = vm.createContext({module:{exports:{}},require:()=>({enumMsg:{}}),__dir:'',periodData:{periods:[]}});
  host.global=host;
  vm.runInContext(readFileSync(new URL(path,import.meta.url),'utf8'),host);
  const rules=[{pattern:'day'}, {pattern:'week',week:['1','3','7']}];
  for(const pattern of ['month','year']){
    for(const day of ['1','29','31']) rules.push({pattern,[pattern]:{type:'type1',month:'2',day}});
    for(const weekIndex of ['0','1','3','4']) for(const week of ['1','6','7'])
      rules.push({pattern,[pattern]:{type:'type2',month:'2',week,weekIndex}});
  }
  for(const year of [2024,2025]) for(const month of [2,4,7]){
    for(let d=1;d<=new Date(Date.UTC(year,month,0)).getUTCDate();d++){
      const date=new Date(Date.UTC(year,month-1,d));
      Object.assign(host,{$Year:year,$Month:month,currentMonthIndex:d,currentMonthWeekIndex:Math.ceil(d/7),currentWeekIndex:date.getUTCDay(),currentDayTime:base.triggerTime});
      for(const r of rules){
        host.periodData.periods=[{...base,...r}];
        assert.equal(report(r,date.toISOString().slice(0,10)).includes('时 1 次'),host.module.exports.getPriodFlag(0));
      }
    }
  }
});
test('有效期取交集、按节点时间换算、未启用及不完整配置',()=>{
  assert.match(report({triggerTime:'10:05', startTime:'2026-11-23T03:00:00Z'}),/11:00:00.000/);
  assert.match(report({endTime:'2026-11-23T02:05:00Z'}),/10:05:00.000/);
  assert.match(report({endTime:'2026-11-23T02:04:59Z'}),/有效期外/);
  assert.match(report({startTime:'2026-11-24 00:00:00'}),/有效期外/);
  assert.match(report({whetherenable:'否'}),/未启用/);
  assert.match(calendarReport(base,'2026-11-23').join(''),/偏移待核对/);
  assert.match(report({pattern:'month',month:{type:'type2',week:'',weekIndex:'0'}}),/不完整/);
  for(const query of [{calendarDate:'2026-02-29'}, {calendarDate:'2026-11-23',nodeOffset:'+14:45'}, {nodeOffset:'+08:00'}]) assert.throws(()=>readCalcQuery(query));
});
test('当前脚本按 GUID 回读、跨工程无匹配、名称和节点时刻留在本机',async()=>{
  const ctx={kind:'period',projectId:'proj',object:'p'} as const;
  const r=await calcConfig(async()=>[base,{...base,GUID:'q',name:'other'}],ctx,readCalcQuery({calendarDate:'2026-11-23',nodeOffset:'+08:00'}));
  assert.equal(r.facts.length,1);assert.match(r.facts[0].value,/10:05:00/);assert.equal(r.summary.runtimeVerified,false);
  assert.ok(!JSON.stringify(r.summary).includes('10:05:00'));
  assert.equal((await calcConfig(async()=>[{...base,GUID:'q'}],ctx,{})).summary.total,0);
});
// end
