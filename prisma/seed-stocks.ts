/**
 * Stock Data Seeding Script
 * Safely adds 50 major Korean stocks to the database
 * Uses upsert to prevent duplicates
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Top 50 Korean stocks by market cap (as of October 2024)
const STOCKS = [
  // Top 10
  { stockCode: '005930', stockName: '삼성전자', market: 'KOSPI' },
  { stockCode: '000660', stockName: 'SK하이닉스', market: 'KOSPI' },
  { stockCode: '373220', stockName: 'LG에너지솔루션', market: 'KOSPI' },
  { stockCode: '207940', stockName: '삼성바이오로직스', market: 'KOSPI' },
  { stockCode: '005935', stockName: '삼성전자우', market: 'KOSPI' },
  { stockCode: '005490', stockName: 'POSCO홀딩스', market: 'KOSPI' },
  { stockCode: '051910', stockName: 'LG화학', market: 'KOSPI' },
  { stockCode: '006400', stockName: '삼성SDI', market: 'KOSPI' },
  { stockCode: '035720', stockName: '카카오', market: 'KOSPI' },
  { stockCode: '000270', stockName: '기아', market: 'KOSPI' },

  // 11-20
  { stockCode: '068270', stockName: '셀트리온', market: 'KOSPI' },
  { stockCode: '028260', stockName: '삼성물산', market: 'KOSPI' },
  { stockCode: '035420', stockName: 'NAVER', market: 'KOSPI' },
  { stockCode: '105560', stockName: 'KB금융', market: 'KOSPI' },
  { stockCode: '055550', stockName: '신한지주', market: 'KOSPI' },
  { stockCode: '012330', stockName: '현대모비스', market: 'KOSPI' },
  { stockCode: '066970', stockName: '엘앤에프', market: 'KOSPI' },
  { stockCode: '086790', stockName: '하나금융지주', market: 'KOSPI' },
  { stockCode: '003670', stockName: '포스코퓨처엠', market: 'KOSPI' },
  { stockCode: '096770', stockName: 'SK이노베이션', market: 'KOSPI' },

  // 21-30
  { stockCode: '017670', stockName: 'SK텔레콤', market: 'KOSPI' },
  { stockCode: '000810', stockName: '삼성화재', market: 'KOSPI' },
  { stockCode: '003550', stockName: 'LG', market: 'KOSPI' },
  { stockCode: '316140', stockName: '우리금융지주', market: 'KOSPI' },
  { stockCode: '009150', stockName: '삼성전기', market: 'KOSPI' },
  { stockCode: '034020', stockName: '두산에너빌리티', market: 'KOSPI' },
  { stockCode: '032830', stockName: '삼성생명', market: 'KOSPI' },
  { stockCode: '018260', stockName: '삼성에스디에스', market: 'KOSPI' },
  { stockCode: '015760', stockName: '한국전력', market: 'KOSPI' },
  { stockCode: '011200', stockName: 'HMM', market: 'KOSPI' },

  // 31-40
  { stockCode: '030200', stockName: 'KT', market: 'KOSPI' },
  { stockCode: '010130', stockName: '고려아연', market: 'KOSPI' },
  { stockCode: '047050', stockName: '포스코인터내셔널', market: 'KOSPI' },
  { stockCode: '402340', stockName: 'SK스퀘어', market: 'KOSPI' },
  { stockCode: '326030', stockName: 'SK바이오팜', market: 'KOSPI' },
  { stockCode: '009540', stockName: 'HD한국조선해양', market: 'KOSPI' },
  { stockCode: '012450', stockName: '한화에어로스페이스', market: 'KOSPI' },
  { stockCode: '036570', stockName: '엔씨소프트', market: 'KOSPI' },
  { stockCode: '010950', stockName: 'S-Oil', market: 'KOSPI' },
  { stockCode: '024110', stockName: '기업은행', market: 'KOSPI' },

  // 41-50
  { stockCode: '009830', stockName: '한화솔루션', market: 'KOSPI' },
  { stockCode: '251270', stockName: '넷마블', market: 'KOSPI' },
  { stockCode: '004020', stockName: '현대제철', market: 'KOSPI' },
  { stockCode: '267250', stockName: 'HD현대중공업', market: 'KOSPI' },
  { stockCode: '011070', stockName: 'LG이노텍', market: 'KOSPI' },
  { stockCode: '034220', stockName: 'LG디스플레이', market: 'KOSPI' },
  { stockCode: '071050', stockName: '한국금융지주', market: 'KOSPI' },
  { stockCode: '047810', stockName: '한국항공우주', market: 'KOSPI' },
  { stockCode: '138040', stockName: '메리츠금융지주', market: 'KOSPI' },
  { stockCode: '011780', stockName: '금호석유', market: 'KOSPI' },
]

async function main() {
  console.log('🌱 Starting stock seeding...')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const stock of STOCKS) {
    try {
      const result = await prisma.stock.upsert({
        where: { stockCode: stock.stockCode },
        update: {
          stockName: stock.stockName,
          market: stock.market,
        },
        create: {
          stockCode: stock.stockCode,
          stockName: stock.stockName,
          market: stock.market,
          currentPrice: 0,
          openPrice: 0,
          highPrice: 0,
          lowPrice: 0,
          volume: BigInt(0),
          priceUpdatedAt: null,
        },
      })

      // Check if it was created or updated
      const existing = await prisma.stock.findUnique({
        where: { stockCode: stock.stockCode },
      })

      if (existing && existing.createdAt.getTime() === existing.updatedAt.getTime()) {
        created++
      } else {
        updated++
      }
    } catch (error) {
      console.error(`❌ Failed to seed ${stock.stockName}:`, error)
      skipped++
    }
  }

  console.log(`\n✅ Stock seeding completed!`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total: ${STOCKS.length}\n`)

  // Verify total count
  const totalStocks = await prisma.stock.count()
  console.log(`📊 Total stocks in database: ${totalStocks}`)

  if (totalStocks >= STOCKS.length) {
    console.log('\n🎉 Stock table is ready!')
    console.log('💡 The scheduler will automatically update prices every 5 minutes during market hours.')
    console.log('💡 Daily candles will be created at 15:35 KST.\n')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during stock seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
