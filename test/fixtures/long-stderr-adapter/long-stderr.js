#!/usr/bin/env node

process.stdin.resume();

process.stdin.on("end", () => {
  const longError = "X".repeat(5000);

  process.stderr.write(longError);
  process.exit(1);
});
