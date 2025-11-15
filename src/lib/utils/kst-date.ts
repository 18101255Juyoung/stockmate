/**
 * KST (Korea Standard Time) Date Utilities
 *
 * CRITICAL: This file provides timezone-safe date operations for KST (UTC+9).
 *
 * WHY THIS EXISTS:
 * JavaScript's `new Date()` uses the SERVER'S local timezone, which can differ
 * from KST. This causes data to be saved with wrong dates when the server runs
 * in a different timezone (e.g., UTC, US timezones).
 *
 * RULES:
 * 1. NEVER use `new Date()` directly in your code
 * 2. ALWAYS use KSTDate.* or KSTDateTime.* factories
 * 3. ESLint will enforce these rules
 *
 * MIGRATION:
 * - new Date() → KSTDate.today() or KSTDateTime.now()
 * - date.setHours(0,0,0,0) → KSTDate.fromDate(date)
 * - getKSTToday() → KSTDate.today()
 * - toKSTDateOnly() → KSTDate.fromDate()
 */

/**
 * KSTDate - A Date object guaranteed to be midnight UTC representing a KST date
 *
 * Format: YYYY-MM-DDT00:00:00.000Z
 * Represents: A calendar date in KST timezone (no time component)
 *
 * @example
 * const today = KSTDate.today()
 * // If KST is 2025-11-14, returns Date("2025-11-14T00:00:00.000Z")
 */
export type KSTDate = Date & { readonly __brand: 'KSTDate' }

/**
 * KSTDateTime - A Date object with full timestamp in KST
 *
 * Use for: Current time, timestamps, time-sensitive operations
 */
export type KSTDateTime = Date & { readonly __brand: 'KSTDateTime' }

/**
 * KSTDate factory functions
 *
 * All dates are represented as UTC midnight (00:00:00.000Z)
 * where the date value corresponds to the KST calendar date.
 */
export const KSTDate = {
  /**
   * Get today's date in KST
   *
   * @returns Today in KST as midnight UTC
   *
   * @example
   * // If current KST time is 2025-11-14 15:30
   * const today = KSTDate.today()
   * // Returns: Date("2025-11-14T00:00:00.000Z")
   */
  today(): KSTDate {
    const now = new Date()
    const kstDateString = now.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return new Date(kstDateString + 'T00:00:00.000Z') as KSTDate
  },

  /**
   * Get yesterday's date in KST
   *
   * @returns Yesterday in KST as midnight UTC
   */
  yesterday(): KSTDate {
    return KSTDate.addDays(KSTDate.today(), -1)
  },

  /**
   * Convert any Date to KST date (strips time component)
   *
   * @param date - Any Date object
   * @returns Date normalized to KST date (midnight UTC)
   *
   * @example
   * const utcDate = new Date("2025-11-14T10:30:00Z")
   * const kstDate = KSTDate.fromDate(utcDate)
   * // Returns: Date("2025-11-14T00:00:00.000Z") if KST is Nov 14
   */
  fromDate(date: Date): KSTDate {
    const kstDateString = date.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return new Date(kstDateString + 'T00:00:00.000Z') as KSTDate
  },

  /**
   * Parse YYYY-MM-DD string to KST date
   *
   * @param dateStr - Date string in YYYY-MM-DD format
   * @returns Parsed KST date
   * @throws Error if format is invalid
   *
   * @example
   * const date = KSTDate.parse('2025-11-14')
   * // Returns: Date("2025-11-14T00:00:00.000Z")
   */
  parse(dateStr: string): KSTDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`)
    }
    return new Date(dateStr + 'T00:00:00.000Z') as KSTDate
  },

  /**
   * Add or subtract days from a KST date
   *
   * @param date - Base KST date
   * @param days - Number of days to add (negative to subtract)
   * @returns New KST date
   *
   * @example
   * const today = KSTDate.today()
   * const nextWeek = KSTDate.addDays(today, 7)
   * const lastWeek = KSTDate.addDays(today, -7)
   */
  addDays(date: KSTDate, days: number): KSTDate {
    const result = new Date(date)
    result.setUTCDate(result.getUTCDate() + days)
    return result as KSTDate
  },

  /**
   * Format KST date as YYYY-MM-DD
   *
   * @param date - KST date to format
   * @returns Formatted date string
   *
   * @example
   * const today = KSTDate.today()
   * const formatted = KSTDate.format(today)
   * // Returns: "2025-11-14"
   */
  format(date: KSTDate): string {
    return date.toISOString().split('T')[0]
  },

  /**
   * Get date key for comparisons and lookups
   * Same as format(), provided for semantic clarity
   *
   * @param date - KST date
   * @returns Date key (YYYY-MM-DD)
   */
  toKey(date: KSTDate): string {
    return date.toISOString().split('T')[0]
  },

  /**
   * Compare two KST dates for equality (ignores time)
   *
   * @param a - First KST date
   * @param b - Second KST date
   * @returns true if dates are the same calendar day in KST
   */
  equals(a: KSTDate, b: KSTDate): boolean {
    return KSTDate.toKey(a) === KSTDate.toKey(b)
  },

  /**
   * Check if KST date is weekend (Saturday or Sunday)
   *
   * @param date - KST date to check
   * @returns true if weekend
   *
   * @example
   * const date = KSTDate.parse('2025-11-15') // Saturday
   * KSTDate.isWeekend(date) // true
   */
  isWeekend(date: KSTDate): boolean {
    const day = date.getUTCDay()
    return day === 0 || day === 6
  },

  /**
   * Get day of week (0=Sunday, 6=Saturday) in KST
   *
   * @param date - KST date
   * @returns Day of week number
   */
  getDayOfWeek(date: KSTDate): number {
    return date.getUTCDay()
  },

  /**
   * Convert KST date to native Date for compatibility
   * Use sparingly - prefer keeping KSTDate type
   *
   * @param date - KST date
   * @returns Native Date object
   */
  toNativeDate(date: KSTDate): Date {
    return new Date(date)
  },
}

/**
 * KSTDateTime factory functions
 * For operations requiring time-of-day in KST
 */
export const KSTDateTime = {
  /**
   * Get current date and time in KST
   *
   * @returns Current KST timestamp
   *
   * @example
   * const now = KSTDateTime.now()
   * // If KST is 2025-11-14 15:30:45, returns Date representing that time
   */
  now(): KSTDateTime {
    return new Date() as KSTDateTime
  },

  /**
   * Get current KST time as { hour, minute } (24-hour format)
   *
   * @returns Current time in KST
   *
   * @example
   * const { hour, minute } = KSTDateTime.time()
   * // If KST is 15:30, returns { hour: 15, minute: 30 }
   */
  time(): { hour: number; minute: number } {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Seoul',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })
    const [hourStr, minuteStr] = timeStr.split(':')
    return {
      hour: parseInt(hourStr, 10),
      minute: parseInt(minuteStr, 10),
    }
  },

  /**
   * Check if current time is after specified KST time
   *
   * @param hour - Hour (0-23)
   * @param minute - Minute (0-59)
   * @returns true if current KST time is after specified time
   *
   * @example
   * KSTDateTime.isAfterTime(15, 30) // true if KST is after 15:30
   */
  isAfterTime(hour: number, minute: number): boolean {
    const current = KSTDateTime.time()
    if (current.hour > hour) return true
    if (current.hour === hour && current.minute >= minute) return true
    return false
  },

  /**
   * Check if Korean stock market is currently open
   * Market hours: 09:00-15:30 KST, Monday-Friday
   *
   * @returns true if market is open
   *
   * @example
   * if (KSTDateTime.isMarketOpen()) {
   *   // Use real-time prices
   * } else {
   *   // Use closing prices
   * }
   */
  isMarketOpen(): boolean {
    // Check if weekend
    const today = KSTDate.today()
    if (KSTDate.isWeekend(today)) {
      return false
    }

    // Check time range: 09:00-15:30
    const { hour, minute } = KSTDateTime.time()

    // Before 09:00
    if (hour < 9) return false

    // After 15:30
    if (hour > 15) return false
    if (hour === 15 && minute > 30) return false

    return true
  },
}

/**
 * LEGACY COMPATIBILITY EXPORTS
 *
 * These maintain backward compatibility with existing code.
 * Gradually migrate to KSTDate.* equivalents.
 */

/**
 * @deprecated Use KSTDate.today() instead
 */
export function getKSTToday(): Date {
  return KSTDate.today()
}

/**
 * @deprecated Use KSTDate.yesterday() instead
 */
export function getKSTYesterday(): Date {
  return KSTDate.yesterday()
}

/**
 * @deprecated Use KSTDate.fromDate() instead
 */
export function toKSTDateOnly(date: Date): Date {
  return KSTDate.fromDate(date)
}

/**
 * @deprecated Use KSTDate.addDays() instead
 */
export function addKSTDays(date: Date, days: number): Date {
  return KSTDate.addDays(date as KSTDate, days)
}

/**
 * @deprecated Use KSTDate.isWeekend() instead
 */
export function isKSTWeekend(date: Date): boolean {
  return KSTDate.isWeekend(date as KSTDate)
}

/**
 * @deprecated Use KSTDateTime.isAfterTime() instead
 */
export function isAfterKSTTime(hour: number, minute: number): boolean {
  return KSTDateTime.isAfterTime(hour, minute)
}

/**
 * @deprecated Use KSTDateTime.isMarketOpen() instead
 */
export function isMarketOpen(): boolean {
  return KSTDateTime.isMarketOpen()
}

/**
 * @deprecated Use KSTDate.format() instead
 */
export function formatKSTDate(date: Date): string {
  return KSTDate.format(date as KSTDate)
}
