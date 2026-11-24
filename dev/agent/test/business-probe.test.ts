// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBusinessExpectations,planBusinessProbe,readBusinessPlan,runBusinessProbe} from '../src/business-probe.ts';

const ref='@variable:abc';
const roles=[{ref,kind:'variable',write:true}];
const names=new Map([[ref,{name:'Result'}]]);
const rules={bindings:roles,previousReview:{policy:'正数两倍',retained:'零输出零，负数停写'}};
const samples=[2,0,-1].map((n,i)=>({kind:['normal','boundary','invalid'][i],covers:[i?'retained1':'policy1'],
  input:{n},initial:{[ref]:0},response:{v:n<0?null:2*n},writes:n<0?[]:[{ref,value:n*2}]}));
const plan=readBusinessPlan('request',rules,{samples});
const code='const n=InParam.n;OutParam.v=n<0?null:2*n;if(n>=0)global.Result=2*n;endResponse(RequestID);';
test('确认后固定独立预期，检测错误回包、同值重复写、异常覆盖的缓存和多次结束响应',async()=>{
  for(const body of [code.replace('2*n','n'),code.replace('global.Result=2*n','global.Result=global.Result=2*n'),
    code.replace('if(n>=0)','if(true)'),code+'endResponse(RequestID);',code.replace('endResponse(RequestID);',''),
    code.replace('endResponse(RequestID);','endResponse(789);'),code.replace('global.Result=2*n','global.Other=2*n')]){
    assert.ok((await runBusinessProbe(plan,body,roles,names)).length>0);
  }
  assert.deepEqual(await runBusinessProbe(plan,code,roles,names),[]);
});
test('缺条款、缺异常类、重复条件或未授权写入不构成验证',()=>{
  for(const v of [samples.slice(0,2),samples.map(s=>({...s,covers:['policy1']})),
    [samples[0],samples[1],{...samples[1],kind:'invalid'}],samples.map(s=>({...s,writes:[{ref:'other',value:1}]}))]){
    assert.throws(()=>readBusinessPlan('request',rules,{samples:v}));
  }
});
test('请求回包按结束瞬间快照，周期读写通过隔离的点样本',async()=>{
  assert.deepEqual(await runBusinessProbe(plan,code+'OutParam.v=88;',roles,names),[]);
  const point='@point:a',source='@source:s';
  const bindings=[...roles,{ref:point,sourceRef:source,kind:'point',read:true},{ref:source,kind:'source'}];
  const per=readBusinessPlan('period',{...rules,bindings},{samples:samples.map(s=>({...s,
    input:{},initial:{[point]:{Q:s.input.n<0?0:192,V:s.input.n,T:1}},response:null}))});
  assert.deepEqual(await runBusinessProbe(per,'const a=[];await KIOQueryDatas("S",["P"],a);if(a[0].Q)global.Result=2*a[0].V;',bindings,
    new Map([...names,[point,{name:'P'}],[source,{name:'S'}]])),[]);
});
// end

// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
test('按宿主形参核对样本，拒绝凭空加的传输外壳，允许业务明确声明的同名字段',()=>{
  const requirements={...rules,previousReview:{policy:'读 InParam.n，回 OutParam.v',retained:'保持异常处理'}};
  for (const change of [{input:{InParam:{n:2}}},{response:{OutParam:{v:4}}},{response:{v:4,RequestID:1}},{response:{wrong:4}}]){
    assert.throws(()=>readBusinessPlan('request',requirements,{samples:[{...samples[0],...change},...samples.slice(1)]}));
  }
  const explicit={...rules,previousReview:{policy:'读 InParam.Token，回 OutParam["RequestID"]',retained:'保持异常处理'}};
  assert.ok(readBusinessPlan('request',explicit,{samples:samples.map((s,i)=>({...s,input:{Token:i},response:{RequestID:i}}))}));
});
// end

// modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
test('同一输入分别测正常与显式写异常，只有实际执行过故障操作才通过',async()=>{
  const fault={operation:'variableWriteThrows',ref};
  const rows=[...samples,{...samples[0],kind:'invalid',fault,response:{v:null},writes:[]}];
  const checked=readBusinessPlan('request',rules,{samples:rows});
  const script='const n=InParam.n;try{if(n>=0)global.Result=2*n;OutParam.v=n<0?null:2*n;}catch{OutParam.v=null;}endResponse(RequestID);';
  assert.deepEqual(await runBusinessProbe(checked,script,roles,names),[]);
  const skipped=await runBusinessProbe(checked,'OutParam.v=null;endResponse(RequestID);',roles,names);
  assert.ok(skipped.some(s=>s.includes('没有执行样本指定的写入故障分支')));
  assert.throws(()=>readBusinessPlan('request',rules,{samples:[...samples,{...rows[3],fault:{...fault,ref:'other'}}]}));
});
// end
// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
const options={url:'https://mock.invalid',model:'mock',key:'mock'};
const formula='const x=input.n;if(x<0)return {response:{v:null},writes:[]};const v=x+x;return {response:{v},writes:[{ref:bindings[0].ref,value:v}]};';
test('独立执行两份参考公式，样本设计中的任意数字不能决定预期',async(t)=>{
  const prompts=[];
  t.mock.method(globalThis,'fetch',async(_url,req)=>{
    const [system,user]=JSON.parse(req.body).messages;prompts.push(system.content);
    assert.deepEqual(Object.keys(JSON.parse(user.content)).sort(),['bindings','clauses','host']);
    const value=prompts.length===1?{samples:samples.map(s=>({...s,response:{v:777}}))}:
      {body:prompts.length===2?formula:formula.replace('x+x','2*x')};
    return Response.json({choices:[{message:{content:JSON.stringify(value)}}]});
  });
  let audit;
  const sealed=await planBusinessProbe('request',rules,options,new AbortController().signal,(_,r)=>{audit=r;});
  assert.deepEqual(sealed.samples,plan.samples);assert.equal(audit.formulae.length,2);
  const wrong=await runBusinessProbe(sealed,code.replace('2*n','n'),roles,names);
  assert.ok(wrong[0].includes('输入')&&wrong[0].includes('预期')&&wrong[0].includes('实际'));
  assert.deepEqual(await runBusinessProbe(sealed,code,roles,names),[]);
  assert.equal(prompts.length,3);
});
test('参考公式语义冲突时保留输入和双方执行值，阻止候选交付',async(t)=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{
    calls++;
    const result=calls===1?{samples}:{body:calls%2===0?formula:formula.replace('x+x','x*x+3')};
    return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
  });
  await assert.rejects(planBusinessProbe('request',rules,options,new AbortController().signal),/样本 1.*输入.*公式一.*4.*公式二.*7/);
});
test('拒绝非 JSON 样本并反馈，独立参考公式执行出错后自行重交',async(t)=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(_url,req)=>{
    calls++;const system=JSON.parse(req.body).messages[0].content;
    if(calls===2)assert.ok(system.includes('禁止裸 NaN'));
    if(calls===4){const data=JSON.parse(JSON.parse(req.body).messages[1].content);assert.match(data.repair.diagnostic,/样本 1/);assert.equal(data.repair.previousBody,'throw Error()');}
    const content=calls===1?'{"samples":[NaN]}':JSON.stringify(calls===2?{samples}:{body:calls===3?'throw Error()':formula});
    return Response.json({choices:[{message:{content}}]});
  });
  const sealed=await planBusinessProbe('request',rules,options,new AbortController().signal);
  assert.equal(calls,5);assert.deepEqual(sealed.samples,plan.samples);
});
// end

// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
test('参考程序不能修改输入或绑定，也不能将已抛错的写入列为成功',async(t)=>{
  const input={samples:[...samples,{...samples[0],kind:'invalid',fault:{operation:'variableWriteThrows',ref}}]};
  const fixed='if(fault)return {response:{v:null},writes:[]};'+formula;
  let requests=0;
  t.mock.method(globalThis,'fetch',async(_url,req)=>{
    const data=JSON.parse(JSON.parse(req.body).messages[1].content);
    requests++;
    if(requests===3){assert.match(data.repair.diagnostic,/只读/);assert.ok(data.repair.previousBody.includes('input.n='));}
    if(requests===4)assert.match(data.repair.diagnostic,/预期成功写入次数为 0/);
    const result=requests===1?input:{body:requests===2?'input.n=1;'+formula:requests===3?formula:fixed};
    return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
  });
  const sealed=await planBusinessProbe('request',rules,options,new AbortController().signal);
  assert.deepEqual(sealed.samples.at(-1).writes,[]);assert.equal(requests,5);
});
test('两份参考公式发生分歧时，各自仅获得本人的程序和运行结果，保持原条件重交',async(t)=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(_url,req)=>{
    calls++;const data=JSON.parse(JSON.parse(req.body).messages[1].content);
    const other=formula.replace('x+x','3*x');
    if(calls===4){assert.equal(data.repair.previousBody,formula);assert.ok(!data.repair.diagnostic.includes('"v":6'));}
    if(calls===5){assert.equal(data.repair.previousBody,other);assert.ok(!data.repair.diagnostic.includes('"v":4'));}
    return Response.json({choices:[{message:{content:JSON.stringify(calls===1?{samples}:{body:calls===3?other:formula})}}]});
  });
  const sealed=await planBusinessProbe('request',rules,options,new AbortController().signal);
  assert.deepEqual(sealed.samples,plan.samples);assert.equal(calls,5);
});
// end

// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
test('独立公式宿主观察成功赋值和抛错；同值重复写入保留次数',async(t)=>{
  const cases={samples:[...samples,{...samples[0],kind:'invalid',fault:{operation:'variableWriteThrows',ref}}]};
  const body='const v=input.n*2;if(v<0)return {response:{v:null}};try{const t=bindings.find(b=>b.canWrite);t.write(v);t.write(v);return {response:{v}};}catch{return {response:{v:null}};}';
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>Response.json({choices:[{message:{content:JSON.stringify(++calls===1?cases:{body})}}]}));
  const sealed=await planBusinessProbe('request',rules,options,new AbortController().signal);
  assert.deepEqual(sealed.samples[0].writes,[{ref,value:4},{ref,value:4}]);
  assert.deepEqual(sealed.samples.at(-1).writes,[]);assert.deepEqual(sealed.samples.at(-1).response,{v:null});
});
// end

// modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
test('参考公式的业务入参与确认清单同形；多读外壳会得到读取路径诊断，业务同名字段仍可使用',async(t)=>{
  const requirements={bindings:roles,previousReview:{policy:'取 InParam.n 双倍',retained:'负数停写'}};
  let calls=0;let nested=false;
  t.mock.method(globalThis,'fetch',async(_url,req)=>{
    calls++;
    const [system,user]=JSON.parse(req.body).messages;
    const data=JSON.parse(user.content);
    if(calls===3&&!nested)assert.match(data.repair.diagnostic,/多读了一层 input.InParam/);
    if(system.content.startsWith('你是 KF 业务公式')){
      assert.equal(data.bindings[0].canWrite,true);assert.ok(!Object.hasOwn(data.bindings[0],'write'));
    }
    const body=nested||calls===2?formula.replace('input.n','input.InParam?.n'):formula.replace('input.n','InParam.n');
    const fixtures=nested?samples.map(s=>({...s,input:{InParam:s.input}})):samples;
    return Response.json({choices:[{message:{content:JSON.stringify(calls===1?{samples:fixtures}:{body})}}]});
  });
  const sealed=await planBusinessProbe('request',requirements,options,new AbortController().signal);
  assert.deepEqual(sealed.samples,plan.samples);
  nested=true;calls=0;
  const result=await planBusinessProbe('request',{...requirements,previousReview:{policy:'取业务属性 InParam.InParam',retained:'负数停写'}},options,new AbortController().signal);
  assert.deepEqual(result.samples[0].response,{v:4});
});
// end
