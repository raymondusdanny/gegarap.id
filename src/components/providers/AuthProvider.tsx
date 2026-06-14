'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Client wrapper around NextAuth's SessionProvider so `useSession()` works
 * anywhere in the tree. Mounted once in the root layout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
