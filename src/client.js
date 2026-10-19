import { discoverPaystubLinks, normalizePaystubRecords, parsePaystubDetail } from './paystubs.js';
import { buildReimbursementRequest, collectReimbursements, buildReimbursementOptionsRequest, parseReimbursementOptions } from './reimbursements.js';
import { submitReimbursement } from './submissions.js';

export class GustoClient {
  constructor({ fetch: fetchImpl, baseUrl = 'https://app.gusto.com', expenseFetch, createExpenseFetch, receiptFetch, createStorageFetch, storageOrigins }) {
    if (typeof fetchImpl !== 'function') throw new Error('A Fetch-compatible transport is required');
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl;
    this.submissionTransports = { expenseFetch, createExpenseFetch, receiptFetch, createStorageFetch, storageOrigins };
  }

  async getText(url) {
    let response;
    try { response = await this.fetch(new URL(url, this.baseUrl), { method: 'GET' }); }
    catch { throw new Error('Gusto request transport failed'); }
    if (!response.ok) throw new Error(`Gusto request failed with HTTP ${response.status}`);
    if (response.url && /\/(?:login|sign_in|signin)(?:\/|$)/i.test(new URL(response.url).pathname)) throw new Error('Gusto authentication required');
    let html;
    try { html = await response.text(); } catch { throw new Error('Gusto response body could not be read'); }
    if (/<input\b[^>]*type\s*=\s*["']?password\b/i.test(html)) throw new Error('Gusto authentication required');
    return html;
  }

  async discoverFromPaystubPages(pageUrls) {
    const records = new Map();
    for (const pageUrl of pageUrls) {
      const absolutePageUrl = new URL(pageUrl, this.baseUrl).toString();
      const html = await this.getText(absolutePageUrl);
      for (const record of discoverPaystubLinks(html, absolutePageUrl)) {
        const prior = records.get(record.id);
        if (prior && prior.url !== record.url) throw new Error(`Conflicting paystub URL for ${record.id}`);
        records.set(record.id, prior ?? record);
      }
    }
    return normalizePaystubRecords([...records.values()], { baseUrl: this.baseUrl });
  }

  paystubPageUrl({ pageNumber = 1, pageSize = 100 } = {}) {
    if (![pageNumber, pageSize].every((value) => Number.isInteger(value) && value > 0)) throw new Error('Paystub page number and size must be positive integers');
    const url = new URL('/employee/pay/paystubs', this.baseUrl);
    url.searchParams.set('sort.direction', 'descending');
    url.searchParams.set('sort.id', 'payDay');
    url.searchParams.set('page.number', String(pageNumber));
    url.searchParams.set('page.size', String(pageSize));
    return url.toString();
  }

  async discoverAllPaystubs({ pageSize = 100, maxPages = 100, expectedCount } = {}) {
    if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('maxPages must be a positive integer');
    const records = new Map();
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const pageUrl = this.paystubPageUrl({ pageNumber, pageSize });
      const pageRecords = discoverPaystubLinks(await this.getText(pageUrl), pageUrl);
      if (pageNumber === 1 && pageRecords.length === 0) throw new Error('No paystub links found; use browser-enumerated records for client-rendered listings');
      let added = 0;
      for (const record of pageRecords) {
        const prior = records.get(record.id);
        if (prior && prior.url !== record.url) throw new Error(`Conflicting paystub URL for ${record.id}`);
        if (!prior) { records.set(record.id, record); added += 1; }
      }
      if (pageRecords.length > 0 && added === 0) throw new Error('Gusto pagination repeated a page without progress');
      if (pageRecords.length < pageSize) return normalizePaystubRecords([...records.values()], { baseUrl: this.baseUrl, expectedCount });
    }
    throw new Error(`Gusto pagination exceeded ${maxPages} pages`);
  }

  async readPaystubDetails(records, { expectedCount } = {}) {
    const normalized = normalizePaystubRecords(records, { baseUrl: this.baseUrl, expectedCount });
    const details = [];
    for (const record of normalized) {
      details.push(parsePaystubDetail(await this.getText(record.url), record.url));
    }
    return details;
  }

  async listReimbursements({ pageSize = 100, expectedCount, maxPages, memberId } = {}) {
    // Validate the first request before any network activity.
    buildReimbursementRequest({ first: pageSize });
    return collectReimbursements(async ({ after }) => {
      const { url, ...options } = buildReimbursementRequest({ first: pageSize, after });
      const response = await this.fetch(new URL(url), options);
      if (!response.ok) throw new Error(`Gusto reimbursement request failed with HTTP ${response.status}`);
      if (response.url && /\/(?:login|sign_in|signin)(?:\/|$)/i.test(new URL(response.url).pathname)) throw new Error('Gusto authentication required');
      return response.json();
    }, { expectedCount, maxPages, memberId });
  }

  async submitReimbursement(input, { receipt } = {}) {
    return submitReimbursement(input, { ...this.submissionTransports, receipt,
      readReimbursements: () => this.listReimbursements({ memberId: input.companyMemberId }) });
  }

  async listReimbursementOptions() {
    const { url, ...options } = buildReimbursementOptionsRequest();
    let payload;
    try {
      const response = await this.fetch(url, options);
      if (!response.ok) throw new Error('Options unavailable');
      payload = await response.json();
    } catch { throw new Error('Gusto reimbursement options request failed'); }
    return parseReimbursementOptions(payload);
  }
}
