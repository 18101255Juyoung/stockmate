/**
 * POST /api/transactions/sell
 * Execute a sell order
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeSell } from '@/lib/services/tradingService'
import { ErrorCodes } from '@/lib/types/api'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to trade',
          },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { stockCode, quantity, note } = body

    // Validate input
    if (!stockCode || typeof stockCode !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Stock code is required',
          },
        },
        { status: 400 }
      )
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Quantity must be a positive number',
          },
        },
        { status: 400 }
      )
    }

    // Execute sell order
    const result = await executeSell(session.user.id, stockCode, quantity, note)

    if (!result.success) {
      const statusCode =
        result.error.code === ErrorCodes.TRADING_INSUFFICIENT_QUANTITY ||
        result.error.code === ErrorCodes.TRADING_STOCK_NOT_OWNED
          ? 400
          : result.error.code === ErrorCodes.NOT_FOUND
          ? 404
          : 500

      return NextResponse.json(result, { status: statusCode })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Sell transaction API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to process sell transaction',
        },
      },
      { status: 500 }
    )
  }
}
