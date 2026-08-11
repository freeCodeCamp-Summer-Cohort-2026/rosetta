#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  discoverAdapters,
  findAdapter,
  runAdapter,
  VALID_CASE_STYLES,
} = require('./lib/adapters');

const ADAPTERS_DIR = path.join(__dirname, '..', 'adapters');

function printHelp() {
  console.log(`Rosetta - a language-agnostic identifier case-conversion CLI

Usage:
  rosetta list
      List all discovered adapters.

  rosetta convert --adapter <name> [--to <style> | --camel | --snake | --kebab | --pascal] [--from <style>] (--input <string> | --file <path>)
      Convert an identifier's case style using the named adapter.

      <style> is one of: ${VALID_CASE_STYLES.join(', ')}

  rosetta help
      Show this message.

Examples:
  rosetta list
  rosetta convert --adapter php-case-converter --from snake --to camel --input hello_world
  rosetta convert --adapter go-case-converter --to pascal --file ./identifiers.txt

Adapters are discovered under adapters/<language>/adapter.json. See
docs/ADAPTER_CONTRACT.md for the full stdin/stdout JSON contract, and
CONTRIBUTING.md for how to add a new adapter in your own language.
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    }
  }
  return flags;
}

function listAdapters() {
  const adapters = discoverAdapters(ADAPTERS_DIR);
  if (adapters.length === 0) {
    console.log('No adapters found in adapters/.');
    return;
  }
  console.log(`Found ${adapters.length} adapter(s):\n`);
  for (const adapter of adapters) {
    const { name, language, description, run } = adapter.manifest;
    console.log(`  ${name}${language ? ` (${language})` : ''}`);
    if (description) console.log(`    ${description}`);
    console.log(`    run: ${run}`);
    console.log('');
  }
}

async function convert(flags) {
  const {
    adapter: adapterId,
    from,
    to,
    input,
    file,
    // these flags override the to flag
    camel,
    snake,
    pascal,
    kebab,
  } = flags;

  if (!adapterId || typeof adapterId !== 'string') {
    console.error(
      'Error: --adapter <name> is required. Run `rosetta list` to see available adapters.'
    );
    process.exitCode = 1;
    return;
  }

  const missingToFlag = !to || typeof to !== "string" || !VALID_CASE_STYLES.includes(to);
  const hasDirectToFlag = !!(camel || snake || pascal || kebab);

  if (missingToFlag && !hasDirectToFlag) {
    // if the to flag was not passed and none of the "direct to" flags were passed then
    // this will throw
    console.error(
      `Error: --to <style> is required and must be one of: ${VALID_CASE_STYLES.join(", ")}, or one of the direct flags must be passed such as --camel or --pascal`,
    );
    process.exitCode = 1;
    return;
  }

  let text = typeof input === 'string' ? input : undefined;
  if (file) {
    try {
      text = fs.readFileSync(file, 'utf8').trim();
    } catch (err) {
      console.error(`Error: could not read --file "${file}": ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  if (!text) {
    console.error(
      'Error: provide input via --input <string> or --file <path>.'
    );
    process.exitCode = 1;
    return;
  }

  const adapter = findAdapter(ADAPTERS_DIR, adapterId);
  if (!adapter) {
    console.error(
      `Error: no adapter named "${adapterId}" found. Run \`rosetta list\` to see available adapters.`
    );
    process.exitCode = 1;
    return;
  }

  const payload = {
    operation: 'convert',
    input: text,
    options: {
      from: typeof from === 'string' ? from : null,
      to,
      // main direct-to flags passed as-is to adapter
      camel,
      snake,
      pascal,
      kebab,
    },
  };

  const result = await runAdapter(adapter, payload);

  if (result.error) {
    console.error(`Adapter error: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(result.output);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'list') {
    listAdapters();
    return;
  }

  if (command === 'convert') {
    const flags = parseFlags(argv.slice(1));
    await convert(flags);
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  printHelp();
  process.exitCode = 1;
}

main();
