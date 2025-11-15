/**
 * Data Initializer Service
 * Automatically fixes missing chart data on server startup
 * - Detects missing dates
 * - Backfills gaps
 * - Ensures minimum 90 days of data
 */

import { prisma } from '@/lib/prisma'
import { backfillAllStocks, fetchHistoricalData } from './historicalDataCollector'
import { KSTDate, KSTDateTime, type KSTDate as KSTDateType } from '@/lib/utils/kst-date'

/**
 * Get the most recent date in StockPriceHistory
 * @returns Most recent date or null if no data
 */
export async function getLastDataDate(): Promise<Date | null> {
  const lastRecord = await prisma.stockPriceHistory.findFirst({
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  return lastRecord?.date || null
}

/**
 * Get total count of StockPriceHistory records
 */
export async function getHistoryDataCount(): Promise<number> {
  return await prisma.stockPriceHistory.count()
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * Uses KST timezone
 */
function isWeekend(date: KSTDateType): boolean {
  return KSTDate.isWeekend(date)
}

/**
 * Get array of weekdays between two dates (inclusive)
 * Excludes weekends
 */
export function getMissingWeekdays(startDate: Date, endDate: Date): KSTDateType[] {
  const weekdays: KSTDateType[] = []
  let current = KSTDate.fromDate(startDate)
  const end = KSTDate.fromDate(endDate)

  while (current <= end) {
    if (!isWeekend(current)) {
      weekdays.push(current)
    }
    current = KSTDate.addDays(current, 1)
  }

  return weekdays
}

/**
 * Backfill data for a specific date
 * @param date - Target date
 * @returns Number of stocks updated
 */
export async function backfillSpecificDate(date: Date): Promise<number> {
  // Normalize to KST date
  const normalizedDate = KSTDate.fromDate(date)

  // SAFETY CHECK: Skip weekends in KST
  if (isWeekend(normalizedDate)) {
    // Get day name in KST
    const dayName = date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Seoul',
      weekday: 'long',
    })
    console.log(`  ⏭️  Skipping ${KSTDate.format(normalizedDate)} (${dayName} - Weekend)`)
    return 0
  }

  console.log(`  📥 Backfilling data for ${KSTDate.format(normalizedDate)}...`)

  // Get all stocks
  const stocks = await prisma.stock.findMany({
    select: { stockCode: true, stockName: true },
  })

  let updatedCount = 0

  // For each stock, fetch historical data for the specific date
  for (const stock of stocks) {
    try {
      // Fetch 5 days of data (to ensure we get the target date with safety margin)
      const histData = await fetchHistoricalData(stock.stockCode, 5)

      // Find data for the target date
      // Use KST date components to match the date passed in
      const dateStr = KSTDate.format(normalizedDate) // YYYY-MM-DD
      const targetDateStr = dateStr.replace(/-/g, '') // YYYYMMDD

      const dayData = histData.find((item) => item.stck_bsop_date === targetDateStr)

      if (!dayData) {
        console.log(`    ⚠️  No data for ${stock.stockCode} on ${targetDateStr}`)
        continue
      }

      // Parse prices
      const openPrice = parseFloat(dayData.stck_oprc) || 0
      const highPrice = parseFloat(dayData.stck_hgpr) || 0
      const lowPrice = parseFloat(dayData.stck_lwpr) || 0
      const closePrice = parseFloat(dayData.stck_clpr) || 0
      const volume = BigInt(dayData.acml_vol || '0')

      if (closePrice === 0) continue

      // Upsert to StockPriceHistory
      await prisma.stockPriceHistory.upsert({
        where: {
          stockCode_date: {
            stockCode: stock.stockCode,
            date: normalizedDate,
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
          date: normalizedDate,
          openPrice,
          highPrice,
          lowPrice,
          closePrice,
          volume,
        },
      })

      updatedCount++
    } catch (error) {
      console.error(`    ✗ ${stock.stockCode}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log(`    ✓ ${updatedCount} stocks updated`)
  return updatedCount
}

/**
 * Automatically fix chart data on server startup
 * - Fills missing dates
 * - Ensures minimum 90 days of data
 */
export async function autoFixChartData(): Promise<void> {
  console.log('\n📊 [Data Fix] Checking chart data integrity...')

  try {
    const lastDate = await getLastDataDate()
    const today = KSTDate.today()

    if (!lastDate) {
      console.log('  ⚠️  No data found. Running full backfill (90 days)...')
      await backfillAllStocks(90)
      console.log('  ✅ Initial data load complete\n')
      return
    }

    // Check for missing dates
    const lastDataDate = KSTDate.fromDate(lastDate)

    console.log(`  Last data date: ${KSTDate.format(lastDataDate)}`)
    console.log(`  Today: ${KSTDate.format(today)}`)

    // Get missing weekdays
    const nextDay = KSTDate.addDays(lastDataDate, 1)

    const missingDates = getMissingWeekdays(nextDay, today)

    if (missingDates.length > 0) {
      console.log(`  Missing weekdays: ${missingDates.length}`)
      console.log(`  Dates: ${missingDates.map((d) => d.toISOString().split('T')[0]).join(', ')}`)

      // Backfill each missing date
      for (const date of missingDates) {
        await backfillSpecificDate(date)
      }

      console.log('  ✅ Missing dates backfilled')
    } else {
      console.log('  ✓ No missing dates')
    }

    // Ensure minimum 90 days of data
    const totalCount = await getHistoryDataCount()
    const stockCount = await prisma.stock.count()
    const expectedMinimum = stockCount * 90

    if (totalCount < expectedMinimum) {
      console.log(`  ⚠️  Total data (${totalCount}) < Expected (${expectedMinimum})`)
      console.log('  Running additional backfill to reach 90 days...')
      await backfillAllStocks(90)
    } else {
      console.log(`  ✓ Data coverage sufficient (${totalCount} records)`)
    }

    console.log('✅ [Data Fix] Chart data is now complete!\n')
  } catch (error) {
    console.error('❌ [Data Fix] Failed:', error)
  }
}