/**
 * Daily Tasks - Midnight Scheduler (00:00 KST)
 *
 * Executes daily maintenance tasks in the following order:
 * 1. League Classification (based on previous day's assets)
 * 2. Monthly Reward Distribution (only on 1st of month)
 * 3. Portfolio Snapshots (baseline for period calculations)
 *
 * This ensures proper sequence: classify → reward → snapshot
 */

import { classifyAllUserLeagues } from '@/lib/services/leagueService'
import { distributeMonthlyRewards } from '@/lib/services/rewardService'
import { createAllDailySnapshots } from '@/lib/services/portfolioSnapshotService'
import {
  resetWeeklyPeriod,
  resetMonthlyPeriod,
  isMonday as checkIsMonday,
  isFirstOfMonth as checkIsFirstOfMonth
} from '@/lib/services/periodResetService'
import { KSTDate } from '@/lib/utils/kst-date'

/**
 * Run all daily midnight tasks
 *
 * @returns Summary of all tasks
 */
export async function runDailyMidnightTasks(): Promise<{
  success: boolean
  timestamp: Date
  leagueClassification?: any
  rewardDistribution?: any
  snapshotCreation?: any
  weeklyReset?: any
  monthlyReset?: any
  errors: string[]
}> {
  const startTime = Date.now()
  const timestamp = new Date()
  const errors: string[] = []

  console.log('\n' + '='.repeat(60))
  console.log('🌙 [Daily Tasks] Starting midnight tasks...')
  console.log(`⏰ Timestamp: ${timestamp.toISOString()} (KST: ${KSTDate.format(KSTDate.today())})`)
  console.log('='.repeat(60))

  const result: {
    success: boolean
    timestamp: Date
    leagueClassification?: any
    rewardDistribution?: any
    snapshotCreation?: any
    weeklyReset?: any
    monthlyReset?: any
    errors: string[]
  } = {
    success: true,
    timestamp,
    errors,
  }

  // ============================================================
  // TASK 1: League Classification
  // ============================================================
  try {
    console.log('\n📋 TASK 1/3: League Classification')
    console.log('-'.repeat(60))

    const leagueResult = await classifyAllUserLeagues()
    result.leagueClassification = leagueResult

    console.log(`✅ League classification completed successfully`)
  } catch (error) {
    const errorMsg = `League classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`❌ ${errorMsg}`)
    errors.push(errorMsg)
    result.success = false
  }

  // ============================================================
  // TASK 2: Monthly Reward Distribution (only on 1st)
  // ============================================================
  const today = new Date()
  const isFirstOfMonth = today.getDate() === 1

  if (isFirstOfMonth) {
    try {
      console.log('\n📋 TASK 2/3: Monthly Reward Distribution')
      console.log('-'.repeat(60))
      console.log('🎁 Today is the 1st of the month - distributing rewards...')

      // Get previous month
      const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
      const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()

      const rewardResult = await distributeMonthlyRewards(prevYear, prevMonth)
      result.rewardDistribution = rewardResult

      console.log(`✅ Reward distribution completed successfully`)
    } catch (error) {
      const errorMsg = `Reward distribution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      errors.push(errorMsg)
      result.success = false
    }
  } else {
    console.log('\n📋 TASK 2/3: Monthly Reward Distribution')
    console.log('-'.repeat(60))
    console.log(`⏭️  Not 1st of month (today: ${today.getDate()}) - skipping rewards`)

    result.rewardDistribution = {
      skipped: true,
      reason: 'Not the 1st of the month',
    }
  }

  // ============================================================
  // TASK 3: Portfolio Snapshots
  // ============================================================
  try {
    console.log('\n📋 TASK 3/5: Portfolio Snapshots')
    console.log('-'.repeat(60))

    const snapshotResult = await createAllDailySnapshots()
    result.snapshotCreation = {
      count: snapshotResult.length,
      success: true,
    }

    console.log(`✅ Created ${snapshotResult.length} portfolio snapshots`)
  } catch (error) {
    const errorMsg = `Snapshot creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`❌ ${errorMsg}`)
    errors.push(errorMsg)
    result.success = false
  }

  // ============================================================
  // TASK 4: Weekly Period Reset (Monday only)
  // ============================================================
  if (checkIsMonday()) {
    try {
      console.log('\n📋 TASK 4/5: Weekly Period Reset')
      console.log('-'.repeat(60))
      console.log('📅 Today is Monday - resetting weekly period...')

      const weeklyResetResult = await resetWeeklyPeriod()
      result.weeklyReset = weeklyResetResult

      if (weeklyResetResult.success) {
        console.log(`✅ Weekly period reset completed for ${weeklyResetResult.updated} portfolios`)
      } else {
        throw new Error(weeklyResetResult.error || 'Unknown error')
      }
    } catch (error) {
      const errorMsg = `Weekly period reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      errors.push(errorMsg)
      result.success = false
    }
  } else {
    console.log('\n📋 TASK 4/5: Weekly Period Reset')
    console.log('-'.repeat(60))
    console.log(`⏭️  Not Monday (today: ${new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}) - skipping weekly reset`)

    result.weeklyReset = {
      skipped: true,
      reason: 'Not Monday',
    }
  }

  // ============================================================
  // TASK 5: Monthly Period Reset (1st only)
  // ============================================================
  if (checkIsFirstOfMonth()) {
    try {
      console.log('\n📋 TASK 5/5: Monthly Period Reset')
      console.log('-'.repeat(60))
      console.log('📅 Today is the 1st - resetting monthly period...')

      const monthlyResetResult = await resetMonthlyPeriod()
      result.monthlyReset = monthlyResetResult

      if (monthlyResetResult.success) {
        console.log(`✅ Monthly period reset completed for ${monthlyResetResult.updated} portfolios`)
      } else {
        throw new Error(monthlyResetResult.error || 'Unknown error')
      }
    } catch (error) {
      const errorMsg = `Monthly period reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      errors.push(errorMsg)
      result.success = false
    }
  } else {
    console.log('\n📋 TASK 5/5: Monthly Period Reset')
    console.log('-'.repeat(60))
    console.log(`⏭️  Not 1st of month (today: ${new Date().getDate()}) - skipping monthly reset`)

    result.monthlyReset = {
      skipped: true,
      reason: 'Not 1st of month',
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  const duration = Date.now() - startTime

  console.log('\n' + '='.repeat(60))
  if (result.success) {
    console.log('✅ All daily tasks completed successfully!')
  } else {
    console.log('⚠️  Some daily tasks failed - check errors above')
    console.log(`Errors (${errors.length}):`)
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
  }
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`)
  console.log('='.repeat(60) + '\n')

  return result
}

/**
 * Run league classification only (for testing or manual trigger)
 */
export async function runLeagueClassificationTask() {
  console.log('\n🏆 Running league classification task...\n')
  const result = await classifyAllUserLeagues()
  console.log('\n✅ League classification task completed\n')
  return result
}

/**
 * Run reward distribution only (for testing or manual trigger)
 *
 * @param year Year
 * @param month Month (1-12)
 */
export async function runRewardDistributionTask(year: number, month: number) {
  console.log(`\n💰 Running reward distribution task for ${year}-${month}...\n`)
  const result = await distributeMonthlyRewards(year, month)
  console.log('\n✅ Reward distribution task completed\n')
  return result
}

/**
 * Run snapshot creation only (for testing or manual trigger)
 */
export async function runSnapshotCreationTask() {
  console.log('\n📸 Running snapshot creation task...\n')
  const result = await createAllDailySnapshots()
  console.log(`\n✅ Created ${result.length} snapshots\n`)
  return result
}
