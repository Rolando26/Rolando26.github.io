import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchList, formatRupiah } from '../lib/queries';
import type { Branch, Category, InventoryRow, Product } from '../types';

export function DashboardPage() {
  const { user } = useAuth();

  const products = useQuery({ queryKey: ['products'], queryFn: () => fetchList<Product>('/products') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => fetchList<Category>('/categories') });
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: () => fetchList<InventoryRow>('/inventory') });

  const lowStock = (inventory.data ?? []).filter((i) => i.isLowStock);
  const inventoryValue = (inventory.data ?? []).reduce((sum, row) => {
    const product = products.data?.find((p) => p.id === row.productId);
    return sum + row.quantity * (product?.costPrice ?? 0);
  }, 0);

  const stats = [
    { label: 'Products', value: products.data?.length ?? '—', hint: 'active SKUs' },
    { label: 'Categories', value: categories.data?.length ?? '—', hint: 'product groups' },
    { label: 'Branches', value: branches.data?.length ?? '—', hint: 'store locations' },
    {
      label: 'Low Stock',
      value: inventory.isLoading ? '—' : lowStock.length,
      hint: 'below reorder point',
      alert: lowStock.length > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {user?.name}.{user?.branch ? ` ${user.branch.name} branch.` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p
              className={`mt-2 text-3xl font-semibold ${
                s.alert ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {s.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <p className="text-sm text-slate-500">Inventory Value (cost price)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {inventory.isLoading ? '—' : formatRupiah(inventoryValue)}
          </p>
          <p className="mt-1 text-xs text-slate-400">across all branches</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-800">Needs Restock</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {lowStock.length} items
            </span>
          </div>

          {inventory.isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">All stock levels are healthy. 👍</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{row.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {row.branch.name} · min {row.product.reorderPoint} {row.product.unit}
                    </p>
                  </div>
                  <span className="font-semibold text-amber-600">
                    {row.quantity} {row.product.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
