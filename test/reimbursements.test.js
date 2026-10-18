import assert from 'node:assert/strict';
import test from 'node:test';
import { GustoClient, buildReimbursementRequest, isReadOnlyReimbursementRequest, collectReimbursements, parseReimbursementPage } from '../src/index.js';

const memberId = 'example-member';
const record = (id = 'example-expense') => ({
  id, member: { id: memberId }, amount: '23.81', currency: null,
  status: 'NEEDS_REVIEW', createdAt: '2026-03-10T11:27:00-07:00',
  purchaseDate: '2026-02-16', checkDate: null, approvedBy: null,
  categoryName: 'Meals', displayName: 'Example merchant', description: '',
  vendor: { id: 'example-vendor', name: 'Example merchant' },
  receipt: { id: 'example-receipt', name: 'example-receipt.pdf', contentType: 'application/pdf', url: 'https://example.test/private-signed-url?token=example-secret' }
});
const page = (nodes = [record()], options = {}) => ({ data: { member: { id: memberId, expenses: { expenses: {
  nodes, pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null, ...options }
} } } } });

test('preserves source amounts, null currency, dates and status without inferring payment', () => {
  const [value] = parseReimbursementPage(page()).records;
  assert.equal(value.amount, '23.81');
  assert.equal(value.currency, null);
  assert.equal(value.status, 'NEEDS_REVIEW');
  assert.equal(value.checkDate, null);
  assert.equal(value.createdAt, '2026-03-10T11:27:00-07:00');
  assert.equal(value.submittedAt, undefined);
  assert.equal(value.paid, undefined);
  assert.equal(value.receipt.id, 'example-receipt');
  assert.equal(value.receipt.url, undefined);
  assert.ok(!JSON.stringify(value).includes('example-secret'));
});

test('preserves paid and unknown status values, optional receipts and approvers', () => {
  const paid = { ...record(), status: 'PAID', checkDate: '2026-03-11', approvedBy: 'Example Reviewer', receipt: null };
  assert.equal(parseReimbursementPage(page([paid])).records[0].checkDate, '2026-03-11');
  assert.equal(parseReimbursementPage(page([{ ...paid, status: 'FUTURE_STATE' }])).records[0].status, 'FUTURE_STATE');
});

test('rejects GraphQL partial errors without exposing response contents', () => {
  assert.throws(() => parseReimbursementPage({ ...page(), errors: [{ message: 'private-value' }] }), { message: 'Gusto reimbursement query returned errors' });
  assert.throws(() => parseReimbursementPage({ errors: [] }), /Missing reimbursement member/);
});

test('validates shape, identities, amounts and dates', () => {
  for (const change of [{ amount: 23.81 }, { amount: '23.8' }, { purchaseDate: '2026-02-30' }, { checkDate: 'March 11' }, { createdAt: '2026-03-10' }, { createdAt: '2026-02-30T10:00:00Z' }, { member: { id: 'different' } }]) {
    assert.throws(() => parseReimbursementPage(page([{ ...record(), ...change }])));
  }
  assert.throws(() => parseReimbursementPage(page(), { memberId: 'different' }), /identity mismatch/);
  assert.throws(() => parseReimbursementPage(page([record(), record()])), /Duplicate/);
  assert.throws(() => parseReimbursementPage(page([], { hasNextPage: true, endCursor: 'next' })), /Empty non-terminal/);
  assert.throws(() => parseReimbursementPage(page([], { hasNextPage: true })), /end cursor/);
});

test('collects every cursor page and verifies the expected unique count', async () => {
  const cursors = [];
  const result = await collectReimbursements(async ({ after }) => {
    cursors.push(after);
    return after === null ? page([record('first')], { hasNextPage: true, endCursor: 'next' }) : page([record('second')], { hasPreviousPage: true, endCursor: 'last' });
  }, { expectedCount: 2 });
  assert.deepEqual(cursors, [null, 'next']);
  assert.equal(result.complete, true);
  assert.equal(result.pageCount, 2);
  assert.deepEqual(result.records.map((r) => r.id), ['first', 'second']);
});

test('accepts a proven empty account, not a missing connection', async () => {
  assert.equal((await collectReimbursements(async () => page([]), { expectedCount: 0 })).records.length, 0);
  await assert.rejects(collectReimbursements(async () => ({ data: { member: { id: memberId } } })), /connection/);
});

test('rejects incomplete, repeated, conflicting, or changing pagination', async () => {
  await assert.rejects(collectReimbursements(async () => page([record()], { hasPreviousPage: true })), /Incomplete/);
  await assert.rejects(collectReimbursements(async () => page(), { expectedCount: 2 }), /count mismatch/);
  await assert.rejects(collectReimbursements(async ({ after }) => page([record(after ?? 'first')], { hasNextPage: true, hasPreviousPage: after !== null, endCursor: 'next' })), /cursor/);
  await assert.rejects(collectReimbursements(async ({ after }) => page([record()], { hasNextPage: after === null, hasPreviousPage: after !== null, endCursor: 'next' })), /Duplicate/);
  await assert.rejects(collectReimbursements(async () => page([record()], { hasNextPage: true, endCursor: 'next' }), { maxPages: 1 }), /page limit/);
});

test('does not turn transport errors into a successful partial collection', async () => {
  await assert.rejects(collectReimbursements(async () => { throw new Error('private-credential'); }), { message: 'Gusto reimbursement page request failed' });
});

test('builds a fixed read-only query with bounded cursor variables', () => {
  const request = buildReimbursementRequest({ first: 10, after: 'example-cursor' });
  assert.equal(request.url, 'https://graphql.app.gusto.com/?operationName=MemberExpenses');
  assert.equal(request.method, 'POST');
  assert.equal(isReadOnlyReimbursementRequest(request), true);
  const payload = JSON.parse(request.body);
  assert.deepEqual(payload.variables, { first: 10, after: 'example-cursor' });
  assert.match(payload.query, /filter: \{\}, order: "-created_at"/);
  assert.ok(!/approvableExpenses|vendors\(|\burl\b/.test(payload.query));
  for (const first of [0, 101, 1.5, '10', null]) assert.throws(() => buildReimbursementRequest({ first }), /page size/);
  assert.throws(() => buildReimbursementRequest({ after: 7 }), /cursor/);
});

test('rejects endpoint, query, operation and variable spoofing at the POST guard', () => {
  const request = buildReimbursementRequest();
  const payload = JSON.parse(request.body);
  const modified = (change) => ({ ...request, body: JSON.stringify({ ...payload, ...change }) });
  for (const invalid of [
    { ...request, url: 'https://example.test/?operationName=MemberExpenses' },
    { ...request, url: `${request.url}&extra=true` },
    { ...request, url: `${request.url}#fragment` },
    { ...request, body: payload }, { ...request, body: '{' },
    modified({ query: 'mutation MemberExpenses { submitExpense { id } }' }),
    modified({ query: `${payload.query}\nmutation Submit { submitExpense { id } }` }),
    modified({ operationName: 'SubmitExpense' }),
    modified({ extensions: {} }), modified({ variables: null }),
    modified({ variables: { first: 101, after: null } }),
    modified({ variables: { first: 100, after: null, teamExpenses: true } }),
    modified({ variables: { first: 100 } }),
    modified({ variables: { first: 100, after: {} } })
  ]) assert.equal(isReadOnlyReimbursementRequest(invalid), false);
  assert.equal(isReadOnlyReimbursementRequest(), false);
});

test('lists reimbursements through the injected guarded POST transport', async () => {
  const calls = [];
  const client = new GustoClient({ fetch: async (url, options) => {
    assert.equal(isReadOnlyReimbursementRequest({ url, body: options.body }), true);
    assert.equal(options.method, 'POST');
    const { variables } = JSON.parse(options.body);
    calls.push(variables);
    return { ok: true, json: async () => variables.after === null ?
      page([record('first')], { hasNextPage: true, endCursor: 'next' }) :
      page([{ ...record('second'), statusReason: 'Awaiting payroll' }], { hasPreviousPage: true }) };
  } });
  const result = await client.listReimbursements({ pageSize: 1, expectedCount: 2 });
  assert.deepEqual(calls, [{ first: 1, after: null }, { first: 1, after: 'next' }]);
  assert.equal(result.pageCount, 2);
  assert.equal(result.records[1].statusReason, 'Awaiting payroll');
  assert.ok(!JSON.stringify(result).includes('example-secret'));
});

test('fails safely on HTTP, login, non-JSON and partial GraphQL responses', async () => {
  for (const response of [
    { ok: false, status: 401 }, { ok: false, status: 500 },
    { ok: true, url: 'https://app.gusto.com/login', json: async () => page() },
    { ok: true, json: async () => { throw new Error('<html>private-token</html>'); } }
  ]) {
    const client = new GustoClient({ fetch: async () => response });
    await assert.rejects(client.listReimbursements(), { message: 'Gusto reimbursement page request failed' });
  }
  const partial = new GustoClient({ fetch: async () => ({ ok: true, json: async () => ({ ...page(), errors: [{ message: 'private-token' }] }) }) });
  await assert.rejects(partial.listReimbursements(), { message: 'Gusto reimbursement query returned errors' });
  const empty = new GustoClient({ fetch: async () => ({ ok: true, json: async () => page([]) }) });
  assert.equal((await empty.listReimbursements({ expectedCount: 0 })).complete, true);
});
