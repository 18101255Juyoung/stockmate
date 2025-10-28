/**
 * Trading Service
 * Handles buy/sell transactions and portfolio updates
 */

import { prisma } from '@/lib/prisma'
import { getStockPrice } from '@/lib/services/stockService'
import {
  calculateAvgPrice,
  calculateRealizedPL,
  calculateTradingFee,
} from '@/lib/utils/calculations'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'
import { updatePortfolioMetrics } from '@/lib/services/portfolioService'

/**
 * Validate quantity input
 *
 * @param quantity - Quantity to validate
 * @returns Validation result
 */
function validateQuantity(quantity: number): ApiResponse<never> | null {
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return {
      success: false,
      error: {
        code: ErrorCodes.TRADING_INVALID_QUANTITY,
        message: 'Quantity must be a positive integer',
      },
    }
  }
  return null
}

/**
 * Execute a buy order
 *
 * @param userId - User ID
 * @param stockCode - Stock code (e.g., "005930")
 * @param quantity - Number of shares to buy
 * @param note - Optional investment memo
 * @returns Transaction result
 */
export async function executeBuy(
  userId: string,
  stockCode: string,
  quantity: number,
  note?: string
): Promise<
  ApiResponse<{
    transaction: {
      id: string
      type: string
      stockCode: string
      stockName: string
      quantity: number
      price: number
      totalAmount: number
      fee: number
    }
  }>
> {
  try {
    // Validate quantity
    const validationError = validateQuantity(quantity)
    if (validationError) {
      return validationError
    }

    // Get user's portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { holdings: true },
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

    // Get current stock price from database (updated by scheduler)
    const stockPriceResult = await getStockPrice(stockCode)

    if (!stockPriceResult) {
      return {
        success: false,
        error: {
          code: ErrorCodes.EXTERNAL_KIS_API_ERROR,
          message: 'Failed to fetch stock price from database',
        },
      }
    }

    const { currentPrice, stockName } = stockPriceResult

    // Calculate transaction details
    const price = currentPrice
    const subtotal = quantity * price
    const fee = calculateTradingFee(subtotal)
    const totalAmount = subtotal + fee

    // Check if user has enough cash
    if (portfolio.currentCash < totalAmount) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TRADING_INSUFFICIENT_FUNDS,
          message: `Insufficient funds. Need ${totalAmount.toLocaleString()} KRW, have ${portfolio.currentCash.toLocaleString()} KRW`,
        },
      }
    }

    // Execute transaction in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          type: 'BUY',
          stockCode,
          stockName,
          quantity,
          price,
          totalAmount,
          fee,
          note,
        },
      })

      // 2. Update or create holding
      const existingHolding = await tx.holding.findUnique({
        where: {
          portfolioId_stockCode: {
            portfolioId: portfolio.id,
            stockCode,
          },
        },
      })

      if (existingHolding) {
        // Update existing holding with new average price
        const newAvgPrice = calculateAvgPrice(
          existingHolding.quantity,
          existingHolding.avgPrice,
          quantity,
          price
        )

        await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: existingHolding.quantity + quantity,
            avgPrice: newAvgPrice,
            currentPrice: price,
          },
        })
      } else {
        // Create new holding
        await tx.holding.create({
          data: {
            portfolioId: portfolio.id,
            stockCode,
            stockName,
            quantity,
            avgPrice: price,
            currentPrice: price,
          },
        })
      }

      // 3. Update portfolio cash
      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          currentCash: portfolio.currentCash - totalAmount,
        },
      })

      return txRecord
    })

    // 4. Update portfolio metrics (outside transaction for performance)
    await updatePortfolioMetrics(portfolio.id)

    return {
      success: true,
      data: {
        transaction: {
          id: result.id,
          type: result.type,
          stockCode: result.stockCode,
          stockName: result.stockName,
          quantity: result.quantity,
          price: result.price,
          totalAmount: result.totalAmount,
          fee: result.fee,
        },
      },
    }
  } catch (error) {
    console.error('Failed to execute buy order:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to execute buy order',
      },
    }
  }
}

/**
 * Execute a sell order
 *
 * @param userId - User ID
 * @param stockCode - Stock code (e.g., "005930")
 * @param quantity - Number of shares to sell
 * @param note - Optional investment memo
 * @returns Transaction result
 */
export async function executeSell(
  userId: string,
  stockCode: string,
  quantity: number,
  note?: string
): Promise<
  ApiResponse<{
    transaction: {
      id: string
      type: string
      stockCode: string
      stockName: string
      quantity: number
      price: number
      totalAmount: number
      fee: number
      realizedPL: number
    }
  }>
> {
  try {
    // Validate quantity
    const validationError = validateQuantity(quantity)
    if (validationError) {
      return validationError
    }

    // Get user's portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { holdings: true },
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

    // Check if user owns this stock
    const holding = await prisma.holding.findUnique({
      where: {
        portfolioId_stockCode: {
          portfolioId: portfolio.id,
          stockCode,
        },
      },
    })

    if (!holding) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TRADING_STOCK_NOT_OWNED,
          message: 'You do not own this stock',
        },
      }
    }

    // Check if user has enough shares
    if (holding.quantity < quantity) {
      return {
        success: false,
        error: {
          code: ErrorCodes.TRADING_INSUFFICIENT_QUANTITY,
          message: `Insufficient quantity. You own ${holding.quantity} shares, trying to sell ${quantity}`,
        },
      }
    }

    // Get current stock price from database (updated by scheduler)
    const stockPriceResult = await getStockPrice(stockCode)

    if (!stockPriceResult) {
      return {
        success: false,
        error: {
          code: ErrorCodes.EXTERNAL_KIS_API_ERROR,
          message: 'Failed to fetch stock price from database',
        },
      }
    }

    const { currentPrice } = stockPriceResult

    // Calculate transaction details
    const price = currentPrice
    const subtotal = quantity * price
    const fee = calculateTradingFee(subtotal)
    const totalAmount = subtotal - fee

    // Calculate realized P/L
    const realizedPL = calculateRealizedPL(holding.avgPrice, price, quantity)

    // Execute transaction in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const txRecord = await tx.transaction.create({
        data: {
          userId,
          type: 'SELL',
          stockCode,
          stockName: holding.stockName,
          quantity,
          price,
          totalAmount,
          fee,
          note,
        },
      })

      // 2. Update or delete holding
      const remainingQuantity = holding.quantity - quantity

      if (remainingQuantity === 0) {
        // Sell all - delete holding
        await tx.holding.delete({
          where: { id: holding.id },
        })
      } else {
        // Partial sell - update quantity
        await tx.holding.update({
          where: { id: holding.id },
          data: {
            quantity: remainingQuantity,
            currentPrice: price,
          },
        })
      }

      // 3. Update portfolio cash and realized P/L
      await tx.portfolio.update({
        where: { id: portfolio.id },
        data: {
          currentCash: portfolio.currentCash + totalAmount,
          realizedPL: portfolio.realizedPL + realizedPL,
        },
      })

      return txRecord
    })

    // 4. Update portfolio metrics (outside transaction for performance)
    await updatePortfolioMetrics(portfolio.id)

    return {
      success: true,
      data: {
        transaction: {
          id: result.id,
          type: result.type,
          stockCode: result.stockCode,
          stockName: result.stockName,
          quantity: result.quantity,
          price: result.price,
          totalAmount: result.totalAmount,
          fee: result.fee,
          realizedPL,
        },
      },
    }
  } catch (error) {
    console.error('Failed to execute sell order:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to execute sell order',
      },
    }
  }
}
