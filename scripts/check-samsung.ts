/**
 * Check Samsung Electronics (005930) data for Nov 4-6
 */

import { prisma } from '../src/lib/prisma'

async function checkSamsung() {
  console.log('📊 삼성전자 (005930) 11월 4-6일 데이터 확인\n')

  try {
    const dates = [
      new Date(Date.UTC(2025, 10, 4, 0, 0, 0, 0)), // Nov 4
      new Date(Date.UTC(2025, 10, 5, 0, 0, 0, 0)), // Nov 5
      new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0)), // Nov 6
    ]

    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]

      const data = await prisma.stockPriceHistory.findUnique({
        where: {
          stockCode_date: {
            stockCode: '005930',
            date,
          },
        },
      })

      if (data) {
        console.log(`\n=== ${dateStr} ===`)
        console.log(`시가:  ${data.openPrice.toLocaleString()}원`)
        console.log(`고가:  ${data.highPrice.toLocaleString()}원`)
        console.log(`저가:  ${data.lowPrice.toLocaleString()}원`)
        console.log(`종가:  ${data.closePrice.toLocaleString()}원`)
        console.log(`거래량: ${data.volume.toLocaleString()}주`)
      } else {
        console.log(`\n=== ${dateStr} ===`)
        console.log('❌ 데이터 없음')
      }
    }

    console.log('\n✅ 조회 완료')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkSamsung()
