/**
 * Cron API: Midnight Tasks
 * Runs daily league classification, rewards, and baseline snapshots
 *
 * Schedule: 00:00 KST daily
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { triggerMidnightTasks } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n🌙 [Cron API] Running midnight tasks...')

  try {
    const result = await triggerMidnightTasks()

    if (result.success) {
      console.log('✅ [Cron API] Midnight tasks completed successfully')
      return Response.json({
        success: true,
        message: 'Midnight tasks completed',
        result
      })
    } else {
      console.error('⚠️  [Cron API] Some midnight tasks failed:', result.errors)
      return Response.json({
        success: false,
        errors: result.errors
      }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ [Cron API] Midnight tasks failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
