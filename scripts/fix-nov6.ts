/**
 * Fix Nov 6 data only
 */

import { prisma } from '../src/lib/prisma'
import { backfillSpecificDate } from '../src/lib/services/dataInitializer'

async function fixNov6() {
  console.log('🔧 Fixing Nov 6 data...\n')

  try {
    const nov6 = new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0))

    // Delete Nov 6 data
    console.log('1. Deleting Nov 6 data...')
    const deleted = await prisma.stockPriceHistory.deleteMany({
      where: { date: nov6 },
    })
    console.log(`   ✓ Deleted ${deleted.count} records\n`)

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Re-backfill
    console.log('2. Re-backfilling Nov 6...')
    const updated = await backfillSpecificDate(nov6)
    console.log(`   ✓ Updated ${updated} stocks\n`)

    // Verify
    console.log('3. Verifying Samsung data...')
    const samsung = await prisma.stockPriceHistory.findUnique({
      where: {
        stockCode_date: {
          stockCode: '005930',
          date: nov6,
        },
      },
    })

    if (samsung) {
      console.log(`   시가: ${samsung.openPrice.toLocaleString()}원`)
      console.log(`   고가: ${samsung.highPrice.toLocaleString()}원`)
      console.log(`   저가: ${samsung.lowPrice.toLocaleString()}원`)
      console.log(`   종가: ${samsung.closePrice.toLocaleString()}원`)

      // Check validity
      if (samsung.openPrice <= samsung.highPrice &&
          samsung.lowPrice <= samsung.closePrice &&
          samsung.lowPrice <= samsung.highPrice) {
        console.log('\n✅ Data is valid!')
      } else {
        console.log('\n❌ Data is still invalid!')
      }
    } else {
      console.log('❌ No data found')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixNov6()
