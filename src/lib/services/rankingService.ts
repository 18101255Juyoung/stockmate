/**
 * Ranking Service - League-based Rankings
 *
 * Handles ranking calculation and retrieval with independent rankings per league:
 * - ROOKIE: Users with total assets < 100M KRW
 * - HALL_OF_FAME: Users with total assets >= 100M KRW
 *
 * Each league has separate rankings for WEEKLY, MONTHLY, and ALL_TIME periods.
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'
import { calculatePeriodReturn } from '@/lib/services/portfolioSnapshotService'
import { RankingPeriod as PrismaRankingPeriod, League } from '@prisma/client'

export type RankingPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'

interface RankingData {
  id: string
  userId: string
  rank: number
  totalReturn: number
  period: RankingPeriod
  league: League
  updatedAt: Date
  user: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
  }
}

/**
 * Update rankings for all leagues and a specific period
 *
 * Calculates independent rankings for ROOKIE and HALL_OF_FAME leagues.
 * Users are automatically placed in appropriate league rankings based on their current league.
 *
 * @param period - Time period for rankings (WEEKLY, MONTHLY, or ALL_TIME)
 * @returns API response with updated count per league
 */
export async function updateRankings(
  period: RankingPeriod
): Promise<ApiResponse<{ updated: number; rookie: number; hallOfFame: number }>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get all portfolios with user league information
      const portfolios = await tx.portfolio.findMany({
        select: {
          id: true,
          userId: true,
          totalAssets: true,
          totalReturn: true,
          weeklyStartAssets: true,
          monthlyStartAssets: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              league: true, // Current league assignment
            },
          },
        },
      })

      if (portfolios.length === 0) {
        return { updated: 0, rookie: 0, hallOfFame: 0 }
      }

      // Calculate period-specific returns for each portfolio
      const portfoliosWithReturns = portfolios.map((portfolio) => {
        let periodReturn: number

        if (period === 'ALL_TIME') {
          // All-time: Use portfolio's total return
          periodReturn = portfolio.totalReturn
        } else if (period === 'WEEKLY') {
          // Weekly: Compare current assets vs Monday 00:00 baseline
          const weeklyStartAssets = portfolio.weeklyStartAssets
          if (weeklyStartAssets === 0) {
            periodReturn = 0
          } else {
            periodReturn = ((portfolio.totalAssets - weeklyStartAssets) / weeklyStartAssets) * 100
          }
        } else {
          // Monthly: Compare current assets vs 1st 00:00 baseline
          const monthlyStartAssets = portfolio.monthlyStartAssets
          if (monthlyStartAssets === 0) {
            periodReturn = 0
          } else {
            periodReturn = ((portfolio.totalAssets - monthlyStartAssets) / monthlyStartAssets) * 100
          }
        }

        return {
          userId: portfolio.userId,
          league: portfolio.user.league,
          periodReturn,
        }
      })

      // Separate by league
      const rookiePortfolios = portfoliosWithReturns.filter(p => p.league === League.ROOKIE)
      const hallPortfolios = portfoliosWithReturns.filter(p => p.league === League.HALL_OF_FAME)

      // Sort each league independently
      const sortedRookie = rookiePortfolios.sort((a, b) => b.periodReturn - a.periodReturn)
      const sortedHall = hallPortfolios.sort((a, b) => b.periodReturn - a.periodReturn)

      // Create rankings (top 100 per league)
      const rookieRankings = sortedRookie.slice(0, 100).map((portfolio, index) => ({
        userId: portfolio.userId,
        rank: index + 1,
        totalReturn: portfolio.periodReturn,
        period,
        league: League.ROOKIE,
        rewardEligible: index < 100, // Top 100 eligible for rewards
      }))

      const hallRankings = sortedHall.slice(0, 100).map((portfolio, index) => ({
        userId: portfolio.userId,
        rank: index + 1,
        totalReturn: portfolio.periodReturn,
        period,
        league: League.HALL_OF_FAME,
        rewardEligible: index < 100,
      }))

      // Delete existing rankings for this period (all leagues)
      await tx.ranking.deleteMany({
        where: { period },
      })

      // Create new rankings
      const allRankings = [...rookieRankings, ...hallRankings]

      if (allRankings.length > 0) {
        await tx.ranking.createMany({
          data: allRankings,
        })
      }

      return {
        updated: allRankings.length,
        rookie: rookieRankings.length,
        hallOfFame: hallRankings.length,
      }
    }, {
      timeout: 30000,
      maxWait: 5000,
    })

    console.log(`✅ Rankings updated for ${period}: ${result.rookie} ROOKIE, ${result.hallOfFame} HALL_OF_FAME`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('[rankingService] Error updating rankings:', {
      period,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown }

      if (prismaError.code === 'P1001' || prismaError.code === 'P1002') {
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Database connection failed',
          },
        }
      }

      if (prismaError.code === 'P2002' || prismaError.code === 'P2003') {
        console.error('[rankingService] Database constraint violation:', {
          code: prismaError.code,
          meta: prismaError.meta,
          period,
        })
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: `Database constraint violation (${prismaError.code})`,
            details: prismaError.meta,
          } as any,
        }
      }
    }

    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to update rankings',
      },
    }
  }
}

/**
 * Get rankings for a specific period and league
 *
 * @param period - Time period for rankings
 * @param league - League (ROOKIE or HALL_OF_FAME), optional (returns all if not specified)
 * @param limit - Maximum number of rankings to return (default: 100)
 * @returns Array of ranking data including user info and return rates
 */
export async function getRankings(
  period: RankingPeriod,
  league?: League,
  limit: number = 100
): Promise<ApiResponse<{ rankings: RankingData[] }>> {
  try {
    const rankings = await prisma.ranking.findMany({
      where: {
        period,
        ...(league && { league }),
      },
      take: limit,
      orderBy: { rank: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileImage: true,
          },
        },
      },
    })

    return {
      success: true,
      data: { rankings },
    }
  } catch (error) {
    console.error('[rankingService] Error getting rankings:', {
      period,
      league,
      limit,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }

      if (prismaError.code === 'P1001' || prismaError.code === 'P1002') {
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Database connection failed',
          },
        }
      }
    }

    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get rankings',
      },
    }
  }
}

/**
 * Get specific user's rank for a period
 *
 * Automatically uses the user's current league to find their ranking.
 *
 * @param userId - ID of the user whose rank to retrieve
 * @param period - Time period for ranking
 * @returns Ranking data with rank, totalReturn, period, league, and user info
 */
export async function getUserRank(
  userId: string,
  period: RankingPeriod
): Promise<
  ApiResponse<{
    rank: number | null
    totalReturn?: number
    period?: RankingPeriod
    league?: League
    user?: {
      id: string
      username: string
      displayName: string
      profileImage: string | null
      league: League
    }
  }>
> {
  try {
    // Get user's current league
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImage: true,
        league: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found',
        },
      }
    }

    // Find ranking in user's current league
    const ranking = await prisma.ranking.findFirst({
      where: {
        userId,
        period,
        league: user.league,
      },
    })

    if (!ranking) {
      return {
        success: true,
        data: {
          rank: null,
          league: user.league,
          user,
        },
      }
    }

    return {
      success: true,
      data: {
        rank: ranking.rank,
        totalReturn: ranking.totalReturn,
        period: ranking.period as RankingPeriod,
        league: ranking.league,
        user,
      },
    }
  } catch (error) {
    console.error('[rankingService] Error getting user rank:', {
      userId,
      period,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }

      if (prismaError.code === 'P1001' || prismaError.code === 'P1002') {
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Database connection failed',
          },
        }
      }

      if (prismaError.code === 'P2025') {
        return {
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'User not found',
          },
        }
      }
    }

    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get user rank',
      },
    }
  }
}

/**
 * Get league statistics
 *
 * @returns Statistics about league distribution and rankings
 */
export async function getLeagueStats(): Promise<ApiResponse<{
  rookie: { total: number; ranked: number }
  hallOfFame: { total: number; ranked: number }
}>> {
  try {
    const [rookieTotal, hallTotal, rookieRanked, hallRanked] = await Promise.all([
      prisma.user.count({ where: { league: League.ROOKIE } }),
      prisma.user.count({ where: { league: League.HALL_OF_FAME } }),
      prisma.ranking.count({
        where: {
          league: League.ROOKIE,
          period: 'ALL_TIME',
        },
      }),
      prisma.ranking.count({
        where: {
          league: League.HALL_OF_FAME,
          period: 'ALL_TIME',
        },
      }),
    ])

    return {
      success: true,
      data: {
        rookie: { total: rookieTotal, ranked: rookieRanked },
        hallOfFame: { total: hallTotal, ranked: hallRanked },
      },
    }
  } catch (error) {
    console.error('[rankingService] Error getting league stats:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get league stats',
      },
    }
  }
}
