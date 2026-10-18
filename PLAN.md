# Plan

Build a read-only Gusto paystub client on `browser-session-rest-client`.

- [ ] Enumerate every paystub page and deduplicate by payroll-item UUID.
- [ ] Parse pay date, service period, payroll type, and PDF endpoint.
- [ ] Generate collision-safe filenames and a credential-free manifest.
- [ ] Download and verify PDFs through the shared collector.
- [ ] Test pagination, duplicate paydays, zero-dollar, bonus, off-cycle, reimbursement, layout drift, and resume.

No account identifiers, browser state, paystubs, or real manifests belong in this repository. Done means the tests pass and the live account can be collected completely through private configuration in `personal-toolbox`.

