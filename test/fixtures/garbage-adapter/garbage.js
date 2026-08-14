#!/usr/bin/env node
// Test fixture: drains stdin, then writes non-JSON to stdout with a 0 exit
// code, so the core's "invalid JSON on stdout" error handling can be
// exercised.
process.stdin.resume();
process.stdin.on("end", () => {
  process.stdout.write("this is not json\n");
});
