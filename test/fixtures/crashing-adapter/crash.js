#!/usr/bin/env node
// Test fixture: drains stdin, then exits non-zero to simulate an adapter
// crash, so the core's error handling can be exercised.
process.stdin.resume();
process.stdin.on("end", () => {
  process.stderr.write("boom: simulated crash\n");
  process.exit(1);
});
