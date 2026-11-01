# Structure

The Python package is generated from named GraphQL operations. It sends individual
API requests and does not maintain expense or payroll state. Gusto owns those
records; callers own pagination, accounting policy and submission reconciliation.

| Files | Responsibility |
| --- | --- |
| `operations/`, `gusto_client/_operations.json` | Static operation documents, variable declarations, request methods and URL conventions. No account data or credentials. |
| `gusto_client/client.py` | Named Python methods produced by the shared generator. |
| `operation_contracts.py`, `operation_runtime.py` inside the package | Validate declared variables, send bounded HTTPX requests and return JSON dictionaries. |
| `_cli.py`, `browser.py`, `session_http.py` inside the package | Endpoint commands, temporary browser login and scoped request transport. |
| `generation.json` | Generator identity, operation hashes and validation limits. Private capture lineage is excluded. |
| `src/` | Existing JavaScript compatibility library and workflow helpers. |

A full schema is optional. Without one, standard scalar types and declared
nullability are checked; custom input fields and response shapes remain JSON.
With a schema, the shared generator can produce stronger models separately.

The CLI requires exact write confirmation. Python mutation methods require an
explicit write-enabled client. Redirects and automatic retries are disabled.
Partial GraphQL errors fail rather than claiming a successful result. If a write
may have reached Gusto, check Gusto before retrying.

Authentication stays in the temporary browser or process memory. Fresh commands
require fresh authentication. Gusto's Apollo client identification headers and
role header are selected by name in the README command, then observed at the exact
API origin. Their values remain in memory. HTTP rejections expose status codes,
not private response bodies. A caller sharing a browser session retains ownership
of that session when the request transport closes. Local tests use synthetic responses; current service
compatibility requires an authenticated read, and writes require separate live
verification. The operation set does not automatically implement receipt upload
or payment reconciliation.
