import Link from 'next/link';
import { MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { buttonVariants } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import type { ProviderListItem } from '@/lib/types';

export function ProviderCard({ provider }: { provider: ProviderListItem }) {
  return (
    <Card className="group flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated">
      <div className="flex items-start gap-4">
        <Avatar name={provider.user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-lg font-bold tracking-tight text-foreground">
              {provider.user.name}
            </h3>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Terverifikasi" />
          </div>
          <Badge variant="primary" className="mt-1.5">
            {provider.category}
          </Badge>
        </div>
      </div>

      {provider.bio && (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {provider.bio}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm">
        <Rating value={provider.rating} count={provider.ratingCount} />
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {provider.completedJobs}+ pekerjaan
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-border pt-5">
        <div>
          <p className="text-xs text-muted-foreground">Tarif harian</p>
          <p className="text-xl font-extrabold tracking-tight text-foreground">
            {formatCurrency(provider.dailyRate)}
          </p>
        </div>
        <Link
          href={`/book/${provider.id}`}
          className={buttonVariants({ variant: 'primary', size: 'sm' })}
        >
          Booking
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}
