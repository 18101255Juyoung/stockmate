/**
 * Verify Nov 5-6 data after timezone fix and re-backfill
 * Compare with securities platform data
 */

import { prisma } from '../src/lib/prisma'

async function verifyData() {
  console.log('📊 Verifying Nov 5-6 data...\n')

  try {
    // Check Nov 5-6 data for a few major stocks
    const testStocks = [
      '005930', // Samsung Electronics
      '000660', // SK Hynix
      '035420', // NAVER
      '005380', // Hyundai Motor
      '051910', // LG Chem
    ]

    const dates = [
      new Date(Date.UTC(2025, 10, 5, 0, 0, 0, 0)), // Nov 5, 2025
      new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0)), // Nov 6, 2025
      new Date(Date.UTC(2025, 10, 7, 0, 0, 0, 0)), // Nov 7, 2025
    ]

    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]
      console.log(`\n=== ${dateStr} ===`)

      for (const stockCode of testStocks) {
        const data = await prisma.stockPriceHistory.findUnique({
          where: {
            stockCode_date: {
              stockCode,
              date,
            },
          },
          include: {
            stock: {
              select: {
                stockName: true,
              },
            },
          },
        })

        if (data) {
          console.log(`\n${stockCode} (${data.stock.stockName}):`)
          console.log(`  Open:  ${data.openPrice.toLocaleString()}원`)
          console.log(`  High:  ${data.highPrice.toLocaleString()}원`)
          console.log(`  Low:   ${data.lowPrice.toLocaleString()}원`)
          console.log(`  Close: ${data.closePrice.toLocaleString()}원`)
          console.log(`  Volume: ${data.volume.toLocaleString()}`)
        } else {
          console.log(`\n${stockCode}: ❌ No data found`)
        }
      }
    }

    // Count total records for Nov 5-7
    console.log('\n\n=== Summary ===')
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]
      const count = await prisma.stockPriceHistory.count({
        where: { date },
      })
      console.log(`${dateStr}: ${count} records`)
    }

    console.log('\n✅ Verification complete')
    console.log('\nPlease compare this data with securities platform charts.')
    console.log('Example: https://finance.naver.com/item/fchart.naver?code=005930')
  } catch (error) {
    console.error('❌ Error verifying data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyData()
