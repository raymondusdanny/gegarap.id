import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Stub the Firebase client auth context so client components that call
 * useSession() render under jsdom without initializing Firebase. Returns an
 * unauthenticated session by default.
 */
vi.mock('@/components/providers/AuthProvider', () => ({
  __esModule: true,
  useSession: () => ({ data: null, status: 'unauthenticated', update: vi.fn() }),
  signOutFull: vi.fn(),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

// Guard against any accidental real Firebase initialization in unit tests.
vi.mock('@/lib/firebase/client', () => ({ auth: {}, db: {} }));
