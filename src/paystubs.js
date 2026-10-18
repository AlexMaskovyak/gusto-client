import * as cheerio from 'cheerio';

const ITEM = /^\/payroll_items\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/paystub\.html$/i;
const MONTHS = new Map(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => [month, index + 1]));

function isoDate(value) {
  const match = value.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match || !MONTHS.has(match[1])) throw new Error(`Unsupported Gusto date: ${value}`);
  const iso = `${match[3]}-${String(MONTHS.get(match[1])).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw new Error('Invalid Gusto calendar date');
  return iso;
}

export function normalizePaystubRecords(records, { baseUrl = 'https://app.gusto.com', expectedCount } = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('No paystub records supplied');
  const origin = new URL(baseUrl).origin;
  const unique = new Map();
  for (const record of records) {
    const href = record.url ?? record.detailUrl ?? record.href;
    if (typeof href !== 'string') throw new Error('Paystub record URL is missing');
    let url;
    try { url = new URL(href, baseUrl); } catch { throw new Error('Invalid paystub record URL'); }
    const id = url.pathname.match(ITEM)?.[1]?.toLowerCase();
    if (!id || url.origin !== origin || url.username || url.password) throw new Error('Invalid paystub record endpoint');
    if (record.id && record.id.toLowerCase() !== id) throw new Error('Paystub record identity mismatch');
    const prior = unique.get(id);
    if (prior && prior.url !== url.toString()) throw new Error(`Conflicting paystub URL for ${id}`);
    unique.set(id, prior ?? { id, url: url.toString(), label: record.label ?? record.text ?? '' });
  }
  if (expectedCount !== undefined && (!Number.isInteger(expectedCount) || expectedCount < 1 || unique.size !== expectedCount)) {
    throw new Error(`Paystub count mismatch: expected ${expectedCount}, found ${unique.size}`);
  }
  return [...unique.values()];
}

export function discoverPaystubLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const records = new Map();
  $('a[href*="/payroll_items/"][href*="paystub.html"]').each((_, element) => {
    const url = new URL($(element).attr('href'), pageUrl).toString();
    const match = new URL(url).pathname.match(ITEM);
    if (!match) return;
    if (new URL(url).origin !== new URL(pageUrl).origin) throw new Error('Cross-origin Gusto paystub endpoint');
    const id = match[1].toLowerCase();
    const label = $(element).text().trim();
    const existing = records.get(id);
    if (existing && existing.url !== url) throw new Error(`Conflicting paystub URL for ${id}`);
    records.set(id, { id, url, label: existing?.label || label });
  });
  return [...records.values()];
}

export function parsePaystubDetail(html, detailUrl) {
  const $ = cheerio.load(html);
  $('script,style').remove();
  const text = $.root().text().replace(/\s+/g, ' ');
  const dates = text.match(/Pay period:\s*(?:(?:Off[- ]Cycle|Bonus)\s+Payroll\s+)?([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+Pay Day:\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/i);
  if (!dates) throw new Error('Unsupported Gusto paystub detail layout');
  const pdfHref = $('a[href*="/payroll_items/"][href*="paystub.pdf"]').first().attr('href');
  if (!pdfHref) throw new Error('Gusto paystub PDF endpoint not found');
  const detail = new URL(detailUrl);
  const id = detail.pathname.match(ITEM)?.[1]?.toLowerCase();
  if (!id) throw new Error('Payroll-item id not found in detail URL');
  const pdfUrl = new URL(pdfHref, detailUrl);
  if (pdfUrl.origin !== detail.origin || pdfUrl.pathname !== `/payroll_items/${id}/paystub.pdf`) throw new Error('Gusto PDF endpoint identity mismatch');
  const payrollType = /bonus payroll/i.test(text) ? 'bonus' : /off[- ]cycle payroll/i.test(text) ? 'off-cycle' : 'regular';
  const periodStart = isoDate(dates[1]);
  const periodEnd = isoDate(dates[2]);
  const payDay = isoDate(dates[3]);
  if (periodStart > periodEnd) throw new Error('Gusto pay period ends before it starts');
  let reimbursements;
  $('tr').each((_, row) => {
    const cells = $(row).find('th,td').toArray().map((cell) => $(cell).text().trim());
    if (!/^Total Reimbursements$/i.test(cells[0] ?? '')) return;
    const rowCells = $(row).find('th,td').toArray();
    const declaredHeaders = rowCells.map((cell) => ($(cell).attr('data-title') ?? '').replace(/\s+/g, ' ').trim());
    const headers = declaredHeaders.some(Boolean) ? declaredHeaders : $(row).closest('table').find('tr').first().find('th,td').toArray().map((cell) => $(cell).text().replace(/\s+/g, ' ').trim());
    if (!/^Current$/i.test(headers[1] ?? '') || !/^Year To Date$/i.test(headers[2] ?? '')) throw new Error('Unsupported Gusto reimbursement columns');
    const amounts = cells.slice(1).map((value) => value.replace(/[$,\s]/g, ''));
    if (amounts.length !== 2 || amounts.some((value) => !/^-?\d+\.\d{2}$/.test(value))) throw new Error('Unsupported Gusto reimbursement summary');
    if (reimbursements) throw new Error('Duplicate Gusto reimbursement summary');
    reimbursements = { current: amounts[0], yearToDate: amounts[1] };
  });
  return {
    id,
    detailUrl,
    pdfUrl: pdfUrl.toString(),
    periodStart, periodEnd, payDay, payrollType,
    ...(reimbursements ? { reimbursements } : {})
  };
}

export function buildPaystubManifest(records, { filenamePrefix = 'gusto-paystub' } = {}) {
  const counts = new Map();
  const bases = records.map((record) => {
    const type = record.payrollType === 'regular' ? '' : `-${record.payrollType}`;
    const base = `${filenamePrefix}-${record.payDay}-period-${record.periodStart}-to-${record.periodEnd}${type}`;
    counts.set(base, (counts.get(base) ?? 0) + 1);
    return base;
  });
  return {
    version: 1,
    service: 'gusto',
    artifacts: records.map((record, index) => ({
      id: record.id,
      url: record.pdfUrl,
      filename: `${bases[index]}${counts.get(bases[index]) > 1 ? `-${record.id.slice(0, 8)}` : ''}.pdf`,
      expected: { contentType: 'application/pdf', magic: '%PDF-', minBytes: 100 }
    }))
  };
}
