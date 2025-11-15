/**
 * Timezone Utility Functions
 * Handles KST (Korea Standard Time, UTC+9) conversions
 *
 * All stock market data and user activities should use KST
 */

/**
 * Get current date/time in KST
 * @returns Date object representing current KST time
 */
export function getKSTNow(): Date {
  const now = new Date()
  // Convert to KST by adding 9 hours to UTC
  const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return kstTime
}

/**
 * Get current date in KST (date only, no time)
 * Returns date with time set to 00:00:00 in UTC, which represents the KST date
 *
 * Example: If KST is 2025-11-07 15:30, returns Date("2025-11-07T00:00:00Z")
 * This ensures date comparisons work correctly regardless of server timezone
 *
 * @returns Date object with time set to 00:00:00 UTC
 */
export function getKSTToday(): Date {
  const now = new Date()

  // Get KST date components
  const kstDateString = now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) // Returns "YYYY-MM-DD" in KST

  // Create date at midnight UTC (which represents the KST date)
  return new Date(kstDateString + 'T00:00:00.000Z')
}

/**
 * Convert any Date to KST date only (strips time)
 *
 * @param date - Date to convert
 * @returns Date object with time set to 00:00:00 UTC representing the KST date
 */
export function toKSTDateOnly(date: Date): Date {
  const kstDateString = date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return new Date(kstDateString + 'T00:00:00.000Z')
}

/**
 * Get current hour and minute in KST
 * @returns { hour, minute } in KST
 */
export function getKSTTime(): { hour: number; minute: number } {
  const now = new Date()

  const kstHour = parseInt(now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false
  }))

  const kstMinute = parseInt(now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Seoul',
    minute: '2-digit'
  }))

  return { hour: kstHour, minute: kstMinute }
}

/**
 * Check if current KST time is after specified time
 *
 * @param hour - Hour in 24h format (0-23)
 * @param minute - Minute (0-59)
 * @returns true if current KST time is after specified time
 */
export function isAfterKSTTime(hour: number, minute: number): boolean {
  const { hour: currentHour, minute: currentMinute } = getKSTTime()

  if (currentHour > hour) return true
  if (currentHour === hour && currentMinute >= minute) return true
  return false
}

/**
 * Check if a given date is weekend in KST
 * @param date - Date to check
 * @returns true if the date is Saturday or Sunday in KST
 */
export function isKSTWeekend(date: Date): boolean {
  // Get KST date string in YYYY-MM-DD format
  const kstDateStr = date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul',
  })

  // Create a Date object from the date string at midnight UTC
  const kstDate = new Date(kstDateStr + 'T00:00:00Z')
  const day = kstDate.getUTCDay() // 0 = Sunday, 6 = Saturday

  return day === 0 || day === 6
}

/**
 * Check if current KST time is market hours
 * Market hours: 09:00 - 15:30 KST, Monday to Friday
 *
 * @returns true if market is currently open
 */
export function isMarketOpen(): boolean {
  const now = new Date()

  // Weekend check (Saturday or Sunday)
  if (isKSTWeekend(now)) return false

  const { hour, minute } = getKSTTime()

  // Before 09:00
  if (hour < 9) return false

  // After 15:30
  if (hour > 15) return false
  if (hour === 15 && minute > 30) return false

  return true
}

/**
 * Get yesterday's date in KST (date only)
 * @returns Date object representing yesterday in KST
 */
export function getKSTYesterday(): Date {
  const today = getKSTToday()
  return new Date(today.getTime() - 24 * 60 * 60 * 1000)
}

/**
 * Add days to a KST date
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addKSTDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Format date as YYYY-MM-DD string in KST
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatKSTDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Get date key for comparisons (YYYY-MM-DD in UTC)
 * This is used for matching dates in StockPriceHistory
 *
 * @param date - Date to get key from
 * @returns Date key string
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}
