import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';

// Perluas tipe Request agar membawa data user hasil autentikasi.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Memastikan request membawa token JWT valid.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Token tidak ditemukan');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw ApiError.unauthorized('Token tidak valid atau kedaluwarsa');
  }
}

// Membatasi akses hanya untuk role tertentu. Contoh: authorize('ADMIN', 'MANAGER')
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Role Anda tidak memiliki izin untuk aksi ini');
    }
    next();
  };
}
