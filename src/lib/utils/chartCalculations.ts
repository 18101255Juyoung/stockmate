/**
 * Chart Calculation Utilities
 * Functions for calculating technical indicators (moving averages, etc.)
 */

interface PriceData {
  date: string
  close: number
}

interface MAResult {
  date: string
  value: number | null
}

/**
 * Calculate Simple Moving Average (SMA)
 * Returns null for periods where there's insufficient data
 *
 * @param data - Array of price data with date and close price
 * @param period - Number of periods for moving average (e.g., 5, 10, 20)
 * @returns Array of moving average values
 */
export function calculateSMA(data: PriceData[], period: number): MAResult[] {
  if (!data || data.length === 0) {
    return []
  }

  const result: MAResult[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // Not enough data points yet
      result.push({
        date: data[i].date,
        value: null,
      })
    } else {
      // Calculate average of last 'period' closes
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close
      }
      result.push({
        date: data[i].date,
        value: sum / period,
      })
    }
  }

  return result
}

/**
 * Calculate multiple moving averages at once
 *
 * @param data - Array of price data
 * @param periods - Array of periods (e.g., [5, 10, 20])
 * @returns Object with MA results keyed by period
 */
export function calculateMultipleMA(
  data: PriceData[],
  periods: number[]
): Record<number, MAResult[]> {
  const result: Record<number, MAResult[]> = {}

  for (const period of periods) {
    result[period] = calculateSMA(data, period)
  }

  return result
}

/**
 * Merge price data with moving averages for chart display
 *
 * @param data - Original price data
 * @param maData - Moving average data by period
 * @returns Combined data array for chart
 */
export function mergePriceWithMA(
  data: PriceData[],
  maData: Record<number, MAResult[]>
): any[] {
  return data.map((item, index) => {
    const merged: any = { ...item }

    // Add each MA to the data point
    for (const period in maData) {
      const maValue = maData[period][index]?.value
      merged[`ma${period}`] = maValue !== null ? maValue : undefined
    }

    return merged
  })
}

/**
 * Calculate percentage change
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Format large numbers (e.g., volume)
 *
 * @param value - Number to format
 * @returns Formatted string
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}
