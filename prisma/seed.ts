import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const providers = [
  {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    category: 'Tukang Ledeng',
    dailyRate: 150000,
    goPayNumber: '081234567890',
    bio: 'Spesialis instalasi & perbaikan pipa air, pompa, dan saluran. 8 tahun pengalaman menangani rumah tinggal di seputaran DIY.',
    rating: 4.9,
    ratingCount: 132,
    completedJobs: 148,
    latitude: -7.7956,
    longitude: 110.3695,
  },
  {
    name: 'Agus Pratama',
    email: 'agus@example.com',
    category: 'Tukang Listrik',
    dailyRate: 180000,
    goPayNumber: '081298765432',
    bio: 'Pemasangan instalasi listrik baru, penambahan daya, dan perbaikan korsleting. Bersertifikat & mengutamakan keselamatan.',
    rating: 4.8,
    ratingCount: 97,
    completedJobs: 110,
    latitude: -7.7828,
    longitude: 110.3755,
  },
  {
    name: 'Siti Rahayu',
    email: 'siti@example.com',
    category: 'Pembersih Rumah',
    dailyRate: 120000,
    goPayNumber: '081211223344',
    bio: 'Layanan bersih-bersih menyeluruh: dapur, kamar mandi, hingga general cleaning pasca renovasi. Rapi, cepat, terpercaya.',
    rating: 5.0,
    ratingCount: 64,
    completedJobs: 71,
    latitude: -7.8012,
    longitude: 110.3642,
  },
  {
    name: 'Joko Widodo',
    email: 'joko@example.com',
    category: 'Tukang Kebun',
    dailyRate: 110000,
    goPayNumber: '081255667788',
    bio: 'Perawatan taman, pemangkasan, dan penataan tanaman hias. Membuat halaman Anda kembali asri.',
    rating: 4.7,
    ratingCount: 41,
    completedJobs: 53,
    latitude: -7.77,
    longitude: 110.378,
  },
  {
    name: 'Eko Nugroho',
    email: 'eko@example.com',
    category: 'Tukang Bangunan',
    dailyRate: 200000,
    goPayNumber: '081299887766',
    bio: 'Renovasi, pengecatan, pasang keramik, dan pekerjaan tukang umum. Hasil rapi sesuai anggaran.',
    rating: 4.6,
    ratingCount: 58,
    completedJobs: 67,
    latitude: -7.81,
    longitude: 110.355,
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.payment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();

  const createdProfiles: { id: string; dailyRate: number }[] = [];
  for (const p of providers) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        role: 'PROVIDER',
        providerProfile: {
          create: {
            category: p.category,
            dailyRate: p.dailyRate,
            goPayNumber: p.goPayNumber,
            isVerified: true,
            bio: p.bio,
            rating: p.rating,
            ratingCount: p.ratingCount,
            completedJobs: p.completedJobs,
            latitude: p.latitude,
            longitude: p.longitude,
          },
        },
      },
      include: { providerProfile: true },
    });
    if (user.providerProfile) {
      createdProfiles.push({
        id: user.providerProfile.id,
        dailyRate: user.providerProfile.dailyRate,
      });
    }
  }

  // A few demo bookings so the provider dashboard isn't empty on first run.
  const customer = await prisma.user.create({
    data: {
      name: 'Pak Susanto',
      email: 'susanto@example.com',
      role: 'CUSTOMER',
      phoneNumber: '08122334455',
    },
  });

  const demoJobs = [
    { address: 'Jl. Kaliurang KM 5, Sleman', days: 2, status: 'PENDING' },
    { address: 'Perum Griya Asri No. 12, Bantul', days: 3, status: 'ONGOING' },
    { address: 'Jl. Magelang KM 7, Sleman', days: 1, status: 'COMPLETED' },
  ];

  for (let i = 0; i < demoJobs.length && i < createdProfiles.length; i++) {
    const profile = createdProfiles[i];
    const d = demoJobs[i];
    const totalFee = profile.dailyRate * d.days;
    const platformCommission = Math.min(totalFee * 0.1, 20_000 * d.days);
    await prisma.job.create({
      data: {
        customerId: customer.id,
        providerProfileId: profile.id,
        estimatedDays: d.days,
        customerAddress: d.address,
        customerWaNumber: '08122334455',
        status: d.status,
        totalFee,
        platformCommission,
        providerPayout: totalFee - platformCommission,
        payments: { create: { amount: profile.dailyRate, type: 'DP', status: 'SUCCESS' } },
      },
    });
  }

  console.log(
    `✅ Seed completed — ${providers.length} verified providers and ${demoJobs.length} demo jobs.`
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
