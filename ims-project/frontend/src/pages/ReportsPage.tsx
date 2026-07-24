import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchList, formatRupiah } from '../lib/queries';
import type { Branch, InventoryRow, Product, Sale } from '../types';

export function ReportsPage() {
  const [branchId, setBranchId] = useState('');

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });
  const products = useQuery({ queryKey: ['products'], queryFn: () => fetchList<Product>('/products') });
  const sales = useQuery({
    queryKey: ['sales', branchId],
    queryFn: () => fetchList<Sale>('/sales', { branchId: branchId || undefined }),
  });
  const inventory = useQuery({
    queryKey: ['inventory', branchId],
    queryFn: () => fetchList<InventoryRow>('/inventory', { branchId: branchId || undefined }),
  });

  const costMap = useMemo(() => {
    const m = new Map<string, number>();
    products.data?.forEach((p) => m.set(p.id, p.costPrice));
    return m;
  }, [products.data]);

  const report = useMemo(() => {
    const list = sales.data ?? [];
    const revenue = list.reduce((sum, s) => sum + s.total, 0);
    let profit = 0;
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    const byPayment = new Map<string, number>();

    for (const sale of list) {
      byPayment.set(sale.paymentMethod, (byPayment.get(sale.paymentMethod) ?? 0) + sale.total);
      for (const item of sale.items) {
        profit += (item.price - (costMap.get(item.productId) ?? 0)) * item.quantity;
        const prev = byProduct.get(item.productId) ?? { name: item.productName, qty: 0, revenue: 0 };
        prev.qty += item.quantity;
        prev.revenue += item.subtotal;
        byProduct.set(item.productId, prev);
      }
    }

    const bestSellers = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
    const payments = [...byPayment.entries()].sort((a, b) => b[1] - a[1]);

    const invValueCost = (inventory.data ?? []).reduce(
      (sum, r) => sum + r.quantity * (costMap.get(r.productId) ?? 0),
      0,
    );
    const lowStock = (inventory.data ?? []).filter((r) => r.isLowStock);

    return { revenue, profit, txCount: list.length, bestSellers, payments, invValueCost, lowStock };
  }, [sales.data, inventory.data, costMap]);

  const maxPayment = Math.max(1, ...report.payments.map(([, v]) => v));
  const maxSeller = Math.max(1, ...report.bestSellers.map((s) => s.qty));

  const cards = [
    { label: 'Total Sales', value: formatRupiah(report.revenue) },
    { label: 'Transactions', value: report.txCount },
    { label: 'Gross Profit', value: formatRupiah(report.profit), accent: 'text-emerald-600' },
    { label: 'Inventory Value (cost)', value: formatRupiah(report.invValueCost) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Summary of sales, profit, and inventory.</p>
        </div>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">All branches</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${c.accent ?? 'text-slate-900'}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-slate-800">Best-Selling Products</h2>
          {report.bestSellers.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {report.bestSellers.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{s.name}</span>
                    <span className="font-medium text-slate-600">{s.qty} sold</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(s.qty / maxSeller) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-slate-800">Sales by Payment Method</h2>
          {report.payments.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {report.payments.map(([method, value]) => (
                <li key={method}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">{method}</span>
                    <span className="font-medium text-slate-600">{formatRupiah(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(value / maxPayment) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-slate-800">Needs Restock</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {report.lowStock.length} item
          </span>
        </div>
        {report.lowStock.length === 0 ? (
          <p className="text-sm text-slate-500">All stock levels are healthy. 👍</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 font-medium">Branch</th>
                  <th className="py-2 text-center font-medium">Stock</th>
                  <th className="py-2 text-center font-medium">Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.lowStock.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-slate-700">{r.product.name}</td>
                    <td className="py-2 text-slate-500">{r.branch.name}</td>
                    <td className="py-2 text-center font-semibold text-amber-600">
                      {r.quantity} {r.product.unit}
                    </td>
                    <td className="py-2 text-center text-slate-500">{r.product.reorderPoint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
