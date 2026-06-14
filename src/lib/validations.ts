import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .regex(/^0[0-9]{9,13}$/, 'Nomor harus diawali 0 dan terdiri dari 10–14 digit');

export const bookingSchema = z.object({
  providerProfileId: z.string().min(1, 'Provider tidak valid'),
  customerName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  customerWaNumber: phone,
  customerAddress: z.string().trim().min(10, 'Alamat terlalu pendek (min. 10 karakter)').max(300),
  estimatedDays: z.coerce.number().int().min(1, 'Minimal 1 hari').max(30, 'Maksimal 30 hari'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  isConsentGiven: z.boolean().refine((v) => v === true, 'Anda harus menyetujui penyimpanan data'),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const PROVIDER_CATEGORIES = [
  'Tukang Ledeng',
  'Tukang Listrik',
  'Pembersih Rumah',
  'Tukang Kebun',
  'Tukang Bangunan',
] as const;

export const providerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().email('Email tidak valid'),
  phoneNumber: phone.optional().or(z.literal('')),
  category: z.enum(PROVIDER_CATEGORIES, { message: 'Pilih kategori keahlian' }),
  dailyRate: z.coerce
    .number()
    .min(50_000, 'Tarif minimal Rp 50.000')
    .max(5_000_000, 'Tarif maksimal Rp 5.000.000'),
  goPayNumber: phone,
  bio: z.string().trim().max(500).optional().or(z.literal('')),
});

export type ProviderInput = z.infer<typeof providerSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(80),
  email: z.string().trim().email('Email tidak valid'),
  message: z.string().trim().min(10, 'Pesan terlalu pendek (min. 10 karakter)').max(1000),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Flattens a ZodError into a `{ field: message }` map for the UI. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
