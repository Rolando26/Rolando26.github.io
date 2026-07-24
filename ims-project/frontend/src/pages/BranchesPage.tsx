import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList } from '../lib/queries';
import type { Branch } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, TextInput } from '../components/ui/Field';

interface FormState {
  name: string;
  address: string;
  phone: string;
}

const EMPTY: FormState = { name: '', address: '', phone: '' };

export function BranchesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const canDelete = user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchList<Branch>('/branches'),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setForm({ name: b.name, address: b.address ?? '', phone: b.phone ?? '' });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
      };
      if (editing) await api.put(`/branches/${editing.id}`, payload);
      else await api.post('/branches', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success(editing ? 'Branch updated' : 'Branch added');
      setOpen(false);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted');
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
          <h1 className="text-2xl font-semibold text-slate-900">Branches</h1>
          <p className="mt-1 text-sm text-slate-500">Store locations across the business.</p>
        </div>
        <Button onClick={openCreate}>+ Add Branch</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No branches yet.
                </td>
              </tr>
            )}
            {data?.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{b.name}</td>
                <td className="px-4 py-3 text-slate-500">{b.address || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{b.phone || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete branch "${b.name}"?`)) remove.mutate(b.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Branch' : 'Add Branch'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="branch-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={submit} className="space-y-4">
          <Field label="Name" required>
            <TextInput value={form.name} onChange={set('name')} required minLength={2} />
          </Field>
          <Field label="Address">
            <TextInput value={form.address} onChange={set('address')} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={set('phone')} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
