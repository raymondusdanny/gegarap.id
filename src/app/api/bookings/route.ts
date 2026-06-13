import prisma from '@/lib/prisma';
import { ok, fail, handle } from '@/lib/api';
import { bookingSchema } from '@/lib/validations';
import { calculateJobFinancials } from '@/lib/calculations';

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const input = bookingSchema.parse(body);

    const provider = await prisma.providerProfile.findUnique({
      where: { id: input.providerProfileId },
      include: { user: { select: { name: true } } },
    });
    if (!provider) return fail('Tukang tidak ditemukan.', 404);

    const financials = calculateJobFinancials(provider.dailyRate, input.estimatedDays);

    // A guest customer is created/reused from their WhatsApp number so a Job
    // (which requires a User) can always be recorded without forcing sign-in.
    const guestEmail = `wa-${input.customerWaNumber}@guest.gegarap.id`;
    const customer = await prisma.user.upsert({
      where: { email: guestEmail },
      update: { name: input.customerName, phoneNumber: input.customerWaNumber },
      create: {
        name: input.customerName,
        email: guestEmail,
        phoneNumber: input.customerWaNumber,
        role: 'CUSTOMER',
      },
    });

    const job = await prisma.job.create({
      data: {
        customerId: customer.id,
        providerProfileId: provider.id,
        estimatedDays: input.estimatedDays,
        customerAddress: input.customerAddress,
        customerWaNumber: input.customerWaNumber,
        notes: input.notes || null,
        isConsentGiven: input.isConsentGiven,
        totalFee: financials.totalFee,
        platformCommission: financials.platformCommission,
        providerPayout: financials.providerPayout,
        status: 'PENDING',
        payments: {
          create: {
            amount: financials.dpAmount,
            type: 'DP',
            status: 'PENDING',
          },
        },
      },
      include: { payments: true },
    });

    return ok(
      {
        jobId: job.id,
        providerName: provider.user.name,
        dpAmount: financials.dpAmount,
        totalFee: financials.totalFee,
      },
      201
    );
  })();
}
