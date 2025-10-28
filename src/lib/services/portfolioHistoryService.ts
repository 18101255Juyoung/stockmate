import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Portfolio history data point
 */
export interface PortfolioHistoryPoint {
  date: Date
  cash: number
  totalAssets: number
  return: number
}

/**
 * Options for portfolio history query
 */
export interface PortfolioHistoryOptions {
  period?: '7d' | '30d' | '90d' | '1y' | 'all'
}

/**
 * Get portfolio value history based on transaction data
 * Calculates portfolio state at each transaction point
 */
export async function getPortfolioHistory(
  userId: string,
  options: PortfolioHistoryOptions = {}
): Promise<ApiResponse<{ history: PortfolioHistoryPoint[] }>> {
  try {
    const { period = 'all' } = options

    // 1. Get user and portfolio
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolio: true,
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
          message: 'Portfolio not found',
        },
      }
    }

    // 2. Calculate date range based on period
    const now = new Date()
    let startDate: Date | undefined

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = undefined
        break
    }

    // 3. Get all transactions ordered by date
    // Note: We fetch ALL transactions, not just within the period,
    // because we need to calculate portfolio state from the beginning
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 4. If no transactions, return empty history
    if (transactions.length === 0) {
      return {
        success: true,
        data: {
          history: [],
        },
      }
    }

    // 5. Get current holdings to use current prices
    const currentHoldings = await prisma.holding.findMany({
      where: {
        portfolioId: user.portfolio.id,
      },
    })

    // Create a map of current prices
    const currentPricesMap = new Map<string, number>()
    currentHoldings.forEach((holding) => {
      currentPricesMap.set(holding.stockCode, holding.currentPrice)
    })

    // 6. Calculate portfolio state at each transaction point
    const history: PortfolioHistoryPoint[] = []
    let cash = user.portfolio.initialCapital
    const holdings = new Map<string, { quantity: number; avgPrice: number }>()

    for (const tx of transactions) {
      // Apply transaction
      if (tx.type === 'BUY') {
        cash -= tx.totalAmount

        // Update holdings
        const existing = holdings.get(tx.stockCode)
        if (existing) {
          // Calculate new average price (FIFO)
          const totalCost = existing.quantity * existing.avgPrice + tx.quantity * tx.price
          const totalQuantity = existing.quantity + tx.quantity
          holdings.set(tx.stockCode, {
            quantity: totalQuantity,
            avgPrice: totalCost / totalQuantity,
          })
        } else {
          holdings.set(tx.stockCode, {
            quantity: tx.quantity,
            avgPrice: tx.price,
          })
        }
      } else if (tx.type === 'SELL') {
        cash += tx.totalAmount

        // Update holdings
        const existing = holdings.get(tx.stockCode)
        if (existing) {
          const newQuantity = existing.quantity - tx.quantity
          if (newQuantity > 0) {
            holdings.set(tx.stockCode, {
              quantity: newQuantity,
              avgPrice: existing.avgPrice, // avgPrice stays the same
            })
          } else {
            holdings.delete(tx.stockCode)
          }
        }
      }

      // Calculate total assets at this point
      let stockValue = 0
      holdings.forEach((holding, stockCode) => {
        // Use current price if available, otherwise use avgPrice as estimate
        const price = currentPricesMap.get(stockCode) || holding.avgPrice
        stockValue += holding.quantity * price
      })

      const totalAssets = cash + stockValue
      const returnRate =
        ((totalAssets - user.portfolio.initialCapital) / user.portfolio.initialCapital) * 100

      // Add to history only if within the period filter
      const shouldInclude = !startDate || tx.createdAt >= startDate

      if (shouldInclude) {
        history.push({
          date: tx.createdAt,
          cash: Math.round(cash * 100) / 100,
          totalAssets: Math.round(totalAssets * 100) / 100,
          return: Math.round(returnRate * 100) / 100,
        })
      }
    }

    return {
      success: true,
      data: {
        history,
      },
    }
  } catch (error) {
    console.error('Portfolio history error:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to retrieve portfolio history',
      },
    }
  }
}
