/**
 * Fix Missing Bonus Cash Script
 *
 * Adds bonus amounts to Portfolio.currentCash for users who received bonuses
 * but the cash wasn't properly incremented.
 *
 * This fixes users where:
 * - User.initialCapital and Portfolio.initialCapital were synced (via previous script)
 * - But Portfolio.currentCash wasn't incremented when bonuses were given
 *
 * Usage:
 *   Dry-run: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fix-missing-bonus-cash.ts --dry-run
 *   Execute: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/fix-missing-bonus-cash.ts
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { calculateTotalAssets, calculateTotalReturn, calculateUnrealizedPL } from '../src/lib/utils/calculations'

const prisma = new PrismaClient()

const BASE_CAPITAL = 10_000_000 // Everyone starts with 10M

interface FixRecord {
  userId: string
  username: string
  bonusAmount: number
  before: {
    currentCash: number
    totalAssets: number
    totalReturn: number
  }
  after: {
    currentCash: number
    totalAssets: number
    totalReturn: number
  }
  success: boolean
  error?: string
}

/**
 * Get all users who received bonuses
 */
async function getUsersWithBonuses() {
  console.log('🔍 Finding users with bonus history...\\n')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      initialCapital: true,
      portfolio: {
        select: {
          id: true,
          initialCapital: true,
          currentCash: true,
          totalAssets: true,
          totalReturn: true,
          unrealizedPL: true,
          holdings: {
            select: {
              quantity: true,
              currentPrice: true,
              avgPrice: true,
            },
          },
        },
      },
      capitalHistory: {
        where: {
          reason: {
            in: ['REFERRAL_GIVEN', 'REFERRAL_USED', 'ROOKIE_REWARD', 'HALL_REWARD'],
          },
        },
        select: {
          amount: true,
          reason: true,
        },
      },
    },
  })

  // Filter to only users with bonuses
  const usersWithBonuses = users.filter(
    (user) => user.capitalHistory.length > 0 && user.portfolio
  )

  console.log(`Found ${usersWithBonuses.length} user(s) with bonus history\\n`)

  return usersWithBonuses
}

/**
 * Fix a single user's portfolio
 */
async function fixUserPortfolio(
  user: any,
  isDryRun: boolean
): Promise<FixRecord> {
  const userId = user.id
  const username = user.username
  const portfolio = user.portfolio

  // Calculate total bonuses
  const totalBonuses = user.capitalHistory.reduce(
    (sum: number, record: any) => sum + parseFloat(record.amount.toString()),
    0
  )

  // Calculate expected initial capital
  const expectedInitialCapital = BASE_CAPITAL + totalBonuses

  // Store before state
  const before = {
    currentCash: portfolio.currentCash,
    totalAssets: portfolio.totalAssets,
    totalReturn: portfolio.totalReturn,
  }

  console.log(`👤 ${username}`)
  console.log(`   Bonuses received:     ₩${totalBonuses.toLocaleString()}`)
  console.log(`   Current cash:         ₩${portfolio.currentCash.toLocaleString()}`)
  console.log(`   Current total assets: ₩${portfolio.totalAssets.toLocaleString()}`)
  console.log(`   Current return:       ${portfolio.totalReturn.toFixed(2)}%`)

  // Check if user.initialCapital matches expected
  const userInitialCapital = parseFloat(user.initialCapital.toString())
  if (Math.abs(userInitialCapital - expectedInitialCapital) > 0.01) {
    console.log(`   ⚠️  Warning: User.initialCapital (₩${userInitialCapital.toLocaleString()}) doesn't match expected (₩${expectedInitialCapital.toLocaleString()})`)
  }

  // The fix: Add bonus amount to currentCash
  const newCash = portfolio.currentCash + totalBonuses

  // Recalculate metrics with new cash
  const holdingsData = portfolio.holdings.map((h: any) => ({
    quantity: h.quantity,
    currentPrice: h.currentPrice,
    avgPrice: h.avgPrice,
  }))

  const newTotalAssets = calculateTotalAssets(newCash, holdingsData)
  const newTotalReturn = calculateTotalReturn(newTotalAssets, portfolio.initialCapital)
  const newUnrealizedPL = calculateUnrealizedPL(holdingsData)

  console.log(`   `)
  console.log(`   📊 After fix:`)
  console.log(`   New cash:             ₩${newCash.toLocaleString()} (+₩${totalBonuses.toLocaleString()})`)
  console.log(`   New total assets:     ₩${newTotalAssets.toLocaleString()}`)
  console.log(`   New return:           ${newTotalReturn.toFixed(2)}%`)

  const result: FixRecord = {
    userId,
    username,
    bonusAmount: totalBonuses,
    before,
    after: {
      currentCash: newCash,
      totalAssets: newTotalAssets,
      totalReturn: newTotalReturn,
    },
    success: false,
  }

  if (isDryRun) {
    console.log(`   🔍 DRY RUN - no changes made`)
    result.success = true
  } else {
    try {
      // Update portfolio
      await prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          currentCash: newCash,
          totalAssets: newTotalAssets,
          totalReturn: newTotalReturn,
          unrealizedPL: newUnrealizedPL,
        },
      })

      console.log(`   ✅ Portfolio updated`)
      result.success = true
    } catch (error) {
      console.log(`   ❌ Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.success = false
      result.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  console.log()
  return result
}

/**
 * Main execution
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('\\n' + '='.repeat(80))
  console.log('💰 Fix Missing Bonus Cash Script')
  console.log('='.repeat(80) + '\\n')

  if (isDryRun) {
    console.log('🔍 Running in DRY-RUN mode - no changes will be made\\n')
  } else {
    console.log('⚠️  Running in EXECUTE mode - portfolios will be updated\\n')
    console.log('💡 Use --dry-run flag to preview changes first\\n')
  }

  // Get users with bonuses
  const users = await getUsersWithBonuses()

  if (users.length === 0) {
    console.log('✅ No users with bonuses found\\n')
    return
  }

  const results: FixRecord[] = []

  console.log('🔧 Processing users...\\n')

  for (const user of users) {
    const result = await fixUserPortfolio(user, isDryRun)
    results.push(result)
  }

  // Summary
  console.log('\\n' + '='.repeat(80))
  console.log('📊 Summary')
  console.log('='.repeat(80) + '\\n')

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length

  console.log(`Total users:          ${results.length}`)
  console.log(`✅ Successfully fixed: ${successCount}`)
  console.log(`❌ Errors:            ${errorCount}`)
  console.log()

  if (!isDryRun && results.length > 0) {
    // Save audit trail
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const filename = `scripts/fix-missing-cash-results-${timestamp}.json`

    const auditData = {
      timestamp: new Date().toISOString(),
      totalUsers: results.length,
      successCount,
      errorCount,
      results,
    }

    writeFileSync(filename, JSON.stringify(auditData, null, 2))
    console.log(`📝 Audit trail saved to: ${filename}\\n`)

    console.log('✅ Fix complete!\\n')
  } else if (isDryRun) {
    console.log('🔍 Dry-run complete - no changes were made')
    console.log('💡 Run without --dry-run to apply these fixes\\n')
  }
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
