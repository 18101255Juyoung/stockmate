/**
 * POST /api/ai/generate
 * Manually generate AI analysis for a specific date
 * - Stage 1: Market analysis (if not exists)
 * - Stage 2: Personalized analysis
 * Works even without transactions on that date (uses portfolio holdings)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ErrorCodes } from '@/lib/types/api'
import { generateMarketAnalysis, generatePersonalizedAnalysis } from '@/lib/services/aiAdvisorService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'You must be logged in to generate AI analysis',
          },
        },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body = await request.json()
    const { date: dateStr } = body

    if (!dateStr) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Date parameter is required (YYYY-MM-DD format)',
          },
        },
        { status: 400 }
      )
    }

    // Parse date
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_INVALID_INPUT,
            message: 'Invalid date format. Use YYYY-MM-DD',
          },
        },
        { status: 400 }
      )
    }

    // 3. Check if analysis already exists
    const existingPersonalAnalysis = await prisma.aIAnalysis.findUnique({
      where: {
        userId_analysisDate: {
          userId: session.user.id,
          analysisDate: date,
        },
      },
    })

    const existingMarketAnalysis = await prisma.marketAnalysis.findUnique({
      where: {
        date: date,
      },
    })

    // If both exist, return them
    if (existingPersonalAnalysis && existingMarketAnalysis) {
      return NextResponse.json({
        success: true,
        data: {
          marketAnalysis: {
            summary: existingMarketAnalysis.summary,
            analysis: existingMarketAnalysis.analysis,
          },
          personalAnalysis: {
            summary: existingPersonalAnalysis.summary,
            response: existingPersonalAnalysis.response,
          },
          alreadyExists: true,
        },
      })
    }

    // 4. Check if user has portfolio
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        portfolio: {
          include: {
            holdings: true,
          },
        },
        transactions: {
          where: {
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0),
            },
          },
        },
      },
    })

    if (!user?.portfolio) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_PORTFOLIO',
            message: '포트폴리오가 생성되지 않았습니다. 먼저 거래를 시작해주세요.',
          },
        },
        { status: 400 }
      )
    }

    // Check if there's anything to analyze (holdings or transactions on that date)
    const hasHoldings = user.portfolio.holdings.length > 0
    const hasTransactions = user.transactions.length > 0

    if (!hasHoldings && !hasTransactions) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_DATA',
            message: '해당 날짜에 거래나 보유 종목이 없어 분석할 수 없습니다.',
          },
        },
        { status: 400 }
      )
    }

    // 5. Generate market analysis if not exists
    let marketAnalysis = existingMarketAnalysis
    if (!marketAnalysis) {
      console.log(`🤖 [AI Generate] Creating market analysis for ${dateStr}...`)
      try {
        marketAnalysis = await generateMarketAnalysis(date)
        console.log(`✅ [AI Generate] Market analysis created`)
      } catch (error) {
        console.error('❌ [AI Generate] Failed to create market analysis:', error)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_GENERATION_FAILED',
              message: '시장 분석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            },
          },
          { status: 500 }
        )
      }
    }

    // 6. Generate personalized analysis
    let personalAnalysis = existingPersonalAnalysis
    if (!personalAnalysis) {
      console.log(`🤖 [AI Generate] Creating personalized analysis for user ${session.user.id}...`)
      try {
        personalAnalysis = await generatePersonalizedAnalysis(
          session.user.id,
          date,
          marketAnalysis
        )
        console.log(`✅ [AI Generate] Personalized analysis created`)
      } catch (error) {
        console.error('❌ [AI Generate] Failed to create personalized analysis:', error)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'AI_GENERATION_FAILED',
              message: '개인 분석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            },
          },
          { status: 500 }
        )
      }
    }

    // 7. Return generated analysis
    return NextResponse.json({
      success: true,
      data: {
        marketAnalysis: {
          summary: marketAnalysis.summary,
          analysis: marketAnalysis.analysis,
        },
        personalAnalysis: {
          summary: personalAnalysis.summary,
          response: personalAnalysis.response,
        },
        tokensUsed: personalAnalysis.tokensUsed,
        cost: personalAnalysis.cost,
        alreadyExists: false,
      },
    })
  } catch (error) {
    console.error('❌ [AI Generate] Unexpected error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'An unexpected error occurred while generating AI analysis',
        },
      },
      { status: 500 }
    )
  }
}
