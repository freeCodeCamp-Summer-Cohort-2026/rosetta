# The Adapter Contract

Rosetta's core CLI is written in Node.js, but adapters - the code that
actually performs a conversion - can be written in **any language**. The
only requirement is that an adapter can be launched as a subprocess and
speak JSON over stdin/stdout. This document is the single source of truth
for that contract. If you're adding a new adapter, read this end to end
before writing code.

## 1. Directory layout

Each adapter lives in its own directory under `adapters/`, named after the
language (or a descriptive slug if a language has multiple adapters):

```
adapters/
  php/
    adapter.json      <- manifest (required)
    adapter.php        <- implementation (any filename/layout you like)
  go/
    adapter.json
    adapter.go
    go.mod
  your-language/
    adapter.json
    ...
```

The core discovers adapters by scanning every immediate subdirectory of
`adapters/` for an `adapter.json` file. Anything else in an adapter's
directory (source files, build artifacts, a lockfile, a README) is up to
you.

## 2. The manifest: `adapter.json`

```json
{
  "name": "php-case-converter",
  "language": "PHP",
  "description": "Converts identifier case styles using plain PHP.",
  "run": "php adapter.php"
}
```

| Field         | Required | Description                                                                                                   |
|---------------|----------|-----------------------------------------------------------------------------------------------------------------|
| `name`        | yes      | Unique identifier for the adapter. Used with `--adapter <name>` on the CLI.                                    |
| `run`         | yes      | The shell command used to launch the adapter. Executed with the adapter's own directory as the working directory. |
| `language`    | no       | Human-readable label shown in `rosetta list`.                                                                  |
| `description` | no       | One-line summary shown in `rosetta list`.                                                                      |

`run` is passed straight to a shell (`spawn(run, { shell: true, cwd: <adapter dir> })`),
so it can be as simple as `php adapter.php` or `go run adapter.go`, or point
at a compiled binary (`./adapter`), a script with an interpreter shebang, or
anything else your language's toolchain needs. Because `cwd` is set to the
adapter's own directory, `run` should reference files with paths relative to
that directory.

> The manifest schema above is intentionally minimal today. See the open
> "improve the adapter manifest schema with validation" issue if you want to
> harden this (required-field checks, useful error messages for typos, etc).

## 3. Invocation

For every conversion request, the core:

1. Spawns `run` as a subprocess, with `cwd` set to the adapter's directory.
2. Writes a single JSON **request** object to the subprocess's stdin, then
   closes stdin.
3. Reads everything the subprocess writes to stdout until it exits.
4. Parses the last chunk of stdout as a single JSON **response** object.
5. Treats a non-zero exit code, or stdout that isn't valid JSON, as an
   adapter failure - reported back to the user, never a CLI crash.

Each subprocess invocation handles exactly **one** request. Adapters do not
need to support persistent/streaming operation.

## 4. Request schema

```json
{
  "operation": "convert",
  "input": "hello_world_example",
  "options": {
    "from": "snake",
    "to": "camel"
  }
}
```

| Field              | Type              | Description                                                                                   |
|--------------------|-------------------|-------------------------------------------------------------------------------------------------|
| `operation`        | string            | The action to perform. Currently only `"convert"` is defined. Adapters should return an error for any other value, so the contract can grow without breaking older adapters. |
| `input`            | string            | The raw text to transform.                                                                     |
| `options.to`       | string            | Required for `convert`. Target case style: one of `snake`, `camel`, `pascal`, `kebab`.          |
| `options.from`     | string or null    | Optional hint for the source case style (same enum as `to`). Adapters may use it or auto-detect. |
| `options.camel`     | boolean or null    | Optional hint to force assume `camel` instead of `to` flag |
| `options.snake`     | boolean or null    | Optional hint to force assume `snake` instead of `to` flag |
| `options.pascal`     | boolean or null    | Optional hint to force assume `pascal` instead of `to` flag |
| `options.kebab`     | boolean  or null    | Optional hint to force assume `kebab` instead of `to` flag |

Adapters should validate the request defensively - malformed JSON, missing
fields, and unsupported values are all expected inputs from a fuzzing/CI
point of view, not edge cases to ignore.

**note** about mixing `to` and "direct-to" flags such as `camel`.
- if `to` is passed along with any of the `camel` or `snake` cases, this should be **an error**. As of the writing of this doc this is **not fully fleshed out or tested**.
**note** about "direct-to" support, only the `go-adapter` supports this, the PHP one does not. This can be another issue cloned from #2

## 5. Response schema

```json
{ "output": "helloWorldExample", "error": null }
```

or, on failure:

```json
{ "output": null, "error": "Unsupported target case: yodawg" }
```

| Field    | Type            | Description                                                                 |
|----------|-----------------|------------------------------------------------------------------------------|
| `output` | string or null  | The converted result. `null` if the request failed.                         |
| `error`  | string or null  | A human-readable error message. `null` on success.                          |

Rules:

- Exactly one of `output` / `error` should be non-null.
- Write **one** JSON object to stdout, then exit with code `0` - even when
  reporting a handled error via the `error` field. Reserve a non-zero exit
  code for situations the adapter itself can't recover from (e.g. the
  runtime crashing); the core treats those as adapter failures and surfaces
  stderr to the user, but can't show a structured `error` message for them.
- Don't write anything else to stdout. Logging/debug output should go to
  stderr so it doesn't corrupt the JSON the core is trying to parse.

## 6. Minimal reference example (pseudocode)

```
payload = parse_json(read_all(stdin))

if payload.operation != "convert":
    write_json(stdout, { output: null, error: "unsupported operation" })
    exit(0)

tokens = split_into_words(payload.input)          # e.g. by "_", "-", or camel boundaries
result = join_words(tokens, payload.options.to)   # e.g. snake_case, camelCase, ...

write_json(stdout, { output: result, error: null })
exit(0)
```

For complete, runnable implementations, see:

- [`adapters/php/adapter.php`](../adapters/php/adapter.php)
- [`adapters/go/adapter.go`](../adapters/go/adapter.go)

Both implement the exact same `convert` operation (case conversion between
`snake`, `camel`, `pascal`, and `kebab`), so you can diff them against each
other to see how the same contract looks in two different languages.

## 7. Adding a new adapter

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full checklist, but in
short: create `adapters/<language>/`, add an `adapter.json`, implement the
`convert` operation per this document, and add a test to
[`test/adapters.test.js`](../test/adapters.test.js) (or a new test file)
that spawns your adapter through `runAdapter` and asserts on real
conversions.
