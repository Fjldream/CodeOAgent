// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
import assert from "node:assert/strict";
import test from "node:test";
import {
  connectEnvironment,
  approvedBindings,
  confirmed,
  readReview,
  selectTarget,
  priorScope,
} from "../src/solution-script.ts";
import { Store } from "../src/store.ts";
import { canUseTool } from "../src/opencode.ts";
const ctx = (kind, projectId) => ({
  kind,
  projectId,
  object: "",
  dirty: false,
});
const flow = {
  projects: [
    ctx("collection", "x"),
    ctx("datasource", "s"),
    ctx("calculation", "c"),
  ],
  uses: [{ sourceId: "s", point: "Tag", direction: "read" }],
};
const env: any = {
  fieldTypes:new Map(),
  sourceIds: new Map([
    ["@source:a", "s"],
    ["@source:b", "other"],
  ]),
  bindings: new Map([
    ["@source:a", { kind: "source", name: "rt" }],
    [
      "@point:1",
      {
        kind: "point",
        name: "Tag",
        sourceRef: "@source:a",
        read: true,
        write: true,
      },
    ],
    ["@function:c", { kind: "function", name: "f" }],
    ["@point:2", { kind: "point", name: "Tag", sourceRef: "@source:b" }],
  ]),
  summary: {
    bindings: [
      {
        kind: "point",
        ref: "@point:1",
        sourceRef: "@source:a",
        read: true,
        write: true,
      },
      { kind: "source", ref: "@source:a" },
      { kind: "point", ref: "@point:2", sourceRef: "@source:b" },
      { kind: "function", ref: "@function:c", signature: { arity: 2 } },
    ],
  },
};
test("按平台源身份和点名映射使用方向，跨入口消歧，目标和函数签名变化让确认作废", () => {
  const s = connectEnvironment(flow, env);
  assert.equal(
    s.bindings.find((b) => b.ref === "@point:1").observedUse[0],
    "read",
  );
  assert.ok(!s.bindings.some((b) => b.ref === "@point:2"));
  assert.equal(selectTarget(flow, ctx("collection", "x")), "c");
  assert.equal(
    selectTarget(
      { ...flow, projects: [...flow.projects, ctx("calculation", "d")] },
      ctx("collection", "x"),
    ),
    null,
  );
  assert.throws(() => selectTarget(flow, ctx("page", "other")));
  assert.throws(() => connectEnvironment({ ...flow, projects: [] }, env));
  const review = readReview({
    hosts: ["request"],
    inputs: ["@point:1"],
    outputs: [],
    functions: ["@function:c"],
    policy: "独立规则",
    missing: "",
  });
  const ck: any = {
    anchor: "a",
    phase: "review",
    target: "c",
    fingerprint: s.fingerprint,
    review,
  };
  assert.ok(confirmed("确认生成", ck, ck));
  for (const q of ["不要生成", "确认生成，但改下口径", "这个方案是什么"])
    assert.ok(!confirmed(q, ck, ck));
  assert.ok(
    !confirmed(
      "确认生成",
      { ...ck, review: { ...review, missing: "单位？" } },
      ck,
    ),
  );
  const scoped = approvedBindings(
    review,
    env,
    new Set(s.bindings.map((b) => b.ref)),
  );
  assert.equal(scoped.get("@point:1").write, false);
  assert.ok(!scoped.has("@point:2"));
  assert.throws(() =>
    approvedBindings(
      { ...review, outputs: ["@point:2"] },
      env,
      new Set(s.bindings.map((b) => b.ref)),
    ),
  );
  assert.throws(() => readReview({ ...review, hosts: ["unknown"] }));
  const changed = {
    ...env,
    summary: {
      bindings: env.summary.bindings.map((b) =>
        b.signature ? { ...b, signature: { arity: 1 } } : b,
      ),
    },
  };
  assert.ok(
    !confirmed("确认生成", ck, {
      ...ck,
      fingerprint: connectEnvironment(flow, changed).fingerprint,
    }),
  );
});
test("跨工程编写只有在当前回合取得已确认的引用后开放；原对话归属隔离", () => {
  const run: any = {
    contextKind: "collection",
    solutionState: "overview",
    tools: 1,
    observations: {},
  };
  assert.ok(canUseTool(run, "prepare_solution_script"));
  assert.ok(!canUseTool(run, "check_script_drafts"));
  run.observations.prepare_solution_script = { status: "needs-review" };
  assert.ok(canUseTool(run, "review_solution_script"));
  assert.ok(!canUseTool(run, "check_script_drafts"));
  run.observations.prepare_solution_script.status = "confirmed";
  assert.ok(canUseTool(run, "check_script_drafts"));
  const s = new Store(":memory:"),
    p = s.createPlan("A", "test");
  assert.throws(() => priorScope(s, "B", p.chatId));
  assert.equal(priorScope(s, "A", p.chatId), undefined);
});
// end
// modified by jinlong.feng at 2026-11-23 KF方案计算脚本衔接
test('完成口径后直接交付，禁止重复查配置且不消耗新模型请求',async()=>{
 const {relay}=await import('../src/opencode.ts');
 const run:any={contextKind:'calculation',tools:3,requests:5,observations:{prepare_solution_script:{status:'needs-review'},review_solution_script:{status:'clarification'}}};
 for(const k of ['lookup_calc_runtime','inspect_calc_config','inspect_calculation_io','check_script_drafts'])assert.equal(canUseTool(run,k as any),false);
 let s='';await relay(run,{}, {writeHead(){},end(v:string){s=v;}},{url:'https://unused.invalid',model:'test',key:''});
 assert.match(s,/\[\[review_solution_script\]\]/);assert.match(s,/\[DONE\]/);assert.equal(run.requests,5);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
import {reviewConstraints, reviewDiagnostics} from '../src/review-constraints.ts';
import {invokeQueryTool} from '../src/opencode.ts';
const dictionary = new Map(['Volume','Volume2','余量','A.B','$Year'].map((name,i)=>['@variable:'+i,{kind:'variable',name}]));
const requestReview={hosts:['request'],inputs:[],outputs:['@variable:1'],functions:['@function:ab'],missing:'',policy:'口径'};
test('按完整对象名跟踪写回目标，用户补口径后保留，明确改口后切换',()=>{
  const first=reviewConstraints('请求式脚本读取 Volume，写回变量 Volume2，复用已有函数。',dictionary);
  assert.deepEqual(first.outputs,['@variable:1']);assert.deepEqual(first.hosts,['request']);
  assert.deepEqual(reviewDiagnostics(requestReview,first),[]);
  const next=reviewConstraints('最低值取零。',dictionary,first);
  assert.deepEqual(next,first);
  assert.ok(reviewDiagnostics({...requestReview,outputs:['@variable:4'],missing:'单位？'},next).length);
  const changed=reviewConstraints('改成保存在「余量」。',dictionary,next);
  assert.deepEqual(changed.outputs,['@variable:2']);
  assert.ok(reviewDiagnostics(requestReview,changed).length);
  assert.deepEqual(reviewConstraints('保存在 A.B。',dictionary).outputs,['@variable:3']);
  assert.deepEqual(reviewConstraints('同时写回 Volume、Volume2',dictionary).outputs,['@variable:0','@variable:1']);
});
test('复用已有函数不新增宿主，可以明确要求同时新建函数和调用脚本',()=>{
  const c=reviewConstraints('生成请求式计算脚本，复用已启用的函数，参考已有周期性脚本。',dictionary);
  assert.deepEqual(c.hosts,['request']);assert.ok(c.reuseOnly);
  assert.ok(reviewDiagnostics({...requestReview,hosts:['request','customFunction']},c).length);
  const create=reviewConstraints('新建自定义函数，生成周期性脚本和请求式脚本。',dictionary);
  assert.deepEqual(new Set(create.hosts),new Set(['period','request','customFunction']));
  assert.deepEqual(reviewDiagnostics({...requestReview,hosts:create.hosts,functions:[]},create),[]);
});
test('错误返回匿名诊断，只在模型重新选对后完成清单',async()=>{
  const c=reviewConstraints('生成请求式脚本，写入 Volume2，调用已有函数。',dictionary);
  const run:any={tools:1,observations:{prepare_solution_script:{status:'needs-review'}},inspect:async(_n,r)=>{
    const diagnostics=reviewDiagnostics(r,c);
    return diagnostics.length?{status:'revise',diagnostics}:{status:'awaiting-confirmation'};
  }};
  const wrong=await invokeQueryTool(run,'review_solution_script',{...requestReview,outputs:['@variable:4'],hosts:['request','customFunction']} as any);
  assert.equal(wrong.status,'revise');assert.match(wrong.diagnostics.join(' '),/@variable:1/);
  assert.doesNotMatch(JSON.stringify(wrong),/Volume|\$Year/);
  assert.equal(canUseTool(run,'check_script_drafts'),false);
  const corrected=await invokeQueryTool(run,'review_solution_script',requestReview as any);
  assert.equal(corrected.status,'awaiting-confirmation');assert.equal(canUseTool(run,'review_solution_script'),false);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
test('源码仅提及目标或函数不算写回和调用',async()=>{
  const {missingReviewRefs}=await import('../src/solution-script.ts');
  assert.deepEqual(missingReviewRefs([{code:'global["@variable:1"] = await global["@function:ab"](2);'}],requestReview),[]);
  assert.deepEqual(missingReviewRefs([{code:'const a = global["@variable:1"]; const f = global["@function:ab"];'}],requestReview),['@variable:1','@function:ab']);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
test('点名的目标不存在时允许追问，禁止任意替换后确认',()=>{
  const unknown=reviewConstraints('结果写回 MissingBuffer',dictionary);
  assert.ok(reviewDiagnostics(requestReview,unknown).length);
  assert.deepEqual(reviewDiagnostics({...requestReview,outputs:[],missing:'请核对缓存变量。'},unknown),[]);
  assert.deepEqual(reviewDiagnostics(requestReview,reviewConstraints('改为写回 Volume2',dictionary,unknown)),[]);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
test('同作用域的唯一引用可经别名调用和写入，重赋值别名不能充当已确认目标',async()=>{
  const {missingReviewRefs}=await import('../src/solution-script.ts');
  const code='const key="@variable:1"; const fn=global["@function:ab"]; global[key]=await fn(2);';
  assert.deepEqual(missingReviewRefs([{code}],requestReview),[]);
  assert.deepEqual(missingReviewRefs([{code:'let key="@variable:1"; key="@variable:2"; global[key]=await global["@function:ab"](2);'}],requestReview),['@variable:1']);
});
test('请求脚本误交匿名函数壳时报告可操作的宿主诊断',async()=>{
  const {checkDraft}=await import('../src/script-authoring.ts');
  const candidate=checkDraft('request','async function(InParam,OutParam,RequestID,Token){endResponse(RequestID);}',new Map());
  assert.match(candidate.errors.join(),/L1.*移除最外层函数声明/);
});
// end
// modified by jinlong.feng at 2026-11-23 KF计算需求变更
test('已交付任务可从关联入口改口；旧确认不能授权修订版',async()=>{
  const {amendmentDiagnostics,isAmendment,reviewText}=await import('../src/solution-script.ts');
  const before={...requestReview,outputs:['@variable:0'],policy:'上限取整'};
  const prior={phase:'delivered',review:before,fingerprint:'old',anchor:'a',target:'p'};
  const revised={...requestReview,retained:'沿用输入与回包',retired:'旧的取整规则',policy:'新规则'};
  assert.ok(isAmendment('改一下计算口径'));
  assert.equal(selectTarget(flow,ctx('collection','x'),prior as any,true),'p');
  assert.equal(confirmed('确认生成',prior as any,prior as any),false);
  const info={base:before,baseRun:'one'};
  assert.ok(amendmentDiagnostics(requestReview,info).length);
  assert.deepEqual(amendmentDiagnostics(revised,info),[]);
  const text=reviewText(revised,{bindings:new Map([...dictionary,['@function:ab',{name:'计算函数'}]])} as any,info);
  for(const expected of ['沿用输入与回包','旧的取整规则','停止写入：Volume','改为写入：Volume2','当前有效口径'])assert.ok(text.includes(expected));
  assert.deepEqual(reviewConstraints('写回目标从 Volume 改为 Volume2，其他沿用。',dictionary,reviewConstraints('写回 Volume',dictionary)).outputs,['@variable:1']);
});
test('修订版禁止额外写回未确认的旧变量，包括直接实名和全局对象别名',async()=>{
  const {missingReviewRefs}=await import('../src/solution-script.ts');
  const correct='global["@variable:1"]=await global["@function:ab"](1);';
  for(const old of ['global.Volume=3;','global["Volume"]=2;','const g=global;g.Volume=0;']){
    assert.ok(missingReviewRefs([{code:correct+old}],requestReview,true).length);
  }
  assert.deepEqual(missingReviewRefs([{code:correct}],requestReview,true),[]);
});
// end
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
test("工程定位、点的隐式连接和实际调用的连接分别核对", async () => {
  const { missingReviewRefs, reviewText } = await import("../src/solution-script.ts");
  const scope = new Set(connectEnvironment(flow, env).bindings.map(b => b.ref));
  const base = readReview({hosts:["request"],inputs:[],outputs:[],functions:[],policy:"按宿主参数计算",missing:""});
  assert.equal(approvedBindings(base, env, scope).size, 0);
  assert.doesNotMatch(reviewText(base, env), /输入：|连接：/u);
  for (const role of ["inputs", "outputs"])
    assert.throws(() => approvedBindings({...base, [role]:["@source:a"]}, env, scope), /从 inputs\/outputs 移除/);
  assert.ok(approvedBindings({...base, inputs:["@point:1"]}, env, scope).has("@source:a"));
  const direct = readReview({...base, connections:["@source:a"]});
  assert.ok(approvedBindings(direct, env, scope).has("@source:a"));
  assert.throws(() => approvedBindings({...direct, connections:["@source:b"]}, env, scope));
  assert.deepEqual(missingReviewRefs([{code:'const c="@source:a"; await SQLQuery(c,"select 1",[]);'}],direct), []);
  assert.deepEqual(missingReviewRefs([{code:'const c="@source:a";'}],direct), ["@source:a"]);
  assert.throws(() => readReview({...base, connections:["@point:1"]}));
});
test("完整确认指向待确认版本，模型的任务分类不能覆盖用户确认", async () => {
  const { scriptMode, isAmendment } = await import("../src/solution-script.ts");
  const ck = {anchor:"a", target:"b", fingerprint:"v", phase:"review", review: requestReview} as any;
  for (const q of ["确认生成完整 JS","我同意按此口径生成完整脚本！","确认生成", "确认生成完整js。"]) {
    for (const mode of ["amend","new","continue",undefined]) {
      assert.equal(scriptMode(q,mode),"continue");
      assert.equal(isAmendment(q,mode),false);
      assert.equal(confirmed(q,ck,ck),true);
    }
  }
  for (const q of ["确认生成完整 JS，但改一下目标","确认生成完整 JS？","先不要生成完整 JS"])
    assert.equal(confirmed(q,ck,ck),false);
  assert.equal(confirmed("确认生成完整 JS",{...ck,review:{...requestReview,inputs:["@source:a"]}},ck),false);
  for (const field of ["anchor","target","fingerprint"])
    assert.equal(confirmed("确认生成完整 JS",ck,{...ck,[field]:"changed"}),false);
});
// end
// modified by jinlong.feng at 2026-11-24 KF脚本引用角色与确认生成
test("确认后模型只提交原创正文，OpenCode 仅派发已开放的校验工具", async t => {
  const {relay} = await import("../src/opencode.ts");
  const draft = {drafts:[{host:"request",code:"OutParam.a = InParam.a; endResponse(RequestID);"}]};
  const sends: any[] = [];
  const frame=(delta:any)=>"data: "+JSON.stringify({choices:[{index:0,delta}]})+"\n\n";
  const stub=t.mock.method(globalThis,"fetch",async (_url:any, options:any)=>{
    const body=JSON.parse(options.body); sends.push(body);
    assert.deepEqual(body.response_format,{type:"json_object"}); assert.ok(!body.tools);
    const data=sends.length===1 ? frame({tool_calls:[{index:0,function:{name:"kf_prepare_solution_script",arguments:"{}"}}]}) :
      frame({content:JSON.stringify(draft).slice(0,12)})+frame({content:JSON.stringify(draft).slice(12)});
    return new Response(data+"data: [DONE]\n\n");
  });
  const run:any={contextKind:"collection",question:"确认生成完整 JS",solutionState:"review",history:[],
    tools:1,requests:1,observations:{prepare_solution_script:{status:"confirmed",previousReview:requestReview}}};
  let written="";
  await relay(run,{tools:[{function:{name:"kf_check_script_drafts"}}]},
    {writeHead(){},end(v:string){written=v;}},{url:"http://localhost/test",key:"",model:"test"});
  const first=JSON.parse(written.split("\n")[0].slice(6)).choices[0].delta.tool_calls[0];
  assert.equal(first.function.name,"kf_check_script_drafts"); assert.deepEqual(JSON.parse(first.function.arguments),draft);
  assert.equal(stub.mock.callCount(),2);
});
// end
// modified by jinlong.feng at 2026-11-24 KF确认引用与脚本写回
test("确认后的生成材料和校验只认同一批引用，切换输出会排除旧变量及定位连接", async () => {
  const {confirmedScriptScope,missingReviewRefs} = await import("../src/solution-script.ts");
  const {checkDraft} = await import("../src/script-authoring.ts");
  const memory = {kind:"variable",name:"PrivateMemory"};
  const extended = {...env, bindings:new Map([...env.bindings, ["@variable:a",memory],["@variable:b",{...memory,name:"PrivateOld"}]]),
    summary:{...env.summary,bindings:[...env.summary.bindings,{ref:"@variable:a",kind:"variable"},{ref:"@variable:b",kind:"variable"}],
      registered:{kio:["KIOUpdateDatas","KIOQueryDatas"],global:["Trace"]}, hosts:{request:"request host",period:"period host"}}};
  const scope=connectEnvironment(flow,extended);
  const review={...requestReview,outputs:["@variable:a"],functions:[]};
  const confirmed=confirmedScriptScope(review,extended,scope);
  assert.deepEqual([...confirmed.bindings.keys()],["@variable:a"]);
  assert.deepEqual(confirmed.material.bindings.map(b=>b.ref),[...confirmed.bindings.keys()]);
  assert.doesNotMatch(JSON.stringify(confirmed.material),/PrivateOld|PrivateMemory|@source:|KIOUpdateDatas|@variable:b/);
  const wrong='await KIOUpdateDatas("@source:a",[{N:"@variable:a",V:7}],[]);endResponse(RequestID);';
  assert.match(checkDraft("request",wrong,confirmed.bindings).errors.join(),/global\["@variable:a"\] = 计算值/);
  const fixed='global["@variable:a"]=7;endResponse(RequestID);';
  assert.deepEqual(checkDraft("request",fixed,confirmed.bindings).errors,[]);
  const pointReview={...review,outputs:["@point:1"]};
  // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  const revised = confirmedScriptScope({...review,retained:'所有输入仍需满足此前的类型校验',retired:'旧版口径'},extended,scope);
  assert.equal(revised.material.previousReview.retained,'所有输入仍需满足此前的类型校验');
  assert.ok(!Object.hasOwn(revised.material.previousReview,'retired'));
  assert.deepEqual(revised.material.bindings,confirmed.material.bindings);
  // end
  const point=confirmedScriptScope(pointReview,extended,scope);
  assert.equal(point.bindings.get("@point:1")?.read,false);
  assert.ok(point.bindings.has("@source:a"));
  assert.match(checkDraft("request",'global["@point:1"]=2;endResponse(RequestID);',point.bindings).errors.join(),/KIOUpdateDatas/);
  assert.deepEqual(missingReviewRefs([{code:'const unused="@point:1";'}],pointReview),["@point:1"]);
  const write='await KIOUpdateDatas("@source:a",[{N:"@point:1",V:2}],[]);endResponse(RequestID);';
  assert.deepEqual(checkDraft("request",write,point.bindings).errors,[]);
  assert.deepEqual(missingReviewRefs([{code:write}],pointReview),[]);
});
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
test('方案确认后带入有权历史源和指定纯函数的用法，排除定位或无权连接', async () => {
  const {scriptEnvironment} = await import('../src/script-authoring.ts');
  const {confirmedScriptScope} = await import('../src/solution-script.ts');
  const sources = [
    {guid:'history', name:'PrivateHistory', type:'工业数据源_网络模式', config:{newWorkDateType:'KHFDBServer'}},
    {guid:'sql', name:'PrivateSql', type:'PostgreSQL', config:{}},
    {guid:'denied', name:'PrivateRedis', type:'Redis', config:{}},
  ];
  const reader = {
    require: async () => {},
    allowed: async (_token, context) => context.projectId !== 'denied',
    call: async (_token, path, args) => {
      if (path === '/dataSource/getAllDataSource') return sources;
      if (path === '/collect/getVarsProperty') return {TagDataType:{editor:{options:{data:[]}}}};
      if (path === '/calculation/projectJsonData') return args.type === 'dataAccess' ? sources.map(source => ({
        name: source.name + 'Alias', connectName: source.name, type: source.type,
      })) : [];
      throw Error(path);
    },
  };
  const historyEnv = await scriptEnvironment(reader, 'token', ctx('calculation', 'c'));
  const historyRef = historyEnv.summary.bindings.find(item => item.connectionFamily === 'kh')!.ref;
  assert.ok(historyEnv.connectionContracts.includes('KHQuerySampleDatas2'));
  assert.ok(!historyEnv.connectionContracts.includes('redisExists'));
  const historyScope = connectEnvironment({projects:[ctx('datasource','history'),ctx('datasource','sql')],uses:[]}, historyEnv);
  const approved = confirmedScriptScope({...requestReview, inputs:[], outputs:[], functions:[],
    connections:[historyRef], policy:'用 KHQuerySampleDatas2 采样，结果用 Round 保留两位小数。'}, historyEnv, historyScope);
  assert.deepEqual([...approved.bindings.keys()], [historyRef]);
  assert.ok(approved.material.cards.some(card => card.symbol === 'KHQuerySampleDatas2' && card.verification?.status === 'source-only'));
  assert.ok(approved.material.cards.some(card => card.symbol === 'Round'));
  assert.doesNotMatch(JSON.stringify(approved.material), /PrivateHistory|PrivateSql|PrivateRedis|SQLQuery|redisExists/);
});
// end
test("模型自修轮只收到已确认材料和原稿诊断，历史工程不会重新进入生成", async t=>{
  const {relay}=await import("../src/opencode.ts");
  const draft={drafts:[{host:"request",code:'global["@variable:1"]=1;endResponse(RequestID);'}]};
  const correction={status:"revise",drafts:[{host:"request",code:"wrong();"}],diagnostics:[{errors:["改用 global 写入"]}]};
  const confirmed={status:"confirmed",previousReview:requestReview,bindings:[{ref:"@variable:1",kind:"variable"}]};
  const run:any={history:[{role:"user",content:"OLD_PROJECT_SECRET"}],contextKind:"collection",solutionState:"review",question:"确认生成完整 JS",
    tools:2,requests:2,observations:{prepare_solution_script:confirmed,check_script_drafts:correction}};
  t.mock.method(globalThis,"fetch",async (_url,options)=>{
    const sent=JSON.parse(options!.body as string);
    assert.equal(sent.messages.length,2);
    assert.deepEqual(JSON.parse(sent.messages[1].content),{confirmed,correction});
    assert.doesNotMatch(JSON.stringify(sent.messages),/OLD_PROJECT_SECRET/);
    return new Response("data: "+JSON.stringify({choices:[{delta:{content:JSON.stringify(draft)}}]})+"\n\ndata: [DONE]\n\n");
  });
  let output="";
  await relay(run,{tools:[{function:{name:"kf_check_script_drafts"}}]},{writeHead(){},end(v){output=v;}},{key:"",model:"test",url:"http://localhost/test"});
  const call=JSON.parse(output.split("\n")[0].slice(6)).choices[0].delta.tool_calls[0];
  assert.deepEqual(JSON.parse(call.function.arguments),draft);
});
// end
// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
test("初版在显示待确认问题前用绑定事实复核，业务选择与未定位的引用保留",async()=>{
  const {recheckClarification}=await import("../src/solution-script.ts");
  const bindings=new Map(env.bindings);bindings.set("@variable:a",{kind:"variable",name:"testMemory"});
  const scope=connectEnvironment(flow,{...env,bindings,summary:{bindings:[...env.summary.bindings,{kind:"variable",ref:"@variable:a"}]}});
  const base=readReview({hosts:["request"],inputs:[],outputs:["@variable:a"],functions:[],policy:"按确认字段回包",missing:"如何写入？",missingBasis:"projectFact"});
  const reply=recheckClarification(base,scope,false);
  assert.match(reply.diagnostics.join(),/global\["@variable:a"\] = 计算值/);
  assert.match(reply.diagnostics.join(),/OutParam/);
  // modified by jinlong.feng at 2026-11-24 KF确认口径执行校验
  assert.match(reply.diagnostics.join(),/没有独立的写入返回码/);
  // end
  assert.doesNotMatch(JSON.stringify(reply),/testMemory|@point:1/);
  assert.equal(recheckClarification(base,scope,true)?.status,"revise");
  for(const missingBasis of ["business","unresolvedReference"]) {
    // modified by jinlong.feng at 2026-11-24 KF业务公式独立执行
    const review={...base,missing:"统计范围？",missingBasis,decisionOptions:["累计所有班次","仅累计当班"]};
    if(missingBasis==="business")assert.ok(recheckClarification({...review,decisionOptions:undefined},scope,true));
    // end
    assert.ok(recheckClarification(review,scope,false));
    assert.equal(recheckClarification(review,scope,true),undefined);
    const checkpoint={phase:"review",review,anchor:"a",target:"t",fingerprint:"1"} as any;
    assert.equal(confirmed("确认生成完整 JS",checkpoint,checkpoint),false);
  }
  const ready={...base,missing:""};assert.equal(recheckClarification(ready,scope,false),undefined);
  const ck={phase:"review",review:ready,anchor:"a",target:"t",fingerprint:"1"} as any;
  assert.equal(confirmed("确认生成完整 JS",ck,ck),true);
});
 // end

// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
import {reviewNameDiagnostics, reviewText as renderLocalReview} from '../src/solution-script.ts';
test('确认、追问与变更的自然语言字段均展开有权名称，未知引用须重新核对', () => {
  const current = {bindings:new Map([['@variable:b',{name:'新目标'}],['@variable:a',{name:'旧目标'}]])};
  const review=readReview({hosts:['request'],inputs:[],outputs:['@variable:b'],functions:[],policy:'写 @variable:b',
    retained:'保留 @variable:b',retired:'停写 @variable:a',missing:'核对 @variable:b 的业务含义'});
  const rendered=renderLocalReview(review,current as any,{baseRun:'x',base:{...review,outputs:['@variable:a']}});
  assert.ok(rendered.includes('写 新目标') && rendered.includes('停写 旧目标') && rendered.includes('核对 新目标'));
  assert.ok(!rendered.includes('@variable:'));
  assert.equal(reviewNameDiagnostics(review,new Set(current.bindings.keys())).length,0);
  assert.equal(reviewNameDiagnostics(review,new Set(['@variable:b'])).length,1);
});
// end
