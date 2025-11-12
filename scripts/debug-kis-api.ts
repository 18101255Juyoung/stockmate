/**
 * Debug KIS API raw data for Samsung Electronics
 * Check what data we get from the API
 */

import { fetchHistoricalData } from '../src/lib/services/historicalDataCollector'

async function debugKISData() {
  console.log('🔍 Debugging KIS API data for Samsung Electronics (005930)\n')

  try {
    // Fetch 10 days of data
    console.log('Fetching 10 days of historical data...\n')
    const data = await fetchHistoricalData('005930', 10)

    console.log(`Received ${data.length} records from KIS API:\n`)

    // Print each record
    data.forEach((item, index) => {
      console.log(`=== Record ${index + 1} ===`)
      console.log(`Date (stck_bsop_date): ${item.stck_bsop_date}`)
      console.log(`Open (stck_oprc): ${item.stck_oprc}`)
      console.log(`High (stck_hgpr): ${item.stck_hgpr}`)
      console.log(`Low (stck_lwpr): ${item.stck_lwpr}`)
      console.log(`Close (stck_clpr): ${item.stck_clpr}`)
      console.log(`Volume (acml_vol): ${item.acml_vol}`)
      console.log('')
    })

    // Parse and display Nov 4, 5, 6 specifically
    console.log('\n📅 Looking for Nov 4-6 data:\n')

    const nov4 = data.find(item => item.stck_bsop_date === '20251104')
    const nov5 = data.find(item => item.stck_bsop_date === '20251105')
    const nov6 = data.find(item => item.stck_bsop_date === '20251106')

    if (nov4) {
      console.log('✅ Nov 4 found:')
      console.log(`   시가: ${parseFloat(nov4.stck_oprc).toLocaleString()}원`)
      console.log(`   고가: ${parseFloat(nov4.stck_hgpr).toLocaleString()}원`)
      console.log(`   저가: ${parseFloat(nov4.stck_lwpr).toLocaleString()}원`)
      console.log(`   종가: ${parseFloat(nov4.stck_clpr).toLocaleString()}원\n`)
    } else {
      console.log('❌ Nov 4 NOT found\n')
    }

    if (nov5) {
      console.log('✅ Nov 5 found:')
      console.log(`   시가: ${parseFloat(nov5.stck_oprc).toLocaleString()}원`)
      console.log(`   고가: ${parseFloat(nov5.stck_hgpr).toLocaleString()}원`)
      console.log(`   저가: ${parseFloat(nov5.stck_lwpr).toLocaleString()}원`)
      console.log(`   종가: ${parseFloat(nov5.stck_clpr).toLocaleString()}원\n`)
    } else {
      console.log('❌ Nov 5 NOT found\n')
    }

    if (nov6) {
      console.log('✅ Nov 6 found:')
      console.log(`   시가: ${parseFloat(nov6.stck_oprc).toLocaleString()}원`)
      console.log(`   고가: ${parseFloat(nov6.stck_hgpr).toLocaleString()}원`)
      console.log(`   저가: ${parseFloat(nov6.stck_lwpr).toLocaleString()}원`)
      console.log(`   종가: ${parseFloat(nov6.stck_clpr).toLocaleString()}원\n`)
    } else {
      console.log('❌ Nov 6 NOT found\n')
    }

    console.log('✅ Debug complete')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

debugKISData()
