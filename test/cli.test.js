'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { execSync } = require('node:child_process');

test('cli runs a two-stage pipeline in order', () => {
  const result = execSync('node core/cli.js convert --pipeline php-case-converter:camel,go-case-converter:kebab --input hello_world').toString();
  assert.equal(result.trim(), 'hello-world');
});

test('cli rejects a pipeline stage missing the required colon', () => {
  assert.throws(() => {
    execSync('node core/cli.js convert --pipeline php-case-converter,go-case-converter:kebab --input hello_world');
  }, /pipeline stage 1 must use the format adapter:style/);
});

test('cli rejects a pipeline stage with an empty adapter name', () => {
  assert.throws(() => {
    execSync('node core/cli.js convert --pipeline php-case-converter:camel,:kebab --input hello_world');
  }, /pipeline stage 2 must use the format adapter:style/);
});

test('cli rejects a pipeline stage with an empty target style', () => {
  assert.throws(() => {
    execSync('node core/cli.js convert --pipeline php-case-converter:,go-case-converter:kebab --input hello_world');
  }, /pipeline stage 1 must use the format adapter:style/);
});