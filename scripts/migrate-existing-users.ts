/**
 * Data Migration Script: Existing Users
 *
 * This script migrates existing users to the new league system:
 * 1. Generates referralCode for users without one
 * 2. Sets initialCapital to 10,000,000 for users
 * 3. Sets league to ROOKIE for users
 * 4. Creates CapitalHistory records for initial capital
 *
 * Run with: npx ts-node scripts/migrate-existing-users.ts
 */

import { PrismaClient, League, CapitalChangeReason } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  return randomBytes(8).toString('hex').toUpperCase()
}

async function main() {
  console.log('🔄 Starting user data migration...\n')

  try {
    // 1. Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        referralCode: true,
        initialCapital: true,
        league: true,
      },
    })

    console.log(`📊 Found ${users.length} users to process\n`)

    let updatedCount = 0
    let skippedCount = 0
    let capitalHistoryCount = 0

    for (const user of users) {
      console.log(`Processing: ${user.username} (${user.email})`)

      const updates: any = {}
      let needsUpdate = false

      // Check if referralCode is missing
      if (!user.referralCode) {
        let newCode = generateReferralCode()

        // Ensure uniqueness
        while (await prisma.user.findUnique({ where: { referralCode: newCode } })) {
          newCode = generateReferralCode()
        }

        updates.referralCode = newCode
        needsUpdate = true
        console.log(`  ✓ Generated referralCode: ${newCode}`)
      } else {
        console.log(`  ✓ Already has referralCode: ${user.referralCode}`)
      }

      // Check initialCapital (should be set by default, but verify)
      const currentCapital = user.initialCapital ? parseFloat(user.initialCapital.toString()) : 0
      if (currentCapital === 0 || !user.initialCapital) {
        updates.initialCapital = 10000000
        needsUpdate = true
        console.log(`  ✓ Set initialCapital: 10,000,000`)
      } else {
        console.log(`  ✓ Already has initialCapital: ${currentCapital.toLocaleString()}`)
      }

      // Check league (should be ROOKIE by default)
      if (!user.league || user.league !== League.ROOKIE) {
        updates.league = League.ROOKIE
        updates.leagueUpdatedAt = new Date()
        needsUpdate = true
        console.log(`  ✓ Set league: ROOKIE`)
      } else {
        console.log(`  ✓ Already in league: ${user.league}`)
      }

      // Update user if needed
      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        })
        updatedCount++
        console.log(`  ✅ User updated\n`)
      } else {
        skippedCount++
        console.log(`  ⏭️  No updates needed\n`)
      }

      // Create CapitalHistory record if it doesn't exist
      const existingHistory = await prisma.capitalHistory.findFirst({
        where: {
          userId: user.id,
          reason: CapitalChangeReason.INITIAL,
        },
      })

      if (!existingHistory) {
        const finalCapital = updates.initialCapital || currentCapital || 10000000

        await prisma.capitalHistory.create({
          data: {
            userId: user.id,
            amount: finalCapital,
            newTotal: finalCapital,
            reason: CapitalChangeReason.INITIAL,
            description: 'Initial capital from account creation',
          },
        })
        capitalHistoryCount++
        console.log(`  📝 Created CapitalHistory record\n`)
      }
    }

    console.log('✅ Migration completed!\n')
    console.log('Summary:')
    console.log(`  📊 Total users: ${users.length}`)
    console.log(`  ✅ Updated: ${updatedCount}`)
    console.log(`  ⏭️  Skipped: ${skippedCount}`)
    console.log(`  📝 CapitalHistory created: ${capitalHistoryCount}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
