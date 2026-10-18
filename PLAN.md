# Plan

## Reimbursements

- [x] Discover the authenticated expense query, filters, cursor arguments, and count from the live browser; prove one client request before bulk collection.
- [x] Parse expense identity, original amount/currency, receipt identity, creation timestamp, source status, approval, and check date without inferring payment or relabeling creation as submission.
- [x] Test complete cursor traversal, empty accounts, duplicate/conflicting IDs, partial GraphQL errors, missing pages, status drift, and malformed values with synthetic fixtures.
- [x] Add the observed read-only query through injected Fetch, with an exact-query POST guard and bounded cursor variables. Keep authentication, account IDs, snapshots, Sheet joins, and private reconciliation in the caller.
- [ ] Verify a complete live collection against the UI count, then reconcile to the existing Sheet without submitting expenses or changing locked amounts.

Gusto owns submitted-record state; payroll statements own payment proof. The client owns response normalization and pagination, not receipt matching or a parallel bookkeeping database. Preserve unknown status values rather than calling them unpaid. Null source currency stays null. Signed receipt URLs are omitted from normalized durable records. Authentication failures, schema drift, partial GraphQL errors, duplicate IDs, and non-progressing cursors stop collection; retain prior verified evidence and retry after correction. Completion requires both tests and a full authenticated live read, not a saved response alone.

Build a standalone read-only Gusto paystub client with an injected Fetch-compatible transport.

- [x] Enumerate paystub HTML pages and deduplicate by payroll-item UUID.
- [x] Accept browser-enumerated records with an expected count; fail on login, empty, or unsupported listings.
- [x] Parse pay date, service period, payroll type, and PDF endpoint.
- [x] Generate collision-safe filenames and a credential-free manifest.
- [x] Validate record identity, calendar dates, and separate current reimbursements from year-to-date totals.
- [x] Test discovery completeness, duplicate paydays, zero-dollar reimbursements, payroll types, and layout drift.

No account identifiers, browser state, paystubs, or real manifests belong in this repository. Transport/authentication and atomic PDF collection belong to the caller. This package owns Gusto discovery, metadata, identity, and filenames. JavaScript-rendered listings require browser-enumerated records; an empty HTTP response is never evidence of a complete account. Failures stop collection; callers retain the input records and retry after correcting authentication or layout. Done means the tests pass and private orchestration can verify its expected count.
