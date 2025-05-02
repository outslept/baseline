import { consola } from 'consola'
import { BaselineAPI } from '../src/index'

async function main() {
  const api = new BaselineAPI({
    config: {
      verbose: true,
      retry: 2,
      timeout: 20000,
    },
  })

  try {
    const featuresResult = await api.features({
      baselineStatus: 'widely',
      group: 'css',
      customQuery: 'name:grid',
    })
    consola.log(`Found ${featuresResult.length} features matching criteria`)

    const baselineResult = await api.baseline('newly')
    consola.log(`Found ${baselineResult.length} features with 'newly' baseline status`)

    const groupResult = await api.byGroup('javascript', 'widely')
    consola.log(`Found ${groupResult.length} JavaScript features with 'widely' status`)

    const cssResult = await api.css('widely')
    consola.log(`Found ${cssResult.length} CSS features with 'widely' status`)

    const jsResult = await api.javascript('widely')
    consola.log(`Found ${jsResult.length} JavaScript features`)

    const htmlResult = await api.html('widely')
    consola.log(`Found ${htmlResult.length} HTML features with 'widely' status`)

    const dateRangeResult = await api.inDateRange('2022-01-01', '2022-12-31')
    consola.log(`Found ${dateRangeResult.length} features in date range 2022`)

    const queryResult = await api.query('name:fetch AND baseline_status:widely')
    consola.log(`Found ${queryResult.length} features matching raw query`)

    try {
      await api.query('')
      consola.log('Empty query test passed (returned empty array)')
    }
    catch (error) {
      consola.error('Empty query test failed:', error)
    }

    if (featuresResult.length > 0) {
      const sample = featuresResult[0]
      consola.log(`Name: ${sample.name}`)
      consola.log(`ID: ${sample.feature_id}`)
      consola.log(`Baseline status: ${sample.baseline.status}`)
      consola.log('Browser implementations:')
      consola.log(`  Chrome: ${sample.browser_implementations.chrome.status} (v${sample.browser_implementations.chrome.version || 'N/A'})`)
      consola.log(`  Firefox: ${sample.browser_implementations.firefox.status} (v${sample.browser_implementations.firefox.version || 'N/A'})`)
      consola.log(`  Safari: ${sample.browser_implementations.safari.status} (v${sample.browser_implementations.safari.version || 'N/A'})`)
      consola.log(`  Edge: ${sample.browser_implementations.edge.status} (v${sample.browser_implementations.edge.version || 'N/A'})`)
    }

    consola.log('Everything completed successfully!')
  }
  catch (error) {
    consola.error('Test failed with error:', error)
  }
}

main()
