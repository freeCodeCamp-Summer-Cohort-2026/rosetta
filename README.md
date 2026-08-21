# Rosetta

Rosetta is a small CLI that converts identifiers between case styles (`snake_case`, `camelCase`, `PascalCase`, `kebab-case`) - and it does the actual conversion work through **pluggable adapters that can be written in any language**.

## Why this exists

This repo is built for the freeCodeCamp/NHCarrigan Summer 2026 Cohort's 2-week sprint phase. Our other cohort repos are dedicated to JS, Python, and Java. Rosetta exists so that:

* Contributors writing Go, PHP, C#, Rust, C/C++, Ruby, Dart, Lua, or any other language have a natural, structured way to contribute in their own stack, by adding a new adapter.
* Contributors who burn through the easy issues on the other repos have somewhere to overflow to.

The conversion logic itself is deliberately simple - tokenize an identifier, rejoin it in a different case style. The interesting part, and the point of this repo, is the **adapter architecture**: a documented, language-agnostic contract (JSON over stdin/stdout) that lets a core Node.js CLI orchestrate work done by a compiled binary, an interpreted script, or anything else that can read stdin and write stdout.

Read the full contract in [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md).

## How it works

```text
core/           Node.js CLI - discovers adapters, dispatches requests, no framework required

adapters/
  php/          Reference adapter written in PHP
  go/           Reference adapter written in Go
  cpp/          Reference adapter written in C++

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

That's the entire contract. See [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md) for the full spec, including the manifest format and error-handling rules.

## Quickstart

Requires Node.js 18+. The PHP adapter needs a PHP 8+ CLI; the Go adapter needs a Go 1.21+ toolchain.

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

# Convert with the C++ reference adapter
node core/cli.js convert --adapter cpp-case-converter --from snake --to camel --input hello_world_example

# -> helloWorldExample

# Run the test suite (spawns all reference adapters for real)
npm test
```

## Supported case styles

`snake`, `camel`, `pascal`, `kebab` - see [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md) for exact definitions.

## Reference adapters

| Language | Directory          | Manifest name           | Run command                               |
| -------- | ------------------ | ----------------------- | ----------------------------------------- |
| PHP      | `adapters/php/`    | `php-case-converter`    | `php adapter.php`                         |
| Go       | `adapters/go/`     | `go-case-converter`     | `go run adapter.go`                       |
| Python   | `adapters/python/` | `python-case-converter` | `python3 adapter.py`                      |
| C++      | `adapters/cpp/`    | `cpp-case-converter`    | `g++ adapter.cpp -o adapter && ./adapter` |

## Getting Started

In this section of the documentation, we are going to walk through some of the examples of converting text from snake, camel, pascal and kebab cases using Rosetta and the different adapters which are supported.

### PHP

When using the PHP adapter for Rosetta, all the commands are going to start with `node core/cli.js convert --adapter php-case-converter`. Following this, we can select what case we want to go from, and what case we want to go to using the `--from {case}` and `--to {case}`. In addition, we will also need to add the text which is going to be converted, we can do this by using the `--input` flag at the end of our command.

#### Snake Case to Camel Case

In this example, we are going to convert `'welcome_to_rosetta'` (which is currently in Snake Case) to Camel Case.

To do this, we will take our initial PHP command of `node core/cli.js convert --adapter php-case-converter` but add `--from snake` and `--to camel` to it.

This means our full command will be:

`node core/cli.js convert --adapter php-case-converter --from snake --to camel --input welcome_to_rosetta`

When this is run using the terminal, the output should be `welcomeToRosetta` which means that the conversion between snake case to camel case using PHP was successful.

### Using Go

As an alternative, we can use a Go adapter for Rosetta. All the commands we are going to use, start with `node core/cli.js convert --adapter go-case-converter` and the same flags to set what case we are going from (`--from`) what case we want the text to be converted to (`--to`) and what text we want to be converted (`--input`)

#### Pascal Case to Kebab Case

In this example, we are going to convert `'WelcomeToRosetta'` (which is currently in Pascal Case) to Kebab Case.

To do this, we will take our initial Go command of `node core/cli.js convert --adapter go-case-converter` but add `--from pascal` and `--to kebab` to it.

This means our full command will be:

`node core/cli.js convert --adapter go-case-converter --from pascal --to kebab --input WelcomeToRosetta`

When this is run using the terminal, the output should be `welcome-to-rosetta` which means that the conversion between pascal case to kebab case using Go was successful.

## Contributing

We want contributions in as many languages as possible. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the issue-claiming flow and, specifically, for the step-by-step guide to adding a brand-new adapter in a language that isn't represented yet.

## License

[MIT](LICENSE)
