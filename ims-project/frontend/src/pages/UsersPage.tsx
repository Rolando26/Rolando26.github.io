import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { fetchList } from '../lib/queries';
import type { Branch, ManagedUser, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Select, TextInput } from '../components/ui/Field';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE'];
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  WAREHOUSE: 'Warehouse',
};

interface FormState {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: string;
}

const EMPTY: FormState = { name: '', email: '', password: '', role: 'CASHIER', branchId: '' };

export function UsersPage() {
  const { user: current } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const users = useQuery({ queryKey: ['users'], queryFn: () => fetchList<ManagedUser>('/users') });
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => fetchList<Branch>('/branches') });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(u: ManagedUser) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branchId: u.branchId ?? '' });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name: form.name,
        email: form.email,
        role: form.role,
        branchId: form.branchId || null,
      };
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          ...base,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.post('/users', { ...base, password: form.password || 'password123' });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(editing ? 'User updated' : 'User added');
      setOpen(false);
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: (u: ManagedUser) => api.put(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(apiMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
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
          <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage staff accounts, roles, and access.</p>
        </div>
        <Button onClick={openCreate}>+ Add User</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Branch</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!users.isLoading && users.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
            {users.data?.map((u) => {
              const isSelf = current?.id === u.id;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3 text-slate-600">{u.branch?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {u.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                        Edit
                      </Button>
                      {!isSelf && (
                        <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate(u)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                      {!isSelf && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (confirm(`Delete user "${u.name}"?`)) remove.mutate(u.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit User' : 'Add User'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Name" required>
              <TextInput value={form.name} onChange={set('name')} required minLength={2} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Email" required>
              <TextInput type="email" value={form.email} onChange={set('email')} required />
            </Field>
          </div>
          <Field label="Role" required>
            <Select value={form.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={form.branchId} onChange={set('branchId')}>
              <option value="">No branch</option>
              {branches.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
            <Field
              label={editing ? 'New Password' : 'Password'}
              hint={editing ? 'Leave blank to keep the current password' : 'Defaults to "password123" if blank'}
            >
              <TextInput
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
