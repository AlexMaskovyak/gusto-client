# gusto-client

Python methods and CLI commands generated from 15 API operations.
The generator produced every file in this project. No service-specific source
patches are needed. This operation set does not imply coverage of every service API.

## Install and inspect

Use Python 3.11 or newer, Poetry 2.2 or newer and installed Chrome for browser login.
From this generated directory:

```sh
poetry install --with dev
poetry run gusto-client --help
poetry run gusto-client MemberExpenses --help
poetry run pytest -q
poetry build
```

Installation may download dependencies. Help, tests and package builds send no
service requests. Tests use synthetic responses; they do not prove live compatibility.

## Call an operation

The configured endpoint is `https://graphql.app.gusto.com/`. With an interactive terminal:

```sh
poetry run gusto-client MemberExpenses --help
```

Add `--login` when executing an operation to open `https://app.gusto.com/payroll_admin/expenses/team`. Sign in,
open the relevant application page and wait for it to load, then press Enter in
the terminal. This command displays help only. Create a JSON object containing the required fields shown there and pass its path with --input FILE when calling the operation. Use `--output NEW_FILE` to save a private result. Existing files
are refused. Each --login invocation opens a fresh login; the browser closes afterward.

Configured additional session-header names: apollographql-client-name, apollographql-client-version, x-role-id.
Their values are observed in memory at the API origin. Never put tokens in source
files or command arguments. Missing required headers can cause HTTP 403. Inspect
the application request and update `client-project.json` if its contract changes.

For operations with inputs, create a JSON object using the names/types in that
operation's help and pass `--input FILE`. Write commands require
`--confirm-write OPERATION` with the exact operation name. No automatic retries occur. Check the service before
retrying an uncertain write. Operations with a discovered file-upload contract
accept `--receipt FILE`: metadata upload, exact-byte storage upload and mutation
run within one login. Supply the original input object without its attachment
field. Python callers use the generated `<method>_with_file` helper and an
authenticated metadata client when the application origin differs from the API.
Unsupported upload protocols and operations without a discovered contract do not
accept this flag. Pagination and other multi-step workflows remain separate.

## Reproduce this project

`inputs/manifest.json` contains the selected API definition or operation documents
and request conventions. `client-project.json` supplies public endpoint/login configuration
and header names. No saved login or account values are needed to build.
Using an installed compatible generator, from this directory:

```sh
website-client build --project client-project.json --output ../gusto-client-rebuilt
```

The output directory must not exist and its parent must exist. The command reads
local inputs, generates code, documentation and tests, and validates an included
Poetry lock. It does not call the service. Compare outputs before replacing an
existing project. Reuse the same generator revision and lock for reproducibility.

## Validation and ownership

Declared standard scalar types are validated; custom input fields and response shapes remain JSON without a complete server schema. Python mutation calls require Client(..., allow_writes=True).
The service remains authoritative for its records. Generation and
synthetic tests do not verify submissions or payment. HTTP failures report status
without response bodies. Authentication stays in browser/process memory.

## Submit with a file

The `CreateMemberExpense` command supports `rails-active-storage-v1`. Prepare its original
JSON input using the command's help and the application's actual fields. Omit
`input.fileId`: the upload supplies it.
A server schema is needed to validate fields inside a custom input object.

The following examples assume `input.json` contains that verified input and
`receipt.pdf` is your existing local file. Replace those paths as needed.
Preview validates the file and prints its hash, variables and target endpoints;
it sends no requests and needs no login or write confirmation:

```sh
poetry run gusto-client CreateMemberExpense --input input.json --receipt receipt.pdf --preview
```

After reviewing the preview, this command uploads the file and changes remote data:

```sh
poetry run gusto-client CreateMemberExpense --input input.json --receipt receipt.pdf --login --confirm-write CreateMemberExpense
```

One login covers all three stages. Python callers use
`Client.create_member_expense_with_file(receipt_path=..., metadata_client=..., **arguments)`
with `allow_writes=True`; supply an application-authenticated metadata client when
its origin differs from the API. Storage stays credential-free. No stage retries.
A failed creation can leave an unattached file. Check the application after an
uncertain result before submitting again. File contracts are inferred source
evidence; they do not prove live service acceptance or reimbursement.

