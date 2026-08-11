'use strict';

// Exercises the reference adapters (PHP, Go) and the core's adapter
// discovery/dispatch logic through the same stdin/stdout JSON contract
// real adapters use. This doubles as living documentation for how a new
// adapter gets validated - see CONTRIBUTING.md.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {execSync} = require('node:child_process');

const {
  discoverAdapters,
  findAdapter,
  runAdapter,
} = require('../core/lib/adapters');

const ADAPTERS_DIR = path.join(__dirname, '..', 'adapters');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function convertPayload(input, to, from) {
  return { operation: 'convert', input, options: { from: from || null, to } };
}

test('discoverAdapters finds the reference adapters', () => {
  const adapters = discoverAdapters(ADAPTERS_DIR);
  const names = adapters.map((a) => a.manifest.name);
  assert.ok(names.includes('php-case-converter'), 'php adapter should be discovered');
  assert.ok(names.includes('go-case-converter'), 'go adapter should be discovered');
});

test('PHP adapter converts snake_case to camelCase', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'php-case-converter');
  assert.ok(adapter, 'php adapter must be discoverable');
  const result = await runAdapter(adapter, convertPayload('hello_world_example', 'camel', 'snake'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'helloWorldExample');
});

test('PHP adapter converts camelCase to kebab-case', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'php-case-converter');
  const result = await runAdapter(adapter, convertPayload('helloWorldExample', 'kebab', 'camel'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'hello-world-example');
});

test('PHP adapter converts kebab-case to PascalCase', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'php-case-converter');
  const result = await runAdapter(adapter, convertPayload('hello-world-example', 'pascal', 'kebab'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'HelloWorldExample');
});

test('PHP adapter reports a handled error for an unsupported operation', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'php-case-converter');
  const result = await runAdapter(adapter, { operation: 'reverse', input: 'x', options: {} });
  assert.equal(result.output, null);
  assert.ok(result.error && result.error.length > 0);
});

test('PHP adapter reports a handled error for empty input', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'php-case-converter');
  const result = await runAdapter(adapter, convertPayload('', 'camel'));
  assert.equal(result.output, null);
  assert.ok(result.error);
});

test('Go adapter converts kebab-case to PascalCase', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'go-case-converter');
  assert.ok(adapter, 'go adapter must be discoverable');
  const result = await runAdapter(adapter, convertPayload('hello-world-example', 'pascal', 'kebab'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'HelloWorldExample');
});

test('Go adapter converts snake_case to camelCase', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'go-case-converter');
  const result = await runAdapter(adapter, convertPayload('hello_world_example', 'camel', 'snake'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'helloWorldExample');
});

test('Go adapter converts camelCase to snake_case', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'go-case-converter');
  const result = await runAdapter(adapter, convertPayload('helloWorldExample', 'snake', 'camel'));
  assert.equal(result.error, null);
  assert.equal(result.output, 'hello_world_example');
});

test('Go adapter reports a handled error for an unsupported target case', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'go-case-converter');
  const result = await runAdapter(adapter, convertPayload('hello_world', 'not-a-style', 'snake'));
  assert.equal(result.output, null);
  assert.ok(result.error);
});

test('Go adapter reports a handled error for empty input', async () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'go-case-converter');
  const result = await runAdapter(adapter, convertPayload('', 'camel'));
  assert.equal(result.output, null);
  assert.ok(result.error);
});

test('core.runAdapter surfaces a graceful error when an adapter process crashes', async () => {
  const adapters = discoverAdapters(FIXTURES_DIR);
  const adapter = adapters.find((a) => a.manifest.name === 'crashing-adapter');
  assert.ok(adapter, 'crashing-adapter fixture must be discoverable');
  const result = await runAdapter(adapter, convertPayload('hello_world', 'camel'));
  assert.equal(result.output, null);
  assert.match(result.error, /exited with code/);
});

test('core.runAdapter surfaces a graceful error when an adapter returns non-JSON output', async () => {
  const adapters = discoverAdapters(FIXTURES_DIR);
  const adapter = adapters.find((a) => a.manifest.name === 'garbage-adapter');
  assert.ok(adapter, 'garbage-adapter fixture must be discoverable');
  const result = await runAdapter(adapter, convertPayload('hello_world', 'camel'));
  assert.equal(result.output, null);
  assert.match(result.error, /invalid JSON/);
});

test('core.findAdapter returns undefined for an unknown adapter name', () => {
  const adapter = findAdapter(ADAPTERS_DIR, 'does-not-exist');
  assert.equal(adapter, undefined);
});

test('cli --list-adapters lists all adapters', () => {
  const result = execSync('node core/cli.js --list-adapters').toString();
  assert.ok(result.includes('php-case-converter'), 'php-case-converter should be listed');
  assert.ok(result.includes('go-case-converter'), 'go-case-converter should be listed');
});