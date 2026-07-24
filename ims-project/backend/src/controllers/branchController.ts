import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const branchSchema = z.object({
  name: z.string().min(2, 'Nama cabang minimal 2 karakter'),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// GET /api/branches
export async function listBranches(_req: Request, res: Response) {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  res.json({ data: branches });
}

// GET /api/branches/:id
export async function getBranch(req: Request, res: Response) {
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { inventories: true } },
    },
  });
  res.json({ data: branch });
}

// POST /api/branches
export async function createBranch(req: Request, res: Response) {
  const data = branchSchema.parse(req.body);
  const branch = await prisma.branch.create({ data });
  res.status(201).json({ data: branch });
}

// PUT /api/branches/:id
export async function updateBranch(req: Request, res: Response) {
  const data = branchSchema.partial().parse(req.body);
  const branch = await prisma.branch.update({ where: { id: req.params.id }, data });
  res.json({ data: branch });
}

// DELETE /api/branches/:id
export async function deleteBranch(req: Request, res: Response) {
  const id = req.params.id;

  // Relasi cabang bersifat restrict, jadi cek dulu agar pesannya jelas
  // ketimbang melempar foreign key error mentah dari database.
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { users: true, inventories: true, sales: true } } },
  });

  const { users, inventories, sales } = branch._count;
  if (users > 0 || inventories > 0 || sales > 0) {
    throw ApiError.conflict(
      'Cabang tidak bisa dihapus karena masih memiliki user, stok, atau transaksi terkait',
    );
  }

  await prisma.branch.delete({ where: { id } });
  res.status(204).send();
}
