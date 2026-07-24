import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList, formatDateTime } from '../lib/queries';
import type { Branch, InventoryRow, Product, StockMovement, StockMovementType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Select, TextInput } from '../components/ui/Field';

const CAN_WRITE = ['ADMIN', 'MANAGER', 'WAREHOUSE'] as const;

const MOVEMENT_LABEL: Record<StockMovementType, { text: string; className: string }> = {
  PURCHASE: { text: 'Purchase', className: 'bg-blue-100 text-blue-700' },
  SALE: { text: 'Sale', className: 'bg-purple-100 text-purple-700' },
  ADJUSTMENT: { text: 'Adjustment', className: 'bg-amber-100 text-amber-700' },
  TRANSFER_IN: { text: 'Transfer In', className: 'bg-emerald-100 text-emerald-700' },
  TRANSFER_OUT: { text: 'Transfer Out', className: 'bg-rose-100 text-rose-700' },
};

export function InventoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canWrite = !!user && (CAN_WRITE as readonly string[]).includes(user.role);

  const [tab, setTab] = useState<'stock' | 'history'>('stock');
  const [branchId, setBranchId] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });
  const products = useQuery({ queryKey: ['products'], queryFn: () => fetchList<Product>('/products') });
  const inventory = useQuery({
    queryKey: ['inventory', branchId, lowOnly],
    queryFn: () =>
      fetchList<InventoryRow>('/inventory', {
        branchId: branchId || undefined,
        lowStock: lowOnly ? 'true' : undefined,
      }),
  });
  const movements = useQuery({
    queryKey: ['movements', branchId],
    queryFn: () => fetchList<StockMovement>('/inventory/movements', { branchId: branchId || undefined }),
    enabled: tab === 'history',
  });

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['movements'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Stock per branch, adjustments, and transfers.</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setTransferOpen(true)}>
              Transfer
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>Adjust Stock</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(['stock', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tab === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'stock' ? 'Stock' : 'History'}
            </button>
          ))}
        </div>

        <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="max-w-xs">
          <option value="">All branches</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>

        {tab === 'stock' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            Low stock only
          </label>
        )}
      </div>

      {tab === 'stock' ? (
        <StockTable rows={inventory.data} loading={inventory.isLoading} />
      ) : (
        <HistoryTable rows={movements.data} loading={movements.isLoading} />
      )}

      {canWrite && (
        <>
          <AdjustModal
            open={adjustOpen}
            onClose={() => setAdjustOpen(false)}
            products={products.data ?? []}
            branches={branches.data ?? []}
            defaultBranchId={branchId}
            onDone={() => {
              invalidate();
              toast.success('Stock adjusted');
              setAdjustOpen(false);
            }}
          />
          <TransferModal
            open={transferOpen}
            onClose={() => setTransferOpen(false)}
            products={products.data ?? []}
            branches={branches.data ?? []}
            onDone={() => {
              invalidate();
              toast.success('Transfer complete');
              setTransferOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

function StockTable({ rows, loading }: { rows?: InventoryRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Branch</th>
            <th className="px-4 py-3 text-center font-medium">Stock</th>
            <th className="px-4 py-3 text-center font-medium">Reorder</th>
            <th className="px-4 py-3 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                No stock data.
              </td>
            </tr>
          )}
          {rows?.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{r.product.name}</p>
                <p className="font-mono text-xs text-slate-400">{r.product.sku}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{r.branch.name}</td>
              <td className="px-4 py-3 text-center font-semibold text-slate-800">
                {r.quantity} {r.product.unit}
              </td>
              <td className="px-4 py-3 text-center text-slate-500">{r.product.reorderPoint}</td>
              <td className="px-4 py-3 text-center">
                {r.isLowStock ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Low
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Healthy
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ rows, loading }: { rows?: StockMovement[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 text-center font-medium">Qty</th>
            <th className="px-4 py-3 font-medium">Note</th>
            <th className="px-4 py-3 font-medium">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                No stock movements yet.
              </td>
            </tr>
          )}
          {rows?.map((m) => {
            const label = MOVEMENT_LABEL[m.type];
            return (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(m.createdAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{m.product.name}</p>
                  <p className="font-mono text-xs text-slate-400">{m.product.sku}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.className}`}>
                    {label.text}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-center font-semibold ${
                    m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="px-4 py-3 text-slate-500">{m.note || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{m.user?.name ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdjustModal({
  open,
  onClose,
  products,
  branches,
  defaultBranchId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  branches: Branch[];
  defaultBranchId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [branch, setBranch] = useState(defaultBranchId || '');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/adjust', {
        productId,
        branchId: branch,
        quantity: Number(quantity),
        note: note || undefined,
      }),
    onSuccess: onDone,
    onError: (err) => toast.error(apiMessage(err)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!productId || !branch || !quantity) return;
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="adjust-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-4">
        <Field label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" required>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} required>
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity Change" required hint="Positive = add stock, negative = reduce (e.g. -5)">
          <TextInput
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="e.g. 10 or -3"
          />
        </Field>
        <Field label="Note">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for adjustment" />
        </Field>
      </form>
    </Modal>
  );
}

function TransferModal({
  open,
  onClose,
  products,
  branches,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  branches: Branch[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [productId, setProductId] = useState('');
  const [fromBranchId, setFrom] = useState('');
  const [toBranchId, setTo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/transfer', {
        productId,
        fromBranchId,
        toBranchId,
        quantity: Number(quantity),
        note: note || undefined,
      }),
    onSuccess: onDone,
    onError: (err) => toast.error(apiMessage(err)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!productId || !fromBranchId || !toBranchId || !quantity) return;
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer Stock Between Branches"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="transfer-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Processing…' : 'Transfer'}
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={submit} className="space-y-4">
        <Field label="Product" required>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From Branch" required>
            <Select value={fromBranchId} onChange={(e) => setFrom(e.target.value)} required>
              <option value="">Select…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="To Branch" required>
            <Select value={toBranchId} onChange={(e) => setTo(e.target.value)} required>
              <option value="">Select…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Quantity" required>
          <TextInput
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
        <Field label="Note">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
