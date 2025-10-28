/**
 * Stock Price Collection Scheduler
 * Uses node-schedule to automatically update stock prices during market hours
 * - Every 5 minutes: Update all stock prices (09:00-15:30, Mon-Fri)
 * - Daily at 15:35: Create daily candles
 */

import schedule from 'node-schedule'
import { updateAllStockPrices, createDailyCandles, isMarketOpen } from '@/lib/services/stockPriceCollector'

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
  const priceUpdateJob = schedule.scheduleJob('*/5 9-15 * * 1-5', async () => {
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
  })

  jobs.push(priceUpdateJob)
  console.log('  ✓ Price update job scheduled: Every 5 minutes (09:00-15:30, Mon-Fri)')

  // Job 2: Create daily candles at market close (15:35)
  // Cron pattern: 35 15 * * 1-5 (15:35, Mon-Fri)
  const dailyCandleJob = schedule.scheduleJob('35 15 * * 1-5', async () => {
    console.log('\n📈 [Scheduled] Creating daily candles...')
    try {
      const count = await createDailyCandles()
      console.log(`✅ [Scheduled] Daily candles created: ${count}`)
    } catch (error) {
      console.error('❌ [Scheduled] Daily candle creation failed:', error)
    }
  })

  jobs.push(dailyCandleJob)
  console.log('  ✓ Daily candle job scheduled: 15:35 (Mon-Fri)')

  isSchedulerRunning = true
  console.log('✅ Scheduler started successfully\n')

  // Log next scheduled runs
  console.log('📅 Next scheduled runs:')
  console.log(`  Price update: ${priceUpdateJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}`)
  console.log(`  Daily candle: ${dailyCandleJob.nextInvocation()?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) || 'Not scheduled'}\n`)
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
