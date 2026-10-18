# Gusto Client

Read-only discovery and download of employee paystubs from Gusto through an authenticated browser request context.

The library handles Gusto pagination, payroll-item identity, statement metadata, PDF endpoint discovery, naming, and validation. Authentication, transport, staging, retries, hashing, and resume are provided by `browser-session-rest-client`.

Account identifiers, browser state, real manifests, paystubs, and local paths are runtime inputs and are not stored in this repository.

## Design

Discovery traverses the live paystub listing and keys records by payroll-item UUID. Detail parsing supplies statement metadata and the individual PDF endpoint. The shared dependency owns authentication, transport, staging, retries, hashing, and resume.

See [the implementation plan](PLAN.md).
