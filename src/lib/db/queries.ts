/**
 * Database Query Helpers - Timezone-Safe Prisma Queries
 *
 * CRITICAL: This file provides helpers to build Prisma queries with KST dates.
 *
 * WHY THIS EXISTS:
 * Prisma accepts raw Date objects in where clauses, making it easy to
 * accidentally pass timezone-incorrect dates. These helpers ensure all
 * date queries use properly normalized KST dates.
 *
 * RULES:
 * 1. ALWAYS use DateQuery.* for date filtering in Prisma queries
 * 2. NEVER build date ranges manually
 * 3. Pass only KSTDate objects to these helpers
 */

import { Prisma } from '@prisma/client'
import { KSTDate } from '../utils/kst-date'

/**
 * Date query builder for Prisma
 *
 * Provides type-safe, timezone-aware date filtering for Prisma queries
 */
export const DateQuery = {
  /**
   * Query for records on a specific KST date
   *
   * Matches records where the DateTime field is between 00:00:00 and 23:59:59
   * on the specified KST date.
   *
   * @param date - KST date to query
   * @returns Prisma DateTimeFilter for the entire day
   *
   * @example
   * // Find all transactions on November 14, 2025 (KST)
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.onDate(KSTDate.parse('2025-11-14'))
   *   }
   * })
   */
  onDate(date: KSTDate): Prisma.DateTimeFilter {
    const start = date
    const end = KSTDate.addDays(date, 1)
    return {
      gte: start,
      lt: end,
    }
  },

  /**
   * Query for records on or after a KST date
   *
   * Matches records where DateTime >= date (00:00:00 in KST)
   *
   * @param date - Minimum KST date (inclusive)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Find transactions from November 14 onwards
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.onOrAfter(KSTDate.parse('2025-11-14'))
   *   }
   * })
   */
  onOrAfter(date: KSTDate): Prisma.DateTimeFilter {
    return { gte: date }
  },

  /**
   * Query for records before a KST date
   *
   * Matches records where DateTime < date (00:00:00 in KST)
   *
   * @param date - Maximum KST date (exclusive)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Find transactions before November 14
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.before(KSTDate.parse('2025-11-14'))
   *   }
   * })
   */
  before(date: KSTDate): Prisma.DateTimeFilter {
    return { lt: date }
  },

  /**
   * Query for records on or before a KST date
   *
   * Matches records where DateTime <= end of date (23:59:59 in KST)
   *
   * @param date - Maximum KST date (inclusive)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Find transactions up to and including November 14
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.onOrBefore(KSTDate.parse('2025-11-14'))
   *   }
   * })
   */
  onOrBefore(date: KSTDate): Prisma.DateTimeFilter {
    const endOfDay = KSTDate.addDays(date, 1)
    return { lt: endOfDay }
  },

  /**
   * Query for records between two KST dates
   *
   * Matches records where start (00:00:00) <= DateTime < end (00:00:00)
   *
   * @param start - Start KST date (inclusive)
   * @param end - End KST date (exclusive)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Find transactions from Nov 1 to Nov 14 (Nov 14 not included)
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.between(
   *       KSTDate.parse('2025-11-01'),
   *       KSTDate.parse('2025-11-14')
   *     )
   *   }
   * })
   */
  between(start: KSTDate, end: KSTDate): Prisma.DateTimeFilter {
    return {
      gte: start,
      lt: end,
    }
  },

  /**
   * Query for records between two KST dates (inclusive)
   *
   * Matches records where start (00:00:00) <= DateTime <= end (23:59:59)
   *
   * @param start - Start KST date (inclusive)
   * @param end - End KST date (inclusive)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Find transactions from Nov 1 to Nov 14 (both included)
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.betweenInclusive(
   *       KSTDate.parse('2025-11-01'),
   *       KSTDate.parse('2025-11-14')
   *     )
   *   }
   * })
   */
  betweenInclusive(start: KSTDate, end: KSTDate): Prisma.DateTimeFilter {
    const endPlusOne = KSTDate.addDays(end, 1)
    return {
      gte: start,
      lt: endPlusOne,
    }
  },

  /**
   * Query for today's records (KST)
   *
   * @returns Prisma DateTimeFilter for today
   *
   * @example
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.today()
   *   }
   * })
   */
  today(): Prisma.DateTimeFilter {
    return DateQuery.onDate(KSTDate.today())
  },

  /**
   * Query for yesterday's records (KST)
   *
   * @returns Prisma DateTimeFilter for yesterday
   */
  yesterday(): Prisma.DateTimeFilter {
    return DateQuery.onDate(KSTDate.yesterday())
  },

  /**
   * Query for records in the last N days (inclusive of today)
   *
   * @param days - Number of days to look back (including today)
   * @returns Prisma DateTimeFilter
   *
   * @example
   * // Last 7 days including today
   * await prisma.transaction.findMany({
   *   where: {
   *     createdAt: DateQuery.lastNDays(7)
   *   }
   * })
   */
  lastNDays(days: number): Prisma.DateTimeFilter {
    const today = KSTDate.today()
    const start = KSTDate.addDays(today, -days + 1)
    return DateQuery.betweenInclusive(start, today)
  },
}

/**
 * COMMON QUERY PATTERNS
 *
 * Pre-built queries for common use cases
 */

/**
 * Get transactions for a specific KST date
 */
export async function getTransactionsOnDate(
  prisma: any,
  userId: string,
  date: KSTDate
) {
  return prisma.transaction.findMany({
    where: {
      userId,
      createdAt: DateQuery.onDate(date),
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get portfolio snapshot for a specific KST date
 */
export async function getPortfolioSnapshotOnDate(
  prisma: any,
  userId: string,
  date: KSTDate
) {
  return prisma.portfolioSnapshot.findUnique({
    where: {
      userId_snapshotDate: {
        userId,
        snapshotDate: date,
      },
    },
  })
}

/**
 * Get stock price history for a KST date
 */
export async function getStockPriceOnDate(
  prisma: any,
  stockCode: string,
  date: KSTDate
) {
  return prisma.stockPriceHistory.findUnique({
    where: {
      stockCode_date: {
        stockCode,
        date,
      },
    },
  })
}

/**
 * Get portfolio analysis for a KST date
 */
export async function getPortfolioAnalysisOnDate(
  prisma: any,
  userId: string,
  date: KSTDate
) {
  return prisma.portfolioAnalysis.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  })
}
