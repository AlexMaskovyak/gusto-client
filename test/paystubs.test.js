import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPaystubManifest, discoverPaystubLinks, parsePaystubDetail } from '../src/index.js';

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
