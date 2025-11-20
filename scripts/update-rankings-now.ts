/**
 * Update Rankings Now
 * Updates all rankings (WEEKLY, MONTHLY, ALL_TIME) using new calculation logic
 */

import { PrismaClient, League } from '@prisma/client'

const prisma = new PrismaClient()

type RankingPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'

async function updateRankings(period: RankingPeriod) {
  console.log(`\n📊 Updating ${period} rankings...`)

  // Get all portfolios with user league information
  const portfolios = await prisma.portfolio.findMany({
    select: {
      id: true,
      userId: true,
      totalAssets: true,
      totalReturn: true,
      weeklyStartAssets: true,
      monthlyStartAssets: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          league: true,
        },
      },
    },
  })

  if (portfolios.length === 0) {
    console.log('   No portfolios found')
    return { updated: 0, rookie: 0, hallOfFame: 0 }
  }

  // Calculate period-specific returns for each portfolio
  const portfoliosWithReturns = portfolios.map((portfolio) => {
    let periodReturn: number

    if (period === 'ALL_TIME') {
      // All-time: Use portfolio's total return
      periodReturn = portfolio.totalReturn
    } else if (period === 'WEEKLY') {
      // Weekly: Compare current assets vs Monday 00:00 baseline
      const weeklyStartAssets = portfolio.weeklyStartAssets
      if (weeklyStartAssets === 0) {
        periodReturn = 0
      } else {
        periodReturn = ((portfolio.totalAssets - weeklyStartAssets) / weeklyStartAssets) * 100
      }
    } else {
      // Monthly: Compare current assets vs 1st 00:00 baseline
      const monthlyStartAssets = portfolio.monthlyStartAssets
      if (monthlyStartAssets === 0) {
        periodReturn = 0
      } else {
        periodReturn = ((portfolio.totalAssets - monthlyStartAssets) / monthlyStartAssets) * 100
      }
    }

    return {
      userId: portfolio.userId,
      league: portfolio.user.league,
      periodReturn,
    }
  })

  // Separate by league
  const rookiePortfolios = portfoliosWithReturns.filter((p) => p.league === League.ROOKIE)
  const hallPortfolios = portfoliosWithReturns.filter((p) => p.league === League.HALL_OF_FAME)

  // Sort each league independently
  const sortedRookie = rookiePortfolios.sort((a, b) => b.periodReturn - a.periodReturn)
  const sortedHall = hallPortfolios.sort((a, b) => b.periodReturn - a.periodReturn)

  // Create rankings (top 100 per league)
  const rookieRankings = sortedRookie.slice(0, 100).map((portfolio, index) => ({
    userId: portfolio.userId,
    rank: index + 1,
    totalReturn: portfolio.periodReturn,
    period,
    league: League.ROOKIE,
    rewardEligible: index < 100,
  }))

  const hallRankings = sortedHall.slice(0, 100).map((portfolio, index) => ({
    userId: portfolio.userId,
    rank: index + 1,
    totalReturn: portfolio.periodReturn,
    period,
    league: League.HALL_OF_FAME,
    rewardEligible: index < 100,
  }))

  // Delete existing rankings for this period (all leagues)
  await prisma.ranking.deleteMany({
    where: { period },
  })

  console.log(`   Deleted old ${period} rankings`)

  // Create new rankings
  const allRankings = [...rookieRankings, ...hallRankings]

  if (allRankings.length > 0) {
    await prisma.ranking.createMany({
      data: allRankings,
    })
  }

  console.log(`   Created ${allRankings.length} new rankings (${rookieRankings.length} ROOKIE, ${hallRankings.length} HALL_OF_FAME)`)

  return {
    updated: allRankings.length,
    rookie: rookieRankings.length,
    hallOfFame: hallRankings.length,
  }
}

async function main() {
  console.log('🚀 Updating all rankings with new calculation logic...\n')

  try {
    const periods: RankingPeriod[] = ['WEEKLY', 'MONTHLY', 'ALL_TIME']
    const results = []

    for (const period of periods) {
      const result = await updateRankings(period)
      results.push({
        period,
        ...result,
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log('='.repeat(60))
    results.forEach((r) => {
      console.log(`${r.period}: ${r.updated} total (${r.rookie} ROOKIE, ${r.hallOfFame} HALL_OF_FAME)`)
    })
    console.log('='.repeat(60))
    console.log('\n✅ All rankings updated successfully!')
  } catch (error) {
    console.error('❌ Failed to update rankings:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
