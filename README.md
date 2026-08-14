# Rosetta

Rosetta is a small CLI that converts identifiers between case styles
(`snake_case`, `camelCase`, `PascalCase`, `kebab-case`) - and it does the
actual conversion work through **pluggable adapters that can be written in
any language**.

## Why this exists

This repo is built for the freeCodeCamp/NHCarrigan Summer 2026 Cohort's
2-week sprint phase. Our other cohort repos are dedicated to JS, Python, and
Java. Rosetta exists so that:

- Contributors writing Go, PHP, C#, Rust, C/C++, Ruby, Dart, Lua, or any
  other language have a natural, structured way to contribute in their own
  stack, by adding a new adapter.
- Contributors who burn through the easy issues on the other repos have
  somewhere to overflow to.

The conversion logic itself is deliberately simple - tokenize an identifier,
rejoin it in a different case style. The interesting part, and the point of
this repo, is the **adapter architecture**: a documented, language-agnostic
contract (JSON over stdin/stdout) that lets a core Node.js CLI orchestrate
work done by a compiled binary, an interpreted script, or anything else that
can read stdin and write stdout.

Read the full contract in [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md).

## How it works

```
core/           Node.js CLI - discovers adapters, dispatches requests, no framework required
adapters/
  php/          Reference adapter written in PHP
  go/           Reference adapter written in Go
docs/
  ADAPTER_CONTRACT.md   The stdin/stdout JSON contract every adapter implements
test/
  adapters.test.js      Spawns each adapter as a real subprocess and checks the contract round-trips
```

The core CLI writes a JSON payload to an adapter's stdin:

```json
{
  "operation": "convert",
  "input": "hello_world",
  "options": { "from": "snake", "to": "camel" }
}
```

and reads a JSON response from its stdout:

```json
{ "output": "helloWorld", "error": null }
```

That's the entire contract. See [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md)
for the full spec, including the manifest format and error-handling rules.

## Quickstart

Requires Node.js 18+. The PHP adapter needs a PHP 8+ CLI; the Go adapter
needs a Go 1.21+ toolchain.

```bash
git clone git@github.com:freeCodeCamp-Summer-Cohort-2026/rosetta.git
cd rosetta

# List available adapters
node core/cli.js list

# Convert with the PHP reference adapter
node core/cli.js convert --adapter php-case-converter --from snake --to camel --input hello_world_example
# -> helloWorldExample

# Convert with the Go reference adapter
node core/cli.js convert --adapter go-case-converter --from kebab --to pascal --input hello-world-example
# -> HelloWorldExample

# Run the test suite (spawns both reference adapters for real)
npm test
```

## Supported case styles

`snake`, `camel`, `pascal`, `kebab` - see
[`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md) for exact
definitions.

## Reference adapters

| Language | Directory       | Manifest name        | Run command         |
| -------- | --------------- | -------------------- | ------------------- |
| PHP      | `adapters/php/` | `php-case-converter` | `php adapter.php`   |
| Go       | `adapters/go/`  | `go-case-converter`  | `go run adapter.go` |

## Contributing

We want contributions in as many languages as possible. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the issue-claiming flow and,
specifically, for the step-by-step guide to adding a brand-new adapter in a
language that isn't represented yet.

## License

[MIT](LICENSE)
