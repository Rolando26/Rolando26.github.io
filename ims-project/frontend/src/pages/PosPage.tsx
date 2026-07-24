import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList, formatDateTime, formatRupiah } from '../lib/queries';
import type { Branch, InventoryRow, Product, Sale } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select, TextInput } from '../components/ui/Field';

interface CartLine {
  product: Product;
  quantity: number;
}

const PAYMENTS = ['CASH', 'DEBIT', 'QRIS', 'TRANSFER'];

export function PosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });
  const [branchId, setBranchId] = useState(user?.branchId ?? '');
  const effectiveBranch = branchId || user?.branchId || '';

  const products = useQuery({ queryKey: ['products'], queryFn: () => fetchList<Product>('/products') });
  const inventory = useQuery({
    queryKey: ['inventory', effectiveBranch],
    queryFn: () => fetchList<InventoryRow>('/inventory', { branchId: effectiveBranch || undefined }),
    enabled: !!effectiveBranch,
  });

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    inventory.data?.forEach((i) => map.set(i.productId, i.quantity));
    return map;
  }, [inventory.data]);

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState('CASH');
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const filtered = (products.data ?? []).filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  function addToCart(product: Product) {
    const stock = stockMap.get(product.id) ?? 0;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + 1 > stock) {
        toast.error(`Only ${stock} left in stock for ${product.name}`);
        return prev;
      }
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function setQty(productId: string, quantity: number) {
    const stock = stockMap.get(productId) ?? 0;
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    if (quantity > stock) {
      toast.error(`Only ${stock} left in stock`);
      quantity = stock;
    }
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  const total = cart.reduce((sum, l) => sum + l.product.sellPrice * l.quantity, 0);

  const checkout = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Sale }>('/sales', {
        branchId: effectiveBranch,
        paymentMethod: payment,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      return res.data.data;
    },
    onSuccess: (sale) => {
      setReceipt(sale);
      setCart([]);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      toast.success(`Transaksi ${sale.number} berhasil`);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  if (!effectiveBranch) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Cashier (POS)</h1>
        <div className="max-w-sm">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Select a branch to start…</option>
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {/* Product catalog */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
          <Select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="ml-auto max-w-[12rem]"
          >
            {branches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <TextInput
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {filtered.map((p) => {
            const stock = stockMap.get(p.id) ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={stock <= 0}
                onClick={() => addToCart(p)}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="line-clamp-2 text-sm font-medium text-slate-800">{p.name}</span>
                <span className="mt-1 font-mono text-[11px] text-slate-400">{p.sku}</span>
                <span className="mt-auto pt-2 text-sm font-semibold text-brand-700">
                  {formatRupiah(p.sellPrice)}
                </span>
                <span className={`text-xs ${stock <= 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  Stock: {stock}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart */}
      <div className="flex w-full flex-col rounded-xl border border-slate-200 bg-white lg:w-96">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Cart</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No items yet. Click a product to add.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cart.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{l.product.name}</p>
                    <p className="text-xs text-slate-400">{formatRupiah(l.product.sellPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQty(l.product.id, l.quantity - 1)}
                      className="size-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      −
                    </button>
                    <input
                      value={l.quantity}
                      onChange={(e) => setQty(l.product.id, Number(e.target.value) || 0)}
                      className="w-10 rounded border border-slate-300 py-1 text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(l.product.id, l.quantity + 1)}
                      className="size-6 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-medium text-slate-700">
                    {formatRupiah(l.product.sellPrice * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3 border-t border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-900">{formatRupiah(total)}</span>
          </div>
          <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <Button
            className="w-full"
            disabled={cart.length === 0 || checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? 'Processing…' : `Pay ${formatRupiah(total)}`}
          </Button>
        </div>
      </div>

      <ReceiptModal sale={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  return (
    <Modal open={!!sale} onClose={onClose} title="Sales Receipt" size="md">
      {sale && (
        <div className="space-y-3 text-sm">
          <div className="text-center">
            <p className="font-semibold text-slate-800">{sale.number}</p>
            <p className="text-xs text-slate-400">
              {sale.branchName} · {formatDateTime(sale.createdAt)}
            </p>
            <p className="text-xs text-slate-400">Cashier: {sale.cashierName}</p>
          </div>
          <ul className="divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-200 py-2">
            {sale.items.map((it) => (
              <li key={it.id} className="flex justify-between py-1">
                <span className="text-slate-600">
                  {it.productName} × {it.quantity}
                </span>
                <span className="text-slate-700">{formatRupiah(it.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold">
            <span>Total ({sale.paymentMethod})</span>
            <span>{formatRupiah(sale.total)}</span>
          </div>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Tutup
          </Button>
        </div>
      )}
    </Modal>
  );
}
