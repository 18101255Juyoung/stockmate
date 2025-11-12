import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'
import {
  getKSTToday,
  getKSTYesterday,
  toKSTDateOnly,
  addKSTDays,
  isAfterKSTTime,
  getDateKey
} from '@/lib/utils/timezone'

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
  period?: '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
  date?: string // YYYY-MM-DD format for specific date lookup
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
    const { period = 'all', date } = options

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
    let specificDate: Date | undefined

    // If date parameter is provided with 1d period, we're looking for a specific date
    if (period === '1d' && date) {
      specificDate = new Date(date)
      startDate = specificDate
    } else {
      switch (period) {
        case '1d':
          // Single day without specific date - use today
          specificDate = toKSTDateOnly(now)
          startDate = specificDate
          break
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

    // 4. If no transactions, fill with initial capital from creation to today
    if (transactions.length === 0) {
      const portfolioCreationDate = new Date(user.portfolio.createdAt)
      portfolioCreationDate.setHours(0, 0, 0, 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const history: PortfolioHistoryPoint[] = []
      const currentDate = new Date(portfolioCreationDate)

      while (currentDate <= today) {
        // Only include if within period filter
        const shouldInclude = !startDate || currentDate >= startDate

        if (shouldInclude) {
          history.push({
            date: new Date(currentDate),
            cash: Math.round(user.portfolio.initialCapital * 100) / 100,
            totalAssets: Math.round(user.portfolio.initialCapital * 100) / 100,
            return: 0,
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      return {
        success: true,
        data: {
          history,
        },
      }
    }

    // 5. Get current holdings to determine which stocks to fetch prices for
    const currentHoldings = await prisma.holding.findMany({
      where: {
        portfolioId: user.portfolio.id,
      },
    })

    // 5.1. Fetch historical stock prices for accurate past valuations
    const stockCodes = Array.from(
      new Set([...transactions.map((t) => t.stockCode), ...currentHoldings.map((h) => h.stockCode)])
    )

    // Create a map: stockCode -> date -> closePrice
    const priceHistoryMap = new Map<string, Map<string, number>>()

    // Only fetch historical prices if there are stock codes to query
    if (stockCodes.length > 0) {
      const historicalPrices = await prisma.stockPriceHistory.findMany({
        where: {
          stockCode: { in: stockCodes },
          date: { gte: startDate || new Date(user.portfolio.createdAt) },
        },
        orderBy: { date: 'asc' },
      })

      historicalPrices.forEach((price) => {
        const dateKey = price.date.toISOString().split('T')[0]
        if (!priceHistoryMap.has(price.stockCode)) {
          priceHistoryMap.set(price.stockCode, new Map())
        }
        priceHistoryMap.get(price.stockCode)!.set(dateKey, price.closePrice)
      })
    }

    // Helper function to get stock price for a specific date
    // Only uses historical prices from StockPriceHistory for accuracy
    const getStockPrice = (stockCode: string, date: Date): number | null => {
      const dateKey = getDateKey(date)
      const stockPrices = priceHistoryMap.get(stockCode)

      if (!stockPrices) {
        console.warn(`No price history available for stock ${stockCode}`)
        return null
      }

      // Try exact date first
      if (stockPrices.has(dateKey)) {
        return stockPrices.get(dateKey)!
      }

      // If exact date not found (weekend/holiday), look for most recent past price
      // Search up to 7 days back to handle long weekends
      for (let i = 1; i <= 7; i++) {
        const prevDate = addKSTDays(date, -i)
        const prevDateKey = getDateKey(prevDate)

        if (stockPrices.has(prevDateKey)) {
          return stockPrices.get(prevDateKey)!
        }
      }

      // No price found within 7 days
      console.warn(
        `No price data found for stock ${stockCode} on ${dateKey} or within 7 days prior`
      )
      return null
    }

    // 6. Calculate portfolio state at each transaction point
    const history: PortfolioHistoryPoint[] = []
    let cash = user.portfolio.initialCapital
    const holdings = new Map<string, { quantity: number; avgPrice: number }>()

    // 6.1. Fill initial period from portfolio creation to first transaction
    const portfolioCreationDate = toKSTDateOnly(user.portfolio.createdAt)
    const firstTransactionDate = toKSTDateOnly(transactions[0].createdAt)

    let currentDate = new Date(portfolioCreationDate)
    while (currentDate < firstTransactionDate) {
      const shouldInclude = !startDate || currentDate >= startDate

      if (shouldInclude) {
        history.push({
          date: new Date(currentDate),
          cash: Math.round(user.portfolio.initialCapital * 100) / 100,
          totalAssets: Math.round(user.portfolio.initialCapital * 100) / 100,
          return: 0,
        })
      }

      currentDate = addKSTDays(currentDate, 1)
    }

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

      // Calculate total assets at this point using historical prices
      let stockValue = 0
      holdings.forEach((holding, stockCode) => {
        // Use historical price for the transaction date
        const price = getStockPrice(stockCode, tx.createdAt)
        if (price !== null) {
          stockValue += holding.quantity * price
        }
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

    // 7. Fill in daily points from last transaction to end date (if any transactions exist)
    // Note: Only include today if market has closed (after 15:35 KST) and today's data exists in StockPriceHistory
    if (history.length > 0) {
      const lastHistoryDate = toKSTDateOnly(history[history.length - 1].date)

      // Determine end date in KST: include today only if we have confirmed closing prices
      // Market closes at 15:30 KST, data is saved at 15:35 KST
      const today = getKSTToday()
      const endDate = isAfterKSTTime(15, 35) ? today : getKSTYesterday()

      // Add daily points from day after last transaction to end date
      let currentDate = addKSTDays(lastHistoryDate, 1)

      while (currentDate <= endDate) {
        // Calculate portfolio value with historical prices for each day
        let stockValue = 0
        holdings.forEach((holding, stockCode) => {
          const price = getStockPrice(stockCode, currentDate)
          if (price !== null) {
            stockValue += holding.quantity * price
          }
        })

        const totalAssets = cash + stockValue
        const returnRate =
          ((totalAssets - user.portfolio.initialCapital) / user.portfolio.initialCapital) * 100

        history.push({
          date: new Date(currentDate),
          cash: Math.round(cash * 100) / 100,
          totalAssets: Math.round(totalAssets * 100) / 100,
          return: Math.round(returnRate * 100) / 100,
        })

        currentDate = addKSTDays(currentDate, 1)
      }
    }

    // 8. If specific date requested, filter to only that date
    let finalHistory = history
    if (specificDate) {
      const targetDateKey = getDateKey(specificDate)
      finalHistory = history.filter((point) => {
        const pointDateKey = getDateKey(point.date)
        return pointDateKey === targetDateKey
      })
    }

    return {
      success: true,
      data: {
        history: finalHistory,
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
