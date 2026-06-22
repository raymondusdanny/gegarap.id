'use client';

import * as React from 'react';
import { useSession } from '@/components/providers/AuthProvider';
import { MessageCircle, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { updateWhatsapp } from '@/app/actions/profile';

function formatLocal(d: string): string {
  return d.match(/.{1,4}/g)?.join('-') ?? d;
}
function toLocalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('62')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 13);
}

/**
 * Gentle, dismissible nudge for users (typically Google sign-ups) who have no
 * WhatsApp number yet. Entirely optional — it never blocks the dashboard.
 */
export function CompleteWhatsAppPrompt() {
  const { update } = useSession();
  const toast = useToast();
  const [wa, setWa] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [hidden, setHidden] = React.useState(false);

  if (hidden) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await updateWhatsapp(wa);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await update(); // refresh the JWT so the session no longer reports a null phone
    toast.success('Nomor WhatsApp tersimpan. Terima kasih!');
    setHidden(true);
  }

  return (
    <div className="mb-8 rounded-2xl border border-primary/20 bg-primary-light/40 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Lengkapi nomor WhatsApp Anda</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Penyedia jasa memakai nomor ini untuk menghubungi Anda soal pesanan. Opsional, bisa diisi
            nanti.
          </p>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div
                className={
                  'flex items-stretch overflow-hidden rounded-xl border bg-card shadow-soft transition-all focus-within:ring-4 focus-within:ring-primary/10 ' +
                  (error
                    ? 'border-red-400 focus-within:border-red-500'
                    : 'border-border focus-within:border-primary/50')
                }
              >
                <span className="flex items-center border-r border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground">
                  +62
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  aria-label="Nomor WhatsApp"
                  value={formatLocal(wa)}
                  onChange={(e) => setWa(toLocalDigits(e.target.value))}
                  placeholder="812-3456-7890"
                  className="h-11 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </div>
              {error && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" size="md" loading={loading} className="sm:w-auto">
              Simpan
            </Button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Tutup"
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
