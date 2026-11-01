# Gusto Client

Python methods and endpoint commands generated from captured GraphQL operations.
A complete server schema is optional. The current set has 16 operations, including
`MemberExpenses`, `ReimbursementOptions` and `CreateMemberExpense`.

## Install and inspect

Use Python 3.11 or newer and Poetry 2.2 or newer. From this repository:

```sh
poetry install
poetry run gusto-client --help
poetry run gusto-client MemberExpenses --help
```

Generated Python methods also include docstrings for declared inputs, omission,
write permission, return values and failures. Inspect one locally with:

```sh
poetry run python -c 'from gusto_client import Client; help(Client.create_member_expense)'
```

Help is local and sends no requests. It lists declared GraphQL variables,
required inputs, optional omissions, and whether each operation reads or writes.

## Read reimbursement options

This command opens a temporary Chrome window and sends one read request:

```sh
mkdir -p .private
poetry run gusto-client ReimbursementOptions \
  --url https://graphql.app.gusto.com/ \
  --login --login-url https://app.gusto.com/payroll_admin/expenses/team \
  --session-header apollographql-client-name \
  --session-header apollographql-client-version \
  --session-header x-role-id \
  --output .private/options.json
```

Sign in, open Expenses and wait for it to load, then press Enter in the terminal.
The three `--session-header` flags name headers sent by Gusto's page. Their values
are collected from your live session and held in memory; do not supply tokens.
Gusto can return HTTP 403 when the Apollo identification headers are missing. The browser closes
after the request. Each invocation requires a fresh sign-in. Existing output
files are refused; choose a new name on subsequent runs. Authentication and
account values are runtime inputs and are never embedded in the package.

For `MemberExpenses`, put the desired variables in a JSON file, for example
`{"first":100}`, and supply its path with `--input`. One invocation returns one
API response; callers control cursor pagination and completeness checks.

## Writes and validation

The CLI requires `--confirm-write CreateMemberExpense` for that mutation.
Python callers must construct `Client(..., allow_writes=True)` to enable mutation
methods. The library never retries a request automatically. Reconcile Gusto
before retrying an uncertain submission.

Variable names, nullability, list constraints and standard scalar types are
validated. Custom input fields and response shapes remain JSON without a schema.
These methods send individual API requests. Receipt upload, duplicate checks,
submission read-back, payment reconciliation and paystub downloads are separate
workflows; the generated operation set does not implement them automatically.

## Generation and tests

Source documents are in `operations/`. `generation.json` records their hashes,
the shared generator version and schema-validation status. The shared
[browser-sourced API client generator](https://github.com/AlexMaskovyak/browser-sourced-api-client-generator)
produced the Python code; this package has no dependency on that generator.

```sh
poetry install --with dev
poetry run pytest -q
poetry build
```

A read of `ReimbursementOptions` through the generated Python client and shared
browser transport returned HTTP 200 and ten categories on 2026-11-01 with these
session headers. This verifies that read only. Live mutations remain unverified.

Tests use synthetic data and do not submit live expenses. Generating a method or
passing a local test does not establish current Gusto compatibility. The existing
[JavaScript compatibility API](docs/javascript-client.md) remains available.
