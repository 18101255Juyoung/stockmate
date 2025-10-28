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
              Trading
            </Link>
            <Link href="/portfolio" className="hover:text-blue-600">
              Portfolio
            </Link>
            <Link href="/journal" className="hover:text-blue-600">
              Journal
            </Link>
            <Link href="/community" className="hover:text-blue-600">
              Community
            </Link>
            <Link href="/ranking" className="hover:text-blue-600">
              Ranking
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {status === 'loading' ? (
              <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
            ) : session ? (
              <>
                <span className="text-sm font-medium">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm hover:text-blue-600"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
