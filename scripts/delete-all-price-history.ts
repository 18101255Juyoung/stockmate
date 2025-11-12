/**
 * Delete all StockPriceHistory data
 * Prepare for clean backfill with timezone fixes
 */

import { prisma } from '../src/lib/prisma'

async function deleteAllData() {
  console.log('🗑️  Deleting ALL StockPriceHistory data...\n')

  try {
    // Count before
    const countBefore = await prisma.stockPriceHistory.count()
    console.log(`  Current records: ${countBefore.toLocaleString()}`)

    // Get date range before deletion
    const oldest = await prisma.stockPriceHistory.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    })
    const newest = await prisma.stockPriceHistory.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    if (oldest && newest) {
      console.log(`  Date range: ${oldest.date.toISOString().split('T')[0]} ~ ${newest.date.toISOString().split('T')[0]}`)
    }

    console.log('\n  ⚠️  This will delete all historical price data!')
    console.log('  Proceeding in 2 seconds...\n')

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Delete all
    const result = await prisma.stockPriceHistory.deleteMany({})

    console.log(`  ✅ Deleted ${result.count.toLocaleString()} records\n`)

    // Verify
    const countAfter = await prisma.stockPriceHistory.count()

    if (countAfter === 0) {
      console.log('✅ All data deleted successfully!')
      console.log('   Ready for clean backfill with timezone fixes.')
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

deleteAllData()
