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

            // Step 1.6: Auto-backfill missing journal analysis (optional, configurable)
            if (process.env.AUTO_BACKFILL_JOURNAL !== 'false') {
              console.log('\n📔 [Instrumentation] Checking for missing journal analysis...')
              const { autoBackfillAll } = await import('@/lib/services/journalBackfillService')
              const maxDays = parseInt(process.env.AUTO_BACKFILL_JOURNAL_DAYS || '7', 10)
              const result = await autoBackfillAll(maxDays)

              if (result.totalDays === 0) {
                console.log('✅ [Instrumentation] Journal analysis up to date')
              } else {
                console.log(`✅ [Instrumentation] Journal backfill completed: ${result.successful}/${result.totalDays} days`)
                if (result.failed > 0) {
                  console.log(`⚠️  [Instrumentation] ${result.failed} days failed`)
                }
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

            // Import KSTDate for date operations
            const { KSTDate } = await import('@/lib/utils/kst-date')
            const today = KSTDate.today()

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
              console.log('  🔒 Market closed - Running end-of-day tasks...')

              // Task 1: Daily candles (15:35)
              console.log('  📊 Creating final daily candle...')
              await triggerDailyCandleCreation()

              // Task 2: Market Analysis (15:35 이후면 생성)
              if (timeInMinutes >= 15 * 60 + 35) {
                console.log('  📰 Generating market analysis...')
                const { generateMarketAnalysis } = await import('@/lib/services/aiAdvisorService')
                await generateMarketAnalysis(today)
                console.log('  ✅ Market analysis completed')
              }

              // Task 3: Portfolio Snapshots (15:40 이후면 생성) - CRITICAL
              if (timeInMinutes >= 15 * 60 + 40) {
                console.log('  📸 Creating portfolio snapshots...')
                const { createAllDailySnapshots } = await import('@/lib/services/portfolioSnapshotService')
                await createAllDailySnapshots(today)
                console.log('  ✅ Snapshots created')
              }

              // Task 4: Portfolio Analysis (16:00 이후면 생성)
              if (timeInMinutes >= 16 * 60) {
                console.log('  📊 Generating portfolio analysis...')
                const { generateDailyPortfolioAnalysisForAllUsers } = await import('@/lib/services/portfolioAnalysisService')
                await generateDailyPortfolioAnalysisForAllUsers(today)
                console.log('  ✅ Portfolio analysis completed')
              }

              // Task 5: Rankings Update (16:10 이후면 업데이트)
              if (timeInMinutes >= 16 * 60 + 10) {
                console.log('  🏆 Updating rankings...')
                const { triggerRankingUpdate } = await import('@/lib/scheduler')
                await triggerRankingUpdate()
                console.log('  ✅ Rankings updated')
              }
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
