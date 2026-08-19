const path = require('path')
const {discoverAdapters, runAdapter} = require('../core/lib/adapters.js')

const testPayload = {
    operation: "convert",
    input: "benchmark_test_string",
    options: { from: "snake", to: "kebab"}
}

const ITERATIONS = 100;

async function runBenchmark() {
    console.log("discovering adapters...")
    const adaptersDir = path.join(__dirname, '../adapters')
    const adapters = await discoverAdapters(adaptersDir)
    
    const finalResults = []

    for (const adapter of adapters) {
        console.log(`running benchmark for ${adapter.id}...`)
        const latencies = []

        try {
            for (let i=0; i<ITERATIONS; i++) {
                const start = performance.now()

                await runAdapter(adapter, testPayload)

                const end = performance.now()
                latencies.push(end - start)
            }

            const min = Math.min(...latencies)
            const max = Math.max(...latencies)

            latencies.sort((a, b) => a - b)

            let median
            const midIndex = Math.floor(latencies.length / 2) 
            if (latencies.length % 2 === 0) {
                median = (latencies[midIndex - 1] + latencies[midIndex]) / 2
            }
            else {
                median = latencies[midIndex]
            }
            const p95 = latencies[Math.floor(latencies.length * 0.95)]

            finalResults.push({
                Adapter: adapter.id,
                Min: min.toFixed(2),
                Max: max.toFixed(2),
                Median: median.toFixed(2),
                P95: p95.toFixed(2)
            })
        } catch (error){
            console.log(`Skipping benchmark for ${adapter.id} due to error: ${error.message}. Toolchain likely not installed.`)
        }
    }

    console.log("\nBenchmark Results:")
    console.table(finalResults)
}

runBenchmark()