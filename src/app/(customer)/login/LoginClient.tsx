'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/providers/AuthProvider';
import { looksLikeEmail } from '@/lib/validations/auth';
import {
  loginWithEmailPassword,
  resolveWhatsapp,
  errorCode,
  firebaseAuthMessage,
} from '@/lib/firebase/auth-actions';

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const toast = useToast();
  const redirect = params.get('redirect') || '/';

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Already signed in → bounce to the intended destination.
  React.useEffect(() => {
    if (status === 'authenticated') router.replace(redirect);
  }, [status, redirect, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Email/No. WhatsApp dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      // Resolve the email: direct for an email identifier, or via the server-side
      // WA→email lookup for a phone number (never queried from the client).
      let email = identifier.trim();
      if (!looksLikeEmail(identifier)) {
        const resolved = await resolveWhatsapp(identifier);
        if (resolved.authProvider === 'google') {
          setError(
            'Akun ini terdaftar via Google. Silakan masuk dengan tombol "Lanjutkan dengan Google".'
          );
          setLoading(false);
          return;
        }
        email = resolved.email;
      }

      await loginWithEmailPassword(email, password);
      toast.success('Berhasil masuk. Selamat datang kembali! 🎉');
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      setLoading(false);
      if (e instanceof Error && e.message === 'NOT_FOUND') {
        setError('Email/No. WhatsApp atau kata sandi salah.');
        return;
      }
      setError(firebaseAuthMessage(errorCode(e)));
    }
  }

  return (
    <AuthShell
      title="Masuk"
      subtitle="Masuk untuk mengelola booking dan profil Anda."
      footer={
        <>
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <GoogleButton redirect={redirect} />
      <AuthDivider label="atau masuk dengan email" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email atau No. WhatsApp" htmlFor="identifier" required>
          <Input
            id="identifier"
            autoComplete="username"
            value={identifier}
            invalid={!!error}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="nama@email.com atau 0812xxxxxxxx"
          />
        </Field>

        <Field label="Kata sandi" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              invalid={!!error}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {loading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
        Dengan melanjutkan, Anda menyetujui{' '}
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Syarat &amp; Ketentuan
        </Link>{' '}
        dan{' '}
        <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
          Kebijakan Privasi
        </Link>{' '}
        kami.
      </p>
    </AuthShell>
  );
}
