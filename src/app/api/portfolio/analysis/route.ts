/**
 * Portfolio Analysis API
 * GET /api/portfolio/analysis - 현재 사용자의 최신 또는 특정 날짜 분석 조회
 * POST /api/portfolio/analysis/generate - 수동 분석 생성 (테스트용)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { generatePortfolioAnalysis } from '@/lib/services/portfolioAnalysisService'

const prisma = new PrismaClient()

/**
 * GET /api/portfolio/analysis
 * Query params:
 * - date: YYYY-MM-DD (optional, default: today)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // 2. 날짜 파라미터
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const date = dateStr ? new Date(dateStr) : new Date()
    date.setHours(0, 0, 0, 0)

    // 3. 분석 조회
    const analysis = await prisma.portfolioAnalysis.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
    })

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: '해당 날짜의 분석이 없습니다',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error: any) {
    console.error('Failed to fetch portfolio analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '분석 조회 중 오류가 발생했습니다',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portfolio/analysis/generate
 * Body: { date?: string } (YYYY-MM-DD, optional, default: today)
 * 수동으로 분석 생성 (테스트/개발용)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // 2. 날짜 파라미터
    const body = await request.json()
    const dateStr = body.date
    const date = dateStr ? new Date(dateStr) : new Date()
    date.setHours(0, 0, 0, 0)

    // 3. 기존 분석 확인
    const existing = await prisma.portfolioAnalysis.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date,
        },
      },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: '이미 생성된 분석이 있습니다',
      })
    }

    // 4. 분석 생성
    const analysis = await generatePortfolioAnalysis(session.user.id, date)

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error: any) {
    console.error('Failed to generate portfolio analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message || '분석 생성 중 오류가 발생했습니다',
        },
      },
      { status: 500 }
    )
  }
}
