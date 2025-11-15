/**
 * Portfolio Snapshot Service
 * Handles daily portfolio snapshots for period-based ranking calculations
 * Creates snapshots to track portfolio performance over time
 */

import { prisma } from '@/lib/prisma'
import { RankingPeriod, PortfolioSnapshot } from '@prisma/client'
import { KSTDate, type KSTDate as KSTDateType } from '@/lib/utils/kst-date'

/**
 * Create or update a daily snapshot of a portfolio
 * Uses upsert to prevent duplicate snapshots for the same day
 *
 * @param portfolioId - Portfolio ID
 * @param date - Snapshot date (defaults to today)
 * @returns Created or updated snapshot
 */
export async function createDailySnapshot(
  portfolioId: string,
  date?: Date
): Promise<PortfolioSnapshot> {
  try {
    // Default to today if no date provided
    // Normalize date to midnight in KST (remove time component)
    const snapshotDate = date ? KSTDate.fromDate(date) : KSTDate.today()

    // Get current portfolio data
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    })

    if (!portfolio) {
      throw new Error('Portfolio not found')
    }

    // Upsert snapshot (create or update if exists)
    const snapshot = await prisma.portfolioSnapshot.upsert({
      where: {
        portfolioId_date: {
          portfolioId,
          date: snapshotDate,
        },
      },
      update: {
        totalAssets: portfolio.totalAssets,
        totalReturn: portfolio.totalReturn,
        currentCash: portfolio.currentCash,
      },
      create: {
        portfolioId,
        date: snapshotDate,
        totalAssets: portfolio.totalAssets,
        totalReturn: portfolio.totalReturn,
        currentCash: portfolio.currentCash,
      },
    })

    return snapshot
  } catch (error) {
    console.error(`Failed to create daily snapshot for portfolio ${portfolioId}:`, error)
    throw error
  }
}

/**
 * Get a snapshot by portfolio ID and date
 *
 * @param portfolioId - Portfolio ID
 * @param date - Snapshot date
 * @returns Snapshot or null if not found
 */
export async function getSnapshotByDate(
  portfolioId: string,
  date: Date
): Promise<PortfolioSnapshot | null> {
  try {
    // Normalize date to midnight in KST
    const snapshotDate = KSTDate.fromDate(date)

    const snapshot = await prisma.portfolioSnapshot.findUnique({
      where: {
        portfolioId_date: {
          portfolioId,
          date: snapshotDate,
        },
      },
    })

    return snapshot
  } catch (error) {
    console.error(
      `Failed to get snapshot for portfolio ${portfolioId} on ${date}:`,
      error
    )
    throw error
  }
}

/**
 * Calculate period-based return for a portfolio
 * Compares current total assets with assets from the start of the period
 *
 * @param portfolioId - Portfolio ID
 * @param period - Ranking period (DAILY, WEEKLY, MONTHLY, ALL_TIME)
 * @returns Return percentage for the period
 */
export async function calculatePeriodReturn(
  portfolioId: string,
  period: RankingPeriod
): Promise<number> {
  try {
    // Determine date range based on period
    const now = KSTDate.today()
    let startDate: KSTDateType | null = null

    switch (period) {
      case RankingPeriod.WEEKLY:
        // 7 days ago
        startDate = KSTDate.addDays(now, -7)
        break
      case RankingPeriod.MONTHLY:
        // 30 days ago
        startDate = KSTDate.addDays(now, -30)
        break
      case RankingPeriod.ALL_TIME:
        // No start date filter for ALL_TIME
        startDate = null
        break
    }

    // For ALL_TIME, return the latest snapshot's totalReturn
    if (period === RankingPeriod.ALL_TIME) {
      const latestSnapshot = await prisma.portfolioSnapshot.findMany({
        where: { portfolioId },
        orderBy: { date: 'desc' },
        take: 1,
      })

      if (latestSnapshot.length === 0) {
        return 0
      }

      return latestSnapshot[0].totalReturn
    }

    // For period-based calculations, get snapshots
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId,
        date: {
          gte: startDate || undefined,
        },
      },
      orderBy: { date: 'asc' },
    })

    // Handle cases with insufficient snapshots
    if (snapshots.length === 0) {
      // No snapshots at all - return 0%
      return 0
    }

    if (snapshots.length === 1) {
      // Single snapshot (new user case) - compare with initial capital
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        select: { initialCapital: true },
      })

      if (!portfolio || portfolio.initialCapital === 0) {
        return 0
      }

      const currentSnapshot = snapshots[0]
      const currentAssets = currentSnapshot.totalAssets

      // Calculate return based on initial capital
      // Example: initialCapital = 10,000,000, currentAssets = 10,500,000 → 5%
      return ((currentAssets - portfolio.initialCapital) / portfolio.initialCapital) * 100
    }

    // Get oldest and newest snapshots in the period (2+ snapshots)
    const oldestSnapshot = snapshots[0]
    const newestSnapshot = snapshots[snapshots.length - 1]

    // Calculate return percentage
    const oldAssets = oldestSnapshot.totalAssets
    const newAssets = newestSnapshot.totalAssets

    if (oldAssets === 0) {
      return 0
    }

    const returnPercentage = ((newAssets - oldAssets) / oldAssets) * 100

    return returnPercentage
  } catch (error) {
    console.error(
      `Failed to calculate period return for portfolio ${portfolioId}:`,
      error
    )
    throw error
  }
}

/**
 * Create snapshots for all portfolios
 * Used by cron job to create daily snapshots
 *
 * @param date - Snapshot date (defaults to today)
 * @returns Array of created snapshots
 */
export async function createAllDailySnapshots(
  date?: Date
): Promise<PortfolioSnapshot[]> {
  try {
    // Get all portfolios
    const portfolios = await prisma.portfolio.findMany({
      select: { id: true },
    })

    // Create snapshots for each portfolio
    const snapshots = await Promise.all(
      portfolios.map((portfolio) => createDailySnapshot(portfolio.id, date))
    )

    return snapshots
  } catch (error) {
    console.error('Failed to create daily snapshots for all portfolios:', error)
    throw error
  }
}

/**
 * Get snapshots for a portfolio in a date range
 * Useful for charting and analysis
 *
 * @param portfolioId - Portfolio ID
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of snapshots
 */
export async function getSnapshotsInRange(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<PortfolioSnapshot[]> {
  try {
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        portfolioId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    return snapshots
  } catch (error) {
    console.error(
      `Failed to get snapshots for portfolio ${portfolioId} in range:`,
      error
    )
    throw error
  }
}
