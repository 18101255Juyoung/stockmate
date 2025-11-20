/**
 * Journal Backfill Service
 *
 * Automatically generates missing market analysis and portfolio analysis
 * for dates between the last analysis and today.
 *
 * Use cases:
 * - Server restart after few days without access
 * - Manual backfill for specific date ranges
 * - Recovery from failed daily cron jobs
 */

import { prisma } from '@/lib/prisma'
import { KSTDate } from '@/lib/utils/kst-date'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'
import { createAllDailySnapshots } from '@/lib/services/portfolioSnapshotService'
import { generateDailyPortfolioAnalysisForAllUsers } from '@/lib/services/portfolioAnalysisService'

export interface BackfillResult {
  date: string
  success: boolean
  marketAnalysis?: boolean
  snapshots?: number
  portfolioAnalyses?: {
    total: number
    successful: number
    failed: number
  }
  error?: string
  cost?: number
}

export interface BackfillSummary {
  totalDays: number
  successful: number
  failed: number
  skipped: number
  results: BackfillResult[]
  totalCost: number
  duration: number
}

/**
 * Find the last date with market analysis
 */
export async function findLastAnalysisDate(): Promise<string | null> {
  const lastAnalysis = await prisma.marketAnalysis.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  if (!lastAnalysis) return null

  // Convert Date to string format (YYYY-MM-DD)
  if (typeof lastAnalysis.date === 'string') {
    return lastAnalysis.date
  } else {
    const kstDate = KSTDate.fromDate(lastAnalysis.date)
    return KSTDate.format(kstDate)
  }
}

/**
 * Check if a date is a weekend (Korean stock market is closed)
 */
function isWeekend(dateStr: string): boolean {
  const date = KSTDate.parse(dateStr)
  const jsDate = new Date(date)
  const dayOfWeek = jsDate.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
}

/**
 * Get all missing dates between lastDate and today (excluding weekends)
 * @param lastDateStr Last date with analysis (YYYY-MM-DD)
 * @param todayStr Today's date (YYYY-MM-DD)
 * @returns Array of date strings (YYYY-MM-DD)
 */
export function getMissingDateRange(
  lastDateStr: string,
  todayStr: string
): string[] {
  const dates: string[] = []
  let current = lastDateStr

  while (current < todayStr) {
    // Add one day
    const currentDate = KSTDate.parse(current)
    const nextDate = KSTDate.addDays(currentDate, 1)
    current = KSTDate.format(nextDate)

    // Skip weekends
    if (!isWeekend(current)) {
      dates.push(current)
    }
  }

  return dates
}

/**
 * Check if market analysis already exists for a date
 */
async function hasMarketAnalysis(dateStr: string): Promise<boolean> {
  // Convert string to Date object for Prisma DateTime field
  const dateObj = KSTDate.parse(dateStr)
  const count = await prisma.marketAnalysis.count({
    where: { date: dateObj },
  })
  return count > 0
}

/**
 * Get all missing dates in the last N days (excluding weekends)
 * This scans the full date range and checks each date individually,
 * rather than just looking for gaps from the last analysis.
 *
 * @param daysToScan Number of days to look back from today
 * @returns Array of date strings (YYYY-MM-DD) that are missing analysis
 */
export async function getAllMissingDatesInRange(
  daysToScan: number
): Promise<string[]> {
  const today = KSTDate.format(KSTDate.today())
  const todayDate = KSTDate.parse(today)

  // Generate array of all dates in range (excluding weekends)
  const allDates: string[] = []
  for (let i = 0; i < daysToScan; i++) {
    const date = KSTDate.addDays(todayDate, -i)
    const dateStr = KSTDate.format(date)

    if (!isWeekend(dateStr)) {
      allDates.push(dateStr)
    }
  }

  // Check which dates are missing market analysis
  const missingDates: string[] = []

  for (const dateStr of allDates) {
    const hasAnalysis = await hasMarketAnalysis(dateStr)
    if (!hasAnalysis) {
      missingDates.push(dateStr)
    }
  }

  // Sort in chronological order (oldest first)
  missingDates.sort()

  return missingDates
}

/**
 * Backfill all data for a specific date
 *
 * Order of operations:
 * 1. Market Analysis (independent, can run first)
 * 2. Portfolio Snapshots (depends on stock prices)
 * 3. Portfolio Analysis (depends on snapshots)
 */
export async function backfillForDate(
  dateStr: string,
  options: { force?: boolean } = {}
): Promise<BackfillResult> {
  const result: BackfillResult = {
    date: dateStr,
    success: false,
    cost: 0,
  }

  try {
    console.log(`\n📅 Backfilling for ${dateStr}...`)

    // Step 1: Market Analysis
    console.log('  📰 Checking market analysis...')
    const hasAnalysis = await hasMarketAnalysis(dateStr)

    if (hasAnalysis && !options.force) {
      console.log('     ✓ Market analysis already exists (skipping)')
      result.marketAnalysis = true
    } else {
      if (options.force && hasAnalysis) {
        console.log('     ⚠️  Forcing regeneration (deleting existing)...')
        await prisma.marketAnalysis.delete({
          where: { date: dateStr },
        })
      }

      console.log('     🤖 Generating market analysis...')
      const dateObj = KSTDate.parse(dateStr)
      const marketAnalysis = await generateMarketAnalysis(dateObj)

      if (marketAnalysis) {
        console.log('     ✓ Market analysis generated')
        result.marketAnalysis = true
        result.cost! += marketAnalysis.cost || 0.03 // Estimate if not provided
      } else {
        console.log('     ❌ Failed to generate market analysis')
        result.marketAnalysis = false
      }
    }

    // Step 2: Portfolio Snapshots
    console.log('  📸 Creating portfolio snapshots...')
    const dateObj = KSTDate.parse(dateStr)
    const snapshots = await createAllDailySnapshots(dateObj)
    result.snapshots = snapshots.length
    console.log(`     ✓ Created ${snapshots.length} snapshots`)

    // Step 3: Portfolio Analysis
    console.log('  📊 Generating portfolio analysis...')
    const analysisResult = await generateDailyPortfolioAnalysisForAllUsers(dateObj)

    result.portfolioAnalyses = {
      total: analysisResult.total,
      successful: analysisResult.successful,
      failed: analysisResult.failed,
    }

    if (analysisResult.successful > 0) {
      console.log(
        `     ✓ Analyzed ${analysisResult.successful}/${analysisResult.total} portfolios`
      )
      // Estimate cost: ~$0.005 per user
      result.cost! += analysisResult.successful * 0.005
    } else {
      console.log(`     ⚠️  No portfolios analyzed`)
    }

    result.success = true
    console.log(`  ✅ Backfill completed for ${dateStr}`)
  } catch (error) {
    console.error(`  ❌ Failed to backfill ${dateStr}:`, error)
    result.success = false
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return result
}

/**
 * Auto-backfill all missing dates up to today
 *
 * Uses full-range scanning: checks each of the last N days individually
 * to find missing analysis, rather than just looking for gaps.
 *
 * @param maxDays Maximum number of days to scan back from today (cost control)
 * @returns Summary of backfill operation
 */
export async function autoBackfillAll(
  maxDays: number = 7
): Promise<BackfillSummary> {
  const startTime = Date.now()

  console.log('\n📔 [Journal Backfill] Starting auto-backfill...')
  console.log(`  📅 Scanning last ${maxDays} days for missing analysis...`)

  // Use new full-range scanning method
  const missingDates = await getAllMissingDatesInRange(maxDays)

  if (missingDates.length === 0) {
    console.log('  ✅ All analysis up to date')
    return {
      totalDays: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
      totalCost: 0,
      duration: Date.now() - startTime,
    }
  }

  console.log(`  📋 Found ${missingDates.length} missing days:`)
  console.log(`     ${missingDates.join(', ')}`)

  // Backfill each date
  const results: BackfillResult[] = []
  let successful = 0
  let failed = 0
  let totalCost = 0

  for (const dateStr of missingDates) {
    const result = await backfillForDate(dateStr)
    results.push(result)

    if (result.success) {
      successful++
      totalCost += result.cost || 0
    } else {
      failed++
    }
  }

  const duration = Date.now() - startTime

  console.log(`\n✅ Backfill completed:`)
  console.log(`   📊 ${successful} successful, ${failed} failed`)
  console.log(`   💰 Estimated cost: $${totalCost.toFixed(3)}`)
  console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(1)}s\n`)

  return {
    totalDays: missingDates.length,
    successful,
    failed,
    skipped: 0,
    results,
    totalCost,
    duration,
  }
}

/**
 * Manual backfill for a specific date range
 *
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param options Backfill options
 * @returns Summary of backfill operation
 */
export async function backfillDateRange(
  startDate: string,
  endDate: string,
  options: { force?: boolean; skipWeekends?: boolean } = {}
): Promise<BackfillSummary> {
  const startTime = Date.now()

  console.log(`\n📔 [Manual Backfill] ${startDate} to ${endDate}`)

  // Validate dates
  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date')
  }

  // Get all dates in range
  let dates: string[] = []
  let current = startDate

  while (current <= endDate) {
    dates.push(current)
    const currentDate = KSTDate.parse(current)
    const nextDate = KSTDate.addDays(currentDate, 1)
    current = KSTDate.format(nextDate)
  }

  // Filter weekends if needed
  if (options.skipWeekends !== false) {
    // Default: skip weekends
    const originalCount = dates.length
    dates = dates.filter((d) => !isWeekend(d))
    console.log(`  📋 Filtered ${originalCount - dates.length} weekend dates`)
  }

  console.log(`  📋 Will backfill ${dates.length} days`)

  // Backfill each date
  const results: BackfillResult[] = []
  let successful = 0
  let failed = 0
  let totalCost = 0

  for (const dateStr of dates) {
    const result = await backfillForDate(dateStr, options)
    results.push(result)

    if (result.success) {
      successful++
      totalCost += result.cost || 0
    } else {
      failed++
    }
  }

  const duration = Date.now() - startTime

  console.log(`\n✅ Manual backfill completed:`)
  console.log(`   📊 ${successful} successful, ${failed} failed`)
  console.log(`   💰 Estimated cost: $${totalCost.toFixed(3)}`)
  console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(1)}s\n`)

  return {
    totalDays: dates.length,
    successful,
    failed,
    skipped: 0,
    results,
    totalCost,
    duration,
  }
}
