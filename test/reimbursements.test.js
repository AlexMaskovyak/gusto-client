import assert from 'node:assert/strict';
import test from 'node:test';
import { collectReimbursements, parseReimbursementPage } from '../src/index.js';

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
