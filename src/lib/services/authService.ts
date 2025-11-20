import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { RegisterInput, LoginInput } from '@/lib/utils/validation'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'
import { Prisma, CapitalChangeReason } from '@prisma/client'
import { applyReferralBonus } from '@/lib/services/referralService'

const SALT_ROUNDS = 10

/**
 * Register a new user and create their portfolio
 *
 * @param data - User registration data
 * @returns API response with user data or error
 */
export async function registerUser(
  data: RegisterInput
): Promise<ApiResponse<{ userId: string; email: string; username: string }>> {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS)

    // Create user and portfolio in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          username: data.username,
          displayName: data.displayName,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          createdAt: true,
          initialCapital: true,
        },
      })

      // Create portfolio for the user
      await tx.portfolio.create({
        data: {
          userId: user.id,
          initialCapital: 10000000,
          currentCash: 10000000,
          totalAssets: 10000000,
          totalReturn: 0,
          realizedPL: 0,
          unrealizedPL: 0,
          weeklyStartAssets: 10000000,  // Initialize for period-based rankings
          monthlyStartAssets: 10000000, // Initialize for period-based rankings
        },
      })

      // Create initial capital history record
      await tx.capitalHistory.create({
        data: {
          userId: user.id,
          amount: new Prisma.Decimal(10000000),
          newTotal: new Prisma.Decimal(10000000),
          reason: CapitalChangeReason.INITIAL,
          description: 'Initial capital from account creation',
        },
      })

      return user
    })

    // Apply referral bonus if referral code was provided (trim and check for empty string)
    const trimmedReferralCode = data.referralCode?.trim()
    if (trimmedReferralCode && trimmedReferralCode !== '') {
      const referralResult = await applyReferralBonus(result.id, trimmedReferralCode)

      if (!referralResult.success) {
        console.warn(
          `Referral bonus failed for user ${result.username}:`,
          referralResult.error
        )
        // Don't fail registration if referral fails, just log it
      } else {
        console.log(
          `✅ Referral bonus applied for user ${result.username} using code ${trimmedReferralCode}`
        )
      }
    }

    return {
      success: true,
      data: {
        userId: result.id,
        email: result.email,
        username: result.username,
      },
    }
  } catch (error) {
    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || []
        const errorMessage = error.message || ''

        // Check target array or parse error message as fallback
        if (target.includes('email') || errorMessage.toLowerCase().includes('email')) {
          return {
            success: false,
            error: {
              code: ErrorCodes.AUTH_DUPLICATE_EMAIL,
              message: 'An account with this email already exists',
            },
          }
        }
        if (target.includes('username') || errorMessage.toLowerCase().includes('username')) {
          return {
            success: false,
            error: {
              code: ErrorCodes.AUTH_DUPLICATE_USERNAME,
              message: 'This username is already taken',
            },
          }
        }

        // If we can't determine which field, check what exists in the database
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ email: data.email }, { username: data.username }],
          },
          select: { email: true, username: true },
        })

        if (existingUser) {
          if (existingUser.email === data.email) {
            return {
              success: false,
              error: {
                code: ErrorCodes.AUTH_DUPLICATE_EMAIL,
                message: 'An account with this email already exists',
              },
            }
          }
          if (existingUser.username === data.username) {
            return {
              success: false,
              error: {
                code: ErrorCodes.AUTH_DUPLICATE_USERNAME,
                message: 'This username is already taken',
              },
            }
          }
        }

        // Generic unique constraint error
        return {
          success: false,
          error: {
            code: ErrorCodes.AUTH_DUPLICATE_EMAIL,
            message: 'An account with this email or username already exists',
          },
        }
      }
    }

    // Generic error
    console.error('Registration error:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An error occurred during registration',
      },
    }
  }
}

/**
 * Authenticate a user with email and password
 *
 * @param data - User login data (email and password)
 * @returns API response with user data or error
 */
export async function loginUser(
  data: LoginInput
): Promise<ApiResponse<{ userId: string; email: string; username: string; displayName: string }>> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        password: true,
      },
    })

    if (!user) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password)

    if (!isValidPassword) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
      }
    }

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'An error occurred during login',
      },
    }
  }
}
