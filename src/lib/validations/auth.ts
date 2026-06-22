import { z } from 'zod';
import { normalizePhone, isValidIndonesianPhone } from '@/lib/whatsapp';

// Re-export the phone helpers so auth callers have a single import site.
export { normalizePhone, isValidIndonesianPhone };

/** Plain email shape check — kept local so we can reuse it for identifier routing. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when an input looks like an email (used to route the login identifier). */
export function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * WhatsApp number field. Accepts `08xxxxxxxxxx` or `+628xxxxxxxxxx` (spaces and
 * dashes tolerated) and normalises to the app's canonical `628xxxxxxxxxx` form.
 *
 * NOTE: storage is digits-only `628…`, NOT `+62…`. That is the format every
 * existing row and helper already uses (normalizePhone / maskPhone / the WA
 * notification sender), so storing `+62…` would defeat the `phone` unique
 * constraint against existing users and break display/notifications. The UI
 * renders the `+62` prefix purely for presentation.
 */
export const waNumberSchema = z
  .string()
  .min(1, 'Nomor WhatsApp wajib diisi')
  .transform((v) => normalizePhone(v))
  .refine(isValidIndonesianPhone, 'Format nomor WhatsApp tidak valid (contoh: 0812xxxx atau +62812xxxx)');

/** At least 8 chars with both a letter and a digit. */
const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Kata sandi harus mengandung huruf')
  .regex(/[0-9]/, 'Kata sandi harus mengandung angka');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter').max(80, 'Nama terlalu panjang'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => EMAIL_RE.test(v), 'Format email tidak valid'),
    whatsapp: waNumberSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak sama',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterParsed = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email atau No. WhatsApp wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type LoginInput = z.infer<typeof loginSchema>;
