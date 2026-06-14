import { ok, fail, handle } from '@/lib/api';
import { contactSchema } from '@/lib/validations';

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const input = contactSchema.parse(body);

    // No SMTP/inbox table wired up yet — log the inquiry so it is captured in
    // server logs. Swap this for an email send or a `ContactMessage` model later.
    console.info('[contact] Pesan masuk:', {
      name: input.name,
      email: input.email,
      message: input.message,
      at: new Date().toISOString(),
    });

    return ok({ received: true }, 201);
  })();
}
