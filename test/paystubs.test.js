import assert from 'node:assert/strict';
import test from 'node:test';
import { GustoClient, buildPaystubManifest, discoverPaystubLinks, parsePaystubDetail } from '../src/index.js';

const id = '11111111-2222-4333-8444-555555555555';
const detailUrl = `https://app.gusto.test/payroll_items/${id}/paystub.html?x_role_id=example`;

test('discovers and deduplicates payroll items', () => {
  const html = `<a href="${detailUrl}">Oct 16, 2026</a><a href="${detailUrl}">View</a>`;
  assert.deepEqual(discoverPaystubLinks(html, 'https://app.gusto.test/employee/pay/paystubs'), [{ id, url: detailUrl, label: 'Oct 16, 2026' }]);
});

test('parses dates, type, and PDF endpoint from detail HTML', () => {
  const html = `<main>Bonus Payroll Pay period: Sep 28, 2026 - Oct 11, 2026 Pay Day: Oct 16, 2026 <a href="/payroll_items/${id}/paystub.pdf?orientation=Landscape&x_role_id=example">Download PDF</a></main>`;
  assert.deepEqual(parsePaystubDetail(html, detailUrl), {
    id,
    detailUrl,
    pdfUrl: `https://app.gusto.test/payroll_items/${id}/paystub.pdf?orientation=Landscape&x_role_id=example`,
    periodStart: '2026-09-28', periodEnd: '2026-10-11', payDay: '2026-10-16', payrollType: 'bonus'
  });
});

test('adds stable suffixes when statements would collide', () => {
  const first = { id, pdfUrl: 'https://app.gusto.test/a.pdf', periodStart: '2026-09-28', periodEnd: '2026-10-11', payDay: '2026-10-16', payrollType: 'regular' };
  const second = { ...first, id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', pdfUrl: 'https://app.gusto.test/b.pdf' };
  const manifest = buildPaystubManifest([first, second]);
  assert.equal(manifest.artifacts[0].filename, 'gusto-paystub-2026-10-16-period-2026-09-28-to-2026-10-11-11111111.pdf');
  assert.equal(manifest.artifacts[1].filename, 'gusto-paystub-2026-10-16-period-2026-09-28-to-2026-10-11-aaaaaaaa.pdf');
});

test('fails explicitly when the layout is unsupported', () => {
  assert.throws(() => parsePaystubDetail('<main>changed</main>', detailUrl), /Unsupported/);
});

test('uses an injected Fetch-compatible transport', async () => {
  const pages = new Map([
    ['https://app.gusto.test/employee/pay/paystubs?page=1', `<a href="${detailUrl}">Oct 16, 2026</a>`],
    [detailUrl, `<main>Pay period: Sep 28, 2026 - Oct 11, 2026 Pay Day: Oct 16, 2026 <a href="/payroll_items/${id}/paystub.pdf">Download PDF</a></main>`]
  ]);
  const calls = [];
  const client = new GustoClient({ baseUrl: 'https://app.gusto.test', fetch: async (url, options) => {
    calls.push({ url: url.toString(), method: options.method });
    const body = pages.get(url.toString());
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, text: async () => body };
  } });
  const records = await client.discoverFromPaystubPages(['/employee/pay/paystubs?page=1']);
  const details = await client.readPaystubDetails(records);
  assert.equal(details[0].payDay, '2026-10-16');
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'GET']);
});

test('enumerates paystub pagination until the final partial page', async () => {
  const ids = [
    '11111111-2222-4333-8444-555555555555',
    'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    '99999999-8888-4777-8666-555555555555'
  ];
  const page = (items) => items.map((item) => `<a href="/payroll_items/${item}/paystub.html">Payday</a>`).join('');
  const calls = [];
  const client = new GustoClient({ baseUrl: 'https://app.gusto.test', fetch: async (url) => {
    calls.push(url.toString());
    const number = new URL(url).searchParams.get('page.number');
    const body = number === '1' ? page(ids.slice(0, 2)) : page(ids.slice(2));
    return { ok: true, status: 200, text: async () => body };
  } });
  const records = await client.discoverAllPaystubs({ pageSize: 2 });
  assert.deepEqual(records.map((record) => record.id), ids);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /page\.number=1/);
  assert.match(calls[1], /page\.number=2/);
});
