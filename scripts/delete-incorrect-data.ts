/**
 * Delete incorrect Nov 5-7 data caused by timezone bugs
 * Run this before re-backfilling with fixed timezone logic
 */

import { prisma } from '../src/lib/prisma'

async function deleteIncorrectData() {
  console.log('🗑️  Deleting incorrect Nov 5-7 data...\n')

  try {
    // Delete data from Nov 5-7, 2025
    const startDate = new Date(Date.UTC(2025, 10, 5, 0, 0, 0, 0)) // Nov 5, 2025
    const endDate = new Date(Date.UTC(2025, 10, 7, 23, 59, 59, 999)) // Nov 7, 2025

    console.log(`  Start date: ${startDate.toISOString().split('T')[0]}`)
    console.log(`  End date: ${endDate.toISOString().split('T')[0]}\n`)

    // Count records before deletion
    const countBefore = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    console.log(`  Found ${countBefore} records to delete`)

    // Delete the records
    const result = await prisma.stockPriceHistory.deleteMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    console.log(`  ✅ Deleted ${result.count} records\n`)

    // Verify deletion
    const countAfter = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    console.log(`  Verification: ${countAfter} records remaining (should be 0)`)

    if (countAfter === 0) {
      console.log('\n✅ Deletion successful! Restart the server to trigger auto-backfill.')
    } else {
      console.warn('\n⚠️  Warning: Some records still remain')
    }
  } catch (error) {
    console.error('❌ Error deleting data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteIncorrectData()
