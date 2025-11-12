/**
 * Fix Nov 6-7 data (final attempt)
 */

import { prisma } from '../src/lib/prisma'
import { backfillSpecificDate } from '../src/lib/services/dataInitializer'

// Convert UTC date to KST string
function toKST(date: Date): string {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kstDate.toISOString().split('T')[0]
}

async function fixDates() {
  console.log('🔧 Fixing Nov 6-7 data (final)...\n')

  try {
    const dates = [
      new Date(Date.UTC(2025, 10, 6, 0, 0, 0, 0)), // Nov 6
      new Date(Date.UTC(2025, 10, 7, 0, 0, 0, 0)), // Nov 7
    ]

    for (const date of dates) {
      const kstDate = toKST(date)

      console.log(`\n=== ${kstDate} ===`)

      // Delete
      console.log('1. 삭제 중...')
      const deleted = await prisma.stockPriceHistory.deleteMany({
        where: { date },
      })
      console.log(`   ✓ ${deleted.count}개 레코드 삭제`)

      // Wait
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Re-backfill
      console.log('2. 재백필 중...')
      const updated = await backfillSpecificDate(date)
      console.log(`   ✓ ${updated}개 종목 업데이트`)

      // Verify Samsung
      console.log('3. 삼성전자 검증...')
      const samsung = await prisma.stockPriceHistory.findUnique({
        where: {
          stockCode_date: {
            stockCode: '005930',
            date,
          },
        },
      })

      if (samsung) {
        console.log(`   시가: ${samsung.openPrice.toLocaleString()}원`)
        console.log(`   고가: ${samsung.highPrice.toLocaleString()}원`)
        console.log(`   저가: ${samsung.lowPrice.toLocaleString()}원`)
        console.log(`   종가: ${samsung.closePrice.toLocaleString()}원`)

        const isValid =
          samsung.openPrice <= samsung.highPrice &&
          samsung.lowPrice <= samsung.highPrice &&
          samsung.lowPrice <= samsung.closePrice

        if (isValid) {
          console.log('   ✅ 유효한 데이터')
        } else {
          console.log('   ❌ 여전히 무효!')
        }
      } else {
        console.log('   ❌ 데이터 없음')
      }
    }

    console.log('\n✅ 수정 완료!')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixDates()
