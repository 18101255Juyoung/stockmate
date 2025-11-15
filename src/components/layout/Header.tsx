'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            StockMate
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/trading" className="hover:text-blue-600">
              모의투자
            </Link>
            <Link href="/portfolio" className="hover:text-blue-600">
              포트폴리오
            </Link>
            <Link href="/journal" className="hover:text-blue-600">
              투자일지
            </Link>
            <Link href="/community" className="hover:text-blue-600">
              커뮤니티
            </Link>
            <Link href="/ranking" className="hover:text-blue-600">
              랭킹
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="px-4 py-2 text-sm text-gray-400">로딩중...</div>
            ) : session ? (
              <>
                <Link
                  href={`/profile/${session.user?.username}`}
                  className="text-sm font-medium hover:text-blue-600 transition-colors"
                >
                  {session.user?.name || session.user?.email}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm hover:text-blue-600"
                >
                  로그인
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
