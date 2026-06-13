'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { providerSchema, fieldErrors, PROVIDER_CATEGORIES } from '@/lib/validations';

export default function OnboardingForm() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phoneNumber: '',
    category: PROVIDER_CATEGORIES[0] as string,
    dailyRate: 150000,
    goPayNumber: '',
    bio: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const update = (key: keyof typeof form, value: string | number) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = providerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error('Periksa kembali isian Anda', 'Beberapa kolom belum benar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json.errors) setErrors(json.errors);
        toast.error('Pendaftaran gagal', json.message ?? 'Silakan coba lagi.');
        return;
      }

      setDone(true);
      toast.success('Profil terkirim!', 'Tim kami akan meninjau verifikasi Anda.');
    } catch {
      toast.error('Koneksi bermasalah', 'Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama Lengkap" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Budi Santoso"
                invalid={!!errors.name}
              />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="budi@email.com"
                invalid={!!errors.email}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Kategori Keahlian" required error={errors.category}>
              <Select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                invalid={!!errors.category}
              >
                {PROVIDER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarif Harian (Rp)" required error={errors.dailyRate}>
              <Input
                type="number"
                min={50000}
                step={10000}
                value={form.dailyRate}
                onChange={(e) => update('dailyRate', Number(e.target.value) || 0)}
                invalid={!!errors.dailyRate}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nomor WhatsApp" error={errors.phoneNumber} hint="Opsional">
              <Input
                value={form.phoneNumber}
                onChange={(e) => update('phoneNumber', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="08123456789"
                inputMode="numeric"
                invalid={!!errors.phoneNumber}
              />
            </Field>
            <Field label="Nomor GoPay (Pencairan)" required error={errors.goPayNumber}>
              <Input
                value={form.goPayNumber}
                onChange={(e) => update('goPayNumber', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="08123456789"
                inputMode="numeric"
                leftIcon={<Wallet className="h-4 w-4" />}
                invalid={!!errors.goPayNumber}
              />
            </Field>
          </div>

          <Field
            label="Deskripsi Singkat"
            error={errors.bio}
            hint="Ceritakan pengalaman & keahlian Anda (opsional)."
          >
            <Textarea
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              rows={3}
              placeholder="Spesialis instalasi pipa air dengan 8 tahun pengalaman..."
              invalid={!!errors.bio}
            />
          </Field>

          <Field
            label="Upload KTP (KYC)"
            hint="Untuk verifikasi identitas — wajib sebelum profil aktif."
          >
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">Klik untuk upload foto KTP</p>
              <p className="text-xs text-muted-foreground">PNG, JPG hingga 5MB</p>
            </div>
          </Field>

          <Button type="submit" size="lg" variant="dark" loading={submitting} className="w-full">
            {submitting ? 'Mengirim...' : 'Kirim Profil untuk Verifikasi'}
          </Button>
        </div>
      </form>

      <Modal
        open={done}
        onClose={() => {
          setDone(false);
          router.push('/dashboard');
        }}
        className="text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2 className="h-9 w-9 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Profil Terkirim! 🎉</h2>
        <p className="mt-2 text-muted-foreground">
          Terima kasih,{' '}
          <span className="font-semibold text-foreground">{form.name || 'Mitra'}</span>. Tim kami
          akan meninjau data Anda dalam 1–2 hari kerja. Anda akan diberi tahu via email setelah
          profil terverifikasi.
        </p>
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            setDone(false);
            router.push('/dashboard');
          }}
        >
          Lihat Dashboard
        </Button>
      </Modal>
    </>
  );
}
