/**
 * Cron API: Portfolio Snapshot Creation
 * Creates daily portfolio snapshots for all users
 *
 * Schedule: 15:40 KST (Mon-Fri)
 */

import { NextRequest } from 'next/server'
import { verifyCronAuth, createUnauthorizedResponse } from '@/lib/utils/cronAuth'
import { triggerSnapshotCreation } from '@/lib/scheduler'

export async function POST(request: NextRequest) {
  // Verify authorization
  if (!verifyCronAuth(request)) {
    return createUnauthorizedResponse()
  }

  console.log('\n📸 [Cron API] Creating portfolio snapshots...')

  try {
    const snapshots = await triggerSnapshotCreation()

    console.log(`✅ [Cron API] Portfolio snapshots created: ${snapshots.length}`)
    return Response.json({
      success: true,
      message: 'Portfolio snapshots created',
      count: snapshots.length
    })
  } catch (error) {
    console.error('❌ [Cron API] Portfolio snapshot creation failed:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
