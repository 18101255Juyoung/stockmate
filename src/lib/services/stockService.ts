/**
 * Stock Service
 * Handles stock price queries, search, and caching
 * Uses Local DB for stock data (updated by scheduler)
 */

import cache from '@/lib/utils/cache'
import { prisma } from '@/lib/prisma'
import {
  StockPrice,
  StockSearchResult,
} from '@/lib/types/stock'

// Cache TTL: 5 minutes
const CACHE_TTL_SECONDS = 5 * 60

/**
 * Get current stock price from database
 * Returns cached price data collected by scheduler
 * Results are cached for 5 minutes
 *
 * @param code - Stock code (e.g., "005930" for Samsung)
 * @returns Stock price information
 */
export async function getStockPrice(code: string): Promise<StockPrice> {
  // Check cache first
  const cacheKey = `stock_price:${code}`
  const cached = cache.get(cacheKey)

  if (cached) {
    return cached
  }

  try {
    // Get price from database (updated by scheduler)
    const stock = await prisma.stock.findUnique({
      where: { stockCode: code },
    })

    if (!stock) {
      throw new Error(`Stock not available: ${code}. Only top 50 stocks by market cap are supported.`)
    }

    // Check if price data is available
    if (stock.currentPrice === 0 || !stock.priceUpdatedAt) {
      throw new Error(`Price data not available for ${code}. Please wait for next scheduled update.`)
    }

    // Calculate change (requires yesterday's close price - for now use 0)
    // TODO: Implement change calculation using StockPriceHistory
    const changePrice = 0
    const changeRate = 0

    // Transform DB record to StockPrice format
    const stockPrice: StockPrice = {
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      currentPrice: stock.currentPrice,
      changePrice,
      changeRate,
      openPrice: stock.openPrice,
      highPrice: stock.highPrice,
      lowPrice: stock.lowPrice,
      volume: Number(stock.volume),
      updatedAt: stock.priceUpdatedAt || stock.updatedAt,
    }

    // Cache the result
    cache.set(cacheKey, stockPrice, CACHE_TTL_SECONDS)

    return stockPrice
  } catch (error) {
    console.error(`Failed to get stock price for ${code}:`, error)
    throw error
  }
}

/**
 * Search stocks by name or code (DB-based)
 * Searches local database for stock information
 * Results are cached for 5 minutes
 *
 * @param query - Search query (stock name or code)
 * @returns Array of matching stocks
 */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.trim() === '') {
    throw new Error('Search query cannot be empty')
  }

  // Check cache first
  const cacheKey = `stock_search:${query}`
  const cached = cache.get(cacheKey)

  if (cached) {
    return cached
  }

  try {
    // Search in local database
    const stocks = await prisma.stock.findMany({
      where: {
        OR: [
          { stockName: { contains: query.trim() } },
          { stockCode: { contains: query.trim() } },
        ],
      },
      take: 20, // Limit results
      orderBy: {
        stockName: 'asc',
      },
    })

    // Transform to StockSearchResult format
    const results: StockSearchResult[] = stocks.map((stock) => ({
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      market: stock.market,
    }))

    // Cache the results
    cache.set(cacheKey, results, CACHE_TTL_SECONDS)

    return results
  } catch (error) {
    console.error(`Failed to search stocks with query "${query}":`, error)
    throw error
  }
}

/**
 * Get stock information (alias for getStockPrice)
 * Kept for API consistency
 *
 * @param code - Stock code
 * @returns Stock information
 */
export async function getStockInfo(code: string): Promise<StockPrice> {
  return getStockPrice(code)
}

/**
 * Clear cache for a specific stock
 * Useful for forcing a refresh
 *
 * @param code - Stock code
 */
export function clearStockCache(code: string): void {
  cache.delete(`stock_price:${code}`)
}

/**
 * Clear search cache for a query
 *
 * @param query - Search query
 */
export function clearSearchCache(query: string): void {
  cache.delete(`stock_search:${query}`)
}

/**
 * Clear all stock-related caches
 */
export function clearAllStockCache(): void {
  // Note: This clears ALL cache, not just stock cache
  // In production, you might want a more targeted approach
  cache.clear()
}
