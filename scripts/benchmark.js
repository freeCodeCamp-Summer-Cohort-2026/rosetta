const path = require("path");
const { discoverAdapters, runAdapter } = require("../core/lib/adapters.js");

const testPayload = {
  operation: "convert",
  input: "benchmark_test_string",
  options: { from: "snake", to: "kebab" },
};

const ITERATIONS = 100;

function calculateMedian(latencies) {
  const midIndex = Math.floor(latencies.length / 2);
  if (latencies.length % 2 === 0) {
    return (latencies[midIndex - 1] + latencies[midIndex]) / 2;
  } else {
    return latencies[midIndex];
  }
}

function appendSuffix(latency) {
  return `${latency} ms`
}

async function runBenchmark() {
  console.log("discovering adapters...");
  const adaptersDir = path.join(__dirname, "../adapters");
  const adapters = await discoverAdapters(adaptersDir);

  const finalResults = [];

  for (const adapter of adapters) {
    console.log(`running benchmark for ${adapter.id}...`);
    const latencies = [];

    try {
      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();

        await runAdapter(adapter, testPayload);

        const end = performance.now();
        latencies.push(end - start);
      }
      
      latencies.sort((a, b) => a - b);

      const min = latencies.at(0);
      const max = latencies.at(-1);
      const median = calculateMedian(latencies);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];

      finalResults.push({
        Adapter: adapter.id,
        Min: appendSuffix(min.toFixed(2)),
        Max: appendSuffix(max.toFixed(2)),
        Median: appendSuffix(median.toFixed(2)),
        P95: appendSuffix(p95.toFixed(2)),
      });
    } catch (error) {
      console.log(
        `Skipping benchmark for ${adapter.id} due to error: ${error.message}. Toolchain likely not installed.`,
      );
    }
  }

  console.log("\nBenchmark Results:");
  console.table(finalResults);
}

runBenchmark();
