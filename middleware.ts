import { withAuth } from 'next-auth/middleware'

// Protect routes that require editor login.
// All other routes (dashboard, expenses, budget, assets, trends) are public.
export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/expenses/new',
    // API write endpoints are protected inside each route handler via getServerSession.
    // This matcher only protects the UI pages.
  ],
}
