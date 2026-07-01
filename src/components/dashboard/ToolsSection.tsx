import Link from 'next/link';
import { Calculator, ArrowRight, type LucideIcon } from 'lucide-react';

interface Tool {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

/** Free utilities surfaced on the customer dashboard. Extend this list to add more. */
const TOOLS: Tool[] = [
  {
    href: '/tools/material-calculator',
    icon: Calculator,
    title: 'Kalkulator Material',
    desc: 'Hitung kebutuhan semen, pasir, batu, keramik & cat plus estimasi biaya.',
  },
];

/** Reusable tools grid — rendered on the dashboard and anywhere else tools belong. */
export function ToolsSection() {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-foreground">Alat Bantu</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <t.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                {t.title}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{t.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
