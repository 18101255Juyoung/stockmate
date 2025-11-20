/**
 * Period Reset Service
 *
 * Handles weekly and monthly resets for period-based rankings.
 *
 * - Weekly: Reset every Monday at 00:00 KST
 * - Monthly: Reset on 1st of every month at 00:00 KST
 */

import { prisma } from '@/lib/prisma'

/**
 * Reset weekly period for all portfolios
 *
 * Sets weeklyStartAssets to current totalAssets for all portfolios.
 * Called every Monday at 00:00 KST.
 *
 * @returns Result with count of updated portfolios
 */
export async function resetWeeklyPeriod(): Promise<{
  success: boolean
  updated: number
  error?: string
}> {
  try {
    console.log('\n📅 [Period Reset] Resetting weekly period...')

    // Get all portfolios with current totalAssets
    const portfolios = await prisma.portfolio.findMany({
      select: {
        id: true,
        totalAssets: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    console.log(`   Found ${portfolios.length} portfolios to reset`)

    // Update all portfolios in a transaction
    const updatePromises = portfolios.map((portfolio) =>
      prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          weeklyStartAssets: portfolio.totalAssets,
        },
      })
    )

    await prisma.$transaction(updatePromises)

    console.log(`✅ [Period Reset] Weekly period reset completed for ${portfolios.length} portfolios`)

    return {
      success: true,
      updated: portfolios.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [Period Reset] Weekly reset failed:', errorMessage)

    return {
      success: false,
      updated: 0,
      error: errorMessage,
    }
  }
}

/**
 * Reset monthly period for all portfolios
 *
 * Sets monthlyStartAssets to current totalAssets for all portfolios.
 * Called on 1st of every month at 00:00 KST.
 *
 * @returns Result with count of updated portfolios
 */
export async function resetMonthlyPeriod(): Promise<{
  success: boolean
  updated: number
  error?: string
}> {
  try {
    console.log('\n📅 [Period Reset] Resetting monthly period...')

    // Get all portfolios with current totalAssets
    const portfolios = await prisma.portfolio.findMany({
      select: {
        id: true,
        totalAssets: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    console.log(`   Found ${portfolios.length} portfolios to reset`)

    // Update all portfolios in a transaction
    const updatePromises = portfolios.map((portfolio) =>
      prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          monthlyStartAssets: portfolio.totalAssets,
        },
      })
    )

    await prisma.$transaction(updatePromises)

    console.log(`✅ [Period Reset] Monthly period reset completed for ${portfolios.length} portfolios`)

    return {
      success: true,
      updated: portfolios.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ [Period Reset] Monthly reset failed:', errorMessage)

    return {
      success: false,
      updated: 0,
      error: errorMessage,
    }
  }
}

/**
 * Check if today is Monday (for weekly reset)
 *
 * @returns true if today is Monday
 */
export function isMonday(): boolean {
  const today = new Date()
  return today.getDay() === 1 // 0 = Sunday, 1 = Monday
}

/**
 * Check if today is the 1st of the month (for monthly reset)
 *
 * @returns true if today is the 1st
 */
export function isFirstOfMonth(): boolean {
  const today = new Date()
  return today.getDate() === 1
}
