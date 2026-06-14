'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { MessageCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { OtpInput } from '@/components/auth/OtpInput';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const RESEND_SECONDS = 60;

/** Group local digits into readable blocks, e.g. 812-3456-7890. */
function formatLocal(digits: string): string {
  return digits.match(/.{1,4}/g)?.join('-') ?? digits;
}

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const toast = useToast();
  const redirect = params.get('redirect') || '/dashboard';

  const [stage, setStage] = React.useState<'phone' | 'otp'>('phone');
  const [local, setLocal] = React.useState(''); // local digits, without +62
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState('');
  const [seconds, setSeconds] = React.useState(0);
  const [resetSignal, setResetSignal] = React.useState(0);

  // Already signed in → bounce to intended destination.
  React.useEffect(() => {
    if (status === 'authenticated') router.replace(redirect);
  }, [status, redirect, router]);

  // Resend countdown.
  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  async function requestOtp() {
    setError('');
    if (local.length < 9) {
      setError('Masukkan nomor WhatsApp yang valid.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: local }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Gagal mengirim OTP. Coba lagi.');
        return;
      }
      setStage('otp');
      setSeconds(RESEND_SECONDS);
      setResetSignal((n) => n + 1);
    } catch {
      setError('Koneksi bermasalah. Silakan coba lagi.');
    } finally {
      setSending(false);
    }
  }

  async function submitOtp(code: string) {
    setVerifying(true);
    setError('');
    const result = await signIn('whatsapp-otp', { phone: local, otp: code, redirect: false });
    setVerifying(false);

    if (result?.ok) {
      toast.success('Login berhasil. Selamat datang! 🎉');
      router.push(redirect);
    } else {
      setError('Kode salah atau sudah kedaluwarsa.');
      toast.error('Kode OTP salah atau sudah kedaluwarsa.');
      setResetSignal((n) => n + 1);
    }
  }

  function changeNumber() {
    setStage('phone');
    setError('');
    setSeconds(0);
  }

  const errorBox = error ? (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-red-600">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {error}
    </p>
  ) : null;

  if (stage === 'phone') {
    return (
      <AuthShell
        title="Masuk atau Daftar"
        subtitle="Kami kirim kode verifikasi ke WhatsApp Anda."
        footer={
          <>
            Butuh bantuan?{' '}
            <Link href="/help" className="font-semibold text-primary hover:underline">
              Pusat Bantuan
            </Link>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOtp();
          }}
        >
          <label className="text-sm font-semibold text-foreground" htmlFor="wa">
            Nomor WhatsApp
          </label>
          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
            <span className="flex items-center border-r border-border bg-muted/40 px-3.5 text-sm font-semibold text-muted-foreground">
              +62
            </span>
            <input
              id="wa"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={formatLocal(local)}
              onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="812-3456-7890"
              className="h-11 w-full bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          {errorBox}
          <Button type="submit" size="lg" loading={sending} className="mt-5 w-full">
            {sending ? 'Mengirim...' : 'Kirim Kode OTP'}
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

  return (
    <AuthShell
      title="Cek WhatsApp Anda"
      subtitle={`Kode 6 digit dikirim ke +62 ${formatLocal(local)}`}
    >
      <div className="mb-6 flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
          <MessageCircle className="h-7 w-7" />
        </span>
      </div>

      <OtpInput onComplete={submitOtp} disabled={verifying} invalid={!!error} resetSignal={resetSignal} />
      {errorBox}

      {verifying && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Memverifikasi...</p>
      )}

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <span>
            Kirim ulang kode dalam{' '}
            <span className="font-semibold text-foreground">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={requestOtp}
            disabled={sending}
            className="font-semibold text-primary hover:underline disabled:opacity-60"
          >
            {sending ? 'Mengirim ulang...' : 'Kirim Ulang Kode'}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={changeNumber}
        className="mx-auto mt-5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ganti Nomor
      </button>
    </AuthShell>
  );
}
