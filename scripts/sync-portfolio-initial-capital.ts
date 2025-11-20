/**
 * Portfolio Initial Capital Sync Script
 *
 * Fixes portfolios where Portfolio.initialCapital is out of sync with User.initialCapital
 * due to the previous bug where bonuses (referrals, rewards) only updated User.initialCapital
 * but not Portfolio.initialCapital.
 *
 * Usage:
 *   Dry-run: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/sync-portfolio-initial-capital.ts --dry-run
 *   Execute: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/sync-portfolio-initial-capital.ts
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

interface OutOfSyncRecord {
  userId: string
  username: string
  userInitialCapital: number
  portfolioInitialCapital: number
  difference: number
  currentCash: number
  totalAssets: number
}

interface SyncResult {
  userId: string
  username: string
  before: {
    userInitialCapital: number
    portfolioInitialCapital: number
    currentCash: number
    totalAssets: number
  }
  after: {
    portfolioInitialCapital: number
    currentCash: number
    totalAssets: number
  }
  difference: number
  success: boolean
  error?: string
}

/**
 * Find all portfolios that are out of sync
 */
async function findOutOfSyncPortfolios(): Promise<OutOfSyncRecord[]> {
  console.log('🔍 Searching for out-of-sync portfolios...\n')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      initialCapital: true,
      portfolio: {
        select: {
          initialCapital: true,
          currentCash: true,
          totalAssets: true,
        },
      },
    },
  })

  const outOfSync: OutOfSyncRecord[] = []

  for (const user of users) {
    if (!user.portfolio) {
      console.warn(`⚠️  User ${user.username} has no portfolio - skipping`)
      continue
    }

    const userInitialCapital = parseFloat(user.initialCapital.toString())
    const portfolioInitialCapital = user.portfolio.initialCapital

    // Check if they're different (with small tolerance for floating point)
    const difference = userInitialCapital - portfolioInitialCapital
    if (Math.abs(difference) > 0.01) {
      outOfSync.push({
        userId: user.id,
        username: user.username,
        userInitialCapital,
        portfolioInitialCapital,
        difference,
        currentCash: user.portfolio.currentCash,
        totalAssets: user.portfolio.totalAssets,
      })
    }
  }

  return outOfSync
}

/**
 * Validate the difference against CapitalHistory
 */
async function validateWithCapitalHistory(userId: string, expectedDifference: number): Promise<boolean> {
  const history = await prisma.capitalHistory.findMany({
    where: {
      userId,
      reason: {
        in: ['REFERRAL_GIVEN', 'REFERRAL_USED', 'ROOKIE_REWARD', 'HALL_REWARD'],
      },
    },
    select: {
      amount: true,
      reason: true,
    },
  })

  const totalBonuses = history.reduce((sum, record) => {
    return sum + parseFloat(record.amount.toString())
  }, 0)

  // The difference should match the total bonuses (with small tolerance)
  const matches = Math.abs(totalBonuses - expectedDifference) < 0.01

  if (!matches) {
    console.warn(
      `⚠️  Warning: Expected difference ${expectedDifference} but CapitalHistory shows ${totalBonuses}`
    )
  }

  return matches
}

/**
 * Sync a single portfolio
 */
async function syncPortfolio(record: OutOfSyncRecord): Promise<SyncResult> {
  const result: SyncResult = {
    userId: record.userId,
    username: record.username,
    before: {
      userInitialCapital: record.userInitialCapital,
      portfolioInitialCapital: record.portfolioInitialCapital,
      currentCash: record.currentCash,
      totalAssets: record.totalAssets,
    },
    after: {
      portfolioInitialCapital: record.userInitialCapital,
      currentCash: record.currentCash,
      totalAssets: record.totalAssets,
    },
    difference: record.difference,
    success: false,
  }

  try {
    // Validate with CapitalHistory
    const isValid = await validateWithCapitalHistory(record.userId, record.difference)
    if (!isValid) {
      result.error = 'CapitalHistory validation failed'
      return result
    }

    // Update portfolio in transaction
    await prisma.portfolio.update({
      where: { userId: record.userId },
      data: {
        initialCapital: record.userInitialCapital,
        // Note: We don't need to update currentCash and totalAssets
        // because they were already correctly incremented by the original bonus code
      },
    })

    result.success = true
    result.after.portfolioInitialCapital = record.userInitialCapital
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return result
}

/**
 * Main execution function
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('\n' + '='.repeat(80))
  console.log('📊 Portfolio Initial Capital Sync Script')
  console.log('='.repeat(80) + '\n')

  if (isDryRun) {
    console.log('🔍 Running in DRY-RUN mode - no changes will be made\n')
  } else {
    console.log('⚠️  Running in EXECUTE mode - changes will be applied to database\n')
    console.log('💡 Use --dry-run flag to preview changes first\n')
  }

  // Find out-of-sync portfolios
  const outOfSync = await findOutOfSyncPortfolios()

  if (outOfSync.length === 0) {
    console.log('✅ All portfolios are already in sync! No action needed.\n')
    return
  }

  console.log(`📋 Found ${outOfSync.length} portfolio(s) that need syncing:\n`)

  // Display records
  for (const record of outOfSync) {
    console.log(`👤 ${record.username}`)
    console.log(`   User.initialCapital:      ₩${record.userInitialCapital.toLocaleString()}`)
    console.log(`   Portfolio.initialCapital: ₩${record.portfolioInitialCapital.toLocaleString()}`)
    console.log(`   Difference:               ₩${record.difference.toLocaleString()}`)
    console.log()
  }

  if (isDryRun) {
    console.log('🔍 Dry-run complete - no changes were made')
    console.log('💡 Run without --dry-run to apply these changes\n')
    return
  }

  // Execute sync
  console.log('🔧 Starting sync process...\n')

  const results: SyncResult[] = []
  let successCount = 0
  let errorCount = 0

  for (const record of outOfSync) {
    console.log(`Processing ${record.username}...`)

    const result = await syncPortfolio(record)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ Synced successfully`)
      console.log(`     Portfolio.initialCapital: ₩${result.before.portfolioInitialCapital.toLocaleString()} → ₩${result.after.portfolioInitialCapital.toLocaleString()}`)
      successCount++
    } else {
      console.log(`  ❌ Failed: ${result.error}`)
      errorCount++
    }
    console.log()
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 Sync Summary')
  console.log('='.repeat(80) + '\n')
  console.log(`Total records found:  ${outOfSync.length}`)
  console.log(`✅ Successfully synced: ${successCount}`)
  console.log(`❌ Errors:             ${errorCount}`)
  console.log()

  // Save audit trail
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
  const filename = `scripts/sync-results-${timestamp}.json`

  const auditData = {
    timestamp: new Date().toISOString(),
    totalRecords: outOfSync.length,
    successCount,
    errorCount,
    results,
  }

  writeFileSync(filename, JSON.stringify(auditData, null, 2))
  console.log(`📝 Audit trail saved to: ${filename}\n`)

  console.log('✅ Sync process complete!\n')
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
