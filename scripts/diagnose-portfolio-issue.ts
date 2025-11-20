/**
 * Diagnostic Script for Portfolio Issue
 *
 * Checks database values to identify why total assets are incorrect
 *
 * Usage:
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/diagnose-portfolio-issue.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface UserDiagnosis {
  username: string
  user: {
    initialCapital: number
  }
  portfolio: {
    initialCapital: number
    currentCash: number
    totalAssets: number
    totalReturn: number
  }
  capitalHistory: Array<{
    amount: number
    reason: string
    createdAt: Date
  }>
  analysis: {
    userPortfolioDiff: number
    expectedCash: number
    cashMissing: number
    expectedTotalAssets: number
    expectedReturn: number
  }
}

async function diagnoseUser(username: string): Promise<UserDiagnosis | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      initialCapital: true,
      portfolio: {
        select: {
          initialCapital: true,
          currentCash: true,
          totalAssets: true,
          totalReturn: true,
          holdings: {
            select: {
              quantity: true,
              currentPrice: true,
            },
          },
        },
      },
    },
  })

  if (!user || !user.portfolio) {
    return null
  }

  // Get capital history
  const capitalHistory = await prisma.capitalHistory.findMany({
    where: {
      userId: user.id,
      reason: {
        in: ['REFERRAL_GIVEN', 'REFERRAL_USED', 'ROOKIE_REWARD', 'HALL_REWARD'],
      },
    },
    select: {
      amount: true,
      reason: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const userInitialCapital = parseFloat(user.initialCapital.toString())
  const portfolioInitialCapital = user.portfolio.initialCapital

  // Calculate expected values
  const totalBonuses = capitalHistory.reduce(
    (sum, record) => sum + parseFloat(record.amount.toString()),
    0
  )

  const BASE_CAPITAL = 10_000_000 // Everyone starts with 10M
  const expectedCash = BASE_CAPITAL + totalBonuses

  // Calculate stock value
  const stockValue = user.portfolio.holdings.reduce(
    (sum, holding) => sum + holding.quantity * holding.currentPrice,
    0
  )

  const expectedTotalAssets = expectedCash + stockValue
  const expectedReturn = ((expectedTotalAssets - userInitialCapital) / userInitialCapital) * 100

  return {
    username: user.username,
    user: {
      initialCapital: userInitialCapital,
    },
    portfolio: {
      initialCapital: portfolioInitialCapital,
      currentCash: user.portfolio.currentCash,
      totalAssets: user.portfolio.totalAssets,
      totalReturn: user.portfolio.totalReturn,
    },
    capitalHistory: capitalHistory.map((record) => ({
      amount: parseFloat(record.amount.toString()),
      reason: record.reason,
      createdAt: record.createdAt,
    })),
    analysis: {
      userPortfolioDiff: userInitialCapital - portfolioInitialCapital,
      expectedCash,
      cashMissing: expectedCash - user.portfolio.currentCash,
      expectedTotalAssets,
      expectedReturn: Math.round(expectedReturn * 100) / 100,
    },
  }
}

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 Portfolio Issue Diagnostic')
  console.log('='.repeat(80) + '\n')

  const usersToCheck = ['dlwndud12', 'dlwndud', 'dlwndud1', 'posttestuser']

  for (const username of usersToCheck) {
    console.log(`\n📊 Checking user: ${username}`)
    console.log('-'.repeat(80))

    const diagnosis = await diagnoseUser(username)

    if (!diagnosis) {
      console.log(`❌ User not found or no portfolio\n`)
      continue
    }

    // Display current values
    console.log('\n📌 Current Database Values:')
    console.log(`   User.initialCapital:      ₩${diagnosis.user.initialCapital.toLocaleString()}`)
    console.log(
      `   Portfolio.initialCapital: ₩${diagnosis.portfolio.initialCapital.toLocaleString()}`
    )
    console.log(`   Portfolio.currentCash:    ₩${diagnosis.portfolio.currentCash.toLocaleString()}`)
    console.log(
      `   Portfolio.totalAssets:    ₩${diagnosis.portfolio.totalAssets.toLocaleString()}`
    )
    console.log(`   Portfolio.totalReturn:    ${diagnosis.portfolio.totalReturn.toFixed(2)}%`)

    // Display capital history
    if (diagnosis.capitalHistory.length > 0) {
      console.log('\n💰 Capital History (Bonuses):')
      diagnosis.capitalHistory.forEach((record) => {
        console.log(
          `   ${record.createdAt.toISOString().split('T')[0]} | ${record.reason.padEnd(20)} | +₩${record.amount.toLocaleString()}`
        )
      })
      const totalBonuses = diagnosis.capitalHistory.reduce((sum, r) => sum + r.amount, 0)
      console.log(`   ${''.padEnd(45, '-')}`)
      console.log(`   Total Bonuses: +₩${totalBonuses.toLocaleString()}`)
    } else {
      console.log('\n💰 Capital History: No bonuses received')
    }

    // Display analysis
    console.log('\n🔬 Analysis:')

    if (Math.abs(diagnosis.analysis.userPortfolioDiff) > 0.01) {
      console.log(
        `   ⚠️  User/Portfolio initialCapital diff: ₩${Math.abs(diagnosis.analysis.userPortfolioDiff).toLocaleString()}`
      )
    } else {
      console.log('   ✅ User and Portfolio initialCapital are in sync')
    }

    console.log(`   Expected currentCash:     ₩${diagnosis.analysis.expectedCash.toLocaleString()}`)
    console.log(`   Actual currentCash:       ₩${diagnosis.portfolio.currentCash.toLocaleString()}`)

    if (Math.abs(diagnosis.analysis.cashMissing) > 0.01) {
      console.log(
        `   ❌ Missing cash:          ₩${diagnosis.analysis.cashMissing.toLocaleString()}`
      )
    } else {
      console.log('   ✅ Cash is correct')
    }

    console.log(
      `   Expected totalAssets:     ₩${diagnosis.analysis.expectedTotalAssets.toLocaleString()}`
    )
    console.log(
      `   Actual totalAssets:       ₩${diagnosis.portfolio.totalAssets.toLocaleString()}`
    )

    console.log(`   Expected totalReturn:     ${diagnosis.analysis.expectedReturn.toFixed(2)}%`)
    console.log(`   Actual totalReturn:       ${diagnosis.portfolio.totalReturn.toFixed(2)}%`)

    // Verdict
    console.log('\n💡 Verdict:')
    if (Math.abs(diagnosis.analysis.cashMissing) > 0.01) {
      console.log(`   ⚠️  PROBLEM FOUND: Portfolio is missing ₩${diagnosis.analysis.cashMissing.toLocaleString()} in cash`)
      console.log('   This is causing incorrect totalAssets and totalReturn calculations')
      console.log(`   Expected fix: Add ₩${diagnosis.analysis.cashMissing.toLocaleString()} to currentCash`)
    } else {
      console.log('   ✅ No issues detected - portfolio values are correct')
    }

    console.log()
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ Diagnostic complete')
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
