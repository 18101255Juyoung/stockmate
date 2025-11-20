/**
 * GET /api/ai/journal
 * 사용자의 AI 분석 일지 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // 2. Query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30') // 기본 30일
    const offset = parseInt(searchParams.get('offset') || '0')

    // 3. AI 분석 목록 조회
    const analyses = await prisma.aIAnalysis.findMany({
      where: {
        userId: session.user.id,
        analysisType: 'daily_journal',
      },
      orderBy: {
        analysisDate: 'desc', // 최신순
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        analysisDate: true,
        summary: true, // 3줄 요약만
        tokensUsed: true,
        cost: true,
        model: true,
        createdAt: true,
      },
    })

    // 4. 총 개수 조회 (pagination용)
    const total = await prisma.aIAnalysis.count({
      where: {
        userId: session.user.id,
        analysisType: 'daily_journal',
      },
    })

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      data: {
        analyses,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + analyses.length < total,
        },
      },
    })
  } catch (error: any) {
    console.error('AI journal list error:', error)
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
