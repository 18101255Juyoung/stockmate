import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/services/authService'
import { loginSchema } from '@/lib/utils/validation'
import { ErrorCodes } from '@/lib/types/api'

/**
 * POST /api/auth/login
 * Authenticate a user with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      const errorCode = firstError.path.includes('email')
        ? ErrorCodes.VALIDATION_INVALID_EMAIL
        : ErrorCodes.VALIDATION_MISSING_FIELDS

      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: firstError.message,
          },
        },
        { status: 400 }
      )
    }

    // Call the login service
    const result = await loginUser(validationResult.data)

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCode =
        result.error.code === ErrorCodes.AUTH_INVALID_CREDENTIALS ? 401 : 500

      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An error occurred during login',
        },
      },
      { status: 500 }
    )
  }
}
