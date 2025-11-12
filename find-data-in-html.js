/**
 * Find data patterns in saved HTML
 */

const fs = require('fs')

try {
  const html = fs.readFileSync('naver-kospi.html', 'utf-8')

  console.log('🔍 Searching for data patterns in HTML...\n')

  // Search for nowVal assignment
  const nowValMatch = html.match(/nowVal\s*=\s*['"]?([\d\.,]+)/i)
  console.log('nowVal:', nowValMatch ? nowValMatch[1] : 'NOT FOUND')

  // Search for changeVal assignment
  const changeValMatch = html.match(/changeVal\s*=\s*['"]?([\d\.,\-]+)/i)
  console.log('changeVal:', changeValMatch ? changeValMatch[1] : 'NOT FOUND')

  // Search for changeRate assignment
  const changeRateMatch = html.match(/changeRate\s*=\s*['"]?([\d\.,\-]+)/i)
  console.log('changeRate:', changeRateMatch ? changeRateMatch[1] : 'NOT FOUND')

  // Search for itemData object
  const itemDataMatch = html.match(/var\s+itemData\s*=\s*({[^}]+})/i)
  if (itemDataMatch) {
    console.log('\n✅ Found itemData:', itemDataMatch[1])
  }

  // Search for any JSON-like data structure
  console.log('\n🔍 Searching for JSON data structures...\n')
  const jsonMatches = html.match(/\{[^{}]*"nv"[^{}]*\}/g)
  if (jsonMatches) {
    jsonMatches.slice(0, 3).forEach((match, i) => {
      console.log(`JSON ${i}:`, match)
    })
  }

  // Search for scripts that set values
  console.log('\n🔍 Searching for value assignments...\n')
  const assignments = html.match(/(nv|cv|cr|pcv|av)\s*:\s*[\d\.,\-]+/g)
  if (assignments) {
    assignments.slice(0, 10).forEach(a => console.log(a))
  }

} catch (error) {
  console.error('❌ Error:', error.message)
}
