/**
 * Manually backfill Nov 4 data
 */

import { backfillSpecificDate } from '../src/lib/services/dataInitializer'

async function main() {
  console.log('📥 Manually backfilling Nov 4, 2025...\n')

  try {
    const nov4 = new Date(Date.UTC(2025, 10, 4, 0, 0, 0, 0))

    console.log(`Target date: ${nov4.toISOString().split('T')[0]}\n`)

    const updated = await backfillSpecificDate(nov4)

    console.log(`\n✅ Backfill complete: ${updated} stocks updated`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
