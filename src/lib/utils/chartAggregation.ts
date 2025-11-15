/**
 * Chart Data Aggregation Utilities
 * Aggregates daily candlestick data into weekly or monthly candles
 * All date operations use KST (Korea Standard Time)
 */

interface DailyCandle {
  date: string | Date
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  volume: number | bigint
}

interface AggregatedCandle {
  date: string
  openPrice: number
  highPrice: number
  lowPrice: number
  closePrice: number
  volume: number
}

/**
 * Get ISO week number and year for a given date in KST
 * ISO week: Monday is the first day of the week
 */
function getISOWeek(date: Date): { year: number; week: number } {
  // Get KST date components
  const kstYear = parseInt(
    date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    })
  )
  const kstMonth =
    parseInt(
      date.toLocaleDateString('en-US', {
        timeZone: 'Asia/Seoul',
        month: 'numeric',
      })
    ) - 1
  const kstDay = parseInt(
    date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Seoul',
      day: 'numeric',
    })
  )

  // Create date object in UTC using KST components
  const d = new Date(Date.UTC(kstYear, kstMonth, kstDay))

  // Get day of week in KST (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const kstDayOfWeek = d.getUTCDay()

  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (kstDayOfWeek || 7))

  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))

  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return { year: d.getUTCFullYear(), week: weekNo }
}

/**
 * Get year and month for a given date in KST
 */
function getYearMonth(date: Date): { year: number; month: number } {
  const kstYear = parseInt(
    date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    })
  )
  const kstMonth = parseInt(
    date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
    })
  )
  return {
    year: kstYear,
    month: kstMonth, // 1-12
  }
}

/**
 * Aggregate daily candles into weekly candles
 * Groups by ISO week (Monday-Sunday)
 *
 * @param dailyCandles - Array of daily OHLCV data
 * @returns Array of weekly aggregated candles
 */
export function aggregateToWeekly(dailyCandles: DailyCandle[]): AggregatedCandle[] {
  if (!dailyCandles || dailyCandles.length === 0) {
    return []
  }

  // Group candles by ISO week
  const weeklyGroups = new Map<string, DailyCandle[]>()

  for (const candle of dailyCandles) {
    const date = new Date(candle.date)
    const { year, week } = getISOWeek(date)
    const key = `${year}-W${week.toString().padStart(2, '0')}`

    if (!weeklyGroups.has(key)) {
      weeklyGroups.set(key, [])
    }
    weeklyGroups.get(key)!.push(candle)
  }

  // Aggregate each week's data
  const weeklyCandles: AggregatedCandle[] = []

  for (const [weekKey, candles] of weeklyGroups.entries()) {
    // Sort candles by date within the week
    candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const openPrice = candles[0].openPrice // First day's open
    const closePrice = candles[candles.length - 1].closePrice // Last day's close
    const highPrice = Math.max(...candles.map((c) => c.highPrice)) // Week's high
    const lowPrice = Math.min(...candles.map((c) => c.lowPrice)) // Week's low
    const volume = candles.reduce((sum, c) => sum + Number(c.volume), 0) // Total volume

    // Use the first day of the week as the date
    const weekDate = new Date(candles[0].date)

    weeklyCandles.push({
      date: weekDate.toISOString().split('T')[0], // YYYY-MM-DD
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      volume,
    })
  }

  // Sort by date
  weeklyCandles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return weeklyCandles
}

/**
 * Aggregate daily candles into monthly candles
 * Groups by year-month
 *
 * @param dailyCandles - Array of daily OHLCV data
 * @returns Array of monthly aggregated candles
 */
export function aggregateToMonthly(dailyCandles: DailyCandle[]): AggregatedCandle[] {
  if (!dailyCandles || dailyCandles.length === 0) {
    return []
  }

  // Group candles by year-month
  const monthlyGroups = new Map<string, DailyCandle[]>()

  for (const candle of dailyCandles) {
    const date = new Date(candle.date)
    const { year, month } = getYearMonth(date)
    const key = `${year}-${month.toString().padStart(2, '0')}`

    if (!monthlyGroups.has(key)) {
      monthlyGroups.set(key, [])
    }
    monthlyGroups.get(key)!.push(candle)
  }

  // Aggregate each month's data
  const monthlyCandles: AggregatedCandle[] = []

  for (const [monthKey, candles] of monthlyGroups.entries()) {
    // Sort candles by date within the month
    candles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const openPrice = candles[0].openPrice // First day's open
    const closePrice = candles[candles.length - 1].closePrice // Last day's close
    const highPrice = Math.max(...candles.map((c) => c.highPrice)) // Month's high
    const lowPrice = Math.min(...candles.map((c) => c.lowPrice)) // Month's low
    const volume = candles.reduce((sum, c) => sum + Number(c.volume), 0) // Total volume

    // Use the first day of the month as the date
    const monthDate = new Date(candles[0].date)

    monthlyCandles.push({
      date: monthDate.toISOString().split('T')[0], // YYYY-MM-DD
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      volume,
    })
  }

  // Sort by date
  monthlyCandles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return monthlyCandles
}
