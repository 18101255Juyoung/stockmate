/**
 * Next.js Instrumentation
 * Runs when the server starts (both dev and production)
 * Used to auto-start the stock price scheduler in development mode
 */

export async function register() {
  // Only start scheduler in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 [Instrumentation] Initializing scheduler...')

    // Dynamic import to avoid loading in build process
    const { startScheduler } = await import('@/lib/scheduler')

    // Delay to ensure database connections are ready
    setTimeout(() => {
      try {
        startScheduler()
      } catch (error) {
        console.error('❌ [Instrumentation] Failed to start scheduler:', error)
      }
    }, 2000)
  }
}
