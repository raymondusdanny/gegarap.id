import prisma from '@/lib/prisma';
import { ok, fail, handle } from '@/lib/api';
import { providerSchema } from '@/lib/validations';

export async function GET() {
  return handle(async () => {
    const providers = await prisma.providerProfile.findMany({
      where: { isVerified: true },
      include: { user: { select: { name: true } } },
      orderBy: { rating: 'desc' },
    });
    return ok(providers);
  })();
}

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const input = providerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return fail('Email sudah terdaftar.', 409, { email: 'Email ini sudah digunakan.' });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber || null,
        role: 'PROVIDER',
        providerProfile: {
          create: {
            category: input.category,
            dailyRate: input.dailyRate,
            goPayNumber: input.goPayNumber,
            bio: input.bio || null,
            isVerified: false, // pending KYC review
          },
        },
      },
      include: { providerProfile: true },
    });

    return ok({ providerProfileId: user.providerProfile?.id, name: user.name }, 201);
  })();
}
