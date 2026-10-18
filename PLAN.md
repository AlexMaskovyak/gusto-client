# Plan

Build a standalone read-only Gusto paystub client with an injected Fetch-compatible transport.

- [x] Enumerate every paystub page and deduplicate by payroll-item UUID.
- [x] Parse pay date, service period, payroll type, and PDF endpoint.
- [x] Generate collision-safe filenames and a credential-free manifest.
- [ ] Download and verify PDFs through the injected transport.
- [ ] Test pagination, duplicate paydays, zero-dollar, bonus, off-cycle, reimbursement, layout drift, and resume.

No account identifiers, browser state, paystubs, or real manifests belong in this repository. `personal-toolbox` may compose it with `browser-session-rest-client`, but this package has no browser-session dependency. Done means the tests pass and the live account can be collected completely through private configuration.
