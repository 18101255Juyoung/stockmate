/**
 * Delete incorrect Nov 6-7 data (corrupted by updateTodayCandles timezone bug)
 */

import { prisma } from '../src/lib/prisma'

async function deleteIncorrectData() {
  console.log('🗑️  Deleting incorrect Nov 6-7 data...\n')

  try {
    // Delete data from Nov 6-7, 2025
    const nov6 = new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0)) // Nov 6
    const nov7 = new Date(Date.UTC(2025, 10, 7, 23, 59, 59, 999)) // Nov 7

    console.log(`  Start date: ${nov6.toISOString().split('T')[0]}`)
    console.log(`  End date: ${nov7.toISOString().split('T')[0]}\n`)

    // Count records before deletion
    const countBefore = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: nov6,
          lte: nov7,
        },
      },
    })

    console.log(`  Found ${countBefore} records to delete`)

    // Delete the records
    const result = await prisma.stockPriceHistory.deleteMany({
      where: {
        date: {
          gte: nov6,
          lte: nov7,
        },
      },
    })

    console.log(`  ✅ Deleted ${result.count} records\n`)

    // Verify deletion
    const countAfter = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: nov6,
          lte: nov7,
        },
      },
    })

    console.log(`  Verification: ${countAfter} records remaining (should be 0)`)

    if (countAfter === 0) {
      console.log('\n✅ Deletion successful!')
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
