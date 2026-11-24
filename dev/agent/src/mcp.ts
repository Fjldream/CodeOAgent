// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { createInterface } from 'node:readline';
// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
// modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
// modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
import { querySchema, readQueryArguments, isQueryTool, queryTools } from './query-tools.ts';
// end
// end
// modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
import { entryTools, supportedTool } from './query-tools.ts';
const entryKind = process.env.KF_ENTRY_KIND ?? 'general';
// end
const rpc = createInterface({ input: process.stdin });
// end
for await (const line of rpc) {
  let call;
  try {
    call = JSON.parse(line);
  } catch {
    continue;
  }
  if (call.id == null) continue;
  let result: any;
  switch (call.method) {
    case 'initialize':
      result = {
        protocolVersion: call.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'kf-readonly', version: '0.1.0' },
      };
      break;
    case 'ping':
      result = {};
      break;
    case 'tools/list':
      result = {
        // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
        // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
        tools: entryTools(entryKind).map((name) => ({
          // end
          name,
          description: queryTools[name],
          // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
          // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
          inputSchema: querySchema(name, entryKind),
          // end
          // end
          annotations: { readOnlyHint: true },
        })),
        // end
      };
      break;
    case 'tools/call':
      try {
        // modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
        const name = call.params?.name;
        // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
        // modified by jinlong.feng at 2026-11-23 KF方案理解与计算工程开发
        if (!isQueryTool(name) || !supportedTool(name, entryKind)) throw Error();
        // end
        // modified by jinlong.feng at 2026-11-21 KF方案起步与开发流程指导
        // modified by jinlong.feng at 2026-11-23 KF脚本引用与修订验收
        const args = call.params.arguments ?? {};
// modified by jinlong.feng at 2026-11-23 KF计算需求确认校验
        const query = (name === 'check_script_drafts' || name === 'review_solution_script') ? args : readQueryArguments(name, args);
// end
        // end
        // end
        // end
        const res = await fetch(process.env.KF_RUN_ENDPOINT + '/' + name, {
          // end
          method: 'POST',
          // modified by jinlong.feng at 2026-11-21 KF客户端采集点核对
          headers: { Authorization: 'Bearer ' + process.env.KF_RUN_CAPABILITY },
          ...(query ? { body: JSON.stringify(query) } : {}),
          // end
        });
        if (!res.ok) throw Error();
        result = { content: [{ type: 'text', text: JSON.stringify(await res.json()) }] };
      } catch {
        result = {
          isError: true,
          content: [{ type: 'text', text: '当前入口不可读取或本轮读取额度已用完。' }],
        };
      }
      break;
    default:
      process.stdout.write(
        JSON.stringify({ jsonrpc: '2.0', id: call.id, error: { code: -32601, message: 'Unsupported' } }) +
          '\n',
      );
      continue;
  }
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: call.id, result }) + '\n');
}
// end
