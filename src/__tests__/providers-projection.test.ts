import { describe, it, expect } from 'vitest';
import type { ProviderListItem } from '@/lib/types';
import {
  PROVIDER_PUBLIC_SELECT,
  PROVIDER_MAP_SELECT,
  toPublicProvider,
  toMapProvider,
  fuzzCoordinate,
} from '@/lib/providers';

// Fields that must NEVER leave the server for a public consumer (Bagian 3).
const FORBIDDEN_KEYS = [
  'payoutDetails',
  'payoutMethod',
  'goPayNumber',
  'ktpImageUrl',
  'latitude',
  'longitude',
  'userId',
  'kycStatus',
  'kycReason',
];

const ALLOWED_PUBLIC_KEYS = [
  'id',
  'category',
  'districts',
  'dailyRate',
  'bio',
  'avatarUrl',
  'rating',
  'ratingCount',
  'completedJobs',
  'available',
  'user',
];

const ALLOWED_MAP_KEYS = ['id', 'category', 'dailyRate', 'latitude', 'longitude', 'user'];

describe('Provider public projection (Bagian 3/10/14)', () => {
  it('PROVIDER_PUBLIC_SELECT tidak menyertakan field sensitif', () => {
    for (const k of FORBIDDEN_KEYS) {
      expect(PROVIDER_PUBLIC_SELECT).not.toHaveProperty(k);
    }
  });

  it('PROVIDER_MAP_SELECT tidak membocorkan payout/KTP (lat/lng difuzz nanti)', () => {
    for (const k of ['payoutDetails', 'payoutMethod', 'goPayNumber', 'ktpImageUrl', 'userId']) {
      expect(PROVIDER_MAP_SELECT).not.toHaveProperty(k);
    }
  });

  it('toPublicProvider = whitelist KETAT: tidak ada key ekstra walau input bocor', () => {
    // Simulate a row that accidentally carries sensitive columns.
    const leaky = {
      id: 'p1',
      category: 'Tukang',
      districts: ['A'],
      dailyRate: 150_000,
      bio: null,
      avatarUrl: null,
      rating: 4.8,
      ratingCount: 12,
      completedJobs: 12,
      available: true,
      user: { name: 'Joko' },
      // leaked extras:
      ktpImageUrl: 'private/ktp.jpg',
      payoutDetails: { accountNumber: '123' },
      latitude: -6.2000001,
      longitude: 106.8000001,
      userId: 'u1',
    } as unknown as ProviderListItem;

    const dto = toPublicProvider(leaky);
    const keys = Object.keys(dto).sort();
    expect(keys).toEqual([...ALLOWED_PUBLIC_KEYS].sort());
    expect(keys.length).toBe(ALLOWED_PUBLIC_KEYS.length); // no extra keys
    for (const k of FORBIDDEN_KEYS) expect(dto).not.toHaveProperty(k);
    expect(Object.keys(dto.user)).toEqual(['name']); // nested gate too
  });

  it('toMapProvider = whitelist + koordinat difuzz, tanpa field sensitif', () => {
    const raw = {
      id: 'p1',
      category: 'Tukang',
      dailyRate: 150_000,
      latitude: -6.2000001,
      longitude: 106.8000001,
      user: { name: 'Joko' },
      ktpImageUrl: 'private/ktp.jpg',
      payoutDetails: { accountNumber: '123' },
    } as never;

    const dto = toMapProvider(raw);
    expect(Object.keys(dto).sort()).toEqual([...ALLOWED_MAP_KEYS].sort());
    // exact coordinate must not survive
    expect(dto.latitude).not.toBe(-6.2000001);
    expect(dto.latitude).toBe(-6.2);
    expect(dto.longitude).toBe(106.8);
  });
});

describe('Coordinate fuzzing determinism (Bagian 12.6)', () => {
  it('input sama → output identik di banyak pemanggilan (anti-triangulasi)', () => {
    const lat = -6.214612345;
    const first = fuzzCoordinate(lat);
    for (let i = 0; i < 50; i++) {
      expect(fuzzCoordinate(lat)).toBe(first);
    }
  });

  it('null → null', () => {
    expect(fuzzCoordinate(null)).toBeNull();
  });

  it('membulatkan ke grid ~1km (2 desimal), bukan jitter acak', () => {
    expect(fuzzCoordinate(-6.2049)).toBe(-6.2);
    expect(fuzzCoordinate(-6.2051)).toBe(-6.21);
  });
});
