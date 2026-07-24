import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';

const categorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
  description: z.string().optional(),
});

// GET /api/categories
export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ data: categories });
}

// GET /api/categories/:id
export async function getCategory(req: Request, res: Response) {
  const category = await prisma.category.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json({ data: category });
}

// POST /api/categories
export async function createCategory(req: Request, res: Response) {
  const data = categorySchema.parse(req.body);
  const category = await prisma.category.create({ data });
  res.status(201).json({ data: category });
}

// PUT /api/categories/:id
export async function updateCategory(req: Request, res: Response) {
  const data = categorySchema.partial().parse(req.body);
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json({ data: category });
}

// DELETE /api/categories/:id
export async function deleteCategory(req: Request, res: Response) {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
