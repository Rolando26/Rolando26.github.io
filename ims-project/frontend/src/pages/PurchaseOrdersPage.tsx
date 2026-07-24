import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList, formatDateTime, formatRupiah } from '../lib/queries';
import type { Branch, Product, PurchaseOrder, PurchaseOrderStatus, Supplier } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Select, TextInput } from '../components/ui/Field';

const CAN_WRITE = ['ADMIN', 'MANAGER', 'WAREHOUSE'] as const;

const STATUS: Record<PurchaseOrderStatus, { text: string; className: string }> = {
  DRAFT: { text: 'Draft', className: 'bg-slate-100 text-slate-600' },
  ORDERED: { text: 'Ordered', className: 'bg-blue-100 text-blue-700' },
  RECEIVED: { text: 'Received', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { text: 'Cancelled', className: 'bg-rose-100 text-rose-700' },
};

interface DraftItem {
  productId: string;
  quantity: string;
  cost: string;
}

export function PurchaseOrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canWrite = !!user && (CAN_WRITE as readonly string[]).includes(user.role);

  const pos = useQuery({ queryKey: ['purchase-orders'], queryFn: () => fetchList<PurchaseOrder>('/purchase-orders') });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => fetchList<Supplier>('/suppliers') });
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });
  const products = useQuery({ queryKey: ['products'], queryFn: () => fetchList<Product>('/products') });

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: ['suppliers'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
  }

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'order' | 'receive' | 'cancel' }) =>
      api.post(`/purchase-orders/${id}/${verb}`),
    onSuccess: (_res, { verb }) => {
      invalidate();
      toast.success(
        verb === 'order' ? 'PO ordered' : verb === 'receive' ? 'Goods received, stock increased' : 'PO cancelled',
      );
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Purchasing</h1>
          <p className="mt-1 text-sm text-slate-500">Purchase order: draft → ordered → received (stock increases).</p>
        </div>
        {canWrite && <Button onClick={() => setCreateOpen(true)}>+ Create PO</Button>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">No. PO</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pos.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!pos.isLoading && pos.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No purchase orders yet.
                </td>
              </tr>
            )}
            {pos.data?.map((po) => (
              <tr key={po.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{po.number}</td>
                <td className="px-4 py-3 text-slate-700">{po.supplierName}</td>
                <td className="px-4 py-3 text-slate-600">{po.branchName}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(po.total)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[po.status].className}`}>
                    {STATUS[po.status].text}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(po.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(po)}>
                      Detail
                    </Button>
                    {canWrite && po.status === 'DRAFT' && (
                      <Button size="sm" onClick={() => action.mutate({ id: po.id, verb: 'order' })}>
                        Order
                      </Button>
                    )}
                    {canWrite && po.status === 'ORDERED' && (
                      <Button size="sm" onClick={() => action.mutate({ id: po.id, verb: 'receive' })}>
                        Receive
                      </Button>
                    )}
                    {canWrite && (po.status === 'DRAFT' || po.status === 'ORDERED') && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Cancel ${po.number}?`)) action.mutate({ id: po.id, verb: 'cancel' });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <CreatePoModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          suppliers={suppliers.data ?? []}
          branches={branches.data ?? []}
          products={products.data ?? []}
          onDone={() => {
            invalidate();
            toast.success('PO draft created');
            setCreateOpen(false);
          }}
        />
      )}

      <DetailModal po={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function CreatePoModal({
  open,
  onClose,
  suppliers,
  branches,
  products,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  branches: Branch[];
  products: Product[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', cost: '0' }]);

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function onPickProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(idx, { productId, cost: product ? String(product.costPrice) : '0' });
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.cost || 0), 0),
    [items],
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/purchase-orders', {
        supplierId,
        branchId,
        items: items
          .filter((it) => it.productId)
          .map((it) => ({ productId: it.productId, quantity: Number(it.quantity), cost: Number(it.cost) })),
      }),
    onSuccess: () => {
      setSupplierId('');
      setBranchId('');
      setItems([{ productId: '', quantity: '1', cost: '0' }]);
      onDone();
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!supplierId || !branchId || !items.some((it) => it.productId)) {
      toast.error('Complete supplier, branch, and at least one product');
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Purchase Order"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="po-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Draft'}
          </Button>
        </>
      }
    >
      <form id="po-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier" required>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Destination Branch" required>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Item</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setItems((prev) => [...prev, { productId: '', quantity: '1', cost: '0' }])}
            >
              + Add baris
            </Button>
          </div>

          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <Select value={it.productId} onChange={(e) => onPickProduct(idx, e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2">
                <TextInput
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                <TextInput
                  type="number"
                  min="0"
                  value={it.cost}
                  onChange={(e) => updateItem(idx, { cost: e.target.value })}
                  placeholder="Price"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={items.length === 1}
                  className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  aria-label="Delete baris"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">Total:&nbsp;</span>
          <span className="font-semibold text-slate-900">{formatRupiah(total)}</span>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({ po, onClose }: { po: PurchaseOrder | null; onClose: () => void }) {
  return (
    <Modal open={!!po} onClose={onClose} title={po ? `Detail ${po.number}` : ''} size="lg">
      {po && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <p>
              <span className="text-slate-400">Supplier:</span> {po.supplierName}
            </p>
            <p>
              <span className="text-slate-400">Branch:</span> {po.branchName}
            </p>
            <p>
              <span className="text-slate-400">Status:</span> {STATUS[po.status].text}
            </p>
            <p>
              <span className="text-slate-400">Created:</span> {formatDateTime(po.createdAt)}
            </p>
          </div>
          <table className="w-full">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 text-center font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2">
                    {it.productName} <span className="font-mono text-xs text-slate-400">{it.sku}</span>
                  </td>
                  <td className="py-2 text-center">{it.quantity}</td>
                  <td className="py-2 text-right">{formatRupiah(it.cost)}</td>
                  <td className="py-2 text-right">{formatRupiah(it.cost * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold">
                <td className="py-2" colSpan={3}>
                  Total
                </td>
                <td className="py-2 text-right">{formatRupiah(po.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}
