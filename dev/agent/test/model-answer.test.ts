// modified by jinlong.feng at 2026-11-20 KF助手模型统一答复
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelAnswer } from '../src/model-answer.ts';

const facts = { read_client_variables: '本地核对的变量清单' };
const resolve = (draft: string, review: unknown) =>
  resolveModelAnswer(draft, facts, 'test-model', Object.keys(facts), false, async () =>
    JSON.stringify(review),
  );
test('模型正文按原顺序交付，实名字段按模型引用在本机插入', async () => {
  const result = await resolve('先核对已有变量。\n[[read_client_variables]]\n然后核对连接。', {
    kind: 'approve',
    basis: ['step:clientSource', 'read_client_variables'],
  });
  assert.equal(result.answer, '先核对已有变量。\n本地核对的变量清单\n然后核对连接。');
  assert.equal(result.source.kind, 'model-text');
});
test('草稿无依据只允许一次核验或修正，不能回退成变量清单', async () => {
  const fixed = await resolve('点击不存在的操作', { kind: 'clarify', fields: ['source'] });
  assert.equal(fixed.source.check, 'review-correction');
  assert.doesNotMatch(fixed.answer, /不存在的操作|本地核对的变量清单/);
  for (const [draft, verdict] of [
    ['声称已运行', { kind: 'unverified' }],
    [
      '错误推论：[[read_client_variables]]，因此上游没有点。',
      { kind: 'approve', basis: ['read_client_variables'] },
    ],
    ['假装有运行读数', { kind: 'approve', basis: ['read_runtime'] }],
    ['[[read_runtime]]', { kind: 'approve', basis: ['step:monitor'] }],
    ['历史上已经发布', { kind: 'approve', basis: ['history'] }],
    ['{"kind":"clarify","fields":["错字段"]}', { kind: 'approve', basis: ['user'] }],
  ] as const)
    await assert.rejects(resolve(draft, verdict), /缺少可核验/);
});
test('核验可保留有依据的原文段落，连续对话只继承最终交付的内容', async () => {
  const result = await resolve(
    '根据变量表推测进程已停止。\n\n[[read_client_variables]]\n\n如果要看运行状态，需检查目标实例。',
    { kind: 'approve', keep: [1, 2], basis: ['read_client_variables', 'step:deployment'] },
  );
  assert.equal(result.answer, '本地核对的变量清单\n\n如果要看运行状态，需检查目标实例。');
  assert.match(result.source.continuity!, /\[\[read_client_variables\]\]/);
  assert.doesNotMatch(result.source.continuity!, /已停止|本地核对的变量清单/);
  await assert.rejects(resolve('原段', { kind: 'approve', keep: [1], basis: ['user'] }));
});
test('逐步指导保留简短正文，明确复核的完整说明可以展开', async () => {
  const walkthrough = '按相应工程的操作资料核对已保存配置。'.repeat(35);
  await assert.rejects(resolve(walkthrough, { kind: 'approve', basis: ['step:clientPoint'] }));
  assert.equal(
    (await resolve(walkthrough, { kind: 'approve', scope: 'detailed', basis: ['step:clientPoint'] })).answer,
    walkthrough,
  );
  await assert.rejects(resolve('参见 step:clientPoint', { kind: 'approve', basis: ['step:clientPoint'] }));
});
test('核验纠正使用模型选定的有序资料，格式错误最多再校正一次', async () => {
  let calls = 0;
  const result = await resolveModelAnswer(
    '不可核实的原稿',
    facts,
    'model',
    Object.keys(facts),
    false,
    async (_draft, options, repair) => {
      calls++;
      if (!repair) return '{"kind":"clarify","fields":["完整的一句话"]}';
      return JSON.stringify({
        choices: ['step:clientPoint', 'ask:pointName'].map((key) => ({ index: options.indexOf(key) })),
      });
    },
  );
  assert.equal(calls, 2);
  assert.deepEqual(result.source.basis, ['step:clientPoint', 'ask:pointName']);
  // modified by jinlong.feng at 2026-11-21 KF助手工程指导文风
  assert.match(result.answer, /快速添加[\s\S]*请提供目标点名/);
  // end
  assert.doesNotMatch(result.answer, /本地核对的变量清单/);
  calls = 0;
  await assert.rejects(
    resolveModelAnswer('无资料', {}, 'model', [], false, async () => {
      calls++;
      return '{"kind":"unverified"}';
    }),
  );
  assert.equal(calls, 1);
});
test('使用历史快照时不标成本轮已查', async () => {
  const key = 'history:read_client_variables';
  const result = await resolveModelAnswer(
    '[[history:read_client_variables]]',
    { [key]: '上次读回的配置（时间）' },
    'model',
    [],
    true,
    async () => JSON.stringify({ kind: 'approve', basis: [key] }),
  );
  assert.deepEqual(result.source.tools, []);
  assert.deepEqual(result.source.basis, [key]);
  assert.match(result.answer, /上次读回/);
});
// modified by jinlong.feng at 2026-11-21 KF助手模型统一答复
test('修正按原样选取具名操作材料，未知名字不能落入其他操作', async () => {
  const corrected = await resolve('失去依据的长说明', { select: ['step:clientSource', 'step:clientPoint'] });
  assert.match(corrected.answer, /数据源管理[\s\S]*快速添加/);
  assert.equal(corrected.source.kind, 'model-guide');
  await assert.rejects(resolve('失去依据的长说明', { select: ['step:unknown'] }));
});
// end
// end

// modified by jinlong.feng at 2026-11-23 KF通用JS宿主开发
test('本轮已经通过检查的模型正文直接交付，历史稿不会被误当成当前产物', async () => {
  const script='request · 完整 JS 候选（静态检查）\nOutParam.result=42;\nendResponse(RequestID);';
  const tools=['inspect_script_environment','check_script_drafts'];
  const response=await resolveModelAnswer('{"kind":"facts","tools":["inspect_script_environment"]}',
    {inspect_script_environment:'工程摘要', check_script_drafts:script},'test-model',tools,false,
    async()=>{throw Error('已经完成的候选正文无需模型再择材');});
  assert.equal(response.answer,script);
  assert.deepEqual(response.source.basis,['check_script_drafts']);
  const prior=await resolveModelAnswer('{"kind":"facts","tools":["inspect_script_environment"]}',
    {inspect_script_environment:'工程摘要','history:check_script_drafts':script},'test-model',tools,true,async()=>'');
  assert.equal(prior.answer,'工程摘要');
});
// end
