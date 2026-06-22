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
import { registerSchema } from '@/lib/validations/auth';
import { registerUser } from '@/app/actions/register';
import { loginWithEmailPassword } from '@/lib/firebase/auth-actions';

/** Group local digits into readable blocks, e.g. 812-3456-7890. */
function formatLocal(digits: string): string {
  return digits.match(/.{1,4}/g)?.join('-') ?? digits;
}

/** Strip to the national part: drop non-digits, a leading 62, and a leading 0. */
function toLocalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('62')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 13);
}

type Errors = Partial<Record<'name' | 'email' | 'whatsapp' | 'password' | 'confirmPassword', string>>;

export function RegisterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const toast = useToast();
  const redirect = params.get('redirect') || '/dashboard';

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [wa, setWa] = React.useState(''); // national digits, without +62
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (status === 'authenticated') router.replace(redirect);
  }, [status, redirect, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const payload = { name, email, whatsapp: wa, password, confirmPassword };

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !(key in next)) {
          next[key as keyof Errors] = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);

    const res = await registerUser(payload);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setFormError(res.error);
      setLoading(false);
      return;
    }

    // Auto-login: sign in with the credentials just created, then redirect.
    try {
      await loginWithEmailPassword(parsed.data.email, password);
      toast.success('Akun berhasil dibuat. Selamat datang! 🎉');
      router.push(redirect);
      router.refresh();
    } catch {
      setLoading(false);
      // Account exists but auto-login hiccuped — send them to login to retry.
      toast.info('Akun dibuat. Silakan masuk untuk melanjutkan.');
      router.push('/login');
    }
  }

  return (
    <AuthShell
      title="Buat Akun"
      subtitle="Daftar gratis untuk mulai memesan jasa tukang terpercaya."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <GoogleButton redirect={redirect} label="Daftar dengan Google" />
      <AuthDivider label="atau daftar dengan email" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Nama lengkap" htmlFor="name" required error={errors.name}>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Budi Santoso"
          />
        </Field>

        <Field label="Email" htmlFor="email" required error={errors.email}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            invalid={!!errors.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
          />
        </Field>

        <Field
          label="Nomor WhatsApp"
          htmlFor="wa"
          required
          error={errors.whatsapp}
          hint="Dipakai penyedia jasa untuk menghubungi Anda soal pesanan."
        >
          <div
            className={
              'flex items-stretch overflow-hidden rounded-xl border bg-card shadow-soft transition-all focus-within:ring-4 focus-within:ring-primary/10 ' +
              (errors.whatsapp
                ? 'border-red-400 focus-within:border-red-500'
                : 'border-border focus-within:border-primary/50')
            }
          >
            <span className="flex items-center border-r border-border bg-muted/40 px-3.5 text-sm font-semibold text-muted-foreground">
              +62
            </span>
            <input
              id="wa"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={formatLocal(wa)}
              onChange={(e) => setWa(toLocalDigits(e.target.value))}
              placeholder="812-3456-7890"
              className="h-11 w-full bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </Field>

        <Field
          label="Kata sandi"
          htmlFor="password"
          required
          error={errors.password}
          hint="Minimal 8 karakter, kombinasi huruf dan angka."
        >
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              invalid={!!errors.password}
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

        <Field label="Konfirmasi kata sandi" htmlFor="confirm" required error={errors.confirmPassword}>
          <Input
            id="confirm"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            invalid={!!errors.confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {formError && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          {loading ? 'Memproses...' : 'Daftar'}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
        Dengan mendaftar, Anda menyetujui{' '}
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
