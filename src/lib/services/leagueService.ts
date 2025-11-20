/**
 * League Classification Service
 *
 * Handles league classification logic for users based on their total assets.
 * - ROOKIE: totalAssets < 100,000,000 KRW
 * - HALL_OF_FAME: totalAssets >= 100,000,000 KRW
 *
 * Classification runs daily at 00:00 based on previous day's 23:59 snapshot.
 */

import { prisma } from '@/lib/prisma'
import { League } from '@prisma/client'

/**
 * League threshold: 100,000,000 KRW (1억 원)
 */
export const LEAGUE_THRESHOLD = 100_000_000

/**
 * Classify a single user into appropriate league based on total assets
 *
 * @param userId User ID to classify
 * @param totalAssets Current total assets (if known, otherwise fetches from portfolio)
 * @returns New league assignment
 */
export async function classifyUserLeague(
  userId: string,
  totalAssets?: number
): Promise<League> {
  // If totalAssets not provided, fetch from portfolio
  if (totalAssets === undefined) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      select: { totalAssets: true },
    })

    if (!portfolio) {
      // No portfolio yet - default to ROOKIE
      return League.ROOKIE
    }

    totalAssets = portfolio.totalAssets
  }

  // Classify based on threshold
  const newLeague = totalAssets >= LEAGUE_THRESHOLD ? League.HALL_OF_FAME : League.ROOKIE

  return newLeague
}

/**
 * Update user's league if it has changed
 *
 * @param userId User ID
 * @param newLeague New league to assign
 * @returns True if league was changed, false if no change
 */
export async function updateUserLeague(
  userId: string,
  newLeague: League
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { league: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  // Check if league changed
  if (user.league === newLeague) {
    return false // No change
  }

  // Update league
  await prisma.user.update({
    where: { id: userId },
    data: {
      league: newLeague,
      leagueUpdatedAt: new Date(),
    },
  })

  return true // League changed
}

/**
 * Classify and update a single user's league
 *
 * @param userId User ID
 * @param totalAssets Optional total assets (otherwise fetches from portfolio)
 * @returns Object with league info and whether it changed
 */
export async function classifyAndUpdateUserLeague(
  userId: string,
  totalAssets?: number
): Promise<{
  userId: string
  previousLeague: League
  newLeague: League
  changed: boolean
  totalAssets: number
}> {
  // Get current league
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { league: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const previousLeague = user.league

  // Classify based on assets
  const newLeague = await classifyUserLeague(userId, totalAssets)

  // Update if changed
  const changed = await updateUserLeague(userId, newLeague)

  // Get final total assets
  if (totalAssets === undefined) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      select: { totalAssets: true },
    })
    totalAssets = portfolio?.totalAssets || 0
  }

  return {
    userId,
    previousLeague,
    newLeague,
    changed,
    totalAssets,
  }
}

/**
 * Classify all users into appropriate leagues
 *
 * This should run daily at 00:00 based on previous day's portfolio values.
 * Uses the most recent portfolio snapshot or current portfolio state.
 *
 * @returns Summary of classification results
 */
export async function classifyAllUserLeagues(): Promise<{
  totalUsers: number
  classified: number
  errors: number
  rookieCount: number
  hallOfFameCount: number
  promoted: number // ROOKIE -> HALL_OF_FAME
  demoted: number // HALL_OF_FAME -> ROOKIE
  unchanged: number
  details: Array<{
    userId: string
    username: string
    previousLeague: League
    newLeague: League
    totalAssets: number
    changed: boolean
  }>
}> {
  console.log('\n🏆 [League Classification] Starting daily classification...')

  const results = {
    totalUsers: 0,
    classified: 0,
    errors: 0,
    rookieCount: 0,
    hallOfFameCount: 0,
    promoted: 0,
    demoted: 0,
    unchanged: 0,
    details: [] as Array<{
      userId: string
      username: string
      previousLeague: League
      newLeague: League
      totalAssets: number
      changed: boolean
    }>,
  }

  try {
    // Get all users with their portfolios
    const users = await prisma.user.findMany({
      include: {
        portfolio: {
          select: {
            totalAssets: true,
          },
        },
      },
    })

    results.totalUsers = users.length
    console.log(`  📊 Found ${users.length} users to classify`)

    for (const user of users) {
      try {
        const totalAssets = user.portfolio?.totalAssets || 0
        const previousLeague = user.league

        // Classify and update
        const result = await classifyAndUpdateUserLeague(user.id, totalAssets)

        // Track statistics
        results.classified++

        if (result.newLeague === League.ROOKIE) {
          results.rookieCount++
        } else {
          results.hallOfFameCount++
        }

        if (result.changed) {
          if (
            result.previousLeague === League.ROOKIE &&
            result.newLeague === League.HALL_OF_FAME
          ) {
            results.promoted++
            console.log(
              `  ⬆️  ${user.username}: ROOKIE -> HALL_OF_FAME (₩${totalAssets.toLocaleString()})`
            )
          } else if (
            result.previousLeague === League.HALL_OF_FAME &&
            result.newLeague === League.ROOKIE
          ) {
            results.demoted++
            console.log(
              `  ⬇️  ${user.username}: HALL_OF_FAME -> ROOKIE (₩${totalAssets.toLocaleString()})`
            )
          }
        } else {
          results.unchanged++
        }

        // Add to details
        results.details.push({
          userId: user.id,
          username: user.username,
          previousLeague: result.previousLeague,
          newLeague: result.newLeague,
          totalAssets: result.totalAssets,
          changed: result.changed,
        })
      } catch (error) {
        console.error(`  ❌ Failed to classify user ${user.username}:`, error)
        results.errors++
      }
    }

    console.log(`\n✅ League classification completed:`)
    console.log(`   📊 Total: ${results.totalUsers}`)
    console.log(`   ✅ Classified: ${results.classified}`)
    console.log(`   🆕 Rookie: ${results.rookieCount}`)
    console.log(`   🏆 Hall of Fame: ${results.hallOfFameCount}`)
    console.log(`   ⬆️  Promoted: ${results.promoted}`)
    console.log(`   ⬇️  Demoted: ${results.demoted}`)
    console.log(`   ➡️  Unchanged: ${results.unchanged}`)
    if (results.errors > 0) {
      console.log(`   ❌ Errors: ${results.errors}`)
    }
    console.log()
  } catch (error) {
    console.error('❌ League classification failed:', error)
    throw error
  }

  return results
}

/**
 * Get league statistics
 *
 * @returns Current league distribution
 */
export async function getLeagueStats(): Promise<{
  total: number
  rookie: number
  hallOfFame: number
  averageRookieAssets: number
  averageHallAssets: number
}> {
  const [total, rookie, hallOfFame, rookieAssets, hallAssets] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { league: League.ROOKIE } }),
    prisma.user.count({ where: { league: League.HALL_OF_FAME } }),
    prisma.user.findMany({
      where: { league: League.ROOKIE },
      select: { portfolio: { select: { totalAssets: true } } },
    }),
    prisma.user.findMany({
      where: { league: League.HALL_OF_FAME },
      select: { portfolio: { select: { totalAssets: true } } },
    }),
  ])

  const avgRookieAssets =
    rookieAssets.reduce((sum, u) => sum + (u.portfolio?.totalAssets || 0), 0) /
    (rookie || 1)

  const avgHallAssets =
    hallAssets.reduce((sum, u) => sum + (u.portfolio?.totalAssets || 0), 0) /
    (hallOfFame || 1)

  return {
    total,
    rookie,
    hallOfFame,
    averageRookieAssets: avgRookieAssets,
    averageHallAssets: avgHallAssets,
  }
}
