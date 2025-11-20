/**
 * Initialize Period Start Assets
 *
 * Sets weeklyStartAssets and monthlyStartAssets for all existing portfolios
 * to their current totalAssets values.
 *
 * This is a one-time migration script to be run after adding the new fields.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing period start assets for existing portfolios...\n')

  try {
    // Get all portfolios
    const portfolios = await prisma.portfolio.findMany({
      select: {
        id: true,
        userId: true,
        totalAssets: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    })

    console.log(`Found ${portfolios.length} portfolios to update\n`)

    let successCount = 0
    let errorCount = 0

    // Update each portfolio
    for (const portfolio of portfolios) {
      try {
        await prisma.portfolio.update({
          where: { id: portfolio.id },
          data: {
            weeklyStartAssets: portfolio.totalAssets,
            monthlyStartAssets: portfolio.totalAssets,
          },
        })

        console.log(
          `✅ ${portfolio.user.username}: weeklyStartAssets = ${portfolio.totalAssets.toLocaleString()}, monthlyStartAssets = ${portfolio.totalAssets.toLocaleString()}`
        )
        successCount++
      } catch (error) {
        console.error(
          `❌ Failed to update portfolio for ${portfolio.user.username}:`,
          error instanceof Error ? error.message : 'Unknown error'
        )
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Total portfolios: ${portfolios.length}`)
    console.log(`   ✅ Successfully updated: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log('='.repeat(60))

    if (errorCount === 0) {
      console.log('\n✅ All portfolios initialized successfully!')
    } else {
      console.log('\n⚠️  Some portfolios failed to initialize')
    }
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✨ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
