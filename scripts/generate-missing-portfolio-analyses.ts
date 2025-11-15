/**
 * Generate missing portfolio analyses for dlwndud1 user
 * Generates analyses for dates with transactions but no analysis
 */

import { PrismaClient } from '@prisma/client'
import { generatePortfolioAnalysis } from '../src/lib/services/portfolioAnalysisService'
import { KSTDate } from '../src/lib/utils/kst-date'

const prisma = new PrismaClient()

async function main() {
  const userId = 'cmho1ftbi002tenb66atzvr6h' // dlwndud1
  const dates = [
    KSTDate.parse('2025-11-14'),
    KSTDate.parse('2025-11-13'),
    KSTDate.parse('2025-11-06'),
  ]

  console.log('🌱 Generating missing portfolio analyses for dlwndud1...\n')

  for (const date of dates) {
    const dateStr = KSTDate.format(date)

    try {
      console.log(`📊 Generating analysis for ${dateStr}...`)

      // Check if analysis already exists
      const existing = await prisma.portfolioAnalysis.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      })

      if (existing) {
        console.log(`   ⏭️  Analysis already exists, skipping\n`)
        continue
      }

      // Generate analysis
      const result = await generatePortfolioAnalysis(userId, date)

      if (result.success) {
        console.log(`   ✅ Analysis generated successfully`)
        console.log(`   📝 Summary: ${result.data?.summary?.substring(0, 50)}...\n`)
      } else {
        console.log(`   ❌ Failed: ${result.error?.message}\n`)
      }
    } catch (error) {
      console.error(`   💥 Error: ${error}\n`)
    }
  }

  console.log('🎉 Portfolio analysis generation completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Fatal error:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
