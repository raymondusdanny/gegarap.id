import { getSessionUid } from '@/lib/firebase/session';
import prisma from './prisma';

/**
 * Authorise an admin-only API request. Returns the admin's user id, or null if
 * the caller isn't a signed-in ADMIN.
 *
 * Role is re-read from Postgres (not trusted from the token/Firestore mirror) so
 * a demoted admin with a still-valid cookie can't keep acting as one — admin
 * actions are sensitive enough to warrant the extra lookup.
 */
export async function requireAdmin(): Promise<{ id: string } | null> {
  const uid = await getSessionUid();
  if (!uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') return null;

  return { id: uid };
}
