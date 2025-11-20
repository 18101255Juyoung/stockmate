/**
 * GET /api/ai/journal/[date]
 * 특정 날짜의 AI 분석 상세 조회
 *
 * 예: GET /api/ai/journal/2025-11-11
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toKSTDateOnly } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    // 1. 인증 확인
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Login required',
          },
        },
        { status: 401 }
      )
    }

    // 2. 날짜 파라미터 검증 및 파싱
    const dateStr = params.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'Date must be in YYYY-MM-DD format',
          },
        },
        { status: 400 }
      )
    }

    const analysisDate = toKSTDateOnly(new Date(dateStr))

    // 3. 해당 날짜의 AI 분석 조회
    const analysis = await prisma.aIAnalysis.findUnique({
      where: {
        userId_analysisDate: {
          userId: session.user.id,
          analysisDate,
        },
      },
      select: {
        id: true,
        analysisDate: true,
        response: true, // 전체 분석 내용
        summary: true,
        tokensUsed: true,
        cost: true,
        model: true,
        createdAt: true,
      },
    })

    // 4. 분석이 없으면 404
    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ANALYSIS_NOT_FOUND',
            message: `No analysis found for ${dateStr}`,
          },
        },
        { status: 404 }
      )
    }

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error: any) {
    console.error('AI journal detail error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: error.message,
        },
      },
      { status: 500 }
    )
  }
}
