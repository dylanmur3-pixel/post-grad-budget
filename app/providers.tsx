'use client'

// SessionProvider must be a client component.
// This wrapper lets us use useSession() anywhere in the app.

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
