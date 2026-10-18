# Gusto Client

Read-only discovery of employee paystubs and their original PDF endpoints through an injected HTTP transport.

The library handles Gusto HTML pagination, payroll-item identity, statement metadata, PDF endpoint discovery, and filenames. It accepts a Fetch-compatible transport so callers can use an authorized browser session or another authentication mechanism. The caller downloads and validates PDF bytes.

Account identifiers, browser state, real manifests, paystubs, and local paths are runtime inputs and are not stored in this repository.

## Design

Discovery keys records by payroll-item UUID. For a JavaScript-rendered listing, supply links enumerated from the rendered browser instead of relying on its empty HTML shell:

```js
import { GustoClient, buildPaystubManifest } from 'gusto-client';

const client = new GustoClient({ fetch: authenticatedFetch });
const details = await client.readPaystubDetails(browserRecords, { expectedCount });
const manifest = buildPaystubManifest(details);
```

Each input record accepts `url`, `detailUrl`, or `href`, with optional `id` and `label`/`text`. An expected count checks unique payroll items. HTML discovery rejects empty initial pages and repeated pagination; neither can prove a complete account. Detail parsing checks dates and the PDF's payroll-item identity. When a reimbursement summary is present, `reimbursements.current` and `reimbursements.yearToDate` are separate decimal strings.

Transport and authentication are injected. Applications may compose this package with `browser-session-rest-client`, but neither package depends on the other. Errors stop the operation; callers retain inputs and retry after authentication or layout issues are resolved.

See [the implementation plan](PLAN.md).

## Reimbursement records

Read employee expenses through the fixed, read-only query and an authorized Fetch transport:

```js
import { GustoClient, isReadOnlyReimbursementRequest } from 'gusto-client';

const client = new GustoClient({ fetch: authenticatedFetch });
const result = await client.listReimbursements({ expectedCount });
```

For transports that restrict POST requests, supply `isReadOnlyReimbursementRequest` as their authorization predicate. It permits only the fixed employee-expense query at the observed endpoint, with bounded page size and cursor variables. The query includes all employee statuses and dates; it does not select team expenses or signed receipt URLs. Verify the account count independently before treating collection as complete.

`collectReimbursements(readPage, options)` also supports caller-supplied page requests returning `data.member.expenses.expenses`. Both paths check member identity, stable IDs, page boundaries, non-progressing cursors, partial errors, and an optional expected count.

Records retain decimal amount strings, nullable source currency, original status, creation time, purchase/check dates, approver, vendor, and receipt identity. Expiring receipt URLs are omitted. Unknown statuses remain unchanged. Creation time is not relabeled as a submission time, and a listed record or check date does not establish payment. Payroll evidence and downstream receipt reconciliation belong to the caller.
