/**
 * Database Seed Script - RESET MODE
 * ⚠️ WARNING: This will DELETE ALL existing data!
 * Use only for:
 * - Initial database setup
 * - Test environment reset
 * - Complete data refresh
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

export async function resetSeed() {
  console.log('🌱 Starting database seed (RESET MODE)...')
  console.log('⚠️  This will DELETE ALL existing data!')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.ranking.deleteMany({})
  await prisma.follow.deleteMany({})
  await prisma.like.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.post.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.holding.deleteMany({})
  await prisma.portfolio.deleteMany({})
  await prisma.user.deleteMany({})

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create users with portfolios
  console.log('👤 Creating users...')
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'testuser1@test.com',
        password: hashedPassword,
        username: 'investor1',
        displayName: '투자왕김씨',
        bio: '10년차 주식 투자자입니다.',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 5000000,
            totalAssets: 12500000,
            totalReturn: 25.0,
            realizedPL: 1000000,
            unrealizedPL: 1500000,
          },
        },
      },
      include: { portfolio: true },
    }),
    prisma.user.create({
      data: {
        email: 'testuser2@test.com',
        password: hashedPassword,
        username: 'trader_lee',
        displayName: '단타매니아이씨',
        bio: '단타 전문 트레이더',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 7000000,
            totalAssets: 11000000,
            totalReturn: 10.0,
            realizedPL: 500000,
            unrealizedPL: 500000,
          },
        },
      },
      include: { portfolio: true },
    }),
    prisma.user.create({
      data: {
        email: 'testuser3@test.com',
        password: hashedPassword,
        username: 'longterm_park',
        displayName: '장투박씨',
        bio: '장기투자로 승부합니다',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 3000000,
            totalAssets: 10500000,
            totalReturn: 5.0,
            realizedPL: 200000,
            unrealizedPL: 300000,
          },
        },
      },
      include: { portfolio: true },
    }),
    prisma.user.create({
      data: {
        email: 'testuser4@test.com',
        password: hashedPassword,
        username: 'newbie_choi',
        displayName: '초보최씨',
        bio: '이제 막 시작한 초보입니다',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 9500000,
            totalAssets: 9800000,
            totalReturn: -2.0,
            realizedPL: -100000,
            unrealizedPL: -100000,
          },
        },
      },
      include: { portfolio: true },
    }),
    prisma.user.create({
      data: {
        email: 'testuser5@test.com',
        password: hashedPassword,
        username: 'value_jung',
        displayName: '가치투자정씨',
        bio: '워렌버핏을 존경합니다',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 4000000,
            totalAssets: 11800000,
            totalReturn: 18.0,
            realizedPL: 800000,
            unrealizedPL: 1000000,
          },
        },
      },
      include: { portfolio: true },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create holdings for users
  console.log('📊 Creating holdings...')
  await Promise.all([
    // User 1: 삼성전자, 카카오
    prisma.holding.create({
      data: {
        portfolioId: users[0].portfolio!.id,
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 100,
        avgPrice: 70000,
        currentPrice: 75000,
      },
    }),
    prisma.holding.create({
      data: {
        portfolioId: users[0].portfolio!.id,
        stockCode: '035720',
        stockName: '카카오',
        quantity: 50,
        avgPrice: 50000,
        currentPrice: 55000,
      },
    }),
    // User 2: NAVER
    prisma.holding.create({
      data: {
        portfolioId: users[1].portfolio!.id,
        stockCode: '035420',
        stockName: 'NAVER',
        quantity: 20,
        avgPrice: 180000,
        currentPrice: 200000,
      },
    }),
    // User 3: 현대차
    prisma.holding.create({
      data: {
        portfolioId: users[2].portfolio!.id,
        stockCode: '005380',
        stockName: '현대차',
        quantity: 30,
        avgPrice: 200000,
        currentPrice: 210000,
      },
    }),
    // User 5: SK하이닉스
    prisma.holding.create({
      data: {
        portfolioId: users[4].portfolio!.id,
        stockCode: '000660',
        stockName: 'SK하이닉스',
        quantity: 40,
        avgPrice: 120000,
        currentPrice: 140000,
      },
    }),
  ])

  console.log('✅ Created holdings')

  // Create transactions
  console.log('💸 Creating transactions...')
  await Promise.all([
    prisma.transaction.create({
      data: {
        userId: users[0].id,
        type: 'BUY',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 100,
        price: 70000,
        totalAmount: 7000000,
        fee: 10500,
        note: '삼성전자 장기투자 목적으로 매수',
      },
    }),
    prisma.transaction.create({
      data: {
        userId: users[0].id,
        type: 'BUY',
        stockCode: '035720',
        stockName: '카카오',
        quantity: 50,
        price: 50000,
        totalAmount: 2500000,
        fee: 3750,
        note: '카카오 성장 기대',
      },
    }),
    prisma.transaction.create({
      data: {
        userId: users[1].id,
        type: 'BUY',
        stockCode: '035420',
        stockName: 'NAVER',
        quantity: 20,
        price: 180000,
        totalAmount: 3600000,
        fee: 5400,
        note: 'NAVER 단타 매수',
      },
    }),
  ])

  console.log('✅ Created transactions')

  // Create posts (without manual counts)
  console.log('📝 Creating posts...')
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        userId: users[0].id,
        title: '삼성전자 100주 매수 후기',
        content:
          '오늘 삼성전자 100주를 70,000원에 매수했습니다. 반도체 업황이 회복될 것으로 보여 장기 보유할 계획입니다.',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 7.14,
        isVerified: true,
        viewCount: 150,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[0].id,
        title: '카카오 매수 전략',
        content: '카카오가 저평가되어 있다고 판단하여 50주 매수했습니다.',
        stockCode: '035720',
        stockName: '카카오',
        returnRate: 10.0,
        isVerified: true,
        viewCount: 98,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[1].id,
        title: 'NAVER 단타 성공!',
        content:
          'NAVER를 180,000원에 매수해서 200,000원에 매도 성공! 11% 수익 달성했습니다.',
        stockCode: '035420',
        stockName: 'NAVER',
        returnRate: 11.11,
        isVerified: true,
        viewCount: 220,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[2].id,
        title: '현대차 장기 투자 시작',
        content: '현대차의 전기차 사업 성장을 기대하며 장기 투자를 시작합니다.',
        stockCode: '005380',
        stockName: '현대차',
        returnRate: 5.0,
        isVerified: true,
        viewCount: 76,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[3].id,
        title: '초보 투자자의 첫 매수',
        content: '처음으로 주식을 샀습니다. 너무 떨려요!',
        viewCount: 45,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[4].id,
        title: 'SK하이닉스 분석',
        content:
          'SK하이닉스의 실적이 개선되고 있습니다. 메모리 반도체 시장이 회복 중입니다.',
        stockCode: '000660',
        stockName: 'SK하이닉스',
        returnRate: 16.67,
        isVerified: true,
        viewCount: 189,
      },
    }),
    prisma.post.create({
      data: {
        userId: users[4].id,
        title: '가치투자의 기본 원칙',
        content:
          '워렌 버핏의 가치투자 원칙을 한국 시장에 적용하는 방법에 대해 공유합니다.',
        viewCount: 312,
      },
    }),
  ])

  console.log(`✅ Created ${posts.length} posts`)

  // Create follow relationships
  console.log('👥 Creating follow relationships...')
  await Promise.all([
    // User 2, 3, 4, 5 follow User 1 (투자왕김씨)
    prisma.follow.create({
      data: { followerId: users[1].id, followingId: users[0].id },
    }),
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[0].id },
    }),
    prisma.follow.create({
      data: { followerId: users[3].id, followingId: users[0].id },
    }),
    prisma.follow.create({
      data: { followerId: users[4].id, followingId: users[0].id },
    }),
    // User 1, 3, 4 follow User 2 (단타매니아이씨)
    prisma.follow.create({
      data: { followerId: users[0].id, followingId: users[1].id },
    }),
    prisma.follow.create({
      data: { followerId: users[2].id, followingId: users[1].id },
    }),
    prisma.follow.create({
      data: { followerId: users[3].id, followingId: users[1].id },
    }),
    // User 4 follows User 5 (가치투자정씨)
    prisma.follow.create({
      data: { followerId: users[3].id, followingId: users[4].id },
    }),
  ])

  console.log('✅ Created follow relationships')

  // Create likes
  console.log('❤️  Creating likes...')
  await Promise.all([
    prisma.like.create({
      data: { userId: users[1].id, postId: posts[0].id },
    }),
    prisma.like.create({
      data: { userId: users[2].id, postId: posts[0].id },
    }),
    prisma.like.create({
      data: { userId: users[3].id, postId: posts[0].id },
    }),
    prisma.like.create({
      data: { userId: users[0].id, postId: posts[2].id },
    }),
    prisma.like.create({
      data: { userId: users[4].id, postId: posts[2].id },
    }),
  ])

  console.log('✅ Created likes')

  // Create comments
  console.log('💬 Creating comments...')
  await Promise.all([
    prisma.comment.create({
      data: {
        userId: users[1].id,
        postId: posts[0].id,
        content: '좋은 선택이시네요! 저도 삼성전자 관심있습니다.',
      },
    }),
    prisma.comment.create({
      data: {
        userId: users[2].id,
        postId: posts[0].id,
        content: '반도체 업황 회복 기대됩니다.',
      },
    }),
    prisma.comment.create({
      data: {
        userId: users[0].id,
        postId: posts[2].id,
        content: '단타 고수시네요! 축하드립니다!',
      },
    }),
    prisma.comment.create({
      data: {
        userId: users[2].id,
        postId: posts[4].id,
        content: '초보분 화이팅! 저도 얼마 안됐어요.',
      },
    }),
  ])

  console.log('✅ Created comments')

  // Update post counts based on actual data
  console.log('🔄 Updating post counts...')
  for (const post of posts) {
    const commentCount = await prisma.comment.count({
      where: { postId: post.id },
    })
    const likeCount = await prisma.like.count({
      where: { postId: post.id },
    })

    await prisma.post.update({
      where: { id: post.id },
      data: {
        commentCount,
        likeCount,
      },
    })
  }

  console.log('✅ Updated post counts')

  // Create rankings
  console.log('🏆 Creating rankings...')
  const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const
  const sortedUsers = [...users].sort(
    (a, b) => b.portfolio!.totalReturn - a.portfolio!.totalReturn
  )

  for (const period of periods) {
    await Promise.all(
      sortedUsers.map((user, index) =>
        prisma.ranking.create({
          data: {
            userId: user.id,
            rank: index + 1,
            totalReturn: user.portfolio!.totalReturn,
            period,
          },
        })
      )
    )
  }

  console.log('✅ Created rankings')

  console.log('\n🎉 Database seed completed successfully (RESET MODE)!')
  console.log('\n📊 Summary:')
  console.log(`   - Users: ${users.length}`)
  console.log(`   - Posts: ${posts.length}`)
  console.log(`   - Holdings: 5`)
  console.log(`   - Transactions: 3`)
  console.log(`   - Follow relationships: 8`)
  console.log(`   - Rankings: ${periods.length * users.length}`)
  console.log('\n🔑 Login credentials:')
  console.log('   Email: testuser1@test.com ~ testuser5@test.com')
  console.log('   Password: password123')
}
