/**
 * Ranking Service
 * Handles ranking calculation and retrieval
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'
import { calculatePeriodReturn } from '@/lib/services/portfolioSnapshotService'
import { RankingPeriod as PrismaRankingPeriod } from '@prisma/client'

export type RankingPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'

interface RankingData {
  id: string
  userId: string
  rank: number
  totalReturn: number
  period: RankingPeriod
  updatedAt: Date
  user: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
  }
}

/**
 * Update rankings for a specific period
 * Calculates rankings based on period-specific returns
 *
 * - WEEKLY: Returns from last 7 days
 * - MONTHLY: Returns from last 30 days
 * - ALL_TIME: Cumulative returns since account creation
 */
export async function updateRankings(
  period: RankingPeriod
): Promise<ApiResponse<{ updated: number }>> {
  try {
    // Get all portfolios
    const portfolios = await prisma.portfolio.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    })

    // Delete existing rankings for this period
    await prisma.ranking.deleteMany({
      where: { period },
    })

    // If no portfolios, return early
    if (portfolios.length === 0) {
      return {
        success: true,
        data: { updated: 0 },
      }
    }

    // Calculate period-specific returns for each portfolio
    const portfoliosWithReturns = await Promise.all(
      portfolios.map(async (portfolio) => {
        let periodReturn: number

        if (period === 'ALL_TIME') {
          // Use cumulative totalReturn from Portfolio
          periodReturn = portfolio.totalReturn
        } else {
          // Calculate period-specific return using snapshots
          periodReturn = await calculatePeriodReturn(
            portfolio.id,
            period as PrismaRankingPeriod
          )
        }

        return {
          userId: portfolio.userId,
          periodReturn,
        }
      })
    )

    // Sort by period return descending
    const sortedPortfolios = portfoliosWithReturns.sort(
      (a, b) => b.periodReturn - a.periodReturn
    )

    // Create rankings (limit to top 100)
    const rankings = sortedPortfolios.slice(0, 100).map((portfolio, index) => ({
      userId: portfolio.userId,
      rank: index + 1,
      totalReturn: portfolio.periodReturn,
      period,
    }))

    await prisma.ranking.createMany({
      data: rankings,
    })

    return {
      success: true,
      data: { updated: rankings.length },
    }
  } catch (error) {
    // Improved error logging with context
    console.error('[rankingService] Error updating rankings:', {
      period,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown }

      // Database connection errors
      if (prismaError.code === 'P1001' || prismaError.code === 'P1002') {
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Database connection failed',
          },
        }
      }

      // Constraint violations
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

    // Generic fallback
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
 * Get rankings for a specific period
 * Retrieves top-ranked users based on portfolio returns for the specified period
 *
 * @param period - Time period for rankings (DAILY, WEEKLY, MONTHLY, or ALL_TIME)
 * @param limit - Maximum number of rankings to return (default: 100)
 * @returns Array of ranking data including user info and return rates
 *
 * @example
 * const result = await getRankings('ALL_TIME', 50)
 * if (result.success) {
 *   result.data.rankings.forEach((r, i) => {
 *     console.log(`#${r.rank}: ${r.user.displayName} (${r.totalReturn}%)`)
 *   })
 * }
 */
export async function getRankings(
  period: RankingPeriod,
  limit: number = 100
): Promise<ApiResponse<{ rankings: RankingData[] }>> {
  try {
    const rankings = await prisma.ranking.findMany({
      where: { period },
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
    // Improved error logging with context
    console.error('[rankingService] Error getting rankings:', {
      period,
      limit,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }

      // Database connection errors
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

    // Generic fallback
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
 * Retrieves ranking information for a single user in the specified period
 *
 * @param userId - ID of the user whose rank to retrieve
 * @param period - Time period for ranking (DAILY, WEEKLY, MONTHLY, or ALL_TIME)
 * @returns Ranking data with rank, totalReturn, period, and user info. Returns null rank if not in top 100.
 *
 * @example
 * const result = await getUserRank('user123', 'ALL_TIME')
 * if (result.success && result.data.rank) {
 *   console.log(`Ranked #${result.data.rank} with ${result.data.totalReturn}% return`)
 * } else {
 *   console.log('Not in top 100')
 * }
 */
export async function getUserRank(
  userId: string,
  period: RankingPeriod
): Promise<
  ApiResponse<{
    rank: number | null
    totalReturn?: number
    period?: RankingPeriod
    user?: {
      id: string
      username: string
      displayName: string
      profileImage: string | null
    }
  }>
> {
  try {
    const ranking = await prisma.ranking.findFirst({
      where: {
        userId,
        period,
      },
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

    if (!ranking) {
      return {
        success: true,
        data: { rank: null },
      }
    }

    return {
      success: true,
      data: {
        rank: ranking.rank,
        totalReturn: ranking.totalReturn,
        period: ranking.period as RankingPeriod,
        user: ranking.user,
      },
    }
  } catch (error) {
    // Improved error logging with context
    console.error('[rankingService] Error getting user rank:', {
      userId,
      period,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }

      // Database connection errors
      if (prismaError.code === 'P1001' || prismaError.code === 'P1002') {
        return {
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Database connection failed',
          },
        }
      }

      // Invalid foreign key (user doesn't exist)
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

    // Generic fallback
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get user rank',
      },
    }
  }
}
