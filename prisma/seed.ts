import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 시가총액 기준 상위 50개 종목 (2024년 10월 28일 기준)
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
  { stockCode: '105560', stockName: 'KB금융', market: 'KOSPI' },
  { stockCode: '055550', stockName: '신한지주', market: 'KOSPI' },
  { stockCode: '035420', stockName: 'NAVER', market: 'KOSPI' },
  { stockCode: '005380', stockName: '현대차', market: 'KOSPI' },
  { stockCode: '012330', stockName: '현대모비스', market: 'KOSPI' },
  { stockCode: '028260', stockName: '삼성물산', market: 'KOSPI' },
  { stockCode: '066570', stockName: 'LG전자', market: 'KOSPI' },
  { stockCode: '003550', stockName: 'LG', market: 'KOSPI' },
  { stockCode: '096770', stockName: 'SK이노베이션', market: 'KOSPI' },

  // 21-30
  { stockCode: '017670', stockName: 'SK텔레콤', market: 'KOSPI' },
  { stockCode: '316140', stockName: '우리금융지주', market: 'KOSPI' },
  { stockCode: '009150', stockName: '삼성전기', market: 'KOSPI' },
  { stockCode: '003670', stockName: '포스코퓨처엠', market: 'KOSPI' },
  { stockCode: '086790', stockName: '하나금융지주', market: 'KOSPI' },
  { stockCode: '032830', stockName: '삼성생명', market: 'KOSPI' },
  { stockCode: '018260', stockName: '삼성에스디에스', market: 'KOSPI' },
  { stockCode: '033780', stockName: 'KT&G', market: 'KOSPI' },
  { stockCode: '091990', stockName: '셀트리온헬스케어', market: 'KOSPI' },
  { stockCode: '034730', stockName: 'SK', market: 'KOSPI' },

  // 31-40
  { stockCode: '010950', stockName: 'S-Oil', market: 'KOSPI' },
  { stockCode: '000810', stockName: '삼성화재', market: 'KOSPI' },
  { stockCode: '030200', stockName: 'KT', market: 'KOSPI' },
  { stockCode: '011200', stockName: 'HMM', market: 'KOSPI' },
  { stockCode: '259960', stockName: '크래프톤', market: 'KOSPI' },
  { stockCode: '138040', stockName: '메리츠금융지주', market: 'KOSPI' },
  { stockCode: '024110', stockName: '기업은행', market: 'KOSPI' },
  { stockCode: '010130', stockName: '고려아연', market: 'KOSPI' },
  { stockCode: '047810', stockName: '한국항공우주', market: 'KOSPI' },
  { stockCode: '361610', stockName: 'SK아이이테크놀로지', market: 'KOSPI' },

  // 41-50
  { stockCode: '011170', stockName: '롯데케미칼', market: 'KOSPI' },
  { stockCode: '004020', stockName: '현대제철', market: 'KOSPI' },
  { stockCode: '009540', stockName: 'HD한국조선해양', market: 'KOSPI' },
  { stockCode: '051900', stockName: 'LG생활건강', market: 'KOSPI' },
  { stockCode: '402340', stockName: 'SK스퀘어', market: 'KOSPI' },
  { stockCode: '086280', stockName: '현대글로비스', market: 'KOSPI' },
  { stockCode: '015760', stockName: '한국전력', market: 'KOSPI' },
  { stockCode: '267250', stockName: 'HD현대', market: 'KOSPI' },
  { stockCode: '036570', stockName: '엔씨소프트', market: 'KOSPI' },
  { stockCode: '251270', stockName: '넷마블', market: 'KOSPI' },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Stock 데이터 삽입
  console.log('📊 Seeding stocks...')

  for (const stock of STOCKS) {
    await prisma.stock.upsert({
      where: { stockCode: stock.stockCode },
      update: {
        stockName: stock.stockName,
        market: stock.market,
      },
      create: {
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        market: stock.market,
      },
    })
  }

  console.log(`✅ Seeded ${STOCKS.length} stocks`)
  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
