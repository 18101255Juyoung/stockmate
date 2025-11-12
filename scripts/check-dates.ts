/**
 * Check what dates exist in the database
 */

import { prisma } from '../src/lib/prisma'

async function checkDates() {
  console.log('📅 Checking dates in database...\n')

  try {
    // Get all unique dates, ordered by date
    const dates = await prisma.stockPriceHistory.findMany({
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 10,
    })

    console.log('Last 10 dates in database:\n')
    for (const { date } of dates) {
      const count = await prisma.stockPriceHistory.count({
        where: { date },
      })
      console.log(`${date.toISOString().split('T')[0]}: ${count} records`)
    }

    // Also check total count
    const total = await prisma.stockPriceHistory.count()
    console.log(`\nTotal records: ${total}`)
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkDates()
