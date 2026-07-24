import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { IS_DEMO } from '../lib/api';
import { resetStore } from '../demo/demoData';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/pos', label: 'POS', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/purchase-orders', label: 'Purchasing', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
  { to: '/suppliers', label: 'Suppliers', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
  { to: '/reports', label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
  { to: '/branches', label: 'Branches', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  WAREHOUSE: 'Warehouse',
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function resetDemo() {
    if (!confirm('Reset all demo data to its initial state? Your changes will be lost.')) return;
    resetStore();
    qc.invalidateQueries();
  }

  const items = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="flex h-full bg-slate-50">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-10 bg-slate-900/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 shrink-0 border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            IMS
          </span>
          <span className="font-semibold text-slate-800">Inventory</span>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {IS_DEMO && (
              <button
                type="button"
                onClick={resetDemo}
                className="hidden rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 sm:block"
                title="Reset demo data to initial state"
              >
                Reset Data
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user ? ROLE_LABEL[user.role] : ''}
                {user?.branch ? ` · ${user.branch.name}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
