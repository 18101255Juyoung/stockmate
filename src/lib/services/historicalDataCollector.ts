/**
 * Historical Data Collector Service
 * Fetches historical price data from KIS API and saves to database
 * Used for backfilling past price data
 */

import { prisma } from '@/lib/prisma'
import { getKISApiClient } from '@/lib/utils/kisApi'
import { KIS_ENDPOINTS } from '@/lib/types/stock'
import { KSTDate } from '@/lib/utils/kst-date'

interface KISChartDataItem {
  stck_bsop_date: string // 영업일자 (YYYYMMDD)
  stck_oprc: string // 시가
  stck_hgpr: string // 고가
  stck_lwpr: string // 저가
  stck_clpr: string // 종가
  acml_vol: string // 거래량
}

interface BackfillResult {
  stockCode: string
  stockName: string
  daysRequested: number
  daysInserted: number
  errors: string[]
}

/**
 * Fetch historical data for a single stock from KIS API
 *
 * @param stockCode - Stock code (e.g., "005930")
 * @param days - Number of days to fetch (max 100 per request for KIS API)
 * @returns Array of historical price data
 */
export async function fetchHistoricalData(
  stockCode: string,
  days: number = 30
): Promise<KISChartDataItem[]> {
  try {
    const client = getKISApiClient()
    const trId = client.getTrId('DAILY_CHART')

    // Calculate end date (today) and start date in KST
    const endDate = KSTDate.today()
    const startDate = KSTDate.addDays(endDate, -days)

    // Format dates as YYYYMMDD
    const formatDateStr = (date: Date) => {
      return KSTDate.format(KSTDate.fromDate(date)).replace(/-/g, '') // YYYYMMDD
    }

    const params = {
      FID_COND_MRKT_DIV_CODE: 'J', // Market division
      FID_INPUT_ISCD: stockCode,
      FID_INPUT_DATE_1: formatDateStr(startDate),
      FID_INPUT_DATE_2: formatDateStr(endDate),
      FID_PERIOD_DIV_CODE: 'D', // D: Daily, W: Weekly, M: Monthly
      FID_ORG_ADJ_PRC: '0', // 0: 수정주가 반영하지 않음, 1: 수정주가 반영
    }

    // Use callApiChart to access output2
    const histData: KISChartDataItem[] = await client.callApiChart<KISChartDataItem>(
      KIS_ENDPOINTS.DAILY_CHART,
      params,
      trId
    )

    return histData
  } catch (error) {
    console.error(`Failed to fetch historical data for ${stockCode}:`, error)
    throw error
  }
}

/**
 * Save historical data to database
 *
 * @param stockCode - Stock code
 * @param histData - Historical price data from KIS API
 * @returns Number of records inserted
 */
async function saveHistoricalData(
  stockCode: string,
  histData: KISChartDataItem[]
): Promise<number> {
  let insertedCount = 0

  for (const item of histData) {
    try {
      // Parse date (YYYYMMDD -> Date object)
      // Use UTC to avoid timezone conversion issues
      const dateStr = item.stck_bsop_date
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1 // 0-indexed
      const day = parseInt(dateStr.substring(6, 8))
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))

      // Parse prices and volume
      const openPrice = parseFloat(item.stck_oprc) || 0
      const highPrice = parseFloat(item.stck_hgpr) || 0
      const lowPrice = parseFloat(item.stck_lwpr) || 0
      const closePrice = parseFloat(item.stck_clpr) || 0
      const volume = BigInt(item.acml_vol || '0')

      // Skip if price is 0 (invalid data)
      if (closePrice === 0) continue

      // Upsert (insert or update if exists)
      await prisma.stockPriceHistory.upsert({
        where: {
          stockCode_date: {
            stockCode,
            date,
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
          stockCode,
          openPrice,
          highPrice,
          lowPrice,
          closePrice,
          volume,
          date,
        },
      })

      insertedCount++
    } catch (error) {
      console.error(`Failed to save data for ${stockCode} on ${item.stck_bsop_date}:`, error)
      // Continue with next item
    }
  }

  return insertedCount
}

/**
 * Backfill historical data for a single stock
 *
 * @param stockCode - Stock code
 * @param stockName - Stock name
 * @param days - Number of days to backfill
 * @returns Backfill result summary
 */
export async function backfillStock(
  stockCode: string,
  stockName: string,
  days: number
): Promise<BackfillResult> {
  const result: BackfillResult = {
    stockCode,
    stockName,
    daysRequested: days,
    daysInserted: 0,
    errors: [],
  }

  try {
    console.log(`  Backfilling ${stockCode} (${stockName}): ${days} days...`)

    // Fetch historical data from KIS API
    const histData = await fetchHistoricalData(stockCode, days)

    if (histData.length === 0) {
      result.errors.push('No data returned from KIS API')
      return result
    }

    // Save to database
    result.daysInserted = await saveHistoricalData(stockCode, histData)

    console.log(`  ✓ ${stockCode}: ${result.daysInserted} days inserted`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMessage)
    console.error(`  ✗ ${stockCode}: ${errorMessage}`)
  }

  return result
}

/**
 * Backfill historical data for all stocks in database
 *
 * @param days - Number of days to backfill (default: 365 = 1 year)
 * @returns Array of backfill results for each stock
 */
export async function backfillAllStocks(days: number = 365): Promise<BackfillResult[]> {
  console.log(`\n📊 Starting backfill for ${days} days...`)

  // Get all stocks from database
  const stocks = await prisma.stock.findMany({
    select: {
      stockCode: true,
      stockName: true,
    },
  })

  console.log(`  Found ${stocks.length} stocks to backfill\n`)

  const results: BackfillResult[] = []

  // Process each stock sequentially (respects rate limit)
  for (const stock of stocks) {
    const result = await backfillStock(stock.stockCode, stock.stockName, days)
    results.push(result)
  }

  // Summary
  const totalInserted = results.reduce((sum, r) => sum + r.daysInserted, 0)
  const totalErrors = results.filter((r) => r.errors.length > 0).length

  console.log(`\n✅ Backfill completed:`)
  console.log(`  Total days inserted: ${totalInserted}`)
  console.log(`  Stocks with errors: ${totalErrors}`)

  return results
}
