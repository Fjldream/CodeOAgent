// modified by jinlong.feng at 2026-11-20 KF开发助手M1
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.ts';
import { pageInputs, scriptReferences } from '../src/center.ts';
import { evidenceGuide } from '../src/guidance.ts';
import type { Evidence } from '../src/shared.ts';

const general = { kind: 'general', object: '', projectId: '', dirty: false } as const;

test('已保存页面只把明确读取的系统变量作为输入', () => {
  assert.deepEqual(pageInputs('$System.A=1; display($System.B); display($System[tag]);'), {
    tags: ['B'],
    partial: true,
  });
  assert.deepEqual(pageInputs('function sample($System){return $System.local}'), { tags: [], partial: true });
});

test('KF 顶层 await、常量、动态参数和局部同名函数', () => {
  const actual = scriptReferences(
    'const alias="A", tag="T"; await KIOQueryDatas(alias,[tag, getTag()]); await KIOUpdateDatas(alias,[{N:"OUT",V:2}]);',
  );
  assert.deepEqual(actual.edges.map((x) => x.tag).sort(), ['OUT', 'T']);
  assert.equal(actual.partial, true);
  for (const code of [
    'foo.KIOQueryDatas("A",["T"])',
    'function KIOQueryDatas(){} KIOQueryDatas("A",["T"]);',
    '{const tag="T";} KIOQueryDatas("A",[tag]);',
    'KIOUpdateDatas("A",[{N:"OUT",...obj}]);',
    '/* KIOQueryDatas("A",["T"]) */',
  ])
    assert.equal(scriptReferences(code).edges.length, 0);
});

test('模型不能把未验证的菜单、字段或操作带入客户答复', () => {
  const e: Evidence = {
    id: 'ev-current',
    layer: 'saved',
    at: 't',
    title: '对象',
    facts: [{ label: '读取点', value: '入口' }],
    references: ['common'],
    gaps: ['运行值待查'],
  };
  const previous = { ...e, id: 'ev-prior' };
  for (const model of ['建议去控制台读取表单', '{"sections":["comparison","verify","执行部署"]}']) {
    const output = evidenceGuide(e, previous, model);
    assert.match(output, /ev-prior/);
    assert.match(output, /ev-current/);
    assert.match(output, /运行值待查/);
    assert.doesNotMatch(output, /控制台|执行部署/);
  }
});

test('账号所属、同一请求重放、版本竞争、中断和冷备份读回', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'kf-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'assistant.sqlite'),
    store = new Store(file);
  const { id: plan, chatId: c1 } = store.createPlan('A', '个人方案'),
    c2 = store.createChat('A', plan, '另一个工程');
  const create = (chat: string) => {
    const run = randomUUID();
    assert.ok(store.start('A', chat, run, '问题', general, 'propose'));
    assert.equal(store.start('A', chat, run, '问题', general, 'propose'), false);
    assert.throws(() => store.start('A', chat, randomUUID(), '另一个问题', general, 'ask'));
    store.finish(run, 'done', '已核对', null, '已保存项');
    return String(store.items(plan).find((p) => p.run === run)!.id);
  };
  const p = create(c1),
    q = create(c2);
  assert.deepEqual(store.workspace('B'), []);
  assert.throws(() => store.proposal('B', p));
  assert.throws(() => store.chat('B', c1));
  assert.equal(store.decide('A', p, 'confirmed').revision, 1);
  assert.equal(store.decide('A', p, 'confirmed').revision, 1);
  assert.throws(() => store.decide('A', q, 'confirmed'));
  assert.equal(store.decide('A', q, 'rejected').revision, 1);
  const interrupted = randomUUID();
  store.start('A', c2, interrupted, '未结束', general, 'ask');
  const backup = join(dir, 'snapshot.sqlite');
  store.db.prepare('VACUUM INTO ?').run(backup);
  store.db.close();
  for (const restored of [file, backup]) {
    const db = new Store(restored);
    assert.equal(db.run('A', interrupted).status, 'interrupted');
    assert.equal(db.plan('A', plan).revision, 1);
    assert.equal(db.proposal('A', p).status, 'confirmed');
    assert.equal(db.workspace('A')[0].chats.length, 2);
    db.db.close();
  }
});
// end
