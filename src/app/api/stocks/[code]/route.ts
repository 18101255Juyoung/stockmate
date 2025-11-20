/**
 * GET /api/stocks/[code]
 * Get stock price information by stock code
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStockPrice } from '@/lib/services/stockService'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
): Promise<NextResponse> {
  try {
    const { code } = params

    // Validate stock code
    if (!code || code.trim() === '') {
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

    // Get stock price from service
    const stockPrice = await getStockPrice(code.trim())

    return NextResponse.json(
      {
        success: true,
        data: stockPrice,
      },
      { status: 200 }
    )
  } catch (error) {
    // Log error (sanitized for production)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stock price API error:', errorMessage)

    // Handle invalid stock code error
    if (error instanceof Error && error.message.includes('Invalid stock code')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.STOCK_NOT_FOUND,
            message: `Stock not found: ${params.code}`,
          },
        },
        { status: 404 }
      )
    }

    // Handle KIS API errors
    if (error instanceof Error && error.message.includes('KIS API')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.EXTERNAL_KIS_API_ERROR,
            message: 'Failed to fetch stock data from external API',
          },
        },
        { status: 500 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An error occurred while fetching stock price',
        },
      },
      { status: 500 }
    )
  }
}
