'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { loginWithGoogle, errorCode, firebaseAuthMessage } from '@/lib/firebase/auth-actions';

/** Google "G" mark (official four-colour logo). */
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

/**
 * "Lanjutkan dengan Google" — Firebase popup OAuth, then establishes the server
 * session cookie and navigates to `redirect`.
 */
export function GoogleButton({
  redirect,
  label = 'Lanjutkan dengan Google',
}: {
  redirect: string;
  label?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push(redirect);
      router.refresh();
    } catch (e) {
      setLoading(false);
      const code = errorCode(e);
      // A user closing the popup isn't an error worth shouting about.
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error(firebaseAuthMessage(code));
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      loading={loading}
      onClick={handleClick}
      className="w-full"
    >
      {!loading && <GoogleIcon />}
      {label}
    </Button>
  );
}
