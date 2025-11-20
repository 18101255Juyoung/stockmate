/**
 * Cron Job Authentication Utility
 * Verifies that cron requests come from authorized sources
 */

import { NextRequest } from 'next/server'

/**
 * Verify cron request authorization
 * Checks for CRON_SECRET environment variable match
 *
 * @param request - Next.js request object
 * @returns true if authorized
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In development, allow requests without auth
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // In production, require CRON_SECRET
  if (!cronSecret) {
    console.error('❌ CRON_SECRET not configured')
    return false
  }

  // Verify Bearer token
  const expectedAuth = `Bearer ${cronSecret}`
  if (authHeader !== expectedAuth) {
    console.error('❌ Invalid cron authorization')
    return false
  }

  return true
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
