/**
 * Regenerate Market Analysis for Nov 14, 2025
 * Deletes existing analysis and creates a new one with correct KST timezone
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function regenerateMarketAnalysis() {
  try {
    // KST Nov 14, 2025 at midnight
    const targetDate = new Date('2025-11-14T00:00:00.000Z')

    console.log('\n🔄 Regenerating Market Analysis for Nov 14, 2025...\n')

    // 1. Check if analysis exists
    const existing = await prisma.marketAnalysis.findUnique({
      where: { date: targetDate }
    })

    if (existing) {
      console.log('📋 Found existing analysis:')
      console.log(`   Date: ${existing.date}`)
      console.log(`   Created: ${existing.createdAt}`)
      console.log(`   Summary length: ${existing.summary.length} chars`)
      console.log('')

      // 2. Delete existing analysis
      console.log('🗑️  Deleting existing analysis...')
      await prisma.marketAnalysis.delete({
        where: { date: targetDate }
      })
      console.log('✅ Deleted successfully\n')
    } else {
      console.log('ℹ️  No existing analysis found for Nov 14\n')
    }

    console.log('✨ Analysis deleted! Now the scheduler will regenerate it automatically.')
    console.log('📝 Or you can manually trigger it via the API:\n')
    console.log('   POST http://localhost:3000/api/dev/market-analysis')
    console.log('   Body: { "date": "2025-11-14" }\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

regenerateMarketAnalysis()
