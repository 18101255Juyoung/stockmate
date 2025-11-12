/**
 * Backfill 150 days of historical data
 * Using timezone-fixed code
 */

import { backfillAllStocks } from '../src/lib/services/historicalDataCollector'

async function main() {
  console.log('📥 Starting 150-day backfill with timezone fixes...\n')
  console.log('This will take approximately 5-10 minutes.\n')

  try {
    const results = await backfillAllStocks(150)

    console.log('\n📊 Backfill Summary:')
    console.log(`Total stocks processed: ${results.length}`)

    const totalDays = results.reduce((sum, r) => sum + r.daysInserted, 0)
    const errors = results.filter(r => r.errors.length > 0).length

    console.log(`Total days inserted: ${totalDays}`)
    console.log(`Stocks with errors: ${errors}`)

    if (errors > 0) {
      console.log('\n⚠️  Stocks with errors:')
      results.filter(r => r.errors.length > 0).forEach(r => {
        console.log(`  - ${r.stockCode} (${r.stockName}): ${r.errors.join(', ')}`)
      })
    }

    console.log('\n✅ Backfill complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
