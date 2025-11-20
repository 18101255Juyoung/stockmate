/**
 * 특정 날짜의 시장 분석을 재생성하는 스크립트
 *
 * 사용법: ts-node scripts/regenerate-market-analysis.ts [날짜]
 * 예시: ts-node scripts/regenerate-market-analysis.ts 2025-11-19
 */

import { generateMarketAnalysis } from '../src/lib/services/aiAdvisorService'
import { KSTDate } from '../src/lib/utils/kst-date'

async function main() {
  const dateArg = process.argv[2]

  if (!dateArg) {
    console.error('❌ 날짜를 입력해주세요.')
    console.log('사용법: ts-node scripts/regenerate-market-analysis.ts YYYY-MM-DD')
    process.exit(1)
  }

  try {
    console.log(`\n📰 시장 분석 재생성 시작: ${dateArg}`)
    console.log('=' .repeat(60))

    const date = KSTDate.parse(dateArg)
    console.log(`날짜 파싱 완료: ${date.toISOString()}`)

    console.log('\n🔄 기존 데이터 강제 삭제 및 재생성 중...')
    const analysis = await generateMarketAnalysis(date, { force: true })

    console.log('\n✅ 시장 분석 재생성 완료!')
    console.log('=' .repeat(60))
    console.log(`ID: ${analysis.id}`)
    console.log(`날짜: ${analysis.date}`)
    console.log(`요약: ${analysis.summary?.substring(0, 100)}...`)
    console.log(`토큰 사용: ${analysis.tokensUsed}`)
    console.log(`비용: $${analysis.cost}`)
    console.log(`모델: ${analysis.model}`)

  } catch (error) {
    console.error('\n❌ 오류 발생:', error)
    process.exit(1)
  }
}

main()
