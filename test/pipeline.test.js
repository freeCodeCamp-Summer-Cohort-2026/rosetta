'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { execSync } = require('node:child_process');

test('cli runs a two-stage pipeline in order', () => {
  const result = execSync('node core/cli.js convert --pipeline php-case-converter:camel,go-case-converter:kebab --input hello_world').toString();
  assert.equal(result.trim(), 'hello-world');
});
