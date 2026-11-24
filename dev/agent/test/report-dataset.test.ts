// modified by jinlong.feng at 2026-11-22 KF报表数据集运行核对
import assert from 'node:assert/strict';
import test from 'node:test';
import { Store } from '../src/store.ts';
import { ReportJournal, compareReport } from '../src/report-journal.ts';
import { reportObservation } from '../../../devFront/src/assistant/report-har.js';
const origin = 'http://example.test:2346',
  url = origin + '/getReportData',
  script = 'http://example.test:2347/TestRows';
const now = Date.now() - 30,
  invocation = 'sample-12345';
const target = {
  origin,
  appId: 'client',
  nodeId: 'node',
  userName: 'ordinary',
  report: 'report',
  cell: { sheet: 'sheet1', row: 3, column: 1 },
  dataset: 'ds',
  field: 'level',
};
const route: any = {
  ctx: { kind: 'report', projectId: 'report-project' },
  targets: [target],
  b: { lines: [], member: {}, def: { target: {}, script: 'TestRows' }, query: { scale: 4 } },
  calc: { urls: [script], dependencies: [] },
  key: 'route',
};
const view = {
  ...target,
  value: 12,
  display: '12.00',
  at: now + 20,
  requests: [{ url, at: now, end: now + 10 }],
};
function entry(url: string, input: any, output: any) {
  return {
    startedDateTime: new Date(now).toISOString(),
    request: { method: 'POST', url, postData: { text: JSON.stringify(input) } },
    response: { status: 200, content: { text: JSON.stringify(output) } },
  };
}
const hmi = entry(
  url,
  { dataSetIds: ['ds'] },
  { errorCode: 0, data: { ds: { level: [12], correlation: [invocation] } } },
);
const proof = entry(
  script,
  { RequestType: 'normal', InParam: { receiptFor: invocation } },
  {
    receipt: {
      invocation,
      input: { scale: 4 },
      output: { type: 'relation', data: [{ level: 12, correlation: invocation }] },
    },
  },
);
function observe(list = [hmi, proof], withProof = true) {
  const har = { log: { entries: list } };
  return reportObservation(
    har,
    { start: now - 10, scriptUrls: [script] },
    view,
    'correlation',
    withProof ? har : null,
  );
}
const check = (o: any) => compareReport(route, o, now - 10, now + 25);
test('report compares typed values independently of display format and saved input', () => {
  const o = observe();
  assert.equal(check(o).matched, true);
  assert.equal(check({ ...o, view: { ...view, value: '12' } }).matched, false);
  assert.equal(check({ ...o, receipt: { ...o.receipt, input: { scale: 3 } } }).queryMatch, false);
  assert.equal(check(observe([hmi], false)).queryMatch, null);
  const stale = structuredClone(o);
  stale.receipt.output.data[0].level = 13;
  assert.equal(check(stale).outputMatch, false);
});
test('wrong account, mixed loads, missing IDs, duplicate replies and unrelated script never match', () => {
  const o = observe();
  for (const bad of [
    { ...o, view: { ...view, userName: 'other' } },
    { ...o, http: { ...o.http, at: now - 80 } },
    { ...o, view: { ...view, requests: [...view.requests, ...view.requests] } },
    { ...o, receipt: { ...o.receipt, url: script + 'x' } },
    { ...o, receipt: { ...o.receipt, invocation: 'sample-other' } },
    { ...o, receipt: { ...o.receipt, input: { password: 'private' } } },
  ])
    assert.throws(() => check(bad));
  assert.throws(() => observe([hmi, hmi, proof]));
  assert.throws(() => observe([hmi, proof, proof]));
});
test('a stored query does not stand in for a script receipt and HAR secrets stay local', () => {
  const h = structuredClone(hmi);
  h.request.headers = [{ name: 'authorization', value: 'private-header' }];
  const seen = observe([h, proof]);
  assert.ok(!JSON.stringify(seen).includes('private-header'));
  assert.throws(() => observe([h]));
});
test('native jQuery dataset request preserves repeated dataSetIds[] form members', () => {
  const encoded = structuredClone(hmi);
  encoded.request.postData = {
    mimeType: 'application/x-www-form-urlencoded; charset=UTF-8',
    text: 'dataSetIds%5B%5D=other&dataSetIds%5B%5D=ds',
  };
  assert.equal(check(observe([encoded, proof])).matched, true);
});
test('a full resource timing buffer requires a unique HAR navigation from the same document', () => {
  const v = { ...view, requests: [], documentPath: '/', documentStart: now - 4 };
  const doc = {
    pageref: 'page1',
    startedDateTime: new Date(now - 4).toISOString(),
    request: { method: 'GET', url: origin + '/' },
    response: { status: 200, content: { mimeType: 'text/html' } },
  };
  const load = { ...hmi, pageref: 'page1' };
  function from(entries: any[]) {
    const har = { log: { entries } };
    return reportObservation(har, { start: now - 10, scriptUrls: [script] }, v, 'correlation', har);
  }
  assert.equal(check(from([doc, load, proof])).matched, true);
  assert.throws(() => check(from([doc, { ...load, pageref: 'page2' }, proof])));
  assert.throws(() => check(from([doc, doc, load, proof])));
  assert.throws(() => check(from([load, proof])));
});
test('history rechecks report and computation access before resolving saved data across entrances', async () => {
  const store = new Store(':memory:');
  try {
    const { chatId } = store.createPlan('one', 'plan');
    const second = store.createPlan('two', 'other').chatId;
    const ctx = { kind: 'general', projectId: '', object: '', dirty: false } as const;
    const source = { kind: 'report', projectId: 'first', object: 'report', cell: target.cell, dirty: false };
    store.db
      .prepare('INSERT INTO report_captures VALUES(?,?,?,?,?)')
      .run(
        'only',
        chatId,
        JSON.stringify(source),
        JSON.stringify([{ kind: 'request', projectId: 'second', runtimeApp: 'app', runtimeNode: 'node' }]),
        JSON.stringify({ lines: ['private'], matched: true }),
      );
    const journal = new ReportJournal(store, {
      require: async () => {},
      evidence: async () => {
        throw Error('revoked');
      },
    } as any);
    assert.equal((await journal.read('two', 'b', second, ctx, async () => true)).summary.receipts, 0);
    await assert.rejects(journal.read('two', 'b', chatId, ctx, async () => true));
    assert.equal(
      (
        await journal.read(
          'one',
          'a',
          chatId,
          ctx,
          async (row) => !JSON.parse(row.dependencies).some((d) => d.runtimeApp === 'app'),
        )
      ).summary.receipts,
      0,
    );
  } finally {
    store.db.close();
  }
});
// end
