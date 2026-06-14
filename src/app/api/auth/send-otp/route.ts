import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  normalizePhone,
  isValidIndonesianPhone,
  generateOtp,
  saveOtp,
  sendOtpWhatsApp,
} from '@/lib/otp';

const schema = z.object({ phone: z.string().min(9) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Nomor WA tidak valid' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidIndonesianPhone(phone)) {
    return NextResponse.json({ error: 'Format nomor WA tidak dikenali' }, { status: 400 });
  }

  // Simple rate limit: one OTP per number per 60 seconds.
  const recent = await prisma.otpToken.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent) {
    return NextResponse.json(
      { error: 'Tunggu 60 detik sebelum meminta OTP baru' },
      { status: 429 }
    );
  }

  const otp = generateOtp();
  await saveOtp(phone, otp);
  const sent = await sendOtpWhatsApp(phone, otp);

  if (!sent) {
    return NextResponse.json({ error: 'Gagal mengirim OTP. Silakan coba lagi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, phone });
}
