// modified by jinlong.feng at 2026-11-20 KF开发助手工程上下文与证据
import { readFileSync } from 'node:fs';
import { HttpError } from './shared.ts';

// modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
export function scriptExample(kind: string, purpose?: unknown) {
  if (purpose !== undefined) {
    if (purpose !== 'report' || kind !== 'request')
      throw new HttpError(400, '报表数据集示例适用于请求式计算脚本');
    return {
      host: '请求式计算 · 报表数据集',
      version: 'KF 3.6',
      code: readFileSync(new URL('../examples/report-mean.js.txt', import.meta.url), 'utf8'),
      instructions:
        '创建请求式脚本并保存、发布到测试 App。报表中选自定义数据集、该计算 App 和脚本，字段名填写 mean。以下查询条件用于固定样本验算。',
      samples: [
        JSON.stringify({
          RequestType: 'normal',
          InParam: { samples: [480, 500, 520, 540, 560].map((V) => ({ V, Q: 192 })) },
        }),
        // modified by jinlong.feng at 2026-11-20 KF助手现场证据补验
        '好质量五笔返回 type=relation，data 第一行的 mean 为 520。缺样或坏质量返回空行集，可按 status 排查。',
        '以上查询条件用于单次串行验算。并发使用前应核实调用端能为每次请求生成独立 RequestID。',
        // end
      ],
    };
  }
  // end
  if (!['period', 'request'].includes(kind)) throw new HttpError(400, '请先打开周期性或请求式计算脚本');
  const request = kind === 'request';
  const file = request ? 'request-mean.js.txt' : 'period-mean.js.txt';
  const code = readFileSync(new URL('../examples/' + file, import.meta.url), 'utf8');
  return {
    code,
    host: request ? '请求式计算' : '周期性计算',
    version: 'KF 3.6',
    instructions: request
      ? '创建请求式计算脚本，将正文放入编辑器。输入 InParam.samples 为五个带 V、Q 的样本，结果取 OutParam。'
      : '先核对本工程别名 Rt 与输入 P_OUT、文本结果 P_AVG5_TEXT。该供水站样例按每分钟采样、好质量 192 和案例时区设计。',
    samples: request
      ? [
          '五个好质量值 480、500、520、540、560，预期 mean = 520。',
          '不足五笔返回 need_five_samples；任一坏质量或非有限数返回 bad_sample。',
        ]
      : [
          '五个连续有效分钟输入 480、500、520、540、560，预期均压 520。',
          '下一分钟 560 替换最旧的 480，预期均压 536。缺分钟或坏质量时核对 WAIT 状态。',
        ],
  };
}
// end
