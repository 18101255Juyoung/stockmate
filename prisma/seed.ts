/**
 * Database Seed Controller
 * Routes to appropriate seed strategy based on SEED_MODE environment variable
 *
 * Modes:
 * - safe (default): Preserves existing data, uses upsert strategy
 * - reset: Deletes all data and recreates from scratch
 *
 * Usage:
 * npm run seed        # Safe mode
 * npm run seed:reset  # Reset mode
 */

import { PrismaClient } from '@prisma/client'
import { resetSeed } from './seeds/reset'
import { safeSeed } from './seeds/safe'

const prisma = new PrismaClient()

async function main() {
  const seedMode = process.env.SEED_MODE || 'safe'

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌱 StockMate Database Seed')
  console.log(`📋 Mode: ${seedMode.toUpperCase()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (seedMode === 'reset') {
    console.log('⚠️  WARNING: RESET MODE')
    console.log('⚠️  This will DELETE ALL existing data!\n')
    await resetSeed()
  } else if (seedMode === 'safe') {
    console.log('✅ SAFE MODE')
    console.log('✅ Existing data will be preserved\n')
    await safeSeed()
  } else {
    console.error(`❌ Invalid SEED_MODE: "${seedMode}"`)
    console.error('   Valid options: "safe" or "reset"')
    process.exit(1)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
