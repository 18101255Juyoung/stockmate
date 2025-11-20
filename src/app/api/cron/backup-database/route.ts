/**
 * POST /api/cron/backup-database - Create database backup (cron job)
 * This endpoint should be called by the scheduler
 */

import { NextRequest, NextResponse } from 'next/server'
import { ErrorCodes } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verify cron job authorization (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.AUTH_UNAUTHORIZED,
            message: 'Unauthorized',
          },
        },
        { status: 401 }
      )
    }

    // Dynamically import child_process (server-side only)
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    // Execute backup script
    console.log('🔧 [API] Executing backup script...')
    const { stdout, stderr } = await execAsync('node scripts/db-backup.js')

    if (stderr && !stderr.includes('[dotenv')) {
      console.error('Backup stderr:', stderr)
    }

    console.log('✅ [API] Backup completed')

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Database backup completed successfully',
          output: stdout,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [API] Backup failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Failed to create database backup',
        },
      },
      { status: 500 }
    )
  }
}
