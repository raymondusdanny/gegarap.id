'use server';

import { Prisma } from '@prisma/client';
import { adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';
import { getSessionUid } from '@/lib/firebase/session';
import { waNumberSchema } from '@/lib/validations/auth';

export type UpdateWhatsappResult = { ok: true; phone: string } | { ok: false; error: string };

/**
 * Save the WhatsApp number for the signed-in user (the non-blocking dashboard
 * prompt for Google sign-ups). Writes the Postgres mirror (authoritative,
 * `phone @unique`) and the Firestore profile so resolve-identifier stays in sync.
 * Plain contact data — no verification.
 */
export async function updateWhatsapp(raw: string): Promise<UpdateWhatsappResult> {
  const uid = await getSessionUid();
  if (!uid) return { ok: false, error: 'Sesi tidak valid. Silakan masuk kembali.' };

  const parsed = waNumberSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Nomor WhatsApp tidak valid.' };
  }
  const phone = parsed.data;

  const taken = await prisma.user.findFirst({
    where: { phone, NOT: { id: uid } },
    select: { id: true },
  });
  if (taken) return { ok: false, error: 'Nomor WhatsApp sudah dipakai akun lain.' };

  try {
    await prisma.user.update({ where: { id: uid }, data: { phone } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, error: 'Nomor WhatsApp sudah dipakai akun lain.' };
    }
    throw e;
  }

  await adminDb.collection('users').doc(uid).set({ whatsapp: phone }, { merge: true });
  return { ok: true, phone };
}
