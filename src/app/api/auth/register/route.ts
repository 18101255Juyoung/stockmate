import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/services/authService'
import { registerSchema } from '@/lib/utils/validation'
import { ErrorCodes } from '@/lib/types/api'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validatedData = registerSchema.parse(body)

    // Register user
    const result = await registerUser(validatedData)

    if (!result.success) {
      const statusCode =
        result.error.code === ErrorCodes.AUTH_DUPLICATE_EMAIL ||
        result.error.code === ErrorCodes.AUTH_DUPLICATE_USERNAME
          ? 409
          : 400

      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      // Check for specific validation errors
      const emailError = error.errors.find((err) => err.path.includes('email'))
      const passwordError = error.errors.find((err) => err.path.includes('password'))

      if (emailError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_INVALID_EMAIL,
              message: emailError.message,
            },
          },
          { status: 400 }
        )
      }

      if (passwordError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ErrorCodes.VALIDATION_WEAK_PASSWORD,
              message: passwordError.message,
            },
          },
          { status: 400 }
        )
      }

      // Generic validation error
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_MISSING_FIELDS,
            message: error.errors[0]?.message || 'Validation failed',
          },
        },
        { status: 400 }
      )
    }

    console.error('Registration API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An internal error occurred',
        },
      },
      { status: 500 }
    )
  }
}
