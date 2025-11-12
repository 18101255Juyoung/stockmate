/**
 * Manually backfill Nov 5 data
 */

import { backfillSpecificDate } from '../src/lib/services/dataInitializer'

async function main() {
  console.log('📥 Manually backfilling Nov 5, 2025...\n')

  try {
    // Use UTC to avoid timezone conversion issues
    const nov5 = new Date(Date.UTC(2025, 10, 5, 0, 0, 0, 0)) // Nov 5, 2025 (month is 0-indexed)

    console.log(`Target date: ${nov5.toISOString().split('T')[0]}\n`)

    const updated = await backfillSpecificDate(nov5)

    console.log(`\n✅ Backfill complete: ${updated} stocks updated`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
