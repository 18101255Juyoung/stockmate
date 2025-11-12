/**
 * Stock Price Collector Service
 * Collects stock prices from KIS API and updates database
 * - Updates Stock table with real-time prices (every 5 minutes)
 * - Creates daily candles in StockPriceHistory (at market close)
 */

import { prisma } from '@/lib/prisma'
import { getKISApiClient } from '@/lib/utils/kisApi'
import { KIS_ENDPOINTS, KISStockPriceOutput } from '@/lib/types/stock'
import { getKSTToday, isMarketOpen as checkMarketOpen } from '@/lib/utils/timezone'

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
            priceUpdatedAt: new Date(),
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
 * Create daily candles from current Stock data
 * Should be called at market close (15:35 KST)
 * Saves OHLCV data to StockPriceHistory table
 *
 * @returns Number of candles created
 */
export async function createDailyCandles(): Promise<number> {
  console.log('📈 Creating daily candles...')

  try {
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
        priceUpdatedAt: true,
      },
    })

    console.log(`  Found ${stocks.length} stocks with price data`)

    // Get today's date in KST (date only, no time)
    const today = getKSTToday()

    let createdCount = 0

    // Create daily candle for each stock
    for (const stock of stocks) {
      try {
        // Skip if any critical price is 0 (invalid/incomplete data)
        if (
          stock.openPrice === 0 ||
          stock.highPrice === 0 ||
          stock.lowPrice === 0 ||
          stock.currentPrice === 0
        ) {
          console.log(`  ⚠️  Skipping ${stock.stockCode} (${stock.stockName}): incomplete OHLC data`)
          continue
        }

        // Use upsert to avoid duplicates (in case this runs multiple times)
        await prisma.stockPriceHistory.upsert({
          where: {
            stockCode_date: {
              stockCode: stock.stockCode,
              date: today,
            },
          },
          update: {
            openPrice: stock.openPrice,
            highPrice: stock.highPrice,
            lowPrice: stock.lowPrice,
            closePrice: stock.currentPrice, // Current price becomes close price
            volume: stock.volume,
          },
          create: {
            stockCode: stock.stockCode,
            openPrice: stock.openPrice,
            highPrice: stock.highPrice,
            lowPrice: stock.lowPrice,
            closePrice: stock.currentPrice,
            volume: stock.volume,
            date: today,
          },
        })

        createdCount++
        console.log(`  ✓ ${stock.stockCode} (${stock.stockName})`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`  ✗ ${stock.stockCode} (${stock.stockName}): ${errorMessage}`)
      }
    }

    console.log(`\n✅ Daily candles created: ${createdCount}`)

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
    const today = getKSTToday()

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
