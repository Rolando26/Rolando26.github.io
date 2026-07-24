import axios from 'axios';
import { demoAdapter } from '../demo/demoAdapter';

const TOKEN_KEY = 'ims_token';

// Mode demo aktif secara default (showcase tanpa backend). Set VITE_DEMO=false
// untuk mengarahkan request ke backend Express asli.
export const IS_DEMO = (import.meta.env.VITE_DEMO ?? 'true') !== 'false';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  ...(IS_DEMO ? { adapter: demoAdapter } : {}),
});

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token kedaluwarsa saat sesi berjalan: bersihkan lalu paksa kembali ke login.
// Login yang gagal tidak ikut terkena karena saat itu belum ada token tersimpan.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && getToken()) {
      setToken(null);
      window.location.assign('#/login');
    }
    return Promise.reject(error);
  },
);

export function apiMessage(error: unknown, fallback = 'Something went wrong on the server') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  return fallback;
}
