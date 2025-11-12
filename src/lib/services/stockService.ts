/**
 * Stock Service
 * Handles stock price queries, search, and caching
 * Uses Local DB for stock data (updated by scheduler)
 * Falls back to KIS API if data not available in DB
 */

import cache from '@/lib/utils/cache'
import { prisma } from '@/lib/prisma'
import { getKISApiClient } from '@/lib/utils/kisApi'
import {
  StockPrice,
  StockSearchResult,
  KIS_ENDPOINTS,
  KIS_TR_IDS,
} from '@/lib/types/stock'

// Cache TTL: 5 minutes
const CACHE_TTL_SECONDS = 5 * 60

/**
 * Get current stock price from database or KIS API
 * Returns cached price data from scheduler, falls back to KIS API if not available
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
    // Try to get price from database (updated by scheduler)
    const stock = await prisma.stock.findUnique({
      where: { stockCode: code },
    })

    // If stock exists in DB and has valid price data, use it
    if (stock && stock.currentPrice > 0 && stock.priceUpdatedAt) {
      const stockPrice: StockPrice = {
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        currentPrice: stock.currentPrice,
        changePrice: 0,
        changeRate: 0,
        openPrice: stock.openPrice,
        highPrice: stock.highPrice,
        lowPrice: stock.lowPrice,
        volume: Number(stock.volume),
        updatedAt: stock.priceUpdatedAt || stock.updatedAt,
      }

      cache.set(cacheKey, stockPrice, CACHE_TTL_SECONDS)
      return stockPrice
    }

    // Fallback to KIS API if stock not in DB or price data missing
    console.log(`Stock ${code} not in DB, fetching from KIS API...`)
    const kisClient = getKISApiClient()

    const priceData = await kisClient.callApi<any>(
      KIS_ENDPOINTS.STOCK_PRICE,
      {
        FID_COND_MRKT_DIV_CODE: 'J', // Market (J: KOSPI, Q: KOSDAQ)
        FID_INPUT_ISCD: code,
      },
      KIS_TR_IDS.COMMON.STOCK_PRICE
    )

    // Transform KIS API response to StockPrice format
    const stockPrice: StockPrice = {
      stockCode: code,
      stockName: priceData.hts_kor_isnm || '',
      currentPrice: parseFloat(priceData.stck_prpr) || 0,
      changePrice: parseFloat(priceData.prdy_vrss) || 0,
      changeRate: parseFloat(priceData.prdy_ctrt) || 0,
      openPrice: parseFloat(priceData.stck_oprc) || 0,
      highPrice: parseFloat(priceData.stck_hgpr) || 0,
      lowPrice: parseFloat(priceData.stck_lwpr) || 0,
      volume: parseInt(priceData.acml_vol) || 0,
      updatedAt: new Date(),
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
 * Search stocks by name or code (DB or KIS API)
 * Searches local database first, falls back to KIS API if no results
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
    // Search in local database first
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

    // If found in DB, return results
    if (stocks.length > 0) {
      const results: StockSearchResult[] = stocks.map((stock) => ({
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        market: stock.market,
      }))

      cache.set(cacheKey, results, CACHE_TTL_SECONDS)
      return results
    }

    // Fallback to KIS API if no results in DB
    console.log(`No results for "${query}" in DB, searching via KIS API...`)
    const kisClient = getKISApiClient()

    const searchData = await kisClient.callApi<any[]>(
      KIS_ENDPOINTS.STOCK_SEARCH,
      {
        PRDT_TYPE_CD: '300', // 주식
        PDNO: query.trim(),
      },
      KIS_TR_IDS.COMMON.STOCK_SEARCH
    )

    // Transform KIS API response to StockSearchResult format
    const results: StockSearchResult[] = (searchData || []).slice(0, 20).map((item: any) => ({
      stockCode: item.pdno || '',
      stockName: item.prdt_name || '',
      market: item.mket_id_cd === 'J' ? 'KOSPI' : item.mket_id_cd === 'Q' ? 'KOSDAQ' : 'ETC',
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
