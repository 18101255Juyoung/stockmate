/**
 * Refresh Weekly Rankings Script
 *
 * Directly updates WEEKLY rankings using current portfolio data
 *
 * Usage:
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/refresh-weekly-rankings.ts
 */

import { PrismaClient, League } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🔄 Refreshing Weekly Rankings')
  console.log('='.repeat(80) + '\n')

  // Get all portfolios with user info
  const portfolios = await prisma.portfolio.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          league: true,
        },
      },
    },
  })

  console.log(`📊 Found ${portfolios.length} portfolios\n`)

  // Separate by league
  const rookiePortfolios = portfolios
    .filter(p => p.user.league === League.ROOKIE)
    .map(p => ({
      userId: p.userId,
      totalReturn: p.totalReturn,
    }))
    .sort((a, b) => b.totalReturn - a.totalReturn)

  const hallPortfolios = portfolios
    .filter(p => p.user.league === League.HALL_OF_FAME)
    .map(p => ({
      userId: p.userId,
      totalReturn: p.totalReturn,
    }))
    .sort((a, b) => b.totalReturn - a.totalReturn)

  console.log(`🌱 Rookie League: ${rookiePortfolios.length} users`)
  console.log(`👑 Hall of Fame: ${hallPortfolios.length} users\n`)

  // Delete old WEEKLY rankings
  await prisma.ranking.deleteMany({
    where: {
      period: 'WEEKLY',
    },
  })

  console.log('🗑️  Deleted old WEEKLY rankings\n')

  // Create new WEEKLY rankings
  const rookieRankings = rookiePortfolios.slice(0, 100).map((p, index) => ({
    userId: p.userId,
    rank: index + 1,
    totalReturn: p.totalReturn,
    period: 'WEEKLY' as const,
    league: League.ROOKIE,
  }))

  const hallRankings = hallPortfolios.slice(0, 100).map((p, index) => ({
    userId: p.userId,
    rank: index + 1,
    totalReturn: p.totalReturn,
    period: 'WEEKLY' as const,
    league: League.HALL_OF_FAME,
  }))

  if (rookieRankings.length > 0) {
    await prisma.ranking.createMany({
      data: rookieRankings,
    })
    console.log(`✅ Created ${rookieRankings.length} Rookie League rankings`)
  }

  if (hallRankings.length > 0) {
    await prisma.ranking.createMany({
      data: hallRankings,
    })
    console.log(`✅ Created ${hallRankings.length} Hall of Fame rankings`)
  }

  console.log(`\n📋 Top 5 Rookie League:`)
  for (let i = 0; i < Math.min(5, rookiePortfolios.length); i++) {
    const p = rookiePortfolios[i]
    const user = await prisma.user.findUnique({
      where: { id: p.userId },
      select: { username: true },
    })
    console.log(`   ${i + 1}위: ${user?.username} - ${p.totalReturn.toFixed(2)}%`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Weekly rankings refreshed!')
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
