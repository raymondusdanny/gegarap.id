import type { Metadata } from 'next';
import { Wallet, CheckCircle2, Clock, Briefcase } from 'lucide-react';
import prisma from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { JobsTable, type JobRow } from '@/components/dashboard/JobsTable';
import { formatCurrency } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard Tukang' };
export const dynamic = 'force-dynamic';

export default async function ProviderDashboard() {
  const jobs = await prisma.job.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows: JobRow[] = jobs.map((j) => ({
    id: j.id,
    customerName: j.customer.name,
    customerWaNumber: j.customerWaNumber,
    customerAddress: j.customerAddress,
    estimatedDays: j.estimatedDays,
    totalFee: j.totalFee,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
  }));

  const completed = jobs.filter((j) => j.status === 'COMPLETED');
  const ongoing = jobs.filter((j) => j.status === 'ONGOING' || j.status === 'PENDING');
  const estimatedRevenue = jobs.reduce((s, j) => s + j.providerPayout, 0);

  return (
    <div className="container py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Dashboard Tukang
          </h1>
          <p className="mt-2 text-muted-foreground">
            Kelola pekerjaan masuk dan pantau performa Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Badge variant="success" className="px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Tersedia
          </Badge>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Estimasi Pendapatan"
          value={formatCurrency(estimatedRevenue)}
          icon={<Wallet className="h-5 w-5" />}
          trend={{ value: 'Total payout dari semua order', positive: true }}
        />
        <StatCard
          label="Pekerjaan Selesai"
          value={String(completed.length)}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Pekerjaan Aktif"
          value={String(ongoing.length)}
          icon={<Clock className="h-5 w-5" />}
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
