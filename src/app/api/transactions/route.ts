/**
 * GET /api/transactions
 * Get user's transaction history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to view transactions',
          },
        },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const stockCode = searchParams.get('stockCode')
    const type = searchParams.get('type') // BUY or SELL

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (stockCode) {
      where.stockCode = stockCode
    }

    if (type && (type === 'BUY' || type === 'SELL')) {
      where.type = type
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + transactions.length < total,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get transactions API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to retrieve transactions',
        },
      },
      { status: 500 }
    )
  }
}
