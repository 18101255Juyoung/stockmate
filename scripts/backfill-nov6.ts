/**
 * Manually backfill Nov 6 data with correct timezone handling
 */

import { backfillSpecificDate } from '../src/lib/services/dataInitializer'

async function main() {
  console.log('📥 Manually backfilling Nov 6, 2025...\n')

  try {
    // Use UTC to avoid timezone conversion issues
    const nov6 = new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0)) // Nov 6, 2025 (month is 0-indexed)

    console.log(`Target date: ${nov6.toISOString().split('T')[0]}\n`)

    const updated = await backfillSpecificDate(nov6)

    console.log(`\n✅ Backfill complete: ${updated} stocks updated`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
