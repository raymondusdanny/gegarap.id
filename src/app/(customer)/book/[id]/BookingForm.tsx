'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { calculateJobFinancials } from '@/lib/calculations';
import { formatCurrency, cn } from '@/lib/utils';
import { bookingSchema, fieldErrors } from '@/lib/validations';

interface BookingFormProps {
  provider: {
    id: string;
    name: string;
    category: string;
    dailyRate: number;
    rating: number;
    ratingCount: number;
  };
}

interface SuccessData {
  dpAmount: number;
  totalFee: number;
}

export default function BookingForm({ provider }: BookingFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = React.useState({
    customerName: '',
    customerWaNumber: '',
    customerAddress: '',
    estimatedDays: 1,
    notes: '',
  });
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<SuccessData | null>(null);

  const financials = calculateJobFinancials(provider.dailyRate, form.estimatedDays || 1);

  const update = (key: keyof typeof form, value: string | number) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = { ...form, providerProfileId: provider.id, isConsentGiven: consent };
    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error('Periksa kembali isian Anda', 'Beberapa kolom belum benar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json.errors) setErrors(json.errors);
        toast.error('Booking gagal', json.message ?? 'Silakan coba lagi.');
        return;
      }

      setSuccess({ dpAmount: json.data.dpAmount, totalFee: json.data.totalFee });
      toast.success('Booking berhasil dibuat!', 'Lanjutkan ke pembayaran DP.');
    } catch {
      toast.error('Koneksi bermasalah', 'Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
        {/* Form fields */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8 lg:col-span-3">
          <div className="space-y-5">
            <Field label="Nama Lengkap" required error={errors.customerName}>
              <Input
                value={form.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                placeholder="Budi Santoso"
                invalid={!!errors.customerName}
                autoComplete="name"
              />
            </Field>

            <Field
              label="Nomor WhatsApp"
              required
              error={errors.customerWaNumber}
              hint={!errors.customerWaNumber ? 'Tukang akan menghubungi via nomor ini.' : undefined}
            >
              <Input
                value={form.customerWaNumber}
                onChange={(e) => update('customerWaNumber', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="08123456789"
                inputMode="numeric"
                invalid={!!errors.customerWaNumber}
                autoComplete="tel"
              />
            </Field>

            <Field label="Alamat Lengkap (DIY)" required error={errors.customerAddress}>
              <Textarea
                value={form.customerAddress}
                onChange={(e) => update('customerAddress', e.target.value)}
                rows={3}
                placeholder="Jl. Kaliurang KM 5, Sleman, Yogyakarta..."
                invalid={!!errors.customerAddress}
              />
            </Field>

            <Field label="Estimasi Hari Kerja" required error={errors.estimatedDays}>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.estimatedDays}
                onChange={(e) =>
                  update('estimatedDays', Math.max(1, Math.min(30, Number(e.target.value) || 1)))
                }
                invalid={!!errors.estimatedDays}
              />
            </Field>

            <Field label="Catatan untuk Tukang" hint="Opsional — jelaskan detail pekerjaan.">
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={2}
                placeholder="Contoh: keran dapur bocor dan saluran air mampet."
              />
            </Field>
          </div>
        </div>

        {/* Summary (sticky on desktop) */}
        <div className="lg:col-span-2">
          <div className="space-y-5 lg:sticky lg:top-24">
            {/* Provider mini-card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar name={provider.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{provider.name}</p>
                  <Badge variant="primary" className="mt-1">
                    {provider.category}
                  </Badge>
                </div>
              </div>
              <div className="mt-3">
                <Rating value={provider.rating} count={provider.ratingCount} />
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-bold text-foreground">Rincian Biaya</h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Tarif harian</dt>
                  <dd>{formatCurrency(provider.dailyRate)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Total jasa ({form.estimatedDays || 1} hari)</dt>
                  <dd>{formatCurrency(financials.totalFee)}</dd>
                </div>
                <div className="my-3 border-t border-border" />
                <div className="flex items-center justify-between">
                  <dt className="font-bold text-foreground">DP dibayar sekarang</dt>
                  <dd className="text-xl font-extrabold text-primary">
                    {formatCurrency(financials.dpAmount)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Sisa {formatCurrency(financials.totalFee - financials.dpAmount)} dibayar setelah
                pekerjaan selesai.
              </p>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setErrors((er) => ({ ...er, isConsentGiven: '' }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Saya setuju data WhatsApp & alamat disimpan untuk keperluan pekerjaan.
                </span>
              </label>
              {errors.isConsentGiven && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{errors.isConsentGiven}</p>
              )}

              <Button type="submit" size="lg" loading={submitting} className="mt-5 w-full">
                {submitting ? 'Memproses...' : `Bayar DP ${formatCurrency(financials.dpAmount)}`}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Pembayaran aman via Midtrans
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Success modal */}
      <Modal
        open={!!success}
        onClose={() => {
          setSuccess(null);
          router.push('/search');
        }}
        className="text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2 className="h-9 w-9 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Booking Berhasil! 🎉</h2>
        <p className="mt-2 text-muted-foreground">
          Pesanan Anda untuk <span className="font-semibold text-foreground">{provider.name}</span>{' '}
          telah dibuat. Selesaikan pembayaran DP sebesar{' '}
          <span className="font-bold text-primary">
            {success ? formatCurrency(success.dpAmount) : ''}
          </span>{' '}
          untuk mengamankan jadwal.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            <MessageCircle className="h-5 w-5" />
            Lanjut Bayar DP (Mock Midtrans)
          </a>
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}
            onClick={() => setSuccess(null)}
          >
            Kembali ke pencarian
          </Link>
        </div>
      </Modal>
    </>
  );
}
