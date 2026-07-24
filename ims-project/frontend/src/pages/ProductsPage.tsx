import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList, formatRupiah } from '../lib/queries';
import type { Category, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Select, TextInput } from '../components/ui/Field';

const CAN_WRITE = ['ADMIN', 'MANAGER'] as const;

interface FormState {
  sku: string;
  name: string;
  categoryId: string;
  costPrice: string;
  sellPrice: string;
  unit: string;
  reorderPoint: string;
}

const EMPTY: FormState = {
  sku: '',
  name: '',
  categoryId: '',
  costPrice: '0',
  sellPrice: '0',
  unit: 'pcs',
  reorderPoint: '0',
};

export function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canWrite = !!user && (CAN_WRITE as readonly string[]).includes(user.role);
  const canDelete = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => fetchList<Category>('/categories') });
  const products = useQuery({
    queryKey: ['products', search, categoryId],
    queryFn: () =>
      fetchList<Product>('/products', {
        search: search || undefined,
        categoryId: categoryId || undefined,
      }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      categoryId: p.categoryId ?? '',
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      unit: p.unit,
      reorderPoint: String(p.reorderPoint),
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        sku: form.sku,
        name: form.name,
        categoryId: form.categoryId || null,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        unit: form.unit,
        reorderPoint: Number(form.reorderPoint),
      };
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Product updated' : 'Product added');
      setOpen(false);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Product master data with prices and total stock.</p>
        </div>
        {canWrite && <Button onClick={openCreate}>+ Add Product</Button>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <TextInput
          placeholder="Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:max-w-xs">
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Sell</th>
              <th className="px-4 py-3 text-center font-medium">Stock</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!products.isLoading && products.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No matching products.
                </td>
              </tr>
            )}
            {products.data?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(p.costPrice)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(p.sellPrice)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`font-medium ${
                      (p.totalStock ?? 0) <= p.reorderPoint ? 'text-amber-600' : 'text-slate-700'
                    }`}
                  >
                    {p.totalStock ?? 0} {p.unit}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete product "${p.name}"?`)) remove.mutate(p.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="product-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="SKU" required>
            <TextInput value={form.sku} onChange={set('sku')} required />
          </Field>
          <Field label="Unit">
            <TextInput value={form.unit} onChange={set('unit')} />
          </Field>
          <div className="col-span-2">
            <Field label="Name" required>
              <TextInput value={form.name} onChange={set('name')} required minLength={2} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Category">
              <Select value={form.categoryId} onChange={set('categoryId')}>
                <option value="">No category</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Cost Price">
            <TextInput type="number" min="0" value={form.costPrice} onChange={set('costPrice')} />
          </Field>
          <Field label="Sell Price">
            <TextInput type="number" min="0" value={form.sellPrice} onChange={set('sellPrice')} />
          </Field>
          <Field label="Reorder Point" hint="Minimum stock before warning">
            <TextInput type="number" min="0" value={form.reorderPoint} onChange={set('reorderPoint')} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
