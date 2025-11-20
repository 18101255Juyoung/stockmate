/**
 * Check Top Rankings Script
 *
 * Investigates top-ranked players to understand their return rates
 *
 * Usage:
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/check-top-rankings.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🏆 Top Rankings Investigation')
  console.log('='.repeat(80) + '\n')

  // Get top 5 from Rookie League - Weekly
  console.log('📊 루키 리그 - 주간 랭킹 TOP 5\n')

  const weeklyRankings = await prisma.ranking.findMany({
    where: {
      league: 'ROOKIE',
      period: 'WEEKLY',
    },
    include: {
      user: {
        select: {
          username: true,
          initialCapital: true,
        },
      },
    },
    orderBy: {
      rank: 'asc',
    },
    take: 5,
  })

  for (const ranking of weeklyRankings) {
    console.log(`${ranking.rank}위 - ${ranking.user.username}`)
    console.log(`   수익률: ${ranking.totalReturn.toFixed(2)}%`)

    // Get user's portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId: ranking.userId },
      select: {
        initialCapital: true,
        currentCash: true,
        totalAssets: true,
        totalReturn: true,
        unrealizedPL: true,
        holdings: {
          select: {
            stockCode: true,
            stockName: true,
            quantity: true,
            avgPrice: true,
            currentPrice: true,
          },
        },
      },
    })

    if (portfolio) {
      console.log(`   User.initialCapital:      ₩${parseFloat(ranking.user.initialCapital.toString()).toLocaleString()}`)
      console.log(`   Portfolio.initialCapital: ₩${portfolio.initialCapital.toLocaleString()}`)
      console.log(`   Portfolio.currentCash:    ₩${portfolio.currentCash.toLocaleString()}`)
      console.log(`   Portfolio.totalAssets:    ₩${portfolio.totalAssets.toLocaleString()}`)
      console.log(`   Portfolio.totalReturn:    ${portfolio.totalReturn.toFixed(2)}%`)
      console.log(`   Portfolio.unrealizedPL:   ₩${portfolio.unrealizedPL.toLocaleString()}`)

      // Check for bonuses
      const bonuses = await prisma.capitalHistory.findMany({
        where: {
          userId: ranking.userId,
          reason: {
            in: ['REFERRAL_GIVEN', 'REFERRAL_USED', 'ROOKIE_REWARD', 'HALL_REWARD'],
          },
        },
        select: {
          amount: true,
          reason: true,
          createdAt: true,
        },
      })

      if (bonuses.length > 0) {
        console.log(`   추천인 보너스:`)
        const totalBonus = bonuses.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0)
        bonuses.forEach(b => {
          console.log(`     - ${b.reason}: +₩${parseFloat(b.amount.toString()).toLocaleString()} (${b.createdAt.toISOString().split('T')[0]})`)
        })
        console.log(`     총 보너스: +₩${totalBonus.toLocaleString()}`)
      } else {
        console.log(`   추천인 보너스: 없음`)
      }

      // Calculate expected return
      const userInitialCapital = parseFloat(ranking.user.initialCapital.toString())
      const profit = portfolio.totalAssets - userInitialCapital
      const expectedReturn = (profit / userInitialCapital) * 100

      console.log(`   \n   계산 검증:`)
      console.log(`   수익 = 총자산 - 초기자본`)
      console.log(`        = ₩${portfolio.totalAssets.toLocaleString()} - ₩${userInitialCapital.toLocaleString()}`)
      console.log(`        = ₩${profit.toLocaleString()}`)
      console.log(`   수익률 = 수익 / 초기자본 × 100`)
      console.log(`          = ₩${profit.toLocaleString()} / ₩${userInitialCapital.toLocaleString()} × 100`)
      console.log(`          = ${expectedReturn.toFixed(2)}%`)

      if (Math.abs(expectedReturn - portfolio.totalReturn) > 0.1) {
        console.log(`   ⚠️  계산 불일치! 예상: ${expectedReturn.toFixed(2)}%, 실제: ${portfolio.totalReturn.toFixed(2)}%`)
      } else {
        console.log(`   ✅ 계산 일치`)
      }

      // Show holdings
      if (portfolio.holdings.length > 0) {
        console.log(`   \n   보유 종목:`)
        portfolio.holdings.forEach(h => {
          const value = h.quantity * h.currentPrice
          const pl = (h.currentPrice - h.avgPrice) * h.quantity
          console.log(`     - ${h.stockName} (${h.stockCode}): ${h.quantity}주 × ₩${h.currentPrice.toLocaleString()} = ₩${value.toLocaleString()} (${pl >= 0 ? '+' : ''}₩${pl.toLocaleString()})`)
        })
      } else {
        console.log(`   보유 종목: 없음`)
      }
    }

    console.log()
  }

  console.log('='.repeat(80))
  console.log('✅ Investigation complete')
  console.log('='.repeat(80) + '\n')
}

// Execute
main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
