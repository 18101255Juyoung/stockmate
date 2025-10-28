import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { loginUser } from '@/lib/services/authService'

/**
 * NextAuth configuration
 * Handles authentication with email/password using Credentials Provider
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Call our login service
        const result = await loginUser({
          email: credentials.email,
          password: credentials.password,
        })

        if (result.success) {
          // Return user object that will be stored in the session
          return {
            id: result.data.userId,
            email: result.data.email,
            name: result.data.displayName,
            username: result.data.username,
          }
        }

        // Return null if login fails
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      // Add user info to session
      if (session.user) {
        session.user.id = token.id
        session.user.username = token.username
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
