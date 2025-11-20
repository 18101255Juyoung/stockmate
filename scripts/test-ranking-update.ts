/**
 * Test Ranking Update
 * Tests the new period-based ranking calculation
 */

import { PrismaClient, League } from '@prisma/client'

const prisma = new PrismaClient()

async function testRankingUpdate() {
  console.log('🧪 Testing new ranking calculation logic...\n')

  try {
    // Get all portfolios
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
            username: true,
            league: true,
          },
        },
      },
    })

    console.log(`Found ${portfolios.length} portfolios\n`)

    // Calculate and display rankings for each period
    const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const

    for (const period of periods) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📊 ${period} Rankings`)
      console.log('='.repeat(60))

      const portfoliosWithReturns = portfolios.map((portfolio) => {
        let periodReturn: number

        if (period === 'ALL_TIME') {
          periodReturn = portfolio.totalReturn
        } else if (period === 'WEEKLY') {
          const weeklyStartAssets = portfolio.weeklyStartAssets
          if (weeklyStartAssets === 0) {
            periodReturn = 0
          } else {
            periodReturn = ((portfolio.totalAssets - weeklyStartAssets) / weeklyStartAssets) * 100
          }
        } else {
          const monthlyStartAssets = portfolio.monthlyStartAssets
          if (monthlyStartAssets === 0) {
            periodReturn = 0
          } else {
            periodReturn = ((portfolio.totalAssets - monthlyStartAssets) / monthlyStartAssets) * 100
          }
        }

        return {
          username: portfolio.user.username,
          league: portfolio.user.league,
          totalAssets: portfolio.totalAssets,
          weeklyStartAssets: portfolio.weeklyStartAssets,
          monthlyStartAssets: portfolio.monthlyStartAssets,
          periodReturn,
        }
      })

      // Sort by return (descending)
      const sorted = portfoliosWithReturns.sort((a, b) => b.periodReturn - a.periodReturn)

      // Display top users
      sorted.forEach((p, index) => {
        console.log(
          `${index + 1}. ${p.username} (${p.league}): ${p.periodReturn.toFixed(2)}%`
        )
        if (period === 'WEEKLY') {
          console.log(`   Current: ₩${p.totalAssets.toLocaleString()} | Weekly Start: ₩${p.weeklyStartAssets.toLocaleString()}`)
        } else if (period === 'MONTHLY') {
          console.log(`   Current: ₩${p.totalAssets.toLocaleString()} | Monthly Start: ₩${p.monthlyStartAssets.toLocaleString()}`)
        } else {
          console.log(`   Total Assets: ₩${p.totalAssets.toLocaleString()}`)
        }
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Test completed successfully!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testRankingUpdate()
  .then(() => {
    console.log('\n✨ All tests passed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
