# Gusto Client

Discover employee paystubs, read reimbursements, and submit expenses with receipt attachments through injected HTTP transports.

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

## Reimbursement and receipt submission

`client.listReimbursementOptions()` reads the current member ID, category IDs, disabled state, and mileage rates. `isReadOnlyReimbursementRequest` allows this fixed query as well as the expense listing. Select a current eligible category and supply the approved member, transaction date, currency, vendor and **gross** amount—including gift cards or credits. The client does not choose accounting policy or alter the amount.

```js
import { GustoClient, prepareReimbursementSubmission } from 'gusto-client';

const approved = prepareReimbursementSubmission({
  companyMemberId, categoryUuid, purchaseDate: '2026-03-10',
  amount: '23.81', currency: 'USD', description: 'Business meal',
  expenseVendor: { name: 'Example merchant' }
});

const client = new GustoClient({
  fetch: authorizedReadFetch,
  createExpenseFetch,   // Factory receives { origin, authorizeWrite }
  receiptFetch,         // App-origin POST; authorized for this receipt only
  createStorageFetch,   // Factory receives { origin, authorizeWrite }; NO app credentials
  storageOrigins       // Explicitly approved upload origins
});

// Run only after the caller approves this expense and receipt for submission.
const result = await client.submitReimbursement(approved, {
  receipt: { filename: 'receipt.pdf', contentType: 'application/pdf', bytes }
});
```

The caller constructs each factory using its authorized transport; this package does not depend on `browser-session-rest-client`. When using that package, pass the supplied `authorizeWrite` to **both** its authenticated and browser-compatible layers. The receipt metadata request additionally needs the application's current session and CSRF header. `createReceiptUploadGuard(receipt)` scopes that POST; `createReimbursementSubmissionGuard(input)` scopes an exact approved create. Do not broadly permit every POST.

Receipts use Gusto's inspected Active Storage flow: metadata POST → exact-byte signed storage PUT → create-expense mutation. PDF/JPEG/PNG/HEIC/HEIF files must match their declared type and be no larger than 15 MB. The storage factory receives an exact URL/byte/header guard; it must carry no application cookies or tokens. `uploadReimbursementReceipt()` is available separately; its returned `fileId` is transient, not a durable receipt identity. An existing uploaded receipt can be supplied as `input.fileId` instead of bytes. Vendor takes exactly `{ id }` or `{ name }`; mileage additionally takes `categoryRateUuid` and `rateAmount`.

Submission reads the complete employee inventory first and blocks possible duplicates. After creation it requires the new stable expense ID to appear in a fresh complete listing, with matching member, gross amount, transaction date, description, category, vendor and receipt. `submissionVerified` does not mean paid. `paymentVerified` remains false. A null source currency stays null and is reported in `unverifiedFields`, not silently relabeled USD.

There are no automatic write retries. `GustoSubmissionError` reports `phase`, `outcome`, `retryable: false`, and a known `expenseId` when creation succeeded but read-back failed. Reconcile Gusto before retrying an `unknown` or `created-unverified` result. Upload success alone is not submission; unused blobs may remain after a later failure. Raw service errors, signed URLs and tokens are not included in errors or normalized output.

The create operation was generated from inspected frontend definitions with the browser-session generator. Authentication, listing and category reads were verified live; upload/create behavior is covered by synthetic tests, **not a live submission**. No production write is performed by discovery or tests. Read-only client construction remains read-only unless separate write transports are supplied.
