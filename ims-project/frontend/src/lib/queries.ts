import { api } from './api';

export async function fetchList<T>(url: string, params?: Record<string, string | undefined>): Promise<T[]> {
  const res = await api.get<{ data: T[] }>(url, { params });
  return res.data.data;
}

export async function fetchOne<T>(url: string): Promise<T> {
  const res = await api.get<{ data: T }>(url);
  return res.data.data;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
