/**
 * Next.js Instrumentation
 * Runs when the server starts (both dev and production)
 * Used to auto-start the stock price scheduler in development mode
 */

export async function register() {
  // Only start scheduler in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 [Instrumentation] Initializing server...')

    // Dynamic imports to avoid loading in build process
    const {
      startScheduler,
      triggerPriceUpdate,
      triggerDailyCandleCreation,
    } = await import('@/lib/scheduler')

    const { autoFixChartData } = await import('@/lib/services/dataInitializer')

    // Delay to ensure database connections are ready
    setTimeout(() => {
      try {
        // Step 1: Auto-fix chart data (fill missing dates, ensure 90 days)
        console.log('\n🔧 [Instrumentation] Starting data integrity check...')
        setTimeout(async () => {
          try {
            await autoFixChartData()

            // Step 1.5: Auto-backfill recent data (optional, configurable)
            if (process.env.AUTO_BACKFILL_DAYS) {
              const days = parseInt(process.env.AUTO_BACKFILL_DAYS, 10)
              if (days > 0) {
                console.log(`\n📊 [Instrumentation] Auto-backfilling recent ${days} days...`)
                const { backfillAllStocks } = await import('@/lib/services/historicalDataCollector')
                const results = await backfillAllStocks(days)
                const totalInserted = results.reduce((sum, r) => sum + r.daysInserted, 0)
                console.log(`✅ [Instrumentation] Backfill completed: ${totalInserted} total days inserted`)
              }
            }

            // Step 2: Start scheduler
            console.log('⏰ [Instrumentation] Starting scheduler...')
            startScheduler()

            // Step 3: Time-based initial tasks
            console.log('\n🔄 [Instrumentation] Running time-based initialization...')

            // Get current KST time
            const kstTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
            const kstTime = new Date(kstTimeStr)
            const hour = kstTime.getHours()
            const minutes = kstTime.getMinutes()
            const timeInMinutes = hour * 60 + minutes

            console.log(`  Current KST time: ${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)

            // Market hours: 09:00-15:30
            const marketOpen = 9 * 60 // 09:00
            const marketClose = 15 * 60 + 30 // 15:30

            if (timeInMinutes < marketOpen) {
              // Before market open (00:00-08:59)
              console.log('  ⏰ Before market open - Chart data ready for yesterday')
            } else if (timeInMinutes >= marketOpen && timeInMinutes <= marketClose) {
              // During market hours (09:00-15:30)
              console.log('  📈 Market is open - Updating stock prices...')
              await triggerPriceUpdate()
            } else {
              // After market close (15:31-23:59)
              console.log('  🔒 Market closed - Creating final daily candle...')
              await triggerDailyCandleCreation()
            }

            console.log('✅ [Instrumentation] Server initialization completed\n')
          } catch (error) {
            console.error('❌ [Instrumentation] Initialization failed:', error)
          }
        }, 3000) // Wait 3 seconds for database connections
      } catch (error) {
        console.error('❌ [Instrumentation] Failed to initialize:', error)
      }
    }, 2000)
  }
}
