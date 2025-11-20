/**
 * POST /api/cron/daily-analysis
 * Cron job 전용: 모든 사용자에 대해 오늘의 AI 분석 생성
 *
 * 보안: 프로덕션에서는 Vercel Cron Secret 검증 추가 필요
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateDailyAnalysisForAllUsers } from '@/lib/services/aiAdvisorService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // TODO: 프로덕션 배포 시 Vercel Cron Secret 검증 추가
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('[API] Starting daily AI analysis generation...')

    const result = await generateDailyAnalysisForAllUsers()

    console.log(
      `[API] Daily AI analysis completed: ${result.successful} success, ${result.failed} failed (${result.total} total)`
    )

    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      },
    })
  } catch (error: any) {
    console.error('[API] Daily AI analysis failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message,
        },
      },
      { status: 500 }
    )
  }
}
