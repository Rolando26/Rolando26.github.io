import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi'),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  unit: z.string().default('pcs'),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// GET /api/products?search=&categoryId=
export async function listProducts(req: Request, res: Response) {
  const { search, categoryId } = req.query as { search?: string; categoryId?: string };

  const products = await prisma.product.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true } },
      inventories: { select: { quantity: true, branchId: true } },
    },
  });

  // Sertakan total stok agregat lintas cabang agar praktis di frontend.
  const data = products.map((p) => ({
    ...p,
    totalStock: p.inventories.reduce((sum, inv) => sum + inv.quantity, 0),
  }));

  res.json({ data });
}

// GET /api/products/:id
export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { category: true, inventories: { include: { branch: true } } },
  });
  res.json({ data: product });
}

// POST /api/products
export async function createProduct(req: Request, res: Response) {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data });
  res.status(201).json({ data: product });
}

// PUT /api/products/:id
export async function updateProduct(req: Request, res: Response) {
  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({ where: { id: req.params.id }, data });
  res.json({ data: product });
}

// DELETE /api/products/:id
export async function deleteProduct(req: Request, res: Response) {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
