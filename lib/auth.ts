import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

// NextAuth configuration.
// There is one editor account — Dylan.
// Credentials are stored in environment variables (never in code).
// Everyone else just views the site without logging in — no account needed.

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Editor Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validUsername = process.env.EDITOR_USERNAME
        const validPassword = process.env.EDITOR_PASSWORD

        if (!validUsername || !validPassword) {
          console.error('EDITOR_USERNAME or EDITOR_PASSWORD not set in environment variables')
          return null
        }

        if (
          credentials?.username === validUsername &&
          credentials?.password === validPassword
        ) {
          // Return a user object — NextAuth stores this in the session
          return {
            id: '1',
            name: credentials.username,
            email: `${credentials.username}@budget.local`,
          }
        }

        return null
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days — stay logged in for a month
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
