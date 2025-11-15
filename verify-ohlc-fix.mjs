/**
 * Verification script for Option 2 implementation
 * Tests that getStockPrice() now reads OHLC from StockPriceHistory
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyOHLCFix() {
  try {
    console.log('\n🧪 Verifying OHLC data source fix...\n')

    const testStockCode = '005930' // Samsung
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // 1. Get OHLC from Stock table (old data source)
    const stockData = await prisma.stock.findUnique({
      where: { stockCode: testStockCode },
      select: {
        stockCode: true,
        stockName: true,
        currentPrice: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        volume: true,
      },
    })

    // 2. Get OHLC from StockPriceHistory (new data source)
    const historyData = await prisma.stockPriceHistory.findUnique({
      where: {
        stockCode_date: {
          stockCode: testStockCode,
          date: today,
        },
      },
      select: {
        stockCode: true,
        date: true,
        openPrice: true,
        highPrice: true,
        lowPrice: true,
        closePrice: true,
        volume: true,
      },
    })

    // 3. Call API endpoint to see what data is returned
    const apiResponse = await fetch(`http://localhost:3000/api/stocks/${testStockCode}`)
    const apiData = await apiResponse.json()

    console.log('📊 Data Comparison for Samsung (005930):\n')

    console.log('1. Stock Table (Old Source):')
    console.log(`   Open:   ${stockData?.openPrice || 'N/A'}`)
    console.log(`   High:   ${stockData?.highPrice || 'N/A'}`)
    console.log(`   Low:    ${stockData?.lowPrice || 'N/A'}`)
    console.log(`   Volume: ${stockData?.volume || 'N/A'}\n`)

    console.log('2. StockPriceHistory (New Source):')
    console.log(`   Open:   ${historyData?.openPrice || 'N/A'}`)
    console.log(`   High:   ${historyData?.highPrice || 'N/A'}`)
    console.log(`   Low:    ${historyData?.lowPrice || 'N/A'}`)
    console.log(`   Close:  ${historyData?.closePrice || 'N/A'}`)
    console.log(`   Volume: ${historyData?.volume || 'N/A'}\n`)

    console.log('3. API Response (What users see):')
    if (apiData.success && apiData.data) {
      console.log(`   Open:   ${apiData.data.openPrice}`)
      console.log(`   High:   ${apiData.data.highPrice}`)
      console.log(`   Low:    ${apiData.data.lowPrice}`)
      console.log(`   Volume: ${apiData.data.volume}\n`)
    } else {
      console.log('   API call failed:', apiData.error || 'Unknown error\n')
    }

    // 4. Verification
    console.log('✅ Verification Result:')

    if (!historyData) {
      console.log('   ⚠️  No StockPriceHistory data found for today')
      console.log('   → API should fallback to Stock table')
      if (
        apiData.success &&
        apiData.data.openPrice === stockData.openPrice &&
        apiData.data.highPrice === stockData.highPrice
      ) {
        console.log('   ✓ Fallback working correctly!\n')
      } else {
        console.log('   ✗ Fallback not working as expected\n')
      }
    } else {
      console.log('   ✓ StockPriceHistory data exists for today')
      console.log('   → API should use StockPriceHistory OHLC')
      if (
        apiData.success &&
        apiData.data.openPrice === historyData.openPrice &&
        apiData.data.highPrice === historyData.highPrice &&
        apiData.data.lowPrice === historyData.lowPrice
      ) {
        console.log('   ✓ API is correctly using StockPriceHistory data!\n')
        console.log('🎉 SUCCESS: OHLC data source fix is working!\n')
      } else {
        console.log('   ✗ API is NOT using StockPriceHistory data\n')
        console.log('❌ FAILED: Something is wrong with the implementation\n')
      }
    }

    // 5. Compare with Chart API
    console.log('📈 Comparing with Chart API...\n')
    const chartResponse = await fetch(
      `http://localhost:3000/api/stocks/${testStockCode}/chart?days=1&timeframe=daily`
    )
    const chartData = await chartResponse.json()

    if (chartData.success && chartData.data.length > 0) {
      const latestCandle = chartData.data[chartData.data.length - 1]
      console.log('   Chart Data (Latest):')
      console.log(`   Open:  ${latestCandle.open}`)
      console.log(`   High:  ${latestCandle.high}`)
      console.log(`   Low:   ${latestCandle.low}`)
      console.log(`   Close: ${latestCandle.close}\n`)

      if (
        apiData.success &&
        apiData.data.openPrice === latestCandle.open &&
        apiData.data.highPrice === latestCandle.high &&
        apiData.data.lowPrice === latestCandle.low
      ) {
        console.log('   ✓ Price API and Chart API are now consistent!\n')
        console.log('🎉 Chart bug is FULLY FIXED!\n')
      } else {
        console.log('   ⚠️  Price API and Chart API still have different OHLC data\n')
      }
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyOHLCFix()
