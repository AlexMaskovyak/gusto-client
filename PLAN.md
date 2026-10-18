# Plan

Build a standalone read-only Gusto paystub client with an injected Fetch-compatible transport.

- [x] Enumerate paystub HTML pages and deduplicate by payroll-item UUID.
- [x] Accept browser-enumerated records with an expected count; fail on login, empty, or unsupported listings.
- [x] Parse pay date, service period, payroll type, and PDF endpoint.
- [x] Generate collision-safe filenames and a credential-free manifest.
- [x] Validate record identity, calendar dates, and separate current reimbursements from year-to-date totals.
- [x] Test discovery completeness, duplicate paydays, zero-dollar reimbursements, payroll types, and layout drift.

No account identifiers, browser state, paystubs, or real manifests belong in this repository. Transport/authentication and atomic PDF collection belong to the caller. This package owns Gusto discovery, metadata, identity, and filenames. JavaScript-rendered listings require browser-enumerated records; an empty HTTP response is never evidence of a complete account. Failures stop collection; callers retain the input records and retry after correcting authentication or layout. Done means the tests pass and private orchestration can verify its expected count.
