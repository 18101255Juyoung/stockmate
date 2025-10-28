/**
 * Financial calculation utilities
 * Core business logic for trading and portfolio management
 */

// Default trading fee rate (0.015%)
const DEFAULT_FEE_RATE = 0.00015

/**
 * Holdings data structure for calculations
 */
export interface HoldingData {
  quantity: number
  currentPrice: number
  avgPrice?: number
}

/**
 * Calculate total assets (cash + stock values)
 *
 * @param cash - Available cash
 * @param holdings - Array of stock holdings with quantity and current price
 * @returns Total assets value
 */
export function calculateTotalAssets(
  cash: number,
  holdings: Array<{ quantity: number; currentPrice: number }>
): number {
  const stockValue = holdings.reduce((sum, holding) => {
    return sum + holding.quantity * holding.currentPrice
  }, 0)

  return cash + stockValue
}

/**
 * Calculate total return percentage
 *
 * @param totalAssets - Current total assets
 * @param initialCapital - Initial investment capital
 * @returns Return percentage (positive for profit, negative for loss)
 */
export function calculateTotalReturn(totalAssets: number, initialCapital: number): number {
  if (initialCapital === 0) {
    return 0
  }

  const returnRate = ((totalAssets - initialCapital) / initialCapital) * 100

  // Round to 2 decimal places
  return Math.round(returnRate * 100) / 100
}

/**
 * Calculate average price using FIFO (First In, First Out) method
 *
 * Formula: (old_quantity × old_avgPrice + new_quantity × new_price) / (old_quantity + new_quantity)
 *
 * @param oldQuantity - Current quantity held
 * @param oldAvgPrice - Current average price
 * @param newQuantity - Quantity being purchased
 * @param newPrice - Purchase price
 * @returns New average price
 */
export function calculateAvgPrice(
  oldQuantity: number,
  oldAvgPrice: number,
  newQuantity: number,
  newPrice: number
): number {
  // If no existing position, return new price
  if (oldQuantity === 0) {
    return newPrice
  }

  // Calculate weighted average
  const totalCost = oldQuantity * oldAvgPrice + newQuantity * newPrice
  const totalQuantity = oldQuantity + newQuantity

  const avgPrice = totalCost / totalQuantity

  // Round to 2 decimal places to avoid floating point errors
  return Math.round(avgPrice * 100) / 100
}

/**
 * Calculate unrealized profit/loss for all holdings
 *
 * Formula: Σ((current_price - avg_price) × quantity)
 *
 * @param holdings - Array of holdings with quantity, avgPrice, and currentPrice
 * @returns Total unrealized P/L (positive for profit, negative for loss)
 */
export function calculateUnrealizedPL(
  holdings: Array<{ quantity: number; avgPrice: number; currentPrice: number }>
): number {
  const unrealizedPL = holdings.reduce((sum, holding) => {
    const pnl = (holding.currentPrice - holding.avgPrice) * holding.quantity
    return sum + pnl
  }, 0)

  // Round to 2 decimal places
  return Math.round(unrealizedPL * 100) / 100
}

/**
 * Calculate realized profit/loss for a sell transaction
 *
 * Formula: (sell_price - avg_price) × quantity
 *
 * @param avgPrice - Average purchase price
 * @param sellPrice - Sell price
 * @param quantity - Quantity sold
 * @returns Realized P/L (positive for profit, negative for loss)
 */
export function calculateRealizedPL(
  avgPrice: number,
  sellPrice: number,
  quantity: number
): number {
  const realizedPL = (sellPrice - avgPrice) * quantity

  // Round to 2 decimal places
  return Math.round(realizedPL * 100) / 100
}

/**
 * Calculate trading fee
 *
 * @param amount - Transaction amount
 * @param feeRate - Fee rate (default: 0.00015 = 0.015%)
 * @returns Trading fee (rounded to integer, no fractional KRW)
 */
export function calculateTradingFee(amount: number, feeRate: number = DEFAULT_FEE_RATE): number {
  const fee = amount * feeRate

  // Round to integer (no fractional KRW)
  return Math.round(fee)
}

/**
 * Calculate portfolio metrics
 * Convenience function to calculate all metrics at once
 *
 * @param initialCapital - Initial investment capital
 * @param currentCash - Current available cash
 * @param holdings - Current stock holdings
 * @returns Object containing all portfolio metrics
 */
export function calculatePortfolioMetrics(
  initialCapital: number,
  currentCash: number,
  holdings: Array<{ quantity: number; avgPrice: number; currentPrice: number }>
) {
  const totalAssets = calculateTotalAssets(currentCash, holdings)
  const totalReturn = calculateTotalReturn(totalAssets, initialCapital)
  const unrealizedPL = calculateUnrealizedPL(holdings)

  return {
    totalAssets,
    totalReturn,
    unrealizedPL,
  }
}
