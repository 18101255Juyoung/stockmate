/**
 * Reward Distribution Service
 *
 * Handles monthly reward distribution for top performers in each league:
 * - Rookie League:
 *   - 1-10th: +10,000,000 KRW initial capital
 *   - 11-100th: +5,000,000 KRW initial capital
 * - Hall of Fame:
 *   - 1-100th: (To be defined)
 *
 * Rewards are distributed on the 1st of each month at 00:00.
 */

import { prisma } from '@/lib/prisma'
import { League, RankingPeriod, CapitalChangeReason, RewardType, Prisma } from '@prisma/client'
import { updatePortfolioMetrics } from '@/lib/services/portfolioService'

/**
 * Reward amounts by type
 */
export const REWARD_AMOUNTS = {
  ROOKIE_TOP10: 10_000_000, // 1-10th in Rookie
  ROOKIE_TOP100: 5_000_000, // 11-100th in Rookie
  HALL_TOP100: 0, // TBD for Hall of Fame
} as const

/**
 * Add capital bonus to user's initial capital
 *
 * Creates a CapitalHistory record to track the change.
 *
 * @param userId User ID
 * @param amount Amount to add (positive number)
 * @param reason Reason for capital change
 * @param metadata Optional metadata (rewardType, rank, period, league)
 * @returns New total initial capital
 */
export async function addCapitalBonus(
  userId: string,
  amount: number,
  reason: CapitalChangeReason,
  metadata?: {
    rewardType?: RewardType
    rewardRank?: number
    period?: string // "2025-11" format
    league?: League
    description?: string
  }
): Promise<number> {
  // Get current initial capital
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { initialCapital: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const currentCapital = parseFloat(user.initialCapital.toString())
  const newTotal = currentCapital + amount

  // Update user's initial capital and create history record in transaction
  await prisma.$transaction([
    // Update user's initial capital
    prisma.user.update({
      where: { id: userId },
      data: {
        initialCapital: new Prisma.Decimal(newTotal),
      },
    }),

    // Update portfolio to match (totalAssets will be recalculated)
    prisma.portfolio.update({
      where: { userId },
      data: {
        initialCapital: newTotal,
        currentCash: { increment: amount },
      },
    }),

    // Create capital history record
    prisma.capitalHistory.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount),
        newTotal: new Prisma.Decimal(newTotal),
        reason,
        description: metadata?.description,
        rewardType: metadata?.rewardType,
        rewardRank: metadata?.rewardRank,
        period: metadata?.period,
        league: metadata?.league,
      },
    }),
  ])

  // Get portfolio ID and recalculate metrics (totalAssets, totalReturn, unrealizedPL)
  const portfolio = await prisma.portfolio.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (portfolio) {
    await updatePortfolioMetrics(portfolio.id)
  }

  return newTotal
}

/**
 * Determine reward type based on rank and league
 *
 * @param rank User's rank (1-based)
 * @param league User's league
 * @returns Reward type and amount, or null if not eligible
 */
export function getRewardInfo(
  rank: number,
  league: League
): { type: RewardType; amount: number } | null {
  if (league === League.ROOKIE) {
    if (rank >= 1 && rank <= 10) {
      return {
        type: RewardType.ROOKIE_TOP10,
        amount: REWARD_AMOUNTS.ROOKIE_TOP10,
      }
    } else if (rank >= 11 && rank <= 100) {
      return {
        type: RewardType.ROOKIE_TOP100,
        amount: REWARD_AMOUNTS.ROOKIE_TOP100,
      }
    }
  } else if (league === League.HALL_OF_FAME) {
    if (rank >= 1 && rank <= 100) {
      return {
        type: RewardType.HALL_TOP100,
        amount: REWARD_AMOUNTS.HALL_TOP100,
      }
    }
  }

  return null
}

/**
 * Distribute monthly rewards to eligible users
 *
 * This should run on the 1st of each month at 00:00.
 * Distributes rewards based on previous month's MONTHLY ranking.
 *
 * @param year Year (e.g., 2025)
 * @param month Month (1-12)
 * @returns Summary of reward distribution
 */
export async function distributeMonthlyRewards(
  year: number,
  month: number
): Promise<{
  totalEligible: number
  distributed: number
  skipped: number
  errors: number
  totalAmount: number
  details: Array<{
    userId: string
    username: string
    rank: number
    league: League
    rewardType: RewardType
    amount: number
    success: boolean
    error?: string
  }>
}> {
  const period = `${year}-${String(month).padStart(2, '0')}` // e.g., "2025-11"

  console.log(`\n💰 [Reward Distribution] Processing rewards for ${period}...`)

  const results = {
    totalEligible: 0,
    distributed: 0,
    skipped: 0,
    errors: 0,
    totalAmount: 0,
    details: [] as Array<{
      userId: string
      username: string
      rank: number
      league: League
      rewardType: RewardType
      amount: number
      success: boolean
      error?: string
    }>,
  }

  try {
    // Get all eligible rankings (top 100 in each league, MONTHLY period)
    const eligibleRankings = await prisma.ranking.findMany({
      where: {
        period: RankingPeriod.MONTHLY,
        rank: {
          lte: 100,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ league: 'asc' }, { rank: 'asc' }],
    })

    results.totalEligible = eligibleRankings.length
    console.log(`  📊 Found ${results.totalEligible} eligible users (top 100 in each league)`)

    for (const ranking of eligibleRankings) {
      try {
        const { user, rank, league } = ranking

        // Check if already rewarded
        if (ranking.rewardGiven) {
          console.log(`  ⏭️  ${user.username} (${league}, #${rank}): Already rewarded`)
          results.skipped++
          continue
        }

        // Get reward info
        const rewardInfo = getRewardInfo(rank, league)

        if (!rewardInfo) {
          console.log(`  ⏭️  ${user.username} (${league}, #${rank}): Not eligible for reward`)
          results.skipped++
          continue
        }

        // Skip Hall of Fame for now (amount is 0)
        if (rewardInfo.amount === 0) {
          console.log(
            `  ⏭️  ${user.username} (${league}, #${rank}): Hall reward not defined yet`
          )
          results.skipped++
          continue
        }

        // Add capital bonus
        const newTotal = await addCapitalBonus(
          user.id,
          rewardInfo.amount,
          league === League.ROOKIE
            ? CapitalChangeReason.ROOKIE_REWARD
            : CapitalChangeReason.HALL_REWARD,
          {
            rewardType: rewardInfo.type,
            rewardRank: rank,
            period,
            league,
            description: `${league} league monthly reward - Rank #${rank} (${period})`,
          }
        )

        // Mark reward as given
        await prisma.ranking.update({
          where: { id: ranking.id },
          data: {
            rewardGiven: true,
            rewardAmount: new Prisma.Decimal(rewardInfo.amount),
          },
        })

        results.distributed++
        results.totalAmount += rewardInfo.amount

        console.log(
          `  ✅ ${user.username} (${league}, #${rank}): +₩${rewardInfo.amount.toLocaleString()} (new total: ₩${newTotal.toLocaleString()})`
        )

        results.details.push({
          userId: user.id,
          username: user.username,
          rank,
          league,
          rewardType: rewardInfo.type,
          amount: rewardInfo.amount,
          success: true,
        })
      } catch (error) {
        console.error(`  ❌ Failed to reward ${ranking.user.username}:`, error)
        results.errors++

        results.details.push({
          userId: ranking.user.id,
          username: ranking.user.username,
          rank: ranking.rank,
          league: ranking.league,
          rewardType: RewardType.ROOKIE_TOP10, // Placeholder
          amount: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log(`\n✅ Reward distribution completed:`)
    console.log(`   📊 Eligible: ${results.totalEligible}`)
    console.log(`   ✅ Distributed: ${results.distributed}`)
    console.log(`   ⏭️  Skipped: ${results.skipped}`)
    console.log(`   💰 Total amount: ₩${results.totalAmount.toLocaleString()}`)
    if (results.errors > 0) {
      console.log(`   ❌ Errors: ${results.errors}`)
    }
    console.log()
  } catch (error) {
    console.error('❌ Reward distribution failed:', error)
    throw error
  }

  return results
}

/**
 * Check if rewards have been distributed for a given period
 *
 * @param year Year
 * @param month Month
 * @returns True if rewards have been distributed
 */
export async function hasRewardsBeenDistributed(
  year: number,
  month: number
): Promise<boolean> {
  const count = await prisma.ranking.count({
    where: {
      period: RankingPeriod.MONTHLY,
      rewardGiven: true,
    },
  })

  return count > 0
}

/**
 * Get reward statistics for a period
 *
 * @param year Year
 * @param month Month
 * @returns Reward statistics
 */
export async function getRewardStats(year: number, month: number): Promise<{
  totalEligible: number
  totalRewarded: number
  totalAmount: number
  rookieRewarded: number
  hallRewarded: number
}> {
  const [rankings, rewardedRankings] = await Promise.all([
    prisma.ranking.findMany({
      where: {
        period: RankingPeriod.MONTHLY,
        rank: { lte: 100 },
      },
    }),
    prisma.ranking.findMany({
      where: {
        period: RankingPeriod.MONTHLY,
        rank: { lte: 100 },
        rewardGiven: true,
      },
      select: {
        league: true,
        rewardAmount: true,
      },
    }),
  ])

  const totalAmount = rewardedRankings.reduce(
    (sum, r) => sum + parseFloat(r.rewardAmount?.toString() || '0'),
    0
  )

  const rookieRewarded = rewardedRankings.filter((r) => r.league === League.ROOKIE).length
  const hallRewarded = rewardedRankings.filter(
    (r) => r.league === League.HALL_OF_FAME
  ).length

  return {
    totalEligible: rankings.length,
    totalRewarded: rewardedRankings.length,
    totalAmount,
    rookieRewarded,
    hallRewarded,
  }
}
