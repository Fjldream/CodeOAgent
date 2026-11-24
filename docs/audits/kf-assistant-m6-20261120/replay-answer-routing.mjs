// modified by jinlong.feng at 2026-11-20 KF助手答复链路归因
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../../dev/agent/', import.meta.url));
// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
const useProse = process.argv.includes('--prose');
// modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
const prose = {
  client:
    '在客户端工程打开「工程变量 → 快速添加」，选择已关联的实时数据源并勾选目标点。返回列表，核对「关联数据源名称」和「映射Tag名称」。',
  alarm: '在数据词典中选择目标点，打开「编辑 → 报警属性」并保存限值。重新打开该点的报警属性，核对限值。',
  calculation: '在计算工程按触发类型打开目标脚本，分别核对输入点和输出点所用的连接。',
};
// end
// end
const fixtures = [
  {
    kind: 'client',
    type: 1,
    question: '我该如何绑定采集工程的点',
    baseline: '我的客户端工程有没有变量？',
    step: 'clientPoint',
    action: '工程变量 → 快速添加',
    tool: 'read_client_variables',
  },
  {
    kind: 'alarm',
    type: 4,
    question: '我该如何设置高限报警？',
    baseline: '当前报警工程有什么数据源？',
    step: 'alarmRule',
    action: '编辑 → 报警属性',
    tool: 'read_object',
  },
  {
    kind: 'calculation',
    type: 0,
    question: '我该如何核对这个周期脚本的输入输出？',
    baseline: '当前计算工程有哪些周期脚本？',
    step: 'script',
    // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
    action: '按触发类型打开目标脚本',
    // end
    tool: 'read_object',
  },
];
async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return 'http://127.0.0.1:' + server.address().port;
}
const center = createServer((req, res) => {
  const routes = {
    '/api/user/userInfo': { tenantId: 1, userId: 1 },
    '/api/project/permissions': {
      items: fixtures.map((fixture) => ({
        projectType: fixture.type,
        projectId: 'test-' + fixture.kind,
        hasProjectPermission: true,
      })),
    },
    '/api/client/getVariableList': { message: [{ sys: { Variables: [{ name: '$Time', isMap: false }] } }] },
    '/api/alarm/dataSource': { s: { name: 'testSource', dm_name: 'demo' } },
    '/api/calculation/projectJsonData': [{ name: 'testPeriod' }],
  };
  const path = req.url.split('?')[0];
  if (!Object.hasOwn(routes, path)) return res.writeHead(404).end();
  res
    .writeHead(200, { 'content-type': 'application/json' })
    .end(JSON.stringify({ errorCode: 0, data: routes[path] }));
});
let scenario, readFirst, modelDecision, returnedTool;
const model = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks));
  // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
  if (input.stream === false) {
    const verdict = { kind: 'approve', basis: ['step:' + scenario.step] };
    return res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(verdict) } }] }));
  }
  // end
  const question = input.messages.findLast((message) => message.role === 'user').content;
  const baseline = question === scenario.baseline;
  const call =
    (baseline || readFirst) &&
    !input.messages.some((message) => message.role === 'tool' && message.tool_call_id === scenario.tool);
  const answer = baseline ? { kind: 'facts', sections: ['facts'] } : { kind: 'step', step: scenario.step };
  // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
  const reply = !baseline && useProse ? prose[scenario.kind] : JSON.stringify(answer);
  // end
  if (!call && !baseline) {
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    modelDecision = reply;
    // end
    returnedTool = input.messages.find((message) => message.role === 'tool')?.tool_call_id ?? null;
  }
  const replyDelta = call
    ? {
        role: 'assistant',
        tool_calls: [
          {
            index: 0,
            id: 'call_fixture',
            type: 'function',
            function: { name: 'kf_' + scenario.tool, arguments: '{}' },
          },
        ],
      }
    : // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      { role: 'assistant', content: reply };
  // end
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  for (const [delta, finish_reason] of [
    [replyDelta, null],
    [{}, call ? 'tool_calls' : 'stop'],
  ])
    res.write(
      'data: ' +
        JSON.stringify({
          id: 'fixture',
          object: 'chat.completion.chunk',
          created: 1,
          model: 'local',
          choices: [{ index: 0, delta, finish_reason }],
        }) +
        '\n\n',
    );
  res.end('data: [DONE]\n\n');
});
const centerBase = await listen(center),
  modelBase = await listen(model);
const dataDirectory = mkdtempSync(join(tmpdir(), 'kf-qa-routing-'));
const assistantService = spawn(process.execPath, [join(root, 'src/server.ts')], {
  cwd: root,
  env: {
    ...process.env,
    KF_CENTER_ORIGIN: centerBase,
    KF_AGENT_PORT: '0',
    KF_AGENT_DATA_DIR: dataDirectory,
    KF_AGENT_ENABLE_MODEL: 'true',
    KF_MODEL_ID: 'local',
    KF_MODEL_API_KEY: '',
    KF_MODEL_BASE_URL: modelBase + '/v1',
    KF_OPENCODE_BINARY: join(root, 'node_modules/opencode-ai/bin/opencode.exe'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
try {
  const [first] = await once(assistantService.stdout, 'data');
  const base = String(first).match(/http:\/\/127\.0\.0\.1:\d+/)[0] + '/api/assistant/';
  async function http(path, body) {
    const res = await fetch(base + path, {
      headers: { authorization: 'Bearer fixture', 'content-type': 'application/json' },
      method: body ? 'POST' : 'GET',
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.ok(res.ok);
    return res;
  }
  const results = [];
  for (const fixture of fixtures) {
    scenario = fixture;
    for (const reading of [false, true]) {
      readFirst = reading;
      modelDecision = null;
      returnedTool = null;
      const { chatId } = await (await http('plans', { title: 'fixture' })).json();
      async function ask(question) {
        const id = randomUUID();
        await http('chats/' + chatId + '/turns', {
          intent: 'ask',
          requestId: id,
          question,
          context: { kind: fixture.kind, projectId: 'test-' + fixture.kind },
        });
        await (await http('runs/' + id + '/events')).text();
        const detail = await (await http('chats/' + chatId)).json();
        const turn = detail.turns.at(-1);
        assert.equal(turn.status, 'done', turn.answer);
        return turn;
      }
      await ask(fixture.baseline);
      const turn = await ask(fixture.question);
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      assert.equal(
        modelDecision,
        useProse ? prose[fixture.kind] : JSON.stringify({ kind: 'step', step: fixture.step }),
      );
      if (useProse) assert.equal(turn.answer, modelDecision);
      // end
      assert.equal(returnedTool, reading ? fixture.tool : null);
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
      const verifyField = { client: '映射Tag名称', alarm: '核对', calculation: '输出点' }[fixture.kind];
      const delivered = turn.answer.includes(fixture.action) && turn.answer.includes(verifyField);
      assert.doesNotMatch(turn.answer, /这一步怎样确认|记下它|告诉我/);
      // end
      if (process.argv.includes('--check')) {
        assert.equal(turn.source.kind, useProse ? 'model-text' : 'model-guide');
        assert.equal(turn.source.model, 'local');
        assert.deepEqual(turn.source.basis, ['step:' + fixture.step]);
        assert.deepEqual(turn.source.tools, reading ? [fixture.tool] : []);
      }
      // end
      results.push({
        project: fixture.kind,
        tool: returnedTool,
        modelDecision,
        delivered,
        visible: turn.answer.split('\n')[0],
      });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  if (process.argv.includes('--check') && results.some((result) => !result.delivered)) process.exitCode = 1;
} finally {
  const stopped = once(assistantService, 'exit');
  assistantService.kill();
  await stopped;
  center.close();
  model.close();
  rmSync(dataDirectory, { recursive: true, force: true });
}
// end
