/**
 * GET /api/stocks/search?q=query
 * Search stocks by name or code
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/services/stockService'
import { ErrorCodes } from '@/lib/types/api'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get query parameter
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    // Validate query
    if (!query || query.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_MISSING_FIELDS,
            message: 'Search query is required. Use ?q=query parameter.',
          },
        },
        { status: 400 }
      )
    }

    // Search stocks
    const results = await searchStocks(query.trim())

    return NextResponse.json(
      {
        success: true,
        data: results,
      },
      { status: 200 }
    )
  } catch (error) {
    // Log error (sanitized for production)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stock search API error:', errorMessage)

    // Handle KIS API errors
    if (error instanceof Error && error.message.includes('KIS API')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.EXTERNAL_KIS_API_ERROR,
            message: 'Failed to search stocks from external API',
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
          message: 'An error occurred while searching stocks',
        },
      },
      { status: 500 }
    )
  }
}
