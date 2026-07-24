import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE']).optional(),
  branchId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
}) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, branchId: user.branchId };
}

// POST /api/auth/register — buat user baru (dibatasi ADMIN di route).
export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role ?? 'CASHIER',
      branchId: data.branchId,
    },
  });

  res.status(201).json({ user: toPublicUser(user) });
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Email atau password salah');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Email atau password salah');
  }

  const token = signToken({ sub: user.id, role: user.role, branchId: user.branchId });
  res.json({ token, user: toPublicUser(user) });
}

// GET /api/auth/me — profil user yang sedang login.
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { branch: true },
  });
  if (!user) throw ApiError.notFound('User tidak ditemukan');
  res.json({ user: { ...toPublicUser(user), branch: user.branch } });
}
