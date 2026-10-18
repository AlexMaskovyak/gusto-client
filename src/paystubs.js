import * as cheerio from 'cheerio';

const ITEM = /\/payroll_items\/([0-9a-f-]{36})\/paystub\.html/i;
const MONTHS = new Map(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => [month, index + 1]));

function isoDate(value) {
  const match = value.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match || !MONTHS.has(match[1])) throw new Error(`Unsupported Gusto date: ${value}`);
  return `${match[3]}-${String(MONTHS.get(match[1])).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

export function discoverPaystubLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const records = new Map();
  $('a[href*="/payroll_items/"][href*="paystub.html"]').each((_, element) => {
    const url = new URL($(element).attr('href'), pageUrl).toString();
    const match = url.match(ITEM);
    if (!match) return;
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
  const text = $.root().text().replace(/\s+/g, ' ');
  const dates = text.match(/Pay period:\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s*-\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+Pay Day:\s*([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
  if (!dates) throw new Error('Unsupported Gusto paystub detail layout');
  const pdfHref = $('a[href*="/payroll_items/"][href*="paystub.pdf"]').first().attr('href');
  if (!pdfHref) throw new Error('Gusto paystub PDF endpoint not found');
  const id = detailUrl.match(ITEM)?.[1]?.toLowerCase();
  if (!id) throw new Error('Payroll-item id not found in detail URL');
  const payrollType = /bonus payroll/i.test(text) ? 'bonus' : /off[- ]cycle payroll/i.test(text) ? 'off-cycle' : 'regular';
  return {
    id,
    detailUrl,
    pdfUrl: new URL(pdfHref, detailUrl).toString(),
    periodStart: isoDate(dates[1]),
    periodEnd: isoDate(dates[2]),
    payDay: isoDate(dates[3]),
    payrollType
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

