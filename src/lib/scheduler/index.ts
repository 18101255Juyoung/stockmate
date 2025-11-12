/**
 * Stock Price Collection Scheduler
 * Uses node-schedule to automatically update stock prices during market hours
 *
 * 📅 Optimized Schedule (장마감 후 집중 처리):
 * - Every 5 minutes: Update all stock prices (09:00-15:30, Mon-Fri)
 * - Daily at 15:35: Create daily candles + Generate market analysis (시장 분석)
 * - Daily at 15:40: Create portfolio snapshots (당일 자산 기록)
 * - Daily at 16:00: Generate unified portfolio analysis (통합 AI 분석)
 * - Daily at 16:10: Update rankings (스냅샷 기반 랭킹)
 * - Daily at 23:59: Create database backup
 */

import schedule from 'node-schedule'
import { updateAllStockPrices, createDailyCandles, isMarketOpen } from '@/lib/services/stockPriceCollector'
import { createAllDailySnapshots } from '@/lib/services/portfolioSnapshotService'
import { updateRankings } from '@/lib/services/rankingService'
import { generateDailyPortfolioAnalysisForAllUsers } from '@/lib/services/portfolioAnalysisService'
import { generateMarketAnalysis } from '@/lib/services/aiAdvisorService'

let isSchedulerRunning = false
const jobs: schedule.Job[] = []

/**
 * Start the scheduler
 * Sets up cron jobs for price updates and daily candle creation
 */
export function startScheduler() {
  if (isSchedulerRunning) {
    console.log('⏰ Scheduler is already running')
    return
  }

  console.log('⏰ Starting stock price scheduler...')

  // Job 1: Update prices every 5 minutes during market hours
  // Cron pattern: */5 9-15 * * 1-5 (every 5 min, 09:00-15:59, Mon-Fri)
  // Note: We check isMarketOpen() to ensure we stop at 15:30
  const priceUpdateJob = schedule.scheduleJob(
    '*/5 9-15 * * 1-5',
    { tz: 'Asia/Seoul' },
    async () => {
    // Additional check: only run during market hours (09:00-15:30)
    if (!isMarketOpen()) {
      console.log('⏸️  Market is closed, skipping price update')
      return
    }

    console.log('\n🔄 [Scheduled] Updating stock prices...')
    try {
      const result = await updateAllStockPrices()
      console.log(`✅ [Scheduled] Price update completed: ${result.success} success, ${result.failed} failed`)
    } catch (error) {
      console.error('❌ [Scheduled] Price update failed:', error)
    }
    }
  )

  jobs.push(priceUpdateJob)
  console.log('  ✓ Price update job scheduled: Every 5 minutes (09:00-15:30, Mon-Fri)')

  // Job 2: Create daily candles at market close (15:35)
  // Cron pattern: 35 15 * * 1-5 (15:35, Mon-Fri)
  const dailyCandleJob = schedule.scheduleJob(
    '35 15 * * 1-5',
    { tz: 'Asia/Seoul' },
    async () => {
    console.log('\n📈 [Scheduled] Creating daily candles...')
    try {
      const count = await createDailyCandles()
      console.log(`✅ [Scheduled] Daily candles created: ${count}`)
    } catch (error) {
      console.error('❌ [Scheduled] Daily candle creation failed:', error)
    }
    }
  )

  jobs.push(dailyCandleJob)
  console.log('  ✓ Daily candle job scheduled: 15:35 (Mon-Fri)')

  // Job 2.5: Generate market analysis at 15:35 (after daily candles)
  // 매일 장마감 직후 전체 시장 분석 생성 (KOSPI/KOSDAQ/업종/뉴스)
  // Cron pattern: 35 15 * * 1-5 (15:35, Mon-Fri)
  const marketAnalysisJob = schedule.scheduleJob(
    '35 15 * * 1-5',
    { tz: 'Asia/Seoul' },
    async () => {
      console.log('\n📰 [Scheduled] Generating market analysis...')
      try {
        const analysis = await generateMarketAnalysis(new Date())
        console.log('✅ [Scheduled] Market analysis generated successfully')
      } catch (error) {
        console.error('❌ [Scheduled] Market analysis generation failed:', error)
      }
    }
  )

  jobs.push(marketAnalysisJob)
  console.log('  ✓ Market analysis job scheduled: 15:35 (Mon-Fri)')

  // Job 3: Create portfolio snapshots at 15:40 (after market close, after candles)
  // Cron pattern: 40 15 * * 1-5 (15:40, Mon-Fri)
  const snapshotJob = schedule.scheduleJob('40 15 * * 1-5', { tz: 'Asia/Seoul' }, async () => {
    console.log('\n📸 [Scheduled] Creating portfolio snapshots...')
    try {
      const snapshots = await createAllDailySnapshots()
      console.log(`✅ [Scheduled] Portfolio snapshots created: ${snapshots.length}`)
    } catch (error) {
      console.error('❌ [Scheduled] Portfolio snapshot creation failed:', error)
    }
  })

  jobs.push(snapshotJob)
  console.log('  ✓ Portfolio snapshot job scheduled: 15:40 (Mon-Fri)')

  // Job 4: Generate unified portfolio analysis at 16:00
  // Analyzes all portfolios regardless of transactions
  // - With transactions: Transaction evaluation + Portfolio diagnosis
  // - Without transactions: Portfolio diagnosis only
  // Cron pattern: 0 16 * * 1-5 (16:00, Mon-Fri)
  const portfolioAnalysisJob = schedule.scheduleJob(
    '0 16 * * 1-5',
    { tz: 'Asia/Seoul' },
    async () => {
    console.log('\n📊 [Scheduled] Starting unified portfolio analysis...')
    try {
      const result = await generateDailyPortfolioAnalysisForAllUsers()
      console.log(`✅ [Scheduled] Analysis completed: ${result.successful}/${result.total} users`)
    } catch (error) {
      console.error('❌ [Scheduled] Portfolio analysis failed:', error)
    }
    }
  )

  jobs.push(portfolioAnalysisJob)
  console.log('  ✓ Portfolio analysis job scheduled: 16:00 (Mon-Fri)')

  // Job 5: Update rankings at 16:10 (after snapshots and analysis)
  // Cron pattern: 10 16 * * 1-5 (16:10, Mon-Fri)
  const rankingUpdateJob = schedule.scheduleJob('10 16 * * 1-5', { tz: 'Asia/Seoul' }, async () => {
    console.log('\n🏆 [Scheduled] Updating rankings...')
    try {
      const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const
      const results = []

      for (const period of periods) {
        const result = await updateRankings(period)
        results.push({
          period,
          success: result.success,
          updated: result.success ? result.data.updated : 0,
        })
      }

      console.log('✅ [Scheduled] Rankings updated:')
      results.forEach((r) => {
        console.log(`   ${r.period}: ${r.updated} users`)
      })
    } catch (error) {
      console.error('❌ [Scheduled] Ranking update failed:', error)
    }
  })

  jobs.push(rankingUpdateJob)
  console.log('  ✓ Ranking update job scheduled: 16:10 (Mon-Fri)')

  // Job 6: Create database backup at 23:59 (before midnight)
  // Cron pattern: 59 23 * * * (23:59, every day)
  const backupJob = schedule.scheduleJob('59 23 * * *', { tz: 'Asia/Seoul' }, async () => {
    console.log('\n💾 [Scheduled] Creating database backup...')
    try {
      // Call backup API endpoint
      const response = await fetch('http://localhost:3000/api/cron/backup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ [Scheduled] Database backup completed')
      } else {
        console.error('❌ [Scheduled] Database backup failed:', data.error)
      }
    } catch (error) {
      console.error('❌ [Scheduled] Database backup failed:', error)
    }
  })

  jobs.push(backupJob)
  console.log('  ✓ Database backup job scheduled: 23:59 (daily)')

  isSchedulerRunning = true
  console.log('✅ Scheduler started successfully\n')

  // Log next scheduled runs
  console.log('📅 Next scheduled runs:')
  console.log(`  Price update: ${priceUpdateJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Daily candle: ${dailyCandleJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Market analysis: ${marketAnalysisJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Portfolio snapshot: ${snapshotJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Portfolio analysis: ${portfolioAnalysisJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Ranking update: ${rankingUpdateJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Database backup: ${backupJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}\n`)
}

/**
 * Stop the scheduler
 * Cancels all scheduled jobs
 */
export function stopScheduler() {
  if (!isSchedulerRunning) {
    console.log('⏰ Scheduler is not running')
    return
  }

  console.log('⏰ Stopping stock price scheduler...')

  // Cancel all jobs
  jobs.forEach((job) => job.cancel())
  jobs.length = 0 // Clear array

  isSchedulerRunning = false
  console.log('✅ Scheduler stopped')
}

/**
 * Get scheduler status
 *
 * @returns true if scheduler is running
 */
export function isSchedulerActive(): boolean {
  return isSchedulerRunning
}

/**
 * Manually trigger price update (for development/testing)
 */
export async function triggerPriceUpdate() {
  console.log('🔧 [Manual] Triggering price update...')
  try {
    const result = await updateAllStockPrices()
    console.log(`✅ [Manual] Price update completed: ${result.success} success, ${result.failed} failed`)
    return result
  } catch (error) {
    console.error('❌ [Manual] Price update failed:', error)
    throw error
  }
}

/**
 * Manually trigger daily candle creation (for development/testing)
 */
export async function triggerDailyCandleCreation() {
  console.log('🔧 [Manual] Triggering daily candle creation...')
  try {
    const count = await createDailyCandles()
    console.log(`✅ [Manual] Daily candles created: ${count}`)
    return count
  } catch (error) {
    console.error('❌ [Manual] Daily candle creation failed:', error)
    throw error
  }
}

/**
 * Manually trigger portfolio snapshot creation (for development/testing)
 */
export async function triggerSnapshotCreation() {
  console.log('🔧 [Manual] Triggering portfolio snapshot creation...')
  try {
    const snapshots = await createAllDailySnapshots()
    console.log(`✅ [Manual] Portfolio snapshots created: ${snapshots.length}`)
    return snapshots
  } catch (error) {
    console.error('❌ [Manual] Portfolio snapshot creation failed:', error)
    throw error
  }
}

/**
 * Manually trigger ranking update (for development/testing)
 */
export async function triggerRankingUpdate() {
  console.log('🔧 [Manual] Triggering ranking update...')
  try {
    const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const
    const results = []

    for (const period of periods) {
      const result = await updateRankings(period)
      results.push({
        period,
        success: result.success,
        updated: result.success ? result.data.updated : 0,
      })
    }

    console.log('✅ [Manual] Rankings updated:')
    results.forEach((r) => {
      console.log(`   ${r.period}: ${r.updated} users`)
    })

    return results
  } catch (error) {
    console.error('❌ [Manual] Ranking update failed:', error)
    throw error
  }
}
