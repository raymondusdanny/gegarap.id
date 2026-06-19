import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CheckCircle2, Clock, Wallet, Briefcase } from 'lucide-react';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { JobsTable, type JobRow } from '@/components/dashboard/JobsTable';
import { isContactUnlocked } from '@/lib/authz';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard Tukang' };
export const dynamic = 'force-dynamic';

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login?redirect=/provider/dashboard');

  // The profile belonging to the logged-in user — this is the filter that was
  // missing before (every provider could see every other provider's jobs + PII).
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!provider) redirect('/dashboard'); // not a provider → customer dashboard

  const jobs = await prisma.job.findMany({
    where: { providerProfileId: provider.id }, // WAJIB: only this provider's jobs
    include: {
      customer: { select: { name: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // PROTECTED tier (Bagian 3): the customer's phone + full address open to the
  // provider only AFTER the DP is paid. Before that they're withheld, so an
  // unpaid/pending booking never leaks a customer's contact to the client.
  const rows: JobRow[] = jobs.map((j) => {
    const contactUnlocked = isContactUnlocked(j.payment?.status);
    return {
      id: j.id,
      customerName: j.customer.name,
      customerWaNumber: contactUnlocked ? j.customerWaNumber : null,
      customerAddress: contactUnlocked ? j.customerAddress : null,
      estimatedDays: j.estimatedDays,
      totalFee: j.totalFee,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
    };
  });

  const stats = {
    completed: jobs.filter((j) => j.status === 'COMPLETED').length,
    active: jobs.filter((j) => j.status === 'CONFIRMED' || j.status === 'IN_PROGRESS').length,
    // Earnings = disbursed payouts. Post-overhaul the released status is RELEASED
    // (the old 'DISBURSED' no longer exists), with the amount on disbursedAmount.
    earnings: jobs
      .filter((j) => j.payment?.status === 'RELEASED')
      .reduce((sum, j) => sum + (j.payment?.disbursedAmount ?? j.payment?.providerAmount ?? 0), 0),
  };

  return (
    <div className="container py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Dashboard Tukang
          </h1>
          <p className="mt-2 text-muted-foreground">
            Selamat datang, {provider.category} · kelola pekerjaan masuk Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Badge variant={provider.available ? 'success' : 'neutral'} className="px-3 py-1.5">
            <span
              className={`h-2 w-2 rounded-full ${provider.available ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
            {provider.available ? 'Tersedia' : 'Tidak tersedia'}
          </Badge>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Pekerjaan Selesai"
          value={String(stats.completed)}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Pekerjaan Aktif"
          value={String(stats.active)}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Total Pendapatan"
          value={formatCurrency(stats.earnings)}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="mb-5 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">Pekerjaan Masuk</h2>
      </div>

      <JobsTable jobs={rows} />
    </div>
  );
}
