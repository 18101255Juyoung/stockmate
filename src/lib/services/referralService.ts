/**
 * Referral System Service
 *
 * Handles referral code validation and bonus distribution:
 * - Validates referral codes during signup
 * - Distributes +3,000,000 KRW bonus to both referrer and new user
 * - Prevents self-referral and duplicate usage
 * - Creates CapitalHistory records for tracking
 */

import { prisma } from '@/lib/prisma'
import { CapitalChangeReason, Prisma } from '@prisma/client'
import { updatePortfolioMetrics } from '@/lib/services/portfolioService'

/**
 * Referral bonus amount: 3,000,000 KRW
 */
export const REFERRAL_BONUS = 3_000_000

/**
 * Validate a referral code
 *
 * @param referralCode Referral code to validate
 * @returns Validation result with referrer info if valid
 */
export async function validateReferralCode(
  referralCode: string
): Promise<{
  valid: boolean
  referrerId?: string
  referrerUsername?: string
  error?: string
}> {
  try {
    // Find user with this referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        username: true,
      },
    })

    if (!referrer) {
      return {
        valid: false,
        error: 'Invalid referral code',
      }
    }

    return {
      valid: true,
      referrerId: referrer.id,
      referrerUsername: referrer.username,
    }
  } catch (error) {
    console.error('Referral code validation error:', error)
    return {
      valid: false,
      error: 'Failed to validate referral code',
    }
  }
}

/**
 * Apply referral bonus to both referrer and new user
 *
 * This should be called during user signup, after the new user is created.
 * Both users receive +3,000,000 KRW added to their initial capital.
 *
 * @param newUserId New user ID
 * @param referralCode Referral code used by new user
 * @returns Success status and details
 */
export async function applyReferralBonus(
  newUserId: string,
  referralCode: string
): Promise<{
  success: boolean
  referrerBonus?: number
  newUserBonus?: number
  error?: string
}> {
  try {
    // Validate referral code
    const validation = await validateReferralCode(referralCode)

    if (!validation.valid || !validation.referrerId) {
      return {
        success: false,
        error: validation.error || 'Invalid referral code',
      }
    }

    const referrerId = validation.referrerId

    // Prevent self-referral
    if (referrerId === newUserId) {
      return {
        success: false,
        error: 'Cannot use your own referral code',
      }
    }

    // Check if new user already used a referral code
    const newUser = await prisma.user.findUnique({
      where: { id: newUserId },
      select: { referredBy: true },
    })

    if (!newUser) {
      return {
        success: false,
        error: 'New user not found',
      }
    }

    if (newUser.referredBy) {
      return {
        success: false,
        error: 'Referral code already used',
      }
    }

    // Apply bonuses in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update referrer's initial capital
      const referrer = await tx.user.findUnique({
        where: { id: referrerId },
        select: { initialCapital: true, username: true },
      })

      if (!referrer) {
        throw new Error('Referrer not found')
      }

      const referrerCurrentCapital = parseFloat(referrer.initialCapital.toString())
      const referrerNewTotal = referrerCurrentCapital + REFERRAL_BONUS

      await tx.user.update({
        where: { id: referrerId },
        data: {
          initialCapital: new Prisma.Decimal(referrerNewTotal),
        },
      })

      // Update referrer's portfolio to match (totalAssets will be recalculated)
      await tx.portfolio.update({
        where: { userId: referrerId },
        data: {
          initialCapital: referrerNewTotal,
          currentCash: { increment: REFERRAL_BONUS },
        },
      })

      // 2. Create capital history for referrer
      await tx.capitalHistory.create({
        data: {
          userId: referrerId,
          amount: new Prisma.Decimal(REFERRAL_BONUS),
          newTotal: new Prisma.Decimal(referrerNewTotal),
          reason: CapitalChangeReason.REFERRAL_GIVEN,
          description: `Referral bonus for inviting new user`,
        },
      })

      // 3. Update new user's initial capital and referral link
      const newUserData = await tx.user.findUnique({
        where: { id: newUserId },
        select: { initialCapital: true, username: true },
      })

      if (!newUserData) {
        throw new Error('New user not found')
      }

      const newUserCurrentCapital = parseFloat(newUserData.initialCapital.toString())
      const newUserNewTotal = newUserCurrentCapital + REFERRAL_BONUS

      await tx.user.update({
        where: { id: newUserId },
        data: {
          initialCapital: new Prisma.Decimal(newUserNewTotal),
          referredBy: referralCode, // Link to referrer
        },
      })

      // Update new user's portfolio to match (totalAssets will be recalculated)
      await tx.portfolio.update({
        where: { userId: newUserId },
        data: {
          initialCapital: newUserNewTotal,
          currentCash: { increment: REFERRAL_BONUS },
        },
      })

      // 4. Create capital history for new user
      await tx.capitalHistory.create({
        data: {
          userId: newUserId,
          amount: new Prisma.Decimal(REFERRAL_BONUS),
          newTotal: new Prisma.Decimal(newUserNewTotal),
          reason: CapitalChangeReason.REFERRAL_USED,
          description: `Referral bonus for using referral code`,
        },
      })

      console.log(
        `✅ Referral bonus applied: ${referrer.username} (+${REFERRAL_BONUS}) ← ${newUserData.username} (+${REFERRAL_BONUS})`
      )
    })

    // Recalculate portfolio metrics for both users (totalAssets, totalReturn, unrealizedPL)
    const [referrerPortfolio, newUserPortfolio] = await Promise.all([
      prisma.portfolio.findUnique({
        where: { userId: referrerId },
        select: { id: true },
      }),
      prisma.portfolio.findUnique({
        where: { userId: newUserId },
        select: { id: true },
      }),
    ])

    if (referrerPortfolio && newUserPortfolio) {
      await Promise.all([
        updatePortfolioMetrics(referrerPortfolio.id),
        updatePortfolioMetrics(newUserPortfolio.id),
      ])
    }

    return {
      success: true,
      referrerBonus: REFERRAL_BONUS,
      newUserBonus: REFERRAL_BONUS,
    }
  } catch (error) {
    console.error('Failed to apply referral bonus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get referral statistics for a user
 *
 * @param userId User ID
 * @returns Referral stats
 */
export async function getReferralStats(userId: string): Promise<{
  referralCode: string
  totalReferrals: number
  totalBonus: number
  referrals: Array<{
    username: string
    displayName: string
    createdAt: Date
  }>
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referrals: {
          select: {
            username: true,
            displayName: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      referralCode: user.referralCode || '',
      totalReferrals: user.referrals.length,
      totalBonus: user.referrals.length * REFERRAL_BONUS,
      referrals: user.referrals,
    }
  } catch (error) {
    console.error('Failed to get referral stats:', error)
    throw error
  }
}

/**
 * Get top referrers (leaderboard)
 *
 * @param limit Number of top referrers to return
 * @returns Top referrers with stats
 */
export async function getTopReferrers(limit: number = 10): Promise<
  Array<{
    userId: string
    username: string
    displayName: string
    referralCount: number
    totalBonus: number
  }>
> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        _count: {
          select: {
            referrals: true,
          },
        },
      },
      orderBy: {
        referrals: {
          _count: 'desc',
        },
      },
      take: limit,
    })

    return users.map((user) => ({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      referralCount: user._count.referrals,
      totalBonus: user._count.referrals * REFERRAL_BONUS,
    }))
  } catch (error) {
    console.error('Failed to get top referrers:', error)
    throw error
  }
}
