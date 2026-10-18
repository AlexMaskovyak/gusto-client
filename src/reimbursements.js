const REIMBURSEMENT_ENDPOINT = 'https://graphql.app.gusto.com/?operationName=MemberExpenses';
const REIMBURSEMENT_QUERY = `query MemberExpenses($after: String, $first: Int) {
  member {
    id
    expenses {
      expenses(after: $after, first: $first, filter: {}, order: "-created_at") {
        nodes {
          id amount approvedBy categoryName checkDate createdAt currency
          description displayName purchaseDate status statusReason
          member { id }
          receipt { id contentType name }
          vendor { id name }
        }
        pageInfo { endCursor hasNextPage hasPreviousPage }
      }
    }
  }
}`;

/** Build the fixed employee-expense read. Authentication belongs to the transport. */
export function buildReimbursementRequest({ first = 100, after = null } = {}) {
  if (!Number.isInteger(first) || first < 1 || first > 100) throw new Error('Reimbursement page size must be between 1 and 100');
  if (after !== null && typeof after !== 'string') throw new Error('Invalid reimbursement cursor');
  return {
    url: REIMBURSEMENT_ENDPOINT,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationName: 'MemberExpenses', query: REIMBURSEMENT_QUERY, variables: { first, after } })
  };
}

/** Restrict an authenticated POST transport to the fixed read-only query. */
export function isReadOnlyReimbursementRequest({ url, body } = {}) {
  try {
    if (new URL(url).href !== REIMBURSEMENT_ENDPOINT || typeof body !== 'string') return false;
    const request = JSON.parse(body);
    if (!request || Object.keys(request).sort().join(',') !== 'operationName,query,variables' ||
        request.operationName !== 'MemberExpenses' || request.query !== REIMBURSEMENT_QUERY) return false;
    const variables = request.variables;
    return Boolean(variables && typeof variables === 'object' && !Array.isArray(variables) &&
      Object.keys(variables).sort().join(',') === 'after,first' &&
      Number.isInteger(variables.first) && variables.first >= 1 && variables.first <= 100 &&
      (variables.after === null || typeof variables.after === 'string'));
  } catch { return false; }
}

function object(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value;
}

function string(value, name, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid reimbursement ${name}`);
  return value;
}

function date(value, name, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid reimbursement ${name}`);
  }
  return value;
}

function normalizeRecord(node, memberId) {
  object(node, 'Invalid reimbursement record');
  if (node.member?.id !== memberId) throw new Error('Reimbursement member identity mismatch');
  const amount = string(node.amount, 'amount');
  if (!/^-?(?:0|[1-9]\d*)\.\d{2}$/.test(amount)) throw new Error('Invalid reimbursement amount');
  const createdAt = string(node.createdAt, 'createdAt');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error('Invalid reimbursement createdAt');
  }
  date(createdAt.slice(0, 10), 'createdAt date');
  let receipt = null;
  if (node.receipt != null) {
    object(node.receipt, 'Invalid reimbursement receipt');
    receipt = {
      id: string(node.receipt.id, 'receipt ID'),
      filename: string(node.receipt.name, 'receipt filename', { nullable: true }),
      contentType: string(node.receipt.contentType, 'receipt content type', { nullable: true })
    };
  }
  return {
    id: string(node.id, 'ID'), memberId, amount,
    currency: string(node.currency, 'currency', { nullable: true }),
    status: string(node.status, 'status'),
    statusReason: string(node.statusReason, 'status reason', { nullable: true }),
    createdAt, purchaseDate: date(node.purchaseDate, 'purchase date'),
    checkDate: date(node.checkDate, 'check date', { nullable: true }),
    approvedBy: string(node.approvedBy, 'approver', { nullable: true }),
    categoryName: string(node.categoryName, 'category', { nullable: true }),
    displayName: string(node.displayName, 'display name', { nullable: true }),
    description: typeof node.description === 'string' ? node.description : null,
    vendor: node.vendor == null ? null : {
      id: string(node.vendor.id, 'vendor ID'), name: string(node.vendor.name, 'vendor name')
    },
    receipt
  };
}

/** Normalize a complete GraphQL response, omitting expiring receipt URLs. */
export function parseReimbursementPage(payload, { memberId: expectedMemberId } = {}) {
  object(payload, 'Invalid reimbursement response');
  if (payload.errors != null && (!Array.isArray(payload.errors) || payload.errors.length)) {
    throw new Error('Gusto reimbursement query returned errors');
  }
  const member = object(payload.data?.member, 'Missing reimbursement member');
  const memberId = string(member.id, 'member ID');
  if (expectedMemberId != null && expectedMemberId !== memberId) throw new Error('Reimbursement member identity mismatch');
  const connection = object(member.expenses?.expenses, 'Missing reimbursement connection');
  if (!Array.isArray(connection.nodes)) throw new Error('Missing reimbursement nodes');
  const info = object(connection.pageInfo, 'Missing reimbursement page information');
  if (typeof info.hasNextPage !== 'boolean' || typeof info.hasPreviousPage !== 'boolean') throw new Error('Invalid reimbursement page information');
  const endCursor = string(info.endCursor, 'end cursor', { nullable: !info.hasNextPage });
  const records = connection.nodes.map((node) => normalizeRecord(node, memberId));
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error('Duplicate reimbursement ID');
  if (info.hasNextPage && records.length === 0) throw new Error('Empty non-terminal reimbursement page');
  return { memberId, records, pageInfo: { hasNextPage: info.hasNextPage, hasPreviousPage: info.hasPreviousPage, endCursor } };
}

/** The caller supplies the browser-discovered read-only page request. */
export async function collectReimbursements(readPage, { expectedCount, maxPages = 1000, memberId } = {}) {
  if (typeof readPage !== 'function') throw new Error('A reimbursement page reader is required');
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) throw new Error('Invalid reimbursement page limit');
  if (expectedCount != null && (!Number.isSafeInteger(expectedCount) || expectedCount < 0)) throw new Error('Invalid expected reimbursement count');
  const records = [];
  const ids = new Set();
  const cursors = new Set();
  let after = null;
  let accountId = memberId;
  for (let page = 0; page < maxPages; page += 1) {
    let payload;
    try { payload = await readPage({ after }); }
    catch { throw new Error('Gusto reimbursement page request failed'); }
    const result = parseReimbursementPage(payload, { memberId: accountId });
    accountId = result.memberId;
    if (result.pageInfo.hasPreviousPage !== (page > 0)) throw new Error('Incomplete reimbursement pagination');
    for (const record of result.records) {
      if (ids.has(record.id)) throw new Error('Duplicate reimbursement ID across pages');
      ids.add(record.id);
      records.push(record);
    }
    if (!result.pageInfo.hasNextPage) {
      if (expectedCount != null && records.length !== expectedCount) throw new Error('Reimbursement count mismatch');
      return { memberId: accountId, records, pageCount: page + 1, complete: true };
    }
    after = result.pageInfo.endCursor;
    if (cursors.has(after)) throw new Error('Reimbursement cursor made no progress');
    cursors.add(after);
  }
  throw new Error('Reimbursement pagination exceeded the page limit');
}
