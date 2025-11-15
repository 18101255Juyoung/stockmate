/**
 * Stock Price Collector Service
 * Collects stock prices from KIS API and updates database
 * - Updates Stock table with real-time prices (every 5 minutes)
 * - Creates daily candles in StockPriceHistory (at market close)
 */

import { prisma } from '@/lib/prisma'
import { getKISApiClient } from '@/lib/utils/kisApi'
import { KIS_ENDPOINTS, KISStockPriceOutput } from '@/lib/types/stock'
import { KSTDate, KSTDateTime } from '@/lib/utils/kst-date'
import { isMarketOpen as checkMarketOpen } from '@/lib/utils/timezone'
import { fetchHistoricalData } from '@/lib/services/historicalDataCollector'

interface StockUpdateResult {
  success: number
  failed: number
  errors: Array<{ stockCode: string; error: string }>
}

/**
 * Update all stock prices from KIS API
 * Processes all stocks in database sequentially (respects rate limit)
 * Updates Stock table with current OHLCV data
 *
 * @returns Summary of update operation
 */
export async function updateAllStockPrices(): Promise<StockUpdateResult> {
  console.log('📊 Starting stock price update...')

  const result: StockUpdateResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get all stocks from database
    const stocks = await prisma.stock.findMany({
      select: {
        stockCode: true,
        stockName: true,
      },
    })

    console.log(`  Found ${stocks.length} stocks to update`)

    const client = getKISApiClient()
    const trId = client.getTrId('STOCK_PRICE')

    // Process each stock sequentially (rate limit handled by kisApi)
    for (const stock of stocks) {
      try {
        // Fetch price from KIS API
        const params = {
          FID_COND_MRKT_DIV_CODE: 'J', // Market division (works for both KOSPI and KOSDAQ)
          FID_INPUT_ISCD: stock.stockCode,
        }

        const response: KISStockPriceOutput = await client.callApi(
          KIS_ENDPOINTS.STOCK_PRICE,
          params,
          trId
        )

        // Parse response
        const currentPrice = parseFloat(response.stck_prpr) || 0
        const openPrice = parseFloat(response.stck_oprc) || 0
        const highPrice = parseFloat(response.stck_hgpr) || 0
        const lowPrice = parseFloat(response.stck_lwpr) || 0
        const volume = BigInt(response.acml_vol || '0')

        // Update database
        await prisma.stock.update({
          where: { stockCode: stock.stockCode },
          data: {
            currentPrice,
            openPrice,
            highPrice,
            lowPrice,
            volume,
            priceUpdatedAt: KSTDateTime.now(),
          },
        })

        result.success++
        console.log(`  ✓ ${stock.stockCode} (${stock.stockName}): ${currentPrice.toLocaleString()}원`)
      } catch (error) {
        result.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push({
          stockCode: stock.stockCode,
          error: errorMessage,
        })
        console.error(`  ✗ ${stock.stockCode} (${stock.stockName}): ${errorMessage}`)
      }
    }

    console.log(`\n✅ Stock price update completed: ${result.success} success, ${result.failed} failed`)

    return result
  } catch (error) {
    console.error('❌ Failed to update stock prices:', error)
    throw error
  }
}

/**
 * Create daily candles from KIS API historical data
 * Should be called at market close (15:35 KST)
 * Fetches accurate OHLCV data from KIS API and saves to StockPriceHistory table
 *
 * FIXED: Previously used Stock table (real-time prices that get overwritten)
 * NOW: Uses KIS API historical endpoint for accurate daily OHLC data
 *
 * @returns Number of candles created
 */
export async function createDailyCandles(): Promise<number> {
  console.log('📈 Creating daily candles from KIS API...')

  try {
    // Get today's date in KST (date only, no time)
    const today = KSTDate.today()

    // Format today's date as YYYYMMDD for KIS API matching
    const dateStr = KSTDate.format(today) // YYYY-MM-DD
    const targetDateStr = dateStr.replace(/-/g, '') // YYYYMMDD

    // Get all stocks
    const stocks = await prisma.stock.findMany({
      select: { stockCode: true, stockName: true },
    })

    console.log(`  Found ${stocks.length} stocks to process`)

    let createdCount = 0
    let failedCount = 0

    // Process each stock
    for (const stock of stocks) {
      try {
        // Fetch 1 day of historical data from KIS API (today's completed candle)
        const histData = await fetchHistoricalData(stock.stockCode, 1)

        if (!histData || histData.length === 0) {
          console.log(`  ⚠️  No data from KIS API for ${stock.stockCode}`)
          failedCount++
          continue
        }

        // Get today's data (should be the first/only item)
        const todayData = histData[0]

        // Verify this is actually today's data
        if (todayData.stck_bsop_date !== targetDateStr) {
          console.log(
            `  ⚠️  Date mismatch for ${stock.stockCode}: expected ${targetDateStr}, got ${todayData.stck_bsop_date}`
          )
          failedCount++
          continue
        }

        // Parse accurate OHLC data from KIS API
        const openPrice = parseFloat(todayData.stck_oprc) || 0
        const highPrice = parseFloat(todayData.stck_hgpr) || 0
        const lowPrice = parseFloat(todayData.stck_lwpr) || 0
        const closePrice = parseFloat(todayData.stck_clpr) || 0
        const volume = BigInt(todayData.acml_vol || '0')

        // Skip if critical prices are missing
        if (closePrice === 0 || openPrice === 0) {
          console.log(`  ⚠️  Invalid price data for ${stock.stockCode}`)
          failedCount++
          continue
        }

        // Upsert to StockPriceHistory (idempotent - safe to run multiple times)
        await prisma.stockPriceHistory.upsert({
          where: {
            stockCode_date: {
              stockCode: stock.stockCode,
              date: today,
            },
          },
          update: {
            openPrice,
            highPrice,
            lowPrice,
            closePrice,
            volume,
          },
          create: {
            stockCode: stock.stockCode,
            date: today,
            openPrice,
            highPrice,
            lowPrice,
            closePrice,
            volume,
          },
        })

        createdCount++
        console.log(
          `  ✓ ${stock.stockCode} (${stock.stockName}): O ${openPrice} H ${highPrice} L ${lowPrice} C ${closePrice}`
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`  ✗ ${stock.stockCode} (${stock.stockName}): ${errorMessage}`)
        failedCount++
      }
    }

    console.log(`\n✅ Daily candles created: ${createdCount} success, ${failedCount} failed`)

    return createdCount
  } catch (error) {
    console.error('❌ Failed to create daily candles:', error)
    throw error
  }
}

/**
 * Update today's candles with current price data
 * Should be called during market hours to show real-time intraday chart
 * Creates or updates today's candle in StockPriceHistory
 *
 * @returns Number of candles updated
 */
export async function updateTodayCandles(): Promise<number> {
  console.log('📊 Updating today\'s candles...')

  try {
    // Get today's date in KST (date only, no time)
    const today = KSTDate.today()

    // Get all stocks with price data
    const stocks = await prisma.stock.findMany({
      where: {
        currentPrice: { gt: 0 }, // Only stocks with valid prices
      },
      select: {
        stockCode: true,
        stockName: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        currentPrice: true,
        volume: true,
      },
    })

    let updatedCount = 0

    // Update today's candle for each stock
    for (const stock of stocks) {
      try {
        // Skip if any critical price is 0
        if (
          stock.openPrice === 0 ||
          stock.highPrice === 0 ||
          stock.lowPrice === 0 ||
          stock.currentPrice === 0
        ) {
          continue
        }

        // Upsert today's candle (create or update)
        await prisma.stockPriceHistory.upsert({
          where: {
            stockCode_date: {
              stockCode: stock.stockCode,
              date: today,
            },
          },
          update: {
            // Keep openPrice unchanged (fixed at market open)
            highPrice: stock.highPrice,
            lowPrice: stock.lowPrice,
            closePrice: stock.currentPrice, // Real-time close price
            volume: stock.volume,
          },
          create: {
            stockCode: stock.stockCode,
            date: today,
            openPrice: stock.openPrice,
            highPrice: stock.highPrice,
            lowPrice: stock.lowPrice,
            closePrice: stock.currentPrice,
            volume: stock.volume,
          },
        })

        updatedCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`  ✗ ${stock.stockCode}: ${errorMessage}`)
      }
    }

    console.log(`  ✅ Today's candles updated: ${updatedCount}`)

    return updatedCount
  } catch (error) {
    console.error('❌ Failed to update today\'s candles:', error)
    throw error
  }
}

/**
 * Get last update time for a specific stock
 *
 * @param stockCode - Stock code
 * @returns Last update timestamp or null
 */
export async function getLastUpdateTime(stockCode: string): Promise<Date | null> {
  const stock = await prisma.stock.findUnique({
    where: { stockCode },
    select: { priceUpdatedAt: true },
  })

  return stock?.priceUpdatedAt || null
}

/**
 * Check if market is currently open
 * Korean stock market hours: 09:00-15:30 KST, Monday-Friday
 * Re-exported from timezone utility for backward compatibility
 *
 * @returns true if market is open
 */
export function isMarketOpen(): boolean {
  return checkMarketOpen()
}
