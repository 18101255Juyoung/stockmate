/**
 * Portfolio Service
 * Manages user portfolios, holdings, and metrics calculation
 */

import { prisma } from '@/lib/prisma'
import { getStockPrice } from '@/lib/services/stockService'
import {
  calculateTotalAssets,
  calculateTotalReturn,
  calculateUnrealizedPL,
} from '@/lib/utils/calculations'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Get user's portfolio with holdings
 *
 * @param userId - User ID
 * @returns Portfolio with holdings
 */
export async function getPortfolio(userId: string): Promise<
  ApiResponse<{
    portfolio: {
      id: string
      userId: string
      initialCapital: number
      currentCash: number
      totalAssets: number
      totalReturn: number
      realizedPL: number
      unrealizedPL: number
      holdings: Array<{
        id: string
        stockCode: string
        stockName: string
        quantity: number
        avgPrice: number
        currentPrice: number
      }>
    }
  }>
> {
  try {
    // Get user with portfolio and holdings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolio: {
          include: {
            holdings: true,
          },
        },
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

    if (!user.portfolio) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Portfolio not found for this user',
        },
      }
    }

    return {
      success: true,
      data: {
        portfolio: user.portfolio,
      },
    }
  } catch (error) {
    console.error('Failed to get portfolio:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to retrieve portfolio',
      },
    }
  }
}

/**
 * Update portfolio metrics (total assets, return, unrealized P/L)
 *
 * @param portfolioId - Portfolio ID
 * @returns Updated portfolio metrics
 */
export async function updatePortfolioMetrics(
  portfolioId: string
): Promise<ApiResponse<{ updated: boolean }>> {
  try {
    // Get portfolio with holdings
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        holdings: true,
      },
    })

    if (!portfolio) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Portfolio not found',
        },
      }
    }

    // Calculate metrics
    const totalAssets = calculateTotalAssets(portfolio.currentCash, portfolio.holdings)
    const totalReturn = calculateTotalReturn(totalAssets, portfolio.initialCapital)
    const unrealizedPL = calculateUnrealizedPL(portfolio.holdings)

    // Update portfolio
    await prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        totalAssets,
        totalReturn,
        unrealizedPL,
      },
    })

    return {
      success: true,
      data: { updated: true },
    }
  } catch (error) {
    console.error('Failed to update portfolio metrics:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to update portfolio metrics',
      },
    }
  }
}

/**
 * Refresh current prices for all holdings in a portfolio
 *
 * @param portfolioId - Portfolio ID
 * @returns Success status
 */
export async function refreshHoldingPrices(
  portfolioId: string
): Promise<ApiResponse<{ updated: number }>> {
  try {
    // Get all holdings for this portfolio
    const holdings = await prisma.holding.findMany({
      where: { portfolioId },
    })

    let updatedCount = 0

    // Update each holding's current price
    for (const holding of holdings) {
      try {
        // Get current price from stock service (with caching)
        const stockPrice = await getStockPrice(holding.stockCode)

        // Update holding
        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            currentPrice: stockPrice.currentPrice,
          },
        })

        updatedCount++
      } catch (error) {
        // Log error but continue with other holdings
        console.error(
          `Failed to update price for ${holding.stockCode}:`,
          error instanceof Error ? error.message : 'Unknown error'
        )
        // Continue to next holding
      }
    }

    return {
      success: true,
      data: { updated: updatedCount },
    }
  } catch (error) {
    console.error('Failed to refresh holding prices:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to refresh holding prices',
      },
    }
  }
}

/**
 * Get portfolio summary (convenience function)
 *
 * @param userId - User ID
 * @returns Portfolio summary with refreshed prices
 */
export async function getPortfolioSummary(userId: string) {
  // Get portfolio
  const portfolioResult = await getPortfolio(userId)

  if (!portfolioResult.success) {
    return portfolioResult
  }

  const portfolioId = portfolioResult.data.portfolio.id

  // Refresh holding prices
  await refreshHoldingPrices(portfolioId)

  // Update metrics
  await updatePortfolioMetrics(portfolioId)

  // Get updated portfolio
  return getPortfolio(userId)
}
