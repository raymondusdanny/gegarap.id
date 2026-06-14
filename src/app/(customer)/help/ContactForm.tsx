'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { contactSchema, fieldErrors } from '@/lib/validations';

export function ContactForm() {
  const toast = useToast();
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        if (json.errors) setErrors(json.errors);
        toast.error('Gagal mengirim pesan', json.message ?? 'Silakan coba lagi.');
        return;
      }

      toast.success('Pesan terkirim!', 'Tim kami akan membalas via email Anda.');
      setForm({ name: '', email: '', message: '' });
    } catch {
      toast.error('Koneksi bermasalah', 'Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nama Anda"
            invalid={!!errors.name}
          />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="email@anda.com"
            invalid={!!errors.email}
          />
        </Field>
      </div>
      <Field label="Pesan" required error={errors.message} className="mt-5">
        <Textarea
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          rows={4}
          placeholder="Ceritakan kebutuhan atau kendala Anda..."
          invalid={!!errors.message}
        />
      </Field>
      <Button type="submit" size="lg" loading={submitting} className="mt-5 w-full sm:w-auto">
        {!submitting && <Send className="h-4 w-4" />}
        {submitting ? 'Mengirim...' : 'Kirim'}
      </Button>
    </form>
  );
}
