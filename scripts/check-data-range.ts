/**
 * Check current data range in database
 */

import { prisma } from '../src/lib/prisma'

async function checkDataRange() {
  console.log('📊 Checking data range in database...\n')

  try {
    // Get oldest and newest dates
    const oldest = await prisma.stockPriceHistory.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    })

    const newest = await prisma.stockPriceHistory.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    // Get total count
    const total = await prisma.stockPriceHistory.count()

    // Get stock count
    const stockCount = await prisma.stock.count()

    console.log('=== Data Range ===')
    console.log(`Oldest date: ${oldest?.date.toISOString().split('T')[0] || 'None'}`)
    console.log(`Newest date: ${newest?.date.toISOString().split('T')[0] || 'None'}`)
    console.log(`Total records: ${total.toLocaleString()}`)
    console.log(`Stock count: ${stockCount}`)

    if (oldest && newest) {
      const days = Math.floor((newest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24)) + 1
      console.log(`Date span: ${days} days`)

      const expectedRecords = stockCount * days
      const coverage = (total / expectedRecords * 100).toFixed(1)
      console.log(`Expected records (if all days): ${expectedRecords.toLocaleString()}`)
      console.log(`Coverage: ${coverage}%`)

      // Estimate trading days (weekdays only, roughly ~70% of all days)
      const estimatedTradingDays = Math.floor(days * 0.7)
      const expectedTradingRecords = stockCount * estimatedTradingDays
      const tradingCoverage = (total / expectedTradingRecords * 100).toFixed(1)
      console.log(`\nEstimated trading days: ${estimatedTradingDays}`)
      console.log(`Expected trading records: ${expectedTradingRecords.toLocaleString()}`)
      console.log(`Trading day coverage: ${tradingCoverage}%`)
    }

    // Get unique dates count
    const uniqueDates = await prisma.stockPriceHistory.groupBy({
      by: ['date'],
      _count: true,
    })

    console.log(`\nUnique dates in DB: ${uniqueDates.length} days`)
    console.log(`Average records per day: ${(total / uniqueDates.length).toFixed(0)}`)

    console.log('\n✅ Analysis complete')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkDataRange()
