import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route tidak ditemukan: ${req.method} ${req.originalUrl}` });
}

// Error handler terpusat — semua error berakhir di sini dengan format konsisten.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validasi gagal',
      errors: err.flatten().fieldErrors,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({ message: `Data dengan ${target} tersebut sudah ada` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
}
