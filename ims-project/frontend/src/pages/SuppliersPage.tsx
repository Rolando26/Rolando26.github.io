import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList, formatRupiah } from '../lib/queries';
import type { Supplier } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, TextInput } from '../components/ui/Field';

const CAN_WRITE = ['ADMIN', 'MANAGER'] as const;

interface FormState {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY: FormState = { name: '', contact: '', phone: '', email: '', address: '' };

export function SuppliersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canWrite = !!user && (CAN_WRITE as readonly string[]).includes(user.role);
  const canDelete = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchList<Supplier>('/suppliers'),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      contact: s.contact ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        contact: form.contact || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      };
      if (editing) await api.put(`/suppliers/${editing.id}`, payload);
      else await api.post('/suppliers', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(editing ? 'Supplier updated' : 'Supplier added');
      setOpen(false);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted');
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
          <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Supplier data for purchasing goods.</p>
        </div>
        {canWrite && <Button onClick={openCreate}>+ Add Supplier</Button>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 text-right font-medium">Payable Balance</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
            {data?.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.contact || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{s.email || '—'}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(s.balance)}</td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
                        Edit
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete supplier "${s.name}"?`)) remove.mutate(s.id);
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
        title={editing ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="supplier-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Name" required>
              <TextInput value={form.name} onChange={set('name')} required minLength={2} />
            </Field>
          </div>
          <Field label="Contact (PIC)">
            <TextInput value={form.contact} onChange={set('contact')} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={set('phone')} />
          </Field>
          <div className="col-span-2">
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={set('email')} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Address">
              <TextInput value={form.address} onChange={set('address')} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
