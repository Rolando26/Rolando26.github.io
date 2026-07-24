import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

// GET /api/inventory?branchId=&lowStock=true
export async function listInventory(req: Request, res: Response) {
  const { branchId, lowStock } = req.query as { branchId?: string; lowStock?: string };

  const inventories = await prisma.inventory.findMany({
    where: { ...(branchId ? { branchId } : {}) },
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true, reorderPoint: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { product: { name: 'asc' } },
  });

  let data = inventories.map((inv) => ({
    ...inv,
    isLowStock: inv.quantity <= inv.product.reorderPoint,
  }));

  if (lowStock === 'true') data = data.filter((i) => i.isLowStock);

  res.json({ data });
}

const adjustSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  // quantity: jumlah perubahan. Positif = tambah stok, negatif = kurangi.
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Quantity tidak boleh 0'),
  note: z.string().optional(),
});

// POST /api/inventory/adjust — penyesuaian stok manual + catat riwayat (audit trail).
// Dibungkus transaction agar update stok & pencatatan movement selalu konsisten.
export async function adjustStock(req: Request, res: Response) {
  const data = adjustSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.inventory.findUnique({
      where: { productId_branchId: { productId: data.productId, branchId: data.branchId } },
    });

    const newQty = (existing?.quantity ?? 0) + data.quantity;
    if (newQty < 0) {
      throw ApiError.badRequest('Stok tidak boleh menjadi negatif');
    }

    const inventory = await tx.inventory.upsert({
      where: { productId_branchId: { productId: data.productId, branchId: data.branchId } },
      create: { productId: data.productId, branchId: data.branchId, quantity: newQty },
      update: { quantity: newQty },
    });

    await tx.stockMovement.create({
      data: {
        productId: data.productId,
        branchId: data.branchId,
        type: 'ADJUSTMENT',
        quantity: data.quantity,
        note: data.note,
        userId: req.user?.sub,
      },
    });

    return inventory;
  });

  res.status(201).json({ data: result });
}

// GET /api/inventory/movements?productId=&branchId=
export async function listMovements(req: Request, res: Response) {
  const { productId, branchId } = req.query as { productId?: string; branchId?: string };
  const movements = await prisma.stockMovement.findMany({
    where: { ...(productId ? { productId } : {}), ...(branchId ? { branchId } : {}) },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data: movements });
}
