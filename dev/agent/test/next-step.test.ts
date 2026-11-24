// modified by jinlong.feng at 2026-11-20 KF助手连续步骤指导
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { sameSelection } from '../src/next-step.ts';
import { Store } from '../src/store.ts';
import type { Context } from '../src/shared.ts';

const selected: Context = {
  kind: 'page',
  projectId: 'privateProject',
  object: 'privatePage',
  control: 'privateControl',
  dirty: false,
  editor: { session: 'editor1', sequence: 1 },
};

test('复用限于相同工程、选区及编辑版本，明确要求复查或追踪仍能读取', () => {
  assert.equal(sameSelection(selected, structuredClone(selected)), true);
  for (const change of [
    { projectId: 'other' },
    { object: 'other' },
    { control: 'other' },
    { dirty: true },
    { editor: { session: 'editor1', sequence: 2 } },
  ])
    assert.equal(sameSelection(selected, { ...selected, ...change }), false);
});

test('旧库按原位迁移且重复打开仍保留原答复', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kf-old-guidance-'));
  const path = join(dir, 'assistant.sqlite');
  try {
    const original = new Store(path);
    const { chatId } = original.createPlan('local', '方案');
    original.start('local', chatId, 'turn', '继续', selected, 'ask');
    original.finish('turn', 'done', '旧答复', null);
    original.db.exec('ALTER TABLE runs DROP COLUMN guidance');
    original.db.close();
    for (let i = 0; i < 2; i++) {
      const reopened = new Store(path);
      const [row] = reopened.histories(chatId);
      assert.equal(row.answer, '旧答复');
      assert.equal(row.guidance, null);
      reopened.db.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

async function listen(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return 'http://127.0.0.1:' + address.port;
}

const binary =
  process.env.KF_OPENCODE_BINARY ||
  fileURLToPath(new URL('../node_modules/opencode-ai/bin/opencode.exe', import.meta.url));
test(
  '真实 OpenCode 与本地模型联调：旧证据续问、两次设备资料反馈、跨步、主动复查',
  {
    skip: !existsSync(binary) && '需安装本平台 OpenCode 运行文件',
    timeout: 120000,
  },
  async (t) => {
    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    // modified by jinlong.feng at 2026-11-22 KF报警规则回读
    let alarmFixture = false;
    // end
    let bindFixture = false;
    // end
    let appShared = true;
    // end
    let pointShared = true;
    let pageReads = 0;
    // end
    // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
    let variableReads = 0;
    let variableGroups: unknown[] = [
      {
        group: {
          Variables: [
            { name: '$Time', isMap: false },
            { name: 'privateTag', isMap: true },
          ],
        },
      },
    ];
    // end
    const upstream = createServer((req, res) => {
      const route = req.url!.split('?')[0];
      const data: Record<string, unknown> = {
        // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
        '/api/user/userInfo': { tenantId: 1, userId: 21, userName: 'privateObserver' },
        '/opscenter/api/v1/opsResourceData': {
          appResource: [
            {
              projectId: selected.projectId,
              projectType: 1,
              appId: 'privateApp',
              appName: 'privateHMI',
              port: 3344,
              canOperate: appShared,
            },
          ],
          nodeProApp: [{ nodeId: 'privateNode', appPros: [{ appId: 'privateApp' }] }],
          nodeResource: [{ nodeId: 'privateNode', address: 'node-a' }],
        },
        '/opscenter/api/v1/fileResourceData': {
          projectResource: [{ projectId: selected.projectId, projectVersion: 'V1' }],
        },
        '/opscenter/api/v1/displayAppListStatus': [
          { appId: 'privateApp', appStatus: 'running', appDeployStatus: 1 },
        ],
        // end
        '/api/project/permissions': {
          // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
          items: [
            { projectId: selected.projectId, projectType: 1, hasProjectPermission: true },
            { projectId: 'privateCollection', projectType: 2, hasProjectPermission: pointShared },
          ],
          // end
        },
        '/api/client/getPages': { message: { Pages: [{ name: selected.object }] } },
        '/api/client/batchGetPageFile': {
          // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
          success: [
            {
              pageProperty: { name: selected.object },
              objects: [{ guid: selected.control, name: 'privateControlLabel', text: 'privateSaved' }],
            },
          ],
          // end
        },
        // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
        '/api/client/getVariableList': { message: variableGroups },
        // end
        // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
        '/api/client/getDataSourceList': { message: [] },
        '/api/projectGroup': [{ guid: 'privateGroup' }],
        '/api/collect/project': [{ guid: 'privateCollection', name: 'privateStation' }],
        '/api/collect/variables': [{ tagName: 'ReturnTemp', deviceName: 'privateRTD' }],
        // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
        '/api/collect/getProjectById': { osType: 'Linux', sysPlatform: 'ARM' },
        '/api/collect/getDriverList': [
          {
            DriverName: 'privateThermal',
            DeviceSeries: 'TH',
            DriverVersion: '4',
            OsType: 'Linux',
            SysPlatform: 'ARM',
          },
        ],
        // end
        '/api/dataSource/project': [],
        // end
      };
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      if (bindFixture) {
        data['/api/client/batchGetPageFile'] = {
          success: [
            {
              pageProperty: { name: selected.object },
              linkMng: { linkList: [] },
              objects: [
                {
                  name: 'PrivateBindingText',
                  guid: selected.control,
                  showUiExtendType: 'RichText',
                  uiModelType: 7,
                },
                {
                  name: 'PrivateBindingButton',
                  guid: 'button2',
                  showUiExtendType: 'ElementUI_Button',
                  uiModelType: 35,
                },
              ],
            },
          ],
        };
        data['/api/client/getVariableList'] = {
          message: [
            {
              group: {
                Variables: [
                  {
                    name: 'PrivateReading',
                    isMap: true,
                    isSub: true,
                    projectDataSourceId: 'conn',
                    dataSourceItem: { appName: 'srcApp', tagName: 'Tag' },
                  },
                ],
              },
            },
          ],
        };
        data['/api/client/getDataSourceList'] = {
          message: [{ id: 'conn', name: 'Rt', appName: 'srcApp', dataSourceName: 'def' }],
        };
        data['/api/dataSource/getAllDataSource'] = [
          {
            name: 'def',
            guid: 'ds',
            type: '工业数据源_网络模式',
            config: {
              newWorkDateType: 'KingIOServerLinux',
              engineeringId: 'privateCollection',
              dataType: ['1'],
            },
          },
        ];
        data['/api/collect/variables'] = [{ tagName: 'Tag', deviceName: 'privateDevice', accessType: 0 }];
        (data['/api/project/permissions'] as any).items.push({
          projectId: 'ds',
          projectType: 3,
          hasProjectPermission: true,
        });
      }
      // end
      // modified by jinlong.feng at 2026-11-22 KF报警规则回读
      if (alarmFixture) {
        (data['/api/project/permissions'] as any).items.push(
          { projectId: 'privateAlarm', projectType: 4, hasProjectPermission: pointShared },
          { projectId: 'privateEvents', projectType: 3, hasProjectPermission: true },
        );
        data['/api/client/batchGetPageFile'] = {
          success: [
            {
              pageProperty: { name: selected.object },
              objects: [
                {
                  guid: selected.control,
                  name: 'privateWindow',
                  prototypeName: 'AlarmWindow',
                  dateSource: 'events',
                },
              ],
            },
          ],
        };
        data['/api/client/getDataSourceList'] = {
          message: [{ name: 'events', dataSourceName: 'privateSource', type: 'AlarmEngineering' }],
        };
        data['/api/dataSource/getAllDataSource'] = [
          {
            guid: 'privateEvents',
            name: 'privateSource',
            type: 'AlarmEngineering',
            config: { alarmProject: 'privateAlarm' },
          },
        ];
        data['/api/alarm/allProjects'] = [{ guid: 'privateAlarm', name: 'privateAlarm' }];
        data['/api/alarm/group'] = { groupId: 'root', children: [] };
        data['/api/alarm/tags'] = [
          {
            ID: 'term1',
            Name: 'privateTerm',
            Type: 2,
            DataSourceName: 'Rt',
            groupId: 'root',
            AlarmEnable: true,
            AlarmItem: {
              ID: 'term1',
              LimitEnable: true,
              AlarmEnable: true,
              HiEnable: true,
              HiLimit: 8765,
              HiHiEnable: false,
              LoEnable: false,
              LoLoEnable: false,
              LimitAlarmDeadEnable: true,
              LimitAlarmDead: 17,
              LimitAlarmDelayEnable: false,
            },
          },
        ];
      }
      // end
      if (route === '/api/client/batchGetPageFile') pageReads++;
      // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
      if (route === '/api/client/getVariableList') {
        assert.equal(new URL(req.url!, 'http://localhost').searchParams.get('projectId'), selected.projectId);
        variableReads++;
      }
      // end
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      (data['/api/project/permissions'] as any).items.push({
        projectId: 'privateCalc',
        projectType: 0,
        hasProjectPermission: true,
      });
      if (route === '/api/calculation/projectJsonData')
        data[route] = [{ name: 'privateCalcTemp', type: 'Number', value: 17 }];
      // end
      if (!(route in data)) return void res.writeHead(404).end();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ errorCode: 0, data: data[route] }));
    });
    const centerOrigin = await listen(upstream);
    t.after(() => upstream.close());
    const requests: any[] = [];
    const provider = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const input = JSON.parse(Buffer.concat(chunks).toString());
      // modified by jinlong.feng at 2026-11-23 KF跨轮任务记忆
      if (input.messages[0]?.content.startsWith('你是 KF 开发对话的工作记忆整理器')) {
        const excerpt = JSON.parse(input.messages[1].content);
        assert.equal(typeof excerpt.question, 'string');
        assert.ok(Array.isArray(excerpt.memory));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({clauses:excerpt.clauses.map(({n}: {n:number})=>({n,action:'question'}))})}}]}));
        return;
      }
      // end
      requests.push(input);
      const question = input.messages.findLast((m: any) => m.role === 'user')?.content;
      const fresh = question === '请重新核对已保存配置';
      // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
      // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
      const lookupPoint = question === '查找采集点 ReturnTemp';
      // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
      // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
      const startup = question === '我从空工程接入设备做画面，先查有哪些数采工程可复用';
      // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
      const inspectSetup = question === '数采工程里有哪些匹配热传感器的驱动？';
      // end
      // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
      // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
      const binding = question === '这个控件的显示应绑定哪个变量';
      // modified by jinlong.feng at 2026-11-22 KF报警规则回读
      const rule = question === '为什么触发又保持这条报警';
      // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
      const calcQuestion = question === '本段对话有计算脚本的运行回执吗';
      // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
      const runtimeUsage = question === '这个计算宿主怎样用 SQLQuery';
      const calcInventory = question === '按当前计算菜单查已保存变量';
      const readTool = runtimeUsage
        ? 'lookup_calc_runtime'
        : calcInventory
          ? 'inspect_calc_config'
          : calcQuestion
            ? // end
              'inspect_calc_results'
            : // end
              rule
              ? 'inspect_alarm_rule'
              : binding
                ? 'inspect_control_binding'
                : inspectSetup
                  ? 'inspect_collection_setup'
                  : startup
                    ? 'plan_solution'
                    : question === '本次改动在运行页生效了吗'
                      ? 'read_runtime'
                      : lookupPoint
                        ? 'find_objects'
                        : fresh
                          ? // end
                            // end
                            'read_object'
                          : [
                                '请盘点这个项目定义的数据项',
                                '我的客户端工程有没有变量？',
                                '当前客户端有哪些变量？',
                                '请告诉我绑定时先检查哪里',
                              ].includes(question)
                            ? 'read_client_variables'
                            : null;
      // end
      // end
      // end
      // end
      const mustRead =
        readTool && !input.messages.some((m: any) => m.role === 'tool' && m.tool_call_id === readTool);
      // end
      // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
      if (input.stream === false) {
        res.writeHead(200, { 'content-type': 'application/json' }).end(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    kind: 'approve',
                    basis: ['step:clientSource', 'read_client_variables'],
                  }),
                },
              },
            ],
          }),
        );
        return;
      }
      let reply: string | object = readTool
        ? { kind: 'facts', tools: [readTool] }
        : { kind: 'clarify', fields: ['source'] };
      // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
      if (question === '沿用刚才的驱动结果')
        reply = { kind: 'facts', tools: ['history:inspect_collection_setup'] };
      // end
      if (question === '请告诉我绑定时先检查哪里')
        reply = '先在客户端工程的数据源管理中核对实时数据源，再把目标点加入工程变量。';
      // end
      if (question === '是新设备，温度传感器用 OPC UA。')
        reply = { kind: 'clarify', fields: ['measurement'] };
      if (question === '节点和类型都已确认，设备也已建好。') reply = { kind: 'step', step: 'point' };
      if (question === '点已保存，目标采集 App 也已部署并运行。下一步？')
        reply = { kind: 'step', step: 'monitor' };
      const delta = mustRead
        ? {
            role: 'assistant',
            tool_calls: [
              {
                index: 0,
                id: 'call_read',
                type: 'function',
                // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
                // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
                // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
                // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
                function: {
                  name: 'kf_' + readTool,
                  // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
                  arguments: runtimeUsage
                    ? JSON.stringify({ symbol: 'SQLQuery' })
                    : inspectSetup
                      ? // end
                        JSON.stringify({ driver: 'Thermal' })
                      : startup
                        ? JSON.stringify({ input: 'device', goals: ['screen'], directory: 'collection' })
                        : lookupPoint
                          ? JSON.stringify({ objectType: 'collectionPoint', tag: 'ReturnTemp' })
                          : '{}',
                },
                // end
                // end
                // end
                // end
              },
            ],
          }
        : { role: 'assistant', content: typeof reply === 'string' ? reply : JSON.stringify(reply) };
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const [part, reason] of [
        [delta, null],
        [{}, mustRead ? 'tool_calls' : 'stop'],
      ]) {
        res.write(
          'data: ' +
            JSON.stringify({
              id: 'chatcmpl-test',
              object: 'chat.completion.chunk',
              created: 1,
              model: 'test',
              choices: [{ index: 0, delta: part, finish_reason: reason }],
            }) +
            '\n\n',
        );
      }
      res.end('data: [DONE]\n\n');
    });
    const modelOrigin = await listen(provider);
    t.after(() => provider.close());
    const dir = mkdtempSync(join(tmpdir(), 'kf-guidance-'));
    const service = spawn(process.execPath, [fileURLToPath(new URL('../src/server.ts', import.meta.url))], {
      env: {
        ...process.env,
        KF_CENTER_ORIGIN: centerOrigin,
        KF_AGENT_PORT: '0',
        KF_AGENT_DATA_DIR: dir,
        KF_AGENT_ENABLE_MODEL: 'true',
        KF_MODEL_BASE_URL: modelOrigin + '/v1',
        KF_MODEL_ID: 'test',
        KF_MODEL_API_KEY: '',
        KF_OPENCODE_BINARY: binary,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(async () => {
      if (service.exitCode === null) {
        const stopped = once(service, 'exit');
        service.kill();
        await stopped;
      }
      rmSync(dir, { recursive: true, force: true });
    });
    const [line] = await once(service.stdout, 'data');
    const base = String(line).match(/http:\/\/127\.0\.0\.1:\d+/)![0] + '/api/assistant/';
    async function call(path: string, data?: object) {
      const response = await fetch(base + path, {
        method: data ? 'POST' : 'GET',
        headers: { authorization: 'Bearer localFixture', 'content-type': 'application/json' },
        body: data && JSON.stringify(data),
      });
      assert.ok(response.ok, path + ' ' + response.status);
      return response;
    }
    const { chatId } = await (await call('plans', { title: '传感器测试' })).json();
    async function turn(question: string, intent = 'ask') {
      const id = randomUUID();
      await call('chats/' + chatId + '/turns', { requestId: id, context: selected, question, intent });
      await (await call('runs/' + id + '/events')).text();
      const { turns } = await (await call('chats/' + chatId)).json();
      const last = turns.at(-1);
      assert.equal(last.status, 'done', last.answer);
      return last;
    }
    const first = await turn('温度传感器要接入实时显示，请核对当前选区。', 'lookup');
    assert.equal(pageReads, 1);
    const continued = await turn('我已看过证据，继续');
    assert.match(continued.answer, /已有数采点/);
    assert.equal(continued.evidence, null);
    assert.equal(pageReads, 1);
    const firstRequest = requests[0];
    assert.match(JSON.stringify(firstRequest.messages), /historicalEvidence/);
    assert.ok(firstRequest.tools?.length);
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    assert.equal(first.source.kind, 'local');
    assert.equal(continued.source.kind, 'model-guide');
    assert.equal(continued.source.model, 'test');
    // end
    // modified by jinlong.feng at 2026-11-20 KF助手客户端工程变量核对
    const providerRequests = requests.length;
    const inventory = await turn('我的客户端工程有没有变量？');
    assert.match(inventory.answer, /2 个已保存的工程变量/);
    assert.match(inventory.answer, /privateTag/);
    assert.equal(inventory.evidence.source, 'client/getVariableList');
    assert.ok(requests.length > providerRequests);
    variableGroups = [];
    const empty = await turn('当前客户端有哪些变量？');
    assert.match(empty.answer, /共 0 个工程变量/);
    assert.equal(empty.source.kind, 'model-facts');
    variableGroups = [{ group: { Variables: [{ name: 'privateTag', isMap: true }] } }];
    const viaModel = await turn('请盘点这个项目定义的数据项');
    assert.match(viaModel.answer, /1 个已保存的工程变量/);
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    const authored = await turn('请告诉我绑定时先检查哪里');
    assert.equal(authored.answer, '先在客户端工程的数据源管理中核对实时数据源，再把目标点加入工程变量。');
    assert.equal(authored.source.kind, 'model-text');
    assert.deepEqual(authored.source.tools, ['read_client_variables']);
    assert.equal(authored.evidence.source, 'client/getVariableList');
    assert.equal(variableReads, 4);
    // end
    assert.equal(pageReads, 1);
    assert.doesNotMatch(JSON.stringify(requests), /privateTag/);
    // end
    const protocol = await turn('是新设备，温度传感器用 OPC UA。');
    // modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
    assert.match(JSON.stringify(requests.at(-1).messages), /先在客户端工程的数据源管理中核对实时数据源/);
    assert.equal(authored.source.continuity, undefined);
    // end
    assert.match(protocol.answer, /点表/);
    assert.doesNotMatch(protocol.answer, /什么通信协议|选中控件/);
    assert.match(JSON.stringify(requests.at(-1).messages), /previousGuidance/);
    assert.match((await turn('节点和类型都已确认，设备也已建好。')).answer, /数采变量 → 新建/);
    // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
    assert.match(
      (await turn('点已保存，目标采集 App 也已部署并运行。下一步？')).answer,
      /第二次采样的源时间晚于第一次/,
    );
    // end
    for (const question of ['继续', '上步完成，下一步呢？', '下一步如何验证？']) await turn(question);
    const older = requests.at(-1);
    assert.match(JSON.stringify(older.messages), /较早的历史核对记录/);
    assert.match(JSON.stringify(older.messages), /已有证据|历史证据/);
    assert.equal(pageReads, 1);
    const refreshed = await turn('请重新核对已保存配置');
    assert.equal(pageReads, 2);
    assert.notEqual(refreshed.evidence.id, first.evidence.id);
    for (const input of requests)
      assert.doesNotMatch(JSON.stringify(input), /privatePage|privateProject|privateControl|localFixture/);
    // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
    const found = await turn('查找采集点 ReturnTemp');
    assert.match(found.answer, /privateRTD/);
    assert.equal(found.evidence.pointLookup.status, 'unique');
    assert.equal(found.evidence.pointLookup.runtimeVerified, false);
    pointShared = false;
    const hidden = (await (await call('chats/' + chatId)).json()).turns.at(-1);
    assert.equal(hidden.status, 'hidden');
    assert.doesNotMatch(JSON.stringify(hidden), /privateStation|privateCollection|privateRTD/);
    const noAccess = await turn('查找采集点 ReturnTemp');
    assert.equal(noAccess.evidence.pointLookup.status, 'unverified');
    assert.doesNotMatch(noAccess.answer, /privateStation|privateCollection|privateRTD/);
    assert.doesNotMatch(JSON.stringify(requests), /privateStation|privateCollection|privateRTD/);
    // modified by jinlong.feng at 2026-11-21 KF单节点运行画面核对
    const runtimeTurn = randomUUID(),
      tab = randomUUID();
    await call('chats/' + chatId + '/turns', {
      requestId: runtimeTurn,
      context: selected,
      question: '本次改动在运行页生效了吗',
      intent: 'ask',
      browserTab: tab,
    });
    const target = (await (await call('tools/runtime_targets', { context: selected })).json())[0];
    const stream = (await call('runs/' + runtimeTurn + '/events')).body!.pipeThrough(new TextDecoderStream());
    let buffer = '',
      observed = false;
    for await (const part of stream) {
      buffer += part;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const event = JSON.parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (event.type !== 'observe-screen') continue;
        assert.equal(event.tab, tab);
        assert.equal(event.control, selected.control);
        await call('runs/' + runtimeTurn + '/screen', {
          ticket: event.ticket,
          observation: {
            ...target,
            at: Date.now(),
            installed: 'privateInstalled',
            displayed: 'privateDisplay',
          },
        });
        observed = true;
      }
    }
    assert.ok(observed);
    const observation = (await (await call('chats/' + chatId)).json()).turns.at(-1);
    assert.equal(observation.status, 'done', observation.answer);
    assert.match(observation.answer, /privateDisplay/);
    assert.match(observation.answer, /privateSaved/);
    assert.doesNotMatch(
      JSON.stringify(requests),
      /privateHMI|privateInstalled|privateDisplay|privateSaved|privateObserver/,
    );
    appShared = false;
    assert.equal((await (await call('chats/' + chatId)).json()).turns.at(-1).status, 'hidden');
    // end
    // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
    pointShared = true;
    const starter = await (await call('plans', { title: '空入口验收' })).json();
    const startId = randomUUID();
    await call('chats/' + starter.chatId + '/turns', {
      requestId: startId,
      context: { kind: 'general' },
      intent: 'ask',
      question: '我从空工程接入设备做画面，先查有哪些数采工程可复用',
    });
    await (await call('runs/' + startId + '/events')).text();
    const startHistory = await (await call('chats/' + starter.chatId)).json();
    assert.equal(startHistory.turns[0].status, 'done', startHistory.turns[0].answer);
    assert.deepEqual(startHistory.turns[0].source.tools, ['plan_solution']);
    assert.match(startHistory.turns[0].answer, /数采管理/);
    assert.match(startHistory.turns[0].answer, /privateStation/);
    assert.doesNotMatch(startHistory.turns[0].answer, /计算管理|报警管理/);
    assert.doesNotMatch(JSON.stringify(requests), /privateStation|privateGroup/);
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    const deviceTurn = randomUUID();
    const collection = { kind: 'collection', projectId: 'privateCollection' };
    await call('chats/' + starter.chatId + '/turns', {
      requestId: deviceTurn,
      context: collection,
      intent: 'ask',
      question: '数采工程里有哪些匹配热传感器的驱动？',
    });
    await (await call('runs/' + deviceTurn + '/events')).text();
    const driverTurn = (await (await call('chats/' + starter.chatId)).json()).turns.at(-1);
    assert.equal(driverTurn.status, 'done', driverTurn.answer);
    assert.deepEqual(driverTurn.source.tools, ['inspect_collection_setup']);
    assert.match(driverTurn.answer, /privateThermal/);
    assert.equal(driverTurn.evidence.collectionSetup.status, 'driver-options');
    const setupReplay = requests
      .flatMap((request) => request.messages)
      .flatMap((message) => message.tool_calls ?? [])
      .find((call) => call.function.name === 'kf_inspect_collection_setup');
    assert.deepEqual(JSON.parse(setupReplay.function.arguments), { view: 'drivers' });
    const priorSetup = randomUUID();
    await call('chats/' + starter.chatId + '/turns', {
      requestId: priorSetup,
      context: collection,
      intent: 'ask',
      question: '沿用刚才的驱动结果',
    });
    await (await call('runs/' + priorSetup + '/events')).text();
    const carried = (await (await call('chats/' + starter.chatId)).json()).turns.at(-1);
    assert.equal(carried.status, 'done', carried.answer);
    assert.deepEqual(carried.source.tools, []);
    assert.match(carried.answer, /上次读回[\s\S]*privateThermal/);
    assert.doesNotMatch(JSON.stringify(requests), /privateThermal/);
    // end
    pointShared = false;
    assert.equal((await (await call('chats/' + starter.chatId)).json()).turns[0].status, 'hidden');
    // modified by jinlong.feng at 2026-11-22 KF设备与点配置指导
    assert.equal((await (await call('chats/' + starter.chatId)).json()).turns.at(-1).status, 'hidden');
    // end
    // end
    // modified by jinlong.feng at 2026-11-22 KF二维控件绑定指导
    bindFixture = true;
    pointShared = true;
    const bindingChat = (await (await call('plans', { title: '绑定试验' })).json()).chatId;
    for (const [control, property] of [
      [selected.control, '.setText('],
      ['button2', '.Caption = '],
    ]) {
      const requestId = randomUUID();
      await call('chats/' + bindingChat + '/turns', {
        requestId,
        context: { ...selected, control },
        intent: 'ask',
        question: '这个控件的显示应绑定哪个变量',
      });
      await (await call('runs/' + requestId + '/events')).text();
      const latest = (await (await call('chats/' + bindingChat)).json()).turns.at(-1);
      assert.equal(latest.status, 'done', latest.answer);
      assert.deepEqual(latest.source.tools, ['inspect_control_binding']);
      assert.equal(latest.evidence.controlBinding.state, 'ready');
      assert.ok(latest.answer.includes(property) && latest.answer.includes('$System.PrivateReading'));
    }
    assert.doesNotMatch(
      JSON.stringify(requests),
      /PrivateBindingButton|PrivateBindingText|PrivateReading|privateDevice/,
    );
    pointShared = false;
    assert.ok(
      (await (await call('chats/' + bindingChat)).json()).turns.every((r: any) => r.status === 'hidden'),
    );
    // end
    // modified by jinlong.feng at 2026-11-22 KF报警规则回读
    bindFixture = false;
    alarmFixture = true;
    pointShared = true;
    const ruleChat = (await (await call('plans', { title: '报警试验' })).json()).chatId;
    for (const context of [
      { kind: 'alarm', projectId: 'privateAlarm', group: 'root', object: 'term1' },
      selected,
    ]) {
      const requestId = randomUUID();
      await call('chats/' + ruleChat + '/turns', {
        requestId,
        context,
        intent: 'ask',
        question: '为什么触发又保持这条报警',
      });
      await (await call('runs/' + requestId + '/events')).text();
      const turn = (await (await call('chats/' + ruleChat)).json()).turns.at(-1);
      assert.equal(turn.status, 'done', turn.answer);
      assert.deepEqual(turn.source.tools, ['inspect_alarm_rule']);
      assert.match(turn.answer, /privateTerm[\s\S]*≥ 8765[\s\S]*< 8748/);
      assert.equal(turn.evidence.alarmRule.captures, 0);
    }
    assert.doesNotMatch(JSON.stringify(requests), /privateTerm|privateWindow|privateEvents|8765|8748/);
    pointShared = false;
    assert.ok(
      (await (await call('chats/' + ruleChat)).json()).turns.every((r: any) => r.status === 'hidden'),
    );
    // end
    // modified by jinlong.feng at 2026-11-22 KF计算脚本运行回读
    // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
    const configChat = (await (await call('plans', { title: '计算配置与接口' })).json()).chatId;
    for (const [question, tool, expected] of [
      ['按当前计算菜单查已保存变量', 'inspect_calc_config', 'privateCalcTemp'],
      ['这个计算宿主怎样用 SQLQuery', 'lookup_calc_runtime', '3000'],
    ]) {
      const requestId = randomUUID();
      await call('chats/' + configChat + '/turns', {
        requestId,
        context: { kind: 'calculation', projectId: 'privateCalc', calcMenu: 'calculate-global-variable' },
        intent: 'ask',
        question,
      });
      await (await call('runs/' + requestId + '/events')).text();
      const turn = (await (await call('chats/' + configChat)).json()).turns.at(-1);
      assert.equal(turn.status, 'done', turn.answer);
      assert.deepEqual(turn.source.tools, [tool]);
      assert.ok(turn.answer.includes(expected), turn.answer);
    }
    assert.doesNotMatch(JSON.stringify(requests), /privateCalcTemp/);
    // end
    const calcChat = (await (await call('plans', { title: '跨入口计算回读' })).json()).chatId;
    const calcRun = randomUUID();
    await call('chats/' + calcChat + '/turns', {
      requestId: calcRun,
      context: selected,
      intent: 'ask',
      question: '本段对话有计算脚本的运行回执吗',
    });
    await (await call('runs/' + calcRun + '/events')).text();
    const calcAnswer = (await (await call('chats/' + calcChat)).json()).turns.at(-1);
    assert.deepEqual(calcAnswer.source.tools, ['inspect_calc_results']);
    assert.match(calcAnswer.answer, /没有可展示的匹配运行回执/);
    // end
    const db = new DatabaseSync(join(dir, 'assistant.sqlite'), { readOnly: true });
    // end
    try {
      assert.equal(db.prepare('select count(*) as n from runs where guidance is not null').get()!.n, 7);
    } finally {
      db.close();
    }
  },
);
// end
