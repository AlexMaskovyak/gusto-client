# Gusto Client

Read-only discovery and download of employee paystubs from Gusto through an injected HTTP transport.

The library handles Gusto pagination, payroll-item identity, statement metadata, PDF endpoint discovery, naming, and validation. It accepts a Fetch-compatible transport so callers can use a browser session, a supported API credential, or another authorized authentication mechanism.

Account identifiers, browser state, real manifests, paystubs, and local paths are runtime inputs and are not stored in this repository.

## Design

Discovery traverses the live paystub listing and keys records by payroll-item UUID. Detail parsing supplies statement metadata and the individual PDF endpoint. Transport and authentication are injected. Applications may compose this package with `browser-session-rest-client`, but neither package depends on the other.

See [the implementation plan](PLAN.md).
