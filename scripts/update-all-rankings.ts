/**
 * Update All Rankings Script
 *
 * Manually updates rankings for all periods (WEEKLY, MONTHLY, ALL_TIME)
 *
 * Usage:
 *   npx ts-node --compiler-options {\"module\":\"CommonJS\"} scripts/update-all-rankings.ts
 */

import { updateRankings } from '../src/lib/services/rankingService'

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🔄 Updating All Rankings')
  console.log('='.repeat(80) + '\n')

  const periods: Array<'WEEKLY' | 'MONTHLY' | 'ALL_TIME'> = ['WEEKLY', 'MONTHLY', 'ALL_TIME']

  for (const period of periods) {
    console.log(`📊 Updating ${period} rankings...`)

    try {
      const result = await updateRankings(period)

      if (result.success && result.data) {
        console.log(`   ✅ ${period}:`)
        console.log(`      루키 리그: ${result.data.rookie}명`)
        console.log(`      명예의 전당: ${result.data.hallOfFame}명`)
        console.log(`      총 업데이트: ${result.data.updated}명`)
      } else {
        console.log(`   ❌ Failed: Unknown error`)
      }
    } catch (error) {
      console.error(`   ❌ Error updating ${period}:`, error)
    }

    console.log()
  }

  console.log('='.repeat(80))
  console.log('✅ All rankings updated')
  console.log('='.repeat(80) + '\n')
}

// Execute
main()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
