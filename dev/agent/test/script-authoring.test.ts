// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDraft, scriptContracts, draftQuery, authorQuery } from '../src/script-authoring.ts';
import { canUseTool, relay, type ModelRun } from '../src/opencode.ts';
const refs = new Map<string, any>([
  ['@source:a', { kind: 'source', name: 'Rt' }],
  ['@point:p', { kind: 'point', name: 'Input', sourceRef: '@source:a', read: true, write: false }],
  ['@variable:v', { kind: 'variable', name: 'Counter' }],
  ['@function:f', { kind: 'function', name: 'ApprovedFn' }],
]);
test('模型编写任意控制流，绑定只替换字符串节点，生成过程不运行正文', () => {
  const source =
    '// "@source:a"\nconst rows=[];\nconst status=await KIOQueryDatas("@source:a",["@point:p"],rows);\nif(status===0){for(const {V} of rows) global["@variable:v"]+=Number(V);}\nreturn await global["@function:f"](rows);';
  const checked = checkDraft('period', source, refs);
  assert.deepEqual(checked.errors, []);
  assert.ok(checked.code?.includes('KIOQueryDatas("Rt",["Input"],rows)'));
  // modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
  assert.ok(checked.code?.startsWith('// "Rt"'));
  // end
  assert.ok(checked.code?.includes('global["ApprovedFn"]'));
});
test('以行号诊断候选，允许模型在同轮提交修订，保留语法与宿主边界', () => {
  const invalid = checkDraft(
    'request',
    'const rows=[];\nawait KIOQueryDatas("@source:a",rows);\nendResponse();',
    refs,
  );
  assert.ok(invalid.errors.some((i) => i.startsWith('L2')));
  assert.ok(invalid.errors.some((i) => i.startsWith('L3')));
  assert.ok(!invalid.code);
  const run = {
    contextKind: 'request',
    tools: 3,
    observations: { inspect_script_environment: {}, check_script_drafts: { status: 'revise' } },
  } as unknown as ModelRun;
  assert.ok(canUseTool(run, 'check_script_drafts'));
  const valid = checkDraft(
    'request',
    'try { OutParam.result=Sum(InParam.items); } finally {endResponse(RequestID);}',
    refs,
  );
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.functions, ['Sum']);
  run.observations.check_script_drafts = { status: 'checked' };
  assert.equal(canUseTool(run, 'check_script_drafts'), false);
  assert.ok(checkDraft('period', 'OutParam.x=1;', refs).errors.length);
  assert.ok(checkDraft('request', 'OutPram.x=1;endResponse(RequestID);', refs).errors.length);
  assert.ok(checkDraft('period', 'const = ;', refs).errors.length);
});
// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
test('来源、读写方向、已有用法与未知接口分别处理', () => {
// end
  for (const text of [
    'await KIOUpdateDatas("@source:a",[{N:"@point:p",V:2}],[]);',
    'await KIOQueryDatas("@source:old",["@point:p"],[]);',
    'ImaginaryKC(5);',
  ])
    assert.ok(checkDraft('system', text, refs).errors.length);
  assert.deepEqual(
    scriptContracts(['SQLQuery', 'AsynSQLQuery', 'ImaginaryKC']).map((s) => s.state),
    // modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
    ['contract', 'contract', 'unknown'],
    // end
  );
  for (const host of ['condition', 'system', 'period', 'customFunction', 'dataChange'] as const)
    assert.deepEqual(
      checkDraft(host, 'let total=0; for(const x of [2,3]) total+=x; return total;', refs).errors,
      [],
    );
  assert.throws(() => authorQuery({ symbols: Array(13).fill('SQLQuery') }));
  assert.throws(() =>
    draftQuery({
      drafts: [
        { host: 'request', code: 'x' },
        { host: 'request', code: 'y' },
      ],
    }),
  );
});

// modified by jinlong.feng at 2026-11-24 KF计算函数目录补全
test('新源码条目统一约束可省略参数、回调位置与历史连接类型', () => {
  const bindings = new Map([...refs,
    ['@source:kh', {kind: 'source', name: 'History', connectionFamily: 'kh'}],
    ['@source:sql', {kind: 'source', name: 'Relational', connectionFamily: 'sql'}],
  ]);
  const [sample, callback] = scriptContracts(['KHQuerySampleDatas2', 'AsynSQLQuery']);
  assert.equal(sample.registration?.requiredFormals, 8);
  assert.equal(sample.verification?.status, 'source-only');
  assert.match(callback.result!, /callback\(code, rows\)/);
  const body = 'const rows=[];await KHQuerySampleDatas2("@source:kh",["Tag"],"start","end",0,60000,0,rows);return rows;';
  const checked = checkDraft('period', body, bindings);
  assert.deepEqual(checked.errors, []);
  assert.match(checked.warnings.join('\n'), /已核对源码.*验证/);
  assert.match(checked.code!, /KHQuerySampleDatas2\("History"/);
  assert.match(checkDraft('period', body.replace(',0,rows)', ',rows)'), bindings).errors.join(), /8 至 9/);
  assert.match(checkDraft('period', body.replace(',0,rows)', ',0,{})'), bindings).errors.join(), /第8参.*数组/);
  assert.match(checkDraft('period', body.replace('@source:kh', '@source:sql'), bindings).errors.join(), /需要 kh 连接/);
  assert.match(checkDraft('period', 'AsynSQLQuery("@source:sql","SELECT 1",[]);', bindings).errors.join(), /第3参需要回调/);
  assert.match(checkDraft('period', 'return await AsynSQLQuery("@source:sql","SELECT 1", () => {});', bindings).warnings.join(), /外层 Promise 不交付业务结果/);
  const withCallback = checkDraft('period', 'AsynReadFile("fixture.txt", (code, data) => console.log(code, data));', bindings);
  assert.deepEqual(withCallback.errors, []);
  assert.doesNotMatch(withCallback.warnings.join(), /请核对等待/);
});
// end

test('已读取不同 KC 符号时模型看到实际查询参数，回合内可继续补查并保留候选修订预算', async () => {
  const run = {
    question: '编写脚本', history: [], contextKind: 'calculation', knownSelection: false,
    signal: AbortSignal.timeout(3000), tools: 2, requests: 1,
    observations: { inspect_script_environment: {bindings:[]}, lookup_calc_runtime: {state:'contract'} },
    publicArguments: {inspect_script_environment:{symbols:['Sum']}, lookup_calc_runtime:{symbol:'Sum'}},
  } as unknown as ModelRun;
  const originalFetch = globalThis.fetch;
  try {
    let request;
    globalThis.fetch = async (_url, init) => {
      request = JSON.parse(String(init.body));
      return new Response('data: [DONE]\n\n');
    };
    await relay(run, {tools:['lookup_calc_runtime','check_script_drafts'].map(n=>({function:{name:'kf_'+n}}))},
      {writeHead(){},end(){}}, {url:'http://localhost/test', model:'test', key:''});
    assert.deepEqual(request.tools.map(t=>t.function.name).sort(),['kf_check_script_drafts','kf_lookup_calc_runtime']);
    assert.deepEqual(request.messages.filter(m=>m.tool_calls).map(m=>JSON.parse(m.tool_calls[0].function.arguments)),
      [{symbols:['Sum']},{symbol:'Sum'}]);
    run.tools=5;
    assert.equal(canUseTool(run,'lookup_calc_runtime'),false);
    assert.ok(canUseTool(run,'check_script_drafts'));
  } finally {globalThis.fetch = originalFetch;}
});

test('已知请求签名可提取函数体；递归、参数错位和只声明辅助函数均须重新编写', () => {
  const body = 'OutParam.result = InParam.n; endResponse(RequestID);';
  const r = checkDraft('request', 'function serve(InParam,OutParam,RequestID,Token){'+body+'}', refs);
  assert.equal(r.code,body);
  assert.match(r.warnings.join(' '),/提取请求入口/);
  for(const candidate of ['function f(){return 1;}', 'function f(OutParam,InParam,RequestID,Token){'+body+'}',
    'function f(InParam,OutParam,RequestID,Token){f();'+body+'}'])
    assert.ok(checkDraft('request',candidate,refs).errors.length);
  const run = {contextKind:'request',tools:3,observations:{inspect_script_environment:{},
    check_script_drafts:{status:'revise',unchanged:true}}} as unknown as ModelRun;
  assert.equal(canUseTool(run,'check_script_drafts'),false);
});
// end

// modified by jinlong.feng at 2026-11-24 KF脚本确认前事实复核
test('请求宿主区分未调用的函数、立即执行、参数遮蔽与回包实参数量', () => {
  for (const wrapper of [
    '(function(InParam, OutParam, RequestID, Token) { endResponse(RequestID); });',
    'async () => { endResponse(RequestID); };',
  ]) {
    const checked = checkDraft('request', wrapper, refs);
    assert.equal(checked.errors.length, 1);
    assert.match(checked.errors[0], /未调用的函数表达式.*仅提交可执行正文/);
  }
  assert.deepEqual(checkDraft('request', '(() => { endResponse(RequestID); })();', refs).errors, []);
  const shadow = checkDraft('request', 'function reply(RequestID){endResponse(RequestID)} reply(RequestID);', refs);
  assert.match(shadow.errors.join(' '), /遮蔽了宿主的 RequestID/);
  const extra = checkDraft('request', 'endResponse(RequestID, OutParam);', refs);
  assert.match(extra.errors.join(' '), /仅传一个参数/);
});
// end

// modified by jinlong.feng at 2026-11-24 KF工程变量实名交付
import {projectText} from '../src/reference-names.ts';
test('工程名投影只替换完整名称，保留相邻中文、重叠名、标点与二次投影', () => {
  const mask=projectText(new Map([['Amt','@variable:a'],['Amt.x','@variable:b'],['$V','@variable:c']]));
  const masked=mask('从Amt改为Amt.x，用$V。MyAmt、Amt2保持。');
  assert.equal(masked,'从@variable:a改为@variable:b，用@variable:c。MyAmt、Amt2保持。');
  assert.equal(mask(masked),masked);
});
test('对仅填充的描述映射要求自修，已被读取或传递的表可以交付', () => {
  for(const prefix of ['const labels={};labels["@variable:v"]="name";','const labels=new Map();labels.set("a","b");']) {
    assert.match(checkDraft('request',prefix+'endResponse(RequestID);',refs).errors.join(' '),/局部映射.*没有消费者/);
  }
  for(const body of ['const a={n:1};OutParam.n=a.n;', 'const a=[];a.push(1);OutParam.a=a;',
    'const a={};{const a={n:2};OutParam.n=a.n;}OutParam.a=a;']) {
    assert.deepEqual(checkDraft('request',body+'endResponse(RequestID);',refs).errors,[]);
  }
  assert.ok(checkDraft('request','OutParam.s="bad @variable:v";endResponse(RequestID);',refs).errors.length);
});
// end
