import { createHash } from 'node:crypto';
import operation from './create-expense-operation.js';
import { parseReimbursementPage } from './reimbursements.js';

const UPLOAD_ENDPOINT = 'https://app.gusto.com/rails/active_storage/direct_uploads';
const MIME_EXTENSIONS = {
  'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'],
  'image/heic': ['heic'], 'image/heif': ['heif']
};
const digest = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const fail = (message) => { throw new Error(message); };
const exactKeys = (value, keys) => plain(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export class GustoSubmissionError extends Error {
  constructor(phase, outcome, expenseId) {
    super(`Gusto ${phase} ${outcome}; reconcile service state before retrying`);
    this.name = 'GustoSubmissionError';
    this.phase = phase;
    this.outcome = outcome;
    this.retryable = false;
    if (expenseId) this.expenseId = expenseId;
  }
}

/** Validate without network activity. Amount is the gross receipt amount. */
export function prepareReimbursementSubmission(input) {
  const required = ['amount', 'categoryUuid', 'companyMemberId', 'currency', 'description', 'purchaseDate'];
  if (!plain(input) || Object.keys(input).some((key) => ![...required, 'expenseVendor', 'categoryRateUuid', 'rateAmount', 'fileId'].includes(key)) || required.some((key) => !Object.hasOwn(input, key))) fail('Invalid reimbursement input fields');
  for (const key of ['categoryUuid', 'companyMemberId', 'currency', 'purchaseDate']) if (!text(input[key])) fail(`Invalid reimbursement ${key}`);
  if (typeof input.amount !== 'string' || !/^(?:0|[1-9]\d{0,8})\.\d{2}$/.test(input.amount) || input.amount === '0.00') fail('Amount must be a positive decimal string below 999999999');
  if (BigInt(input.amount.replace('.', '')) >= 99999999900n) fail('Amount must be below 999999999');
  if (!/^[A-Z]{3}$/.test(input.currency) || ['USDC', 'USDT'].includes(input.currency)) fail('Invalid reimbursement currency');
  const day = new Date(`${input.purchaseDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.purchaseDate) || !Number.isFinite(day.valueOf()) || day.toISOString().slice(0, 10) !== input.purchaseDate) fail('Invalid reimbursement purchaseDate');
  if (typeof input.description !== 'string' || input.description.length > 255 || /[\r\n]/.test(input.description)) fail('Invalid reimbursement description');
  const result = Object.fromEntries(required.map((key) => [key, input[key]]));
  if (input.expenseVendor !== undefined) {
    const vendor = input.expenseVendor;
    if (!(exactKeys(vendor, ['id']) && text(vendor.id)) && !(exactKeys(vendor, ['name']) && text(vendor.name))) fail('Vendor requires exactly one ID or name');
    result.expenseVendor = { ...vendor };
  }
  if (input.fileId !== undefined) {
    if (!text(input.fileId)) fail('Invalid uploaded receipt ID');
    result.fileId = input.fileId;
  }
  if (input.categoryRateUuid !== undefined || input.rateAmount !== undefined) {
    if (!text(input.categoryRateUuid) || typeof input.rateAmount !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.rateAmount) || !/[1-9]/.test(input.rateAmount)) fail('Mileage requires a rate ID and positive decimal quantity');
    result.categoryRateUuid = input.categoryRateUuid;
    result.rateAmount = input.rateAmount;
  }
  return result;
}

export function buildCreateReimbursementRequest(input) {
  return { url: operation.endpoint, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operationName: operation.operationName, query: operation.query, variables: { input: prepareReimbursementSubmission(input) } }) };
}

/** Scope transport permission to this exact approved input, not arbitrary creates. */
export function createReimbursementSubmissionGuard(input) {
  const request = buildCreateReimbursementRequest(input);
  return ({ url, method, body }) => String(url) === request.url && method === 'POST' && body === request.body;
}

export function prepareReceiptUpload({ filename, contentType, bytes } = {}) {
  if (!text(filename) || filename.length > 255 || /[\\/\x00-\x1f\x7f]/.test(filename) || ['.', '..'].includes(filename)) fail('Receipt requires a safe filename');
  const extension = filename.split('.').at(-1).toLowerCase();
  if (!MIME_EXTENSIONS[contentType]?.includes(extension)) fail('Unsupported receipt type or extension');
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > 15000000) fail('Receipt must contain at most 15 MB');
  const body = new Uint8Array(bytes);
  const header = Buffer.from(body.subarray(0, 16));
  const signatureOk = contentType === 'application/pdf' ? header.subarray(0, 5).toString() === '%PDF-' :
    contentType === 'image/png' ? header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    contentType === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255 :
    header.subarray(4, 8).toString() === 'ftyp';
  if (!signatureOk) fail('Receipt content does not match its declared type');
  return { filename, contentType, bytes: body, byteSize: body.byteLength, sha256: digest(body), checksum: digest(body, 'md5', 'base64') };
}

export function buildReceiptUploadRequest(receipt) {
  const prepared = prepareReceiptUpload(receipt);
  return { url: UPLOAD_ENDPOINT, method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' },
    body: JSON.stringify({ blob: { filename: prepared.filename, content_type: prepared.contentType, byte_size: prepared.byteSize, checksum: prepared.checksum } }) };
}

export function createReceiptUploadGuard(receipt) {
  const request = buildReceiptUploadRequest(receipt);
  return ({ url, method, body }) => String(url) === request.url && method === 'POST' && body === request.body;
}

function storageRequest(payload, receipt, origins) {
  if (!plain(payload) || !text(payload.signed_id) || payload.filename !== receipt.filename || payload.content_type !== receipt.contentType || payload.byte_size !== receipt.byteSize || payload.checksum !== receipt.checksum) fail('Receipt upload metadata mismatch');
  const url = new URL(payload.direct_upload?.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !Array.isArray(origins) || !origins.includes(url.origin)) fail('Unapproved receipt storage origin');
  const headers = new Headers(payload.direct_upload.headers);
  for (const name of headers.keys()) if (/^(?:authorization|cookie|proxy-authorization|host|x-csrf-token)$/i.test(name)) fail('Unexpected receipt storage credentials');
  return { url: url.href, method: 'PUT', headers: Object.fromEntries(headers), body: receipt.bytes, credentials: 'omit', redirect: 'manual' };
}

/** Runtime-only guard: do not serialize the signed URL or receipt bytes. */
export function createReceiptStorageGuard(request) {
  const url = request.url;
  const headers = JSON.stringify([...new Headers(request.headers)].sort());
  const hash = digest(new Uint8Array(request.body));
  return (candidate) => String(candidate.url) === url && candidate.method === 'PUT' && candidate.body instanceof Uint8Array && digest(candidate.body) === hash && JSON.stringify([...new Headers(candidate.headers)].sort()) === headers;
}

async function write(fetch, request, phase, { json = true } = {}) {
  try {
    const { url, ...init } = request;
    const response = await fetch(url, { ...init, redirect: 'manual', credentials: phase === 'receipt-upload' ? 'omit' : 'same-origin' });
    if (!response.ok) throw new GustoSubmissionError(phase, response.status >= 400 && response.status < 500 && response.status !== 408 ? 'rejected' : 'unknown');
    return json ? await response.json() : null;
  } catch (error) {
    if (error instanceof GustoSubmissionError) throw error;
    throw new GustoSubmissionError(phase, 'unknown');
  }
}

/** Upload alone does not create an expense. The storage factory must not carry app credentials. */
export async function uploadReimbursementReceipt(receipt, { receiptFetch, createStorageFetch, storageOrigins } = {}) {
  const prepared = prepareReceiptUpload(receipt);
  if (typeof receiptFetch !== 'function' || typeof createStorageFetch !== 'function' || !Array.isArray(storageOrigins) || storageOrigins.length === 0) fail('Receipt and credential-free storage transports with approved origins are required');
  const metadata = await write(receiptFetch, buildReceiptUploadRequest(prepared), 'receipt-metadata');
  let request;
  try { request = storageRequest(metadata, prepared, storageOrigins); }
  catch { throw new GustoSubmissionError('receipt-metadata', 'unknown'); }
  let fetch;
  try {
    fetch = createStorageFetch({ origin: new URL(request.url).origin, authorizeWrite: createReceiptStorageGuard(request) });
    if (typeof fetch !== 'function') fail('Invalid storage transport');
  } catch { throw new GustoSubmissionError('receipt-upload', 'not-sent'); }
  await write(fetch, request, 'receipt-upload', { json: false });
  return { fileId: metadata.signed_id, filename: prepared.filename, sha256: prepared.sha256 };
}

function matches(record, input) {
  return record.memberId === input.companyMemberId && record.amount === input.amount && (record.currency === null || record.currency === input.currency) && record.purchaseDate === input.purchaseDate && record.description === input.description;
}

/** Explicit write path; no retries. Verify by stable returned ID, never by amount alone. */
export async function submitReimbursement(input, { expenseFetch, createExpenseFetch, readReimbursements, receipt, receiptFetch, createStorageFetch, storageOrigins } = {}) {
  const approved = prepareReimbursementSubmission(input);
  if ((typeof expenseFetch !== 'function' && typeof createExpenseFetch !== 'function') || typeof readReimbursements !== 'function') fail('Explicit expense write and read-back transports are required');
  if (receipt && approved.fileId) fail('Supply receipt bytes or an existing uploaded receipt ID, not both');
  if (receipt) prepareReceiptUpload(receipt);
  let before;
  try { before = await readReimbursements(); }
  catch { throw new GustoSubmissionError('preflight', 'not-sent'); }
  if (before.complete !== true || before.memberId !== approved.companyMemberId) fail('Complete matching employee reimbursement inventory required');
  if (before.records.some((record) => matches(record, approved))) fail('Possible duplicate reimbursement; reconcile before submitting');
  const uploaded = receipt ? await uploadReimbursementReceipt(receipt, { receiptFetch, createStorageFetch, storageOrigins }) : null;
  const submitted = uploaded ? { ...approved, fileId: uploaded.fileId } : approved;
  const request = buildCreateReimbursementRequest(submitted);
  let fetch;
  try {
    fetch = createExpenseFetch ? createExpenseFetch({ origin: new URL(request.url).origin, authorizeWrite: createReimbursementSubmissionGuard(submitted) }) : expenseFetch;
    if (typeof fetch !== 'function') fail('Invalid expense transport');
  } catch { throw new GustoSubmissionError('expense-create', 'not-sent'); }
  const payload = await write(fetch, request, 'expense-create');
  if (payload?.errors?.length || !Array.isArray(payload?.data?.payload?.errors)) throw new GustoSubmissionError('expense-create', 'unknown');
  if (payload.data.payload.errors.length > 0) throw new GustoSubmissionError('expense-create', 'rejected');
  let created;
  try {
    const node = payload.data.payload.oneTimeReimbursement;
    created = parseReimbursementPage({ data: { member: { id: approved.companyMemberId, expenses: { expenses: { nodes: [node], pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null } } } } } }).records[0];
    if (before.records.some((record) => record.id === created.id) || !matches(created, approved) || node.categoryUuid !== approved.categoryUuid || (submitted.fileId && !created.receipt) || (approved.expenseVendor?.id && created.vendor?.id !== approved.expenseVendor.id) || (approved.expenseVendor?.name && created.vendor?.name !== approved.expenseVendor.name)) fail('Created reimbursement mismatch');
  } catch { throw new GustoSubmissionError('expense-create', 'unknown'); }
  try {
    const after = await readReimbursements();
    const verified = after.records.filter((record) => record.id === created.id);
    if (after.complete !== true || after.memberId !== approved.companyMemberId || verified.length !== 1 || !matches(verified[0], approved) || verified[0].categoryUuid !== approved.categoryUuid || (submitted.fileId && verified[0].receipt?.id !== created.receipt?.id) || (approved.expenseVendor?.id && verified[0].vendor?.id !== approved.expenseVendor.id) || (approved.expenseVendor?.name && verified[0].vendor?.name !== approved.expenseVendor.name)) fail('Read-back mismatch');
    return { expense: verified[0], submissionVerified: true, paymentVerified: false, unverifiedFields: verified[0].currency === null ? ['currency'] : [], receipt: uploaded ? { filename: uploaded.filename, sha256: uploaded.sha256 } : null };
  } catch { throw new GustoSubmissionError('verification', 'created-unverified', created.id); }
}
