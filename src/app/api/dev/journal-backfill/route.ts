/**
 * Manual Journal Backfill API
 *
 * GET  /api/dev/journal-backfill - Check backfill status
 * POST /api/dev/journal-backfill - Trigger manual backfill
 *
 * Query Parameters (POST):
 * - startDate: Start date (YYYY-MM-DD) - optional
 * - endDate: End date (YYYY-MM-DD) - optional
 * - maxDays: Maximum days to backfill (default: 7) - optional
 * - force: Force regeneration of existing analysis (default: false) - optional
 */

import { NextRequest, NextResponse } from 'next/server'
import { KSTDate } from '@/lib/utils/kst-date'
import {
  getAllMissingDatesInRange,
  autoBackfillAll,
  backfillDateRange,
} from '@/lib/services/journalBackfillService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET - Check backfill status
 * Returns information about missing dates in the last N days
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxDays = parseInt(searchParams.get('maxDays') || '7', 10)

    if (maxDays < 1 || maxDays > 90) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'maxDays must be between 1 and 90',
          },
        },
        { status: 400 }
      )
    }

    const today = KSTDate.format(KSTDate.today())
    const missingDates = await getAllMissingDatesInRange(maxDays)

    return NextResponse.json({
      success: true,
      data: {
        today,
        daysScanned: maxDays,
        missingDates,
        missingDaysCount: missingDates.length,
        needsBackfill: missingDates.length > 0,
        message:
          missingDates.length === 0
            ? `All analysis up to date (last ${maxDays} days)`
            : `${missingDates.length} days need backfill`,
      },
    })
  } catch (error) {
    console.error('[Backfill Status] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check backfill status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Trigger manual backfill
 *
 * Request body:
 * {
 *   startDate?: string,  // YYYY-MM-DD
 *   endDate?: string,    // YYYY-MM-DD
 *   maxDays?: number,    // Max days to backfill (default: 7)
 *   force?: boolean      // Force regeneration (default: false)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, maxDays = 7, force = false } = body

    // Validate maxDays
    if (typeof maxDays !== 'number' || maxDays < 1 || maxDays > 90) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'maxDays must be between 1 and 90',
          },
        },
        { status: 400 }
      )
    }

    let result

    if (startDate && endDate) {
      // Manual date range backfill
      // Validate date format
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid date format. Expected YYYY-MM-DD',
            },
          },
          { status: 400 }
        )
      }

      if (startDate > endDate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'startDate must be before or equal to endDate',
            },
          },
          { status: 400 }
        )
      }

      console.log(`[Manual Backfill] Requested: ${startDate} to ${endDate}`)
      result = await backfillDateRange(startDate, endDate, {
        force,
        skipWeekends: true,
      })
    } else if (startDate || endDate) {
      // Only one date provided - error
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both startDate and endDate must be provided together',
          },
        },
        { status: 400 }
      )
    } else {
      // Auto backfill (from last analysis to today)
      console.log(`[Auto Backfill] Requested: maxDays=${maxDays}`)
      result = await autoBackfillAll(maxDays)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDays: result.totalDays,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
          totalCost: result.totalCost,
          duration: result.duration,
        },
        results: result.results,
        message: `Backfilled ${result.successful} days successfully`,
      },
    })
  } catch (error) {
    console.error('[Manual Backfill] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to execute backfill',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
