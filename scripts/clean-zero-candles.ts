/**
 * Clean Zero-Value Candles Script
 * Removes stock price history records with 0 values in OHLC data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanZeroCandles() {
  console.log('🧹 Starting cleanup of zero-value candles...\n')

  try {
    // Find all records with any 0 value in OHLC
    const zeroRecords = await prisma.stockPriceHistory.findMany({
      where: {
        OR: [
          { openPrice: 0 },
          { highPrice: 0 },
          { lowPrice: 0 },
          { closePrice: 0 },
        ],
      },
      select: {
        stockCode: true,
        date: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        closePrice: true,
      },
    })

    console.log(`Found ${zeroRecords.length} records with zero values:\n`)

    if (zeroRecords.length > 0) {
      // Display found records
      zeroRecords.forEach((record) => {
        console.log(
          `  ${record.stockCode} | ${record.date.toISOString().split('T')[0]} | ` +
            `O:${record.openPrice} H:${record.highPrice} L:${record.lowPrice} C:${record.closePrice}`
        )
      })

      console.log('\n⚠️  Deleting these records...\n')

      // Delete records with 0 values
      const result = await prisma.stockPriceHistory.deleteMany({
        where: {
          OR: [
            { openPrice: 0 },
            { highPrice: 0 },
            { lowPrice: 0 },
            { closePrice: 0 },
          ],
        },
      })

      console.log(`✅ Successfully deleted ${result.count} zero-value candles\n`)
    } else {
      console.log('✅ No zero-value candles found. Database is clean!\n')
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanZeroCandles()
  .then(() => {
    console.log('✨ Cleanup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error)
    process.exit(1)
  })
