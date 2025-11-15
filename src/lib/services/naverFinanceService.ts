/**
 * 네이버 금융 데이터 수집 서비스
 * KOSPI/KOSDAQ 지수, 업종별 데이터, 시장 뉴스 크롤링
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { KSTDateTime } from '@/lib/utils/kst-date'

interface IndexData {
  value: number
  change: number
  changeRate: number
  volume?: number
}

interface SectorData {
  name: string
  change: number
  changeRate: number
}

interface NewsItem {
  title: string
  link: string
  pubDate: string
  description?: string
}

/**
 * 네이버 금융에서 KOSPI 또는 KOSDAQ 지수 크롤링
 */
export async function fetchNaverIndex(
  indexName: 'KOSPI' | 'KOSDAQ'
): Promise<IndexData> {
  try {
    const indexCode = indexName === 'KOSPI' ? 'KOSPI' : 'KOSDAQ'
    const url = `https://finance.naver.com/sise/sise_index.naver?code=${indexCode}`

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    })

    // 네이버 금융은 EUC-KR 인코딩 사용
    const iconv = require('iconv-lite')
    const decodedData = iconv.decode(response.data, 'EUC-KR')
    const $ = cheerio.load(decodedData)

    // 지수 값 파싱
    const valueText = $('#now_value').text().trim().replace(/,/g, '')
    const value = parseFloat(valueText)

    // 등락 및 등락률 파싱 (정규식 패턴 매칭 사용 - 업종별과 동일한 방식)
    // 페이지 전체 텍스트에서 퍼센트 패턴 찾기
    const bodyText = $('body').text()

    // 등락률 추출: "+1.23%" 또는 "-0.45%" 형식
    const percentMatches = bodyText.match(/([+-]?\d+\.?\d*)%/g)
    let changeRate = 0
    let change = 0

    if (percentMatches && percentMatches.length > 0) {
      // 첫 번째 퍼센트 값을 등락률로 사용 (보통 지수 등락률)
      const firstPercent = percentMatches[0]
      const rateMatch = firstPercent.match(/([+-]?\d+\.?\d*)/)
      if (rateMatch) {
        changeRate = parseFloat(rateMatch[1])
      }
    }

    // 등락 포인트 추출: 등락률이 있으면 지수 값으로부터 역산
    if (changeRate !== 0 && !isNaN(value)) {
      change = (value * changeRate) / 100
    }

    // 거래량 파싱 (선택)
    const volumeText = $('#quant').text().trim().replace(/,/g, '')
    const volume = volumeText ? parseFloat(volumeText) : undefined

    // 지수 값은 반드시 있어야 함
    if (isNaN(value) || value === 0) {
      throw new Error(
        `Failed to parse ${indexName} value: ${valueText}`
      )
    }

    return {
      value,
      change: isNaN(change) ? 0 : change,
      changeRate: isNaN(changeRate) ? 0 : changeRate,
      volume,
    }
  } catch (error) {
    console.error(`❌ Error fetching Naver ${indexName} index:`, error)
    throw new Error(`Failed to fetch ${indexName} data from Naver`)
  }
}

/**
 * 네이버 금융에서 업종별 등락 데이터 크롤링
 */
export async function fetchNaverSectors(): Promise<SectorData[]> {
  try {
    const url = 'https://finance.naver.com/sise/sise_group.naver?type=upjong'

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    })

    // 네이버 금융은 EUC-KR 인코딩 사용
    const iconv = require('iconv-lite')
    const decodedData = iconv.decode(response.data, 'EUC-KR')
    const $ = cheerio.load(decodedData)
    const sectors: SectorData[] = []

    // 업종 테이블 파싱
    $('.type_1 tbody tr').each((_, element) => {
      const $tr = $(element)

      // 광고 행 제외
      if ($tr.find('.blank_02').length > 0) return

      const name = $tr.find('td:nth-child(1) a').text().trim()
      // col2에 "+9.39%" 형식으로 등락률이 저장되어 있음
      const priceAndRateText = $tr.find('td:nth-child(2)').text().trim()

      if (!name || !priceAndRateText) return

      // "+9.39%" 또는 "-2.51%" 형식에서 숫자만 추출
      const rateMatch = priceAndRateText.match(/([+-]?\d+\.?\d*)%/)
      if (!rateMatch) return

      const changeRate = parseFloat(rateMatch[1])
      // change는 등락률을 그대로 사용 (포인트 단위 없음)
      const change = changeRate

      if (!isNaN(changeRate)) {
        sectors.push({ name, change, changeRate })
      }
    })

    // 상위 10개만 반환
    return sectors.slice(0, 10)
  } catch (error) {
    console.error('❌ Error fetching Naver sectors:', error)
    // 실패 시 빈 배열 반환 (치명적이지 않음)
    return []
  }
}

/**
 * 네이버 금융 증시 뉴스 RSS 파싱
 */
export async function fetchMarketNews(limit: number = 5): Promise<NewsItem[]> {
  try {
    // 네이버 금융 증시 뉴스 RSS
    const url = 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258'

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    })

    // 네이버 금융은 EUC-KR 인코딩 사용
    const iconv = require('iconv-lite')
    const decodedData = iconv.decode(response.data, 'EUC-KR')
    const $ = cheerio.load(decodedData)
    const news: NewsItem[] = []

    // 뉴스 목록 파싱
    $('.simpleNewsList .simpleNewsList_link').each((index, element) => {
      if (index >= limit) return false // limit 개수만큼만

      const $a = $(element)
      const title = $a.text().trim()
      const link = $a.attr('href') || ''
      const fullLink = link.startsWith('http')
        ? link
        : `https://finance.naver.com${link}`

      if (title && fullLink) {
        news.push({
          title,
          link: fullLink,
          pubDate: KSTDateTime.now().toISOString(), // RSS가 아니므로 KST 현재 시간 사용
        })
      }
    })

    return news
  } catch (error) {
    console.error('❌ Error fetching market news:', error)
    // 실패 시 빈 배열 반환 (치명적이지 않음)
    return []
  }
}

/**
 * 모든 시장 데이터를 한 번에 수집
 */
export async function fetchAllNaverMarketData() {
  try {
    const [kospi, kosdaq, sectors, news] = await Promise.all([
      fetchNaverIndex('KOSPI'),
      fetchNaverIndex('KOSDAQ'),
      fetchNaverSectors(),
      fetchMarketNews(5),
    ])

    return {
      kospi,
      kosdaq,
      sectors,
      news,
    }
  } catch (error) {
    console.error('❌ Error fetching all market data:', error)
    throw error
  }
}
