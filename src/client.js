import { discoverPaystubLinks, parsePaystubDetail } from './paystubs.js';

export class GustoClient {
  constructor({ fetch: fetchImpl, baseUrl = 'https://app.gusto.com' }) {
    if (typeof fetchImpl !== 'function') throw new Error('A Fetch-compatible transport is required');
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl;
  }

  async getText(url) {
    const response = await this.fetch(new URL(url, this.baseUrl), { method: 'GET' });
    if (!response.ok) throw new Error(`Gusto request failed with HTTP ${response.status}`);
    return response.text();
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
    return [...records.values()];
  }

  async readPaystubDetails(records) {
    const details = [];
    for (const record of records) {
      details.push(parsePaystubDetail(await this.getText(record.url), record.url));
    }
    return details;
  }
}
