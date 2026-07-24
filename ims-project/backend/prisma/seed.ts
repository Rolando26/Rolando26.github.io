import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const pusat = await prisma.branch.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Cabang Pusat',
      address: 'Jl. Merdeka No. 1, Jakarta',
      phone: '021-1000001',
    },
  });

  const cabangB = await prisma.branch.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Cabang Bandung',
      address: 'Jl. Asia Afrika No. 20, Bandung',
      phone: '022-2000002',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'admin@ims.test', name: 'Admin Utama', role: 'ADMIN' as const, branchId: pusat.id },
    { email: 'manager@ims.test', name: 'Manager Pusat', role: 'MANAGER' as const, branchId: pusat.id },
    { email: 'kasir@ims.test', name: 'Kasir Pusat', role: 'CASHIER' as const, branchId: pusat.id },
    { email: 'gudang@ims.test', name: 'Staf Gudang', role: 'WAREHOUSE' as const, branchId: cabangB.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
  }

  const categories = [
    { name: 'Minuman', description: 'Minuman kemasan dan siap saji' },
    { name: 'Makanan Ringan', description: 'Snack dan camilan' },
    { name: 'Kebutuhan Rumah', description: 'Perlengkapan rumah tangga' },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const saved = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categoryMap.set(saved.name, saved.id);
  }

  const products = [
    { sku: 'MNM-001', name: 'Air Mineral 600ml', category: 'Minuman', costPrice: 2500, sellPrice: 4000, reorderPoint: 24 },
    { sku: 'MNM-002', name: 'Teh Kotak 250ml', category: 'Minuman', costPrice: 3500, sellPrice: 5500, reorderPoint: 24 },
    { sku: 'SNK-001', name: 'Keripik Kentang 68g', category: 'Makanan Ringan', costPrice: 8000, sellPrice: 12000, reorderPoint: 12 },
    { sku: 'SNK-002', name: 'Biskuit Cokelat 120g', category: 'Makanan Ringan', costPrice: 9000, sellPrice: 13500, reorderPoint: 12 },
    { sku: 'RMH-001', name: 'Sabun Cuci Piring 800ml', category: 'Kebutuhan Rumah', costPrice: 14000, sellPrice: 19000, reorderPoint: 6 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: categoryMap.get(p.category),
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        reorderPoint: p.reorderPoint,
      },
    });

    // Stok awal berbeda per cabang; sebagian sengaja di bawah reorder point
    // supaya filter lowStock bisa langsung diuji.
    for (const [branchId, quantity] of [
      [pusat.id, p.reorderPoint * 3],
      [cabangB.id, Math.floor(p.reorderPoint / 2)],
    ] as const) {
      await prisma.inventory.upsert({
        where: { productId_branchId: { productId: product.id, branchId } },
        update: {},
        create: { productId: product.id, branchId, quantity },
      });
    }
  }

  console.log('✅ Seed selesai.');
  console.log('   Login: admin@ims.test / password123');
}

main()
  .catch((err) => {
    console.error('❌ Seed gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
