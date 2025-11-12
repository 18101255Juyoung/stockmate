/**
 * Delete corrupted Nov 4-6 data
 */

import { prisma } from '../src/lib/prisma'

async function deleteData() {
  console.log('🗑️  Deleting corrupted Nov 4-6 data...\n')

  try {
    const nov4 = new Date(Date.UTC(2025, 10, 4, 0, 0, 0, 0))
    const nov6End = new Date(Date.UTC(2025, 10, 6, 23, 59, 59, 999))

    console.log(`  Start date: ${nov4.toISOString().split('T')[0]}`)
    console.log(`  End date: ${nov6End.toISOString().split('T')[0]}\n`)

    // Count before
    const countBefore = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: nov4,
          lte: nov6End,
        },
      },
    })

    console.log(`  Found ${countBefore} records to delete`)

    // Delete
    const result = await prisma.stockPriceHistory.deleteMany({
      where: {
        date: {
          gte: nov4,
          lte: nov6End,
        },
      },
    })

    console.log(`  ✅ Deleted ${result.count} records\n`)

    // Verify
    const countAfter = await prisma.stockPriceHistory.count({
      where: {
        date: {
          gte: nov4,
          lte: nov6End,
        },
      },
    })

    if (countAfter === 0) {
      console.log('✅ Deletion successful!')
    } else {
      console.warn(`⚠️  Warning: ${countAfter} records still remain`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

deleteData()
