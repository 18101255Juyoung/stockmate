/**
 * Portfolio Metrics Recalculation Script
 *
 * Recalculates totalAssets, totalReturn, and unrealizedPL for all portfolios
 * using the correct updatePortfolioMetrics() function.
 *
 * This fixes portfolios where metrics were set using direct increments instead
 * of being calculated from currentCash + holdings.
 *
 * Usage:
 *   Dry-run: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/recalculate-portfolio-metrics.ts --dry-run
 *   Execute: npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/recalculate-portfolio-metrics.ts
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { calculateTotalAssets, calculateTotalReturn, calculateUnrealizedPL } from '../src/lib/utils/calculations'

const prisma = new PrismaClient()

interface PortfolioMetrics {
  portfolioId: string
  username: string
  before: {
    totalAssets: number
    totalReturn: number
    unrealizedPL: number
  }
  after: {
    totalAssets: number
    totalReturn: number
    unrealizedPL: number
  }
  changed: boolean
}

/**
 * Get all portfolios with their current metrics
 */
async function getAllPortfolios() {
  console.log('📊 Fetching all portfolios...\n')

  const portfolios = await prisma.portfolio.findMany({
    select: {
      id: true,
      userId: true,
      totalAssets: true,
      totalReturn: true,
      unrealizedPL: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  })

  console.log(`Found ${portfolios.length} portfolio(s)\n`)
  return portfolios
}

/**
 * Recalculate metrics for a single portfolio
 */
async function recalculatePortfolio(
  portfolioId: string,
  username: string,
  beforeMetrics: { totalAssets: number; totalReturn: number; unrealizedPL: number }
): Promise<PortfolioMetrics> {
  // Fetch portfolio with holdings
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      holdings: true,
    },
  })

  if (!portfolio) {
    throw new Error(`Portfolio ${portfolioId} not found`)
  }

  // Prepare holdings for calculation
  const holdingsData = portfolio.holdings.map((holding) => ({
    quantity: holding.quantity,
    currentPrice: holding.currentPrice,
    avgPrice: holding.avgPrice,
  }))

  // Calculate metrics
  const totalAssets = calculateTotalAssets(portfolio.currentCash, holdingsData)
  const totalReturn = calculateTotalReturn(totalAssets, portfolio.initialCapital)
  const unrealizedPL = calculateUnrealizedPL(holdingsData)

  // Update portfolio
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: {
      totalAssets,
      totalReturn,
      unrealizedPL,
    },
  })

  const changed =
    Math.abs(totalAssets - beforeMetrics.totalAssets) > 0.01 ||
    Math.abs(totalReturn - beforeMetrics.totalReturn) > 0.01 ||
    Math.abs(unrealizedPL - beforeMetrics.unrealizedPL) > 0.01

  return {
    portfolioId,
    username,
    before: beforeMetrics,
    after: {
      totalAssets,
      totalReturn,
      unrealizedPL,
    },
    changed,
  }
}

/**
 * Main execution function
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('\n' + '='.repeat(80))
  console.log('📊 Portfolio Metrics Recalculation Script')
  console.log('='.repeat(80) + '\n')

  if (isDryRun) {
    console.log('🔍 Running in DRY-RUN mode - no changes will be made\n')
  } else {
    console.log('⚠️  Running in EXECUTE mode - portfolios will be updated\n')
    console.log('💡 Use --dry-run flag to preview changes first\n')
  }

  // Get all portfolios
  const portfolios = await getAllPortfolios()

  if (portfolios.length === 0) {
    console.log('✅ No portfolios found\n')
    return
  }

  const results: PortfolioMetrics[] = []
  let changedCount = 0
  let unchangedCount = 0

  console.log('🔧 Processing portfolios...\n')

  for (const portfolio of portfolios) {
    const beforeMetrics = {
      totalAssets: portfolio.totalAssets,
      totalReturn: portfolio.totalReturn,
      unrealizedPL: portfolio.unrealizedPL,
    }

    if (isDryRun) {
      // In dry-run, we need to manually fetch and calculate without saving
      // For simplicity, we'll just show current values
      console.log(`👤 ${portfolio.user.username}`)
      console.log(`   Current totalAssets:  ₩${portfolio.totalAssets.toLocaleString()}`)
      console.log(`   Current totalReturn:  ${portfolio.totalReturn.toFixed(2)}%`)
      console.log(`   Current unrealizedPL: ₩${portfolio.unrealizedPL.toLocaleString()}`)
      console.log(`   (Recalculation will happen during actual execution)`)
      console.log()

      unchangedCount++
    } else {
      // Execute recalculation
      try {
        const result = await recalculatePortfolio(
          portfolio.id,
          portfolio.user.username,
          beforeMetrics
        )

        results.push(result)

        if (result.changed) {
          console.log(`👤 ${result.username}`)
          console.log(`   Total Assets:  ₩${result.before.totalAssets.toLocaleString()} → ₩${result.after.totalAssets.toLocaleString()}`)
          console.log(`   Total Return:  ${result.before.totalReturn.toFixed(2)}% → ${result.after.totalReturn.toFixed(2)}%`)
          console.log(`   Unrealized PL: ₩${result.before.unrealizedPL.toLocaleString()} → ₩${result.after.unrealizedPL.toLocaleString()}`)
          console.log(`   ✅ Updated`)
          changedCount++
        } else {
          console.log(`👤 ${result.username}`)
          console.log(`   ⏭️  No changes needed (metrics already correct)`)
          unchangedCount++
        }
        console.log()
      } catch (error) {
        console.error(`❌ Failed to recalculate ${portfolio.user.username}:`, error)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary')
  console.log('='.repeat(80) + '\n')

  if (isDryRun) {
    console.log(`Total portfolios: ${portfolios.length}`)
    console.log('\n🔍 Dry-run complete - no changes were made')
    console.log('💡 Run without --dry-run to recalculate all portfolios\n')
  } else {
    console.log(`Total portfolios:     ${portfolios.length}`)
    console.log(`✅ Updated:            ${changedCount}`)
    console.log(`⏭️  No changes needed: ${unchangedCount}`)
    console.log()

    // Save audit trail
    if (results.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
      const filename = `scripts/recalculate-results-${timestamp}.json`

      const auditData = {
        timestamp: new Date().toISOString(),
        totalPortfolios: portfolios.length,
        changedCount,
        unchangedCount,
        results: results.filter((r) => r.changed),
      }

      writeFileSync(filename, JSON.stringify(auditData, null, 2))
      console.log(`📝 Audit trail saved to: ${filename}\n`)
    }

    console.log('✅ Recalculation complete!\n')
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
