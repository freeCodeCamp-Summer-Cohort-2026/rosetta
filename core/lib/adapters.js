"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// The set of identifier case styles every adapter is expected to support
// for the "convert" operation. See docs/ADAPTER_CONTRACT.md.
const VALID_CASE_STYLES = ["snake", "camel", "pascal", "kebab"];

/**
 * Scan a directory of adapter subdirectories and return the ones that have
 * a valid adapter.json manifest (must at least declare `name` and `run`).
 *
 * @param {string} adaptersDir
 * @returns {Array<{id: string, dir: string, manifestPath: string, manifest: object}>}
 */
function discoverAdapters(adaptersDir) {
  if (!fs.existsSync(adaptersDir)) {
    return [];
  }

  const entries = fs.readdirSync(adaptersDir, { withFileTypes: true });
  const adapters = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const adapterDir = path.join(adaptersDir, entry.name);
    const manifestPath = path.join(adapterDir, "adapter.json");

    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!manifest.name || !manifest.run) {
        // Malformed manifest - missing required fields. Skip rather than crash
        // discovery for the whole CLI; see the "manifest schema validation"
        // issue for turning this into a loud, actionable error.
        continue;
      }
      adapters.push({
        id: entry.name,
        dir: adapterDir,
        manifestPath,
        manifest,
      });
    } catch (err) {
      continue;
    }
  }

  return adapters;
}

/**
 * Find a single adapter by its directory name or its manifest `name` field.
 */
function findAdapter(adaptersDir, idOrName) {
  const adapters = discoverAdapters(adaptersDir);
  return adapters.find(
    (a) => a.id === idOrName || a.manifest.name === idOrName,
  );
}

/**
 * Invoke an adapter per the contract in docs/ADAPTER_CONTRACT.md:
 * spawn `manifest.run` with cwd = the adapter's directory, write the JSON
 * payload to stdin, and parse a JSON response from stdout.
 *
 * Never throws - all failure modes (bad exit code, non-JSON stdout, spawn
 * failure, timeout) resolve to a { output: null, error: <string> } shape so
 * callers can handle adapter errors gracefully.
 *
 * @param {{dir: string, manifest: object}} adapter
 * @param {object} payload
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{output: string|null, error: string|null}>}
 */
function runAdapter(adapter, payload, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    let child;

    try {
      child = spawn(adapter.manifest.run, {
        cwd: adapter.dir,
        shell: true,
      });
    } catch (err) {
      resolve({
        output: null,
        error: `Failed to start adapter "${adapter.manifest.name}": ${err.message}`,
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({
        output: null,
        error: `Adapter "${adapter.manifest.name}" timed out after ${timeoutMs}ms.`,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        output: null,
        error: `Failed to start adapter "${adapter.manifest.name}": ${err.message}`,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        const MAX_STDERR_LENGTH = 500;
        const stderrMessage = stderr.trim();
        const truncatedStderr =
          stderrMessage.length > MAX_STDERR_LENGTH
            ? `${stderrMessage.slice(0, MAX_STDERR_LENGTH)}...`
            : stderrMessage;
        resolve({
          output: null,
          error:
            `Adapter "${adapter.manifest.name}" exited with code ${code}. ` +
            `Check the adapter's run command in adapter.json.` +
            (truncatedStderr ? ` stderr: ${truncatedStderr}` : ""),
        });
        return;
      }

      const trimmed = stdout.trim();
      try {
        const parsed = JSON.parse(trimmed);
        resolve({
          output: parsed.output ?? null,
          error: parsed.error ?? null,
        });
      } catch (err) {
        resolve({
          output: null,
          error: `Adapter "${adapter.manifest.name}" returned invalid JSON on stdout: ${err.message}. Raw output: ${trimmed}`,
        });
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

module.exports = {
  discoverAdapters,
  findAdapter,
  runAdapter,
  VALID_CASE_STYLES,
};
