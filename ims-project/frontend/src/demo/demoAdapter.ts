// Adapter axios untuk mode demo: mencegat request ke "backend" dan menjawabnya
// dari store in-memory. Dipasang di lib/api.ts saat VITE_DEMO aktif.
import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { AuthUser } from '../types';
import { db, nextId, persist, type DemoStore, type DemoUser } from './demoData';

function publicUser(u: DemoUser): AuthUser {
  const { password: _password, ...rest } = u;
  return rest;
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config, request: {} };
}

function fail(config: InternalAxiosRequestConfig, status: number, message: string): never {
  const response: AxiosResponse = {
    data: { message },
    status,
    statusText: 'ERROR',
    headers: {},
    config,
    request: {},
  };
  throw new AxiosError(message, String(status), config, {}, response);
}

function body<T = Record<string, unknown>>(config: InternalAxiosRequestConfig): T {
  if (config.data == null) return {} as T;
  if (typeof config.data === 'string') return JSON.parse(config.data) as T;
  return config.data as T;
}

function userIdFromAuth(config: InternalAxiosRequestConfig): string | null {
  const header = (config.headers?.Authorization ?? config.headers?.authorization) as
    | string
    | undefined;
  if (!header?.startsWith('Bearer demo-token.')) return null;
  return header.slice('Bearer demo-token.'.length);
}

function requireUser(config: InternalAxiosRequestConfig, store: DemoStore): DemoUser {
  const id = userIdFromAuth(config);
  const user = id ? store.users.find((u) => u.id === id) : null;
  if (!user) fail(config, 401, 'Invalid or expired token');
  return user;
}

function withBranch(store: DemoStore, u: DemoUser): AuthUser {
  const branch = store.branches.find((b) => b.id === u.branchId) ?? null;
  return { ...publicUser(u), branch };
}

function managedUser(store: DemoStore, u: DemoUser) {
  const b = store.branches.find((x) => x.id === u.branchId);
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branchId,
    branch: b ? { id: b.id, name: b.name } : null,
    isActive: u.isActive,
  };
}

// Handler dipilih berdasarkan method + pola path (segmen `:id` diabaikan saat cocokkan).
type Handler = (
  config: InternalAxiosRequestConfig,
  store: DemoStore,
  params: string[],
) => AxiosResponse;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [
  // ---- Auth ----
  {
    method: 'post',
    pattern: /^\/auth\/login$/,
    handler: (config, store) => {
      const { email, password } = body<{ email?: string; password?: string }>(config);
      const user = store.users.find((u) => u.email === email);
      if (!user || user.password !== password) {
        fail(config, 401, 'Incorrect email or password');
      }
      if (!user.isActive) fail(config, 401, 'This account is inactive');
      return ok(config, { token: `demo-token.${user.id}`, user: publicUser(user) });
    },
  },
  {
    method: 'get',
    pattern: /^\/auth\/me$/,
    handler: (config, store) => {
      const user = requireUser(config, store);
      return ok(config, { user: withBranch(store, user) });
    },
  },

  // ---- Users ----
  {
    method: 'get',
    pattern: /^\/users$/,
    handler: (config, store) => {
      requireUser(config, store);
      const data = [...store.users]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((u) => managedUser(store, u));
      return ok(config, { data });
    },
  },
  {
    method: 'post',
    pattern: /^\/users$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<{
        name: string;
        email: string;
        password: string;
        role?: DemoUser['role'];
        branchId?: string | null;
      }>(config);
      if (store.users.some((u) => u.email === input.email)) {
        fail(config, 409, `A record with that email already exists`);
      }
      const user: DemoUser = {
        id: nextId('us'),
        name: input.name,
        email: input.email,
        password: input.password || 'password123',
        role: input.role ?? 'CASHIER',
        branchId: input.branchId ?? null,
        isActive: true,
      };
      store.users.push(user);
      return ok(config, { data: managedUser(store, user) }, 201);
    },
  },
  {
    method: 'put',
    pattern: /^\/users\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const user = store.users.find((u) => u.id === id);
      if (!user) fail(config, 404, 'Data not found');
      const input = body<{
        name?: string;
        email?: string;
        password?: string;
        role?: DemoUser['role'];
        branchId?: string | null;
        isActive?: boolean;
      }>(config);
      if (input.email && store.users.some((u) => u.email === input.email && u.id !== id)) {
        fail(config, 409, `A record with that email already exists`);
      }
      if (input.name !== undefined) user.name = input.name;
      if (input.email !== undefined) user.email = input.email;
      if (input.password) user.password = input.password;
      if (input.role !== undefined) user.role = input.role;
      if (input.branchId !== undefined) user.branchId = input.branchId;
      if (input.isActive !== undefined) user.isActive = input.isActive;
      return ok(config, { data: managedUser(store, user) });
    },
  },
  {
    method: 'delete',
    pattern: /^\/users\/([^/]+)$/,
    handler: (config, store, [id]) => {
      const current = requireUser(config, store);
      if (current.id === id) fail(config, 400, 'You cannot delete your own account');
      store.users = store.users.filter((u) => u.id !== id);
      return ok(config, null, 204);
    },
  },

  // ---- Branches ----
  {
    method: 'get',
    pattern: /^\/branches$/,
    handler: (config, store) => {
      requireUser(config, store);
      const data = [...store.branches].sort((a, b) => a.name.localeCompare(b.name));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/branches\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const branch = store.branches.find((b) => b.id === id);
      if (!branch) fail(config, 404, 'Data not found');
      const users = store.users
        .filter((u) => u.branchId === id)
        .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
      const inventories = store.inventories.filter((i) => i.branchId === id).length;
      return ok(config, { data: { ...branch, users, _count: { inventories } } });
    },
  },
  {
    method: 'post',
    pattern: /^\/branches$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<{ name: string; address?: string; phone?: string }>(config);
      const branch = {
        id: nextId('br'),
        name: input.name,
        address: input.address ?? null,
        phone: input.phone ?? null,
      };
      store.branches.push(branch);
      return ok(config, { data: branch }, 201);
    },
  },
  {
    method: 'put',
    pattern: /^\/branches\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const branch = store.branches.find((b) => b.id === id);
      if (!branch) fail(config, 404, 'Data not found');
      Object.assign(branch, body(config));
      return ok(config, { data: branch });
    },
  },
  {
    method: 'delete',
    pattern: /^\/branches\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const hasUsers = store.users.some((u) => u.branchId === id);
      const hasStock = store.inventories.some((i) => i.branchId === id);
      if (hasUsers || hasStock) {
        fail(config, 409, 'Branch cannot be deleted because it still has related users or stock');
      }
      store.branches = store.branches.filter((b) => b.id !== id);
      return ok(config, null, 204);
    },
  },

  // ---- Categories ----
  {
    method: 'get',
    pattern: /^\/categories$/,
    handler: (config, store) => {
      requireUser(config, store);
      const data = [...store.categories]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          ...c,
          _count: { products: store.products.filter((p) => p.categoryId === c.id).length },
        }));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/categories\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const category = store.categories.find((c) => c.id === id);
      if (!category) fail(config, 404, 'Data not found');
      return ok(config, { data: category });
    },
  },
  {
    method: 'post',
    pattern: /^\/categories$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<{ name: string; description?: string }>(config);
      if (store.categories.some((c) => c.name === input.name)) {
        fail(config, 409, `A record with that name already exists`);
      }
      const category = { id: nextId('ct'), name: input.name, description: input.description ?? null };
      store.categories.push(category);
      return ok(config, { data: category }, 201);
    },
  },
  {
    method: 'put',
    pattern: /^\/categories\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const category = store.categories.find((c) => c.id === id);
      if (!category) fail(config, 404, 'Data not found');
      Object.assign(category, body(config));
      return ok(config, { data: category });
    },
  },
  {
    method: 'delete',
    pattern: /^\/categories\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      store.categories = store.categories.filter((c) => c.id !== id);
      // Produk terkait dilepas kategorinya (mirror onDelete SetNull secara longgar).
      store.products.forEach((p) => {
        if (p.categoryId === id) p.categoryId = null;
      });
      return ok(config, null, 204);
    },
  },

  // ---- Suppliers ----
  {
    method: 'get',
    pattern: /^\/suppliers$/,
    handler: (config, store) => {
      requireUser(config, store);
      const data = [...store.suppliers].sort((a, b) => a.name.localeCompare(b.name));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/suppliers\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const supplier = store.suppliers.find((s) => s.id === id);
      if (!supplier) fail(config, 404, 'Data not found');
      return ok(config, { data: supplier });
    },
  },
  {
    method: 'post',
    pattern: /^\/suppliers$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<Record<string, string | undefined>>(config);
      const supplier = {
        id: nextId('sp'),
        name: String(input.name),
        contact: input.contact ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
        balance: 0,
      };
      store.suppliers.push(supplier);
      return ok(config, { data: supplier }, 201);
    },
  },
  {
    method: 'put',
    pattern: /^\/suppliers\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const supplier = store.suppliers.find((s) => s.id === id);
      if (!supplier) fail(config, 404, 'Data not found');
      Object.assign(supplier, body(config));
      return ok(config, { data: supplier });
    },
  },
  {
    method: 'delete',
    pattern: /^\/suppliers\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const usedInPo = store.purchaseOrders.some((po) => po.supplierId === id);
      if (usedInPo) fail(config, 409, 'Supplier cannot be deleted because it is used in a purchase order');
      store.suppliers = store.suppliers.filter((s) => s.id !== id);
      return ok(config, null, 204);
    },
  },

  // ---- Products ----
  {
    method: 'get',
    pattern: /^\/products$/,
    handler: (config, store) => {
      requireUser(config, store);
      const search = (config.params?.search as string | undefined)?.toLowerCase();
      const categoryId = config.params?.categoryId as string | undefined;
      const data = store.products
        .filter((p) => (categoryId ? p.categoryId === categoryId : true))
        .filter((p) =>
          search
            ? p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
            : true,
        )
        .map((p) => ({
          ...p,
          category: p.categoryId
            ? (() => {
                const c = store.categories.find((c) => c.id === p.categoryId);
                return c ? { id: c.id, name: c.name } : null;
              })()
            : null,
          totalStock: store.inventories
            .filter((i) => i.productId === p.id)
            .reduce((sum, i) => sum + i.quantity, 0),
        }));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/products\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const product = store.products.find((p) => p.id === id);
      if (!product) fail(config, 404, 'Data not found');
      const category = product.categoryId
        ? store.categories.find((c) => c.id === product.categoryId) ?? null
        : null;
      const inventories = store.inventories.filter((i) => i.productId === id);
      return ok(config, { data: { ...product, category, inventories } });
    },
  },
  {
    method: 'post',
    pattern: /^\/products$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<Record<string, unknown>>(config);
      if (store.products.some((p) => p.sku === input.sku)) {
        fail(config, 409, `A record with that sku already exists`);
      }
      const product = {
        id: nextId('pr'),
        sku: String(input.sku),
        name: String(input.name),
        description: (input.description as string) ?? null,
        categoryId: (input.categoryId as string) ?? null,
        costPrice: Number(input.costPrice ?? 0),
        sellPrice: Number(input.sellPrice ?? 0),
        unit: (input.unit as string) ?? 'pcs',
        reorderPoint: Number(input.reorderPoint ?? 0),
        isActive: input.isActive == null ? true : Boolean(input.isActive),
      };
      store.products.push(product);
      return ok(config, { data: product }, 201);
    },
  },
  {
    method: 'put',
    pattern: /^\/products\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const product = store.products.find((p) => p.id === id);
      if (!product) fail(config, 404, 'Data not found');
      Object.assign(product, body(config));
      return ok(config, { data: product });
    },
  },
  {
    method: 'delete',
    pattern: /^\/products\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      store.products = store.products.filter((p) => p.id !== id);
      store.inventories = store.inventories.filter((i) => i.productId !== id);
      return ok(config, null, 204);
    },
  },

  // ---- Purchase Orders ----
  {
    method: 'get',
    pattern: /^\/purchase-orders$/,
    handler: (config, store) => {
      requireUser(config, store);
      const data = [...store.purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/purchase-orders\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const po = store.purchaseOrders.find((p) => p.id === id);
      if (!po) fail(config, 404, 'Data not found');
      return ok(config, { data: po });
    },
  },
  {
    method: 'post',
    pattern: /^\/purchase-orders$/,
    handler: (config, store) => {
      requireUser(config, store);
      const input = body<{
        supplierId: string;
        branchId: string;
        items: Array<{ productId: string; quantity: number; cost: number }>;
      }>(config);
      const supplier = store.suppliers.find((s) => s.id === input.supplierId);
      const branch = store.branches.find((b) => b.id === input.branchId);
      if (!supplier || !branch) fail(config, 400, 'Supplier or branch not found');
      if (!input.items?.length) fail(config, 400, 'At least one purchase item is required');

      const items = input.items.map((it) => {
        const product = store.products.find((p) => p.id === it.productId);
        if (!product) fail(config, 400, 'Product not found');
        return {
          id: nextId('poi'),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: Number(it.quantity),
          cost: Number(it.cost),
        };
      });
      const total = items.reduce((sum, it) => sum + it.quantity * it.cost, 0);
      const seq = String(store.purchaseOrders.length + 1).padStart(4, '0');

      const po = {
        id: nextId('po'),
        number: `PO-${seq}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        branchId: branch.id,
        branchName: branch.name,
        status: 'DRAFT' as const,
        total,
        items,
        createdAt: new Date().toISOString(),
        orderedAt: null,
        receivedAt: null,
      };
      store.purchaseOrders.unshift(po);
      return ok(config, { data: po }, 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/purchase-orders\/([^/]+)\/order$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const po = store.purchaseOrders.find((p) => p.id === id);
      if (!po) fail(config, 404, 'Data not found');
      if (po.status !== 'DRAFT') fail(config, 400, 'Only draft POs can be ordered');
      po.status = 'ORDERED';
      po.orderedAt = new Date().toISOString();
      return ok(config, { data: po });
    },
  },
  {
    method: 'post',
    pattern: /^\/purchase-orders\/([^/]+)\/receive$/,
    handler: (config, store, [id]) => {
      const user = requireUser(config, store);
      const po = store.purchaseOrders.find((p) => p.id === id);
      if (!po) fail(config, 404, 'Data not found');
      if (po.status !== 'ORDERED') fail(config, 400, 'Only ordered POs can be received');

      const now = new Date().toISOString();
      for (const item of po.items) {
        const product = store.products.find((p) => p.id === item.productId);
        if (!product) continue;
        let inv = store.inventories.find(
          (i) => i.productId === item.productId && i.branchId === po.branchId,
        );
        if (inv) {
          inv.quantity += item.quantity;
          inv.isLowStock = inv.quantity <= inv.product.reorderPoint;
        } else {
          inv = {
            id: nextId('inv'),
            productId: product.id,
            branchId: po.branchId,
            quantity: item.quantity,
            isLowStock: item.quantity <= product.reorderPoint,
            product: {
              id: product.id,
              sku: product.sku,
              name: product.name,
              unit: product.unit,
              reorderPoint: product.reorderPoint,
            },
            branch: { id: po.branchId, name: po.branchName },
          };
          store.inventories.push(inv);
        }
        store.movements.unshift({
          id: nextId('mv'),
          productId: product.id,
          branchId: po.branchId,
          type: 'PURCHASE',
          quantity: item.quantity,
          note: `Received ${po.number}`,
          createdAt: now,
          product: { name: product.name, sku: product.sku },
          user: { name: user.name },
        });
      }

      po.status = 'RECEIVED';
      po.receivedAt = now;
      // Utang ke supplier bertambah sebesar nilai PO.
      const supplier = store.suppliers.find((s) => s.id === po.supplierId);
      if (supplier) supplier.balance += po.total;

      return ok(config, { data: po });
    },
  },
  {
    method: 'post',
    pattern: /^\/purchase-orders\/([^/]+)\/cancel$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const po = store.purchaseOrders.find((p) => p.id === id);
      if (!po) fail(config, 404, 'Data not found');
      if (po.status === 'RECEIVED') fail(config, 400, 'A received PO cannot be cancelled');
      po.status = 'CANCELLED';
      return ok(config, { data: po });
    },
  },

  // ---- Sales (POS) ----
  {
    method: 'get',
    pattern: /^\/sales$/,
    handler: (config, store) => {
      requireUser(config, store);
      const branchId = config.params?.branchId as string | undefined;
      const data = store.sales
        .filter((s) => (branchId ? s.branchId === branchId : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/sales\/([^/]+)$/,
    handler: (config, store, [id]) => {
      requireUser(config, store);
      const sale = store.sales.find((s) => s.id === id);
      if (!sale) fail(config, 404, 'Data not found');
      return ok(config, { data: sale });
    },
  },
  {
    method: 'post',
    pattern: /^\/sales$/,
    handler: (config, store) => {
      const user = requireUser(config, store);
      const input = body<{
        branchId: string;
        paymentMethod?: string;
        items: Array<{ productId: string; quantity: number }>;
      }>(config);
      const branch = store.branches.find((b) => b.id === input.branchId);
      if (!branch) fail(config, 400, 'Branch not found');
      if (!input.items?.length) fail(config, 400, 'Cart is empty');

      // Validasi stok dulu sebelum ada perubahan, agar transaksi tidak setengah jadi.
      const lines = input.items.map((it) => {
        const product = store.products.find((p) => p.id === it.productId);
        if (!product) fail(config, 400, 'Product not found');
        const inv = store.inventories.find(
          (i) => i.productId === product.id && i.branchId === branch.id,
        );
        const qty = Number(it.quantity);
        if (!inv || inv.quantity < qty) {
          fail(config, 400, `Insufficient stock for ${product.name} at ${branch.name}`);
        }
        return { product, inv, qty };
      });

      const now = new Date().toISOString();
      const items = lines.map(({ product, inv, qty }) => {
        inv.quantity -= qty;
        inv.isLowStock = inv.quantity <= inv.product.reorderPoint;
        store.movements.unshift({
          id: nextId('mv'),
          productId: product.id,
          branchId: branch.id,
          type: 'SALE',
          quantity: -qty,
          note: 'POS sale',
          createdAt: now,
          product: { name: product.name, sku: product.sku },
          user: { name: user.name },
        });
        return {
          id: nextId('si'),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: qty,
          price: product.sellPrice,
          subtotal: product.sellPrice * qty,
        };
      });

      const total = items.reduce((sum, it) => sum + it.subtotal, 0);
      const seq = String(store.sales.length + 1).padStart(4, '0');
      const sale = {
        id: nextId('sl'),
        number: `TRX-${seq}`,
        branchId: branch.id,
        branchName: branch.name,
        cashierId: user.id,
        cashierName: user.name,
        total,
        paymentMethod: input.paymentMethod ?? 'CASH',
        items,
        createdAt: now,
      };
      store.sales.unshift(sale);
      return ok(config, { data: sale }, 201);
    },
  },

  // ---- Inventory ----
  {
    method: 'get',
    pattern: /^\/inventory$/,
    handler: (config, store) => {
      requireUser(config, store);
      const branchId = config.params?.branchId as string | undefined;
      const lowStock = config.params?.lowStock as string | undefined;
      let data = store.inventories
        .filter((i) => (branchId ? i.branchId === branchId : true))
        .map((i) => ({ ...i, isLowStock: i.quantity <= i.product.reorderPoint }))
        .sort((a, b) => a.product.name.localeCompare(b.product.name));
      if (lowStock === 'true') data = data.filter((i) => i.isLowStock);
      return ok(config, { data });
    },
  },
  {
    method: 'get',
    pattern: /^\/inventory\/movements$/,
    handler: (config, store) => {
      requireUser(config, store);
      const productId = config.params?.productId as string | undefined;
      const branchId = config.params?.branchId as string | undefined;
      const data = store.movements
        .filter((m) => (productId ? m.productId === productId : true))
        .filter((m) => (branchId ? m.branchId === branchId : true))
        .slice(0, 100);
      return ok(config, { data });
    },
  },
  {
    method: 'post',
    pattern: /^\/inventory\/adjust$/,
    handler: (config, store) => {
      const user = requireUser(config, store);
      const input = body<{ productId: string; branchId: string; quantity: number; note?: string }>(
        config,
      );
      const product = store.products.find((p) => p.id === input.productId);
      const branch = store.branches.find((b) => b.id === input.branchId);
      if (!product || !branch) fail(config, 400, 'Product or branch not found');

      let inv = store.inventories.find(
        (i) => i.productId === input.productId && i.branchId === input.branchId,
      );
      const newQty = (inv?.quantity ?? 0) + Number(input.quantity);
      if (newQty < 0) fail(config, 400, 'Stock cannot go negative');

      if (inv) {
        inv.quantity = newQty;
        inv.isLowStock = newQty <= inv.product.reorderPoint;
      } else {
        inv = {
          id: nextId('inv'),
          productId: product.id,
          branchId: branch.id,
          quantity: newQty,
          isLowStock: newQty <= product.reorderPoint,
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            reorderPoint: product.reorderPoint,
          },
          branch: { id: branch.id, name: branch.name },
        };
        store.inventories.push(inv);
      }

      store.movements.unshift({
        id: nextId('mv'),
        productId: product.id,
        branchId: branch.id,
        type: 'ADJUSTMENT',
        quantity: Number(input.quantity),
        note: input.note ?? null,
        createdAt: new Date().toISOString(),
        product: { name: product.name, sku: product.sku },
        user: { name: user.name },
      });

      return ok(config, { data: inv }, 201);
    },
  },
  {
    method: 'post',
    pattern: /^\/inventory\/transfer$/,
    handler: (config, store) => {
      const user = requireUser(config, store);
      const input = body<{
        productId: string;
        fromBranchId: string;
        toBranchId: string;
        quantity: number;
        note?: string;
      }>(config);
      const qty = Number(input.quantity);
      if (qty <= 0) fail(config, 400, 'Transfer quantity must be greater than 0');
      if (input.fromBranchId === input.toBranchId) {
        fail(config, 400, 'Source and destination branches must differ');
      }

      const product = store.products.find((p) => p.id === input.productId);
      const from = store.branches.find((b) => b.id === input.fromBranchId);
      const to = store.branches.find((b) => b.id === input.toBranchId);
      if (!product || !from || !to) fail(config, 400, 'Product or branch not found');

      const source = store.inventories.find(
        (i) => i.productId === product.id && i.branchId === from.id,
      );
      if (!source || source.quantity < qty) {
        fail(config, 400, 'Insufficient stock at the source branch');
      }

      source.quantity -= qty;
      source.isLowStock = source.quantity <= source.product.reorderPoint;

      let dest = store.inventories.find(
        (i) => i.productId === product.id && i.branchId === to.id,
      );
      if (dest) {
        dest.quantity += qty;
        dest.isLowStock = dest.quantity <= dest.product.reorderPoint;
      } else {
        dest = {
          id: nextId('inv'),
          productId: product.id,
          branchId: to.id,
          quantity: qty,
          isLowStock: qty <= product.reorderPoint,
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            reorderPoint: product.reorderPoint,
          },
          branch: { id: to.id, name: to.name },
        };
        store.inventories.push(dest);
      }

      const now = new Date().toISOString();
      const note = input.note ?? `Transfer ${from.name} → ${to.name}`;
      store.movements.unshift(
        {
          id: nextId('mv'),
          productId: product.id,
          branchId: from.id,
          type: 'TRANSFER_OUT',
          quantity: -qty,
          note,
          createdAt: now,
          product: { name: product.name, sku: product.sku },
          user: { name: user.name },
        },
        {
          id: nextId('mv'),
          productId: product.id,
          branchId: to.id,
          type: 'TRANSFER_IN',
          quantity: qty,
          note,
          createdAt: now,
          product: { name: product.name, sku: product.sku },
          user: { name: user.name },
        },
      );

      return ok(config, { data: { from: source, to: dest } }, 201);
    },
  },
];

export const demoAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  // Buang baseURL & query agar tinggal path bersih untuk dicocokkan.
  const rawUrl = config.url ?? '';
  const path = rawUrl.split('?')[0].replace(/\/+$/, '') || '/';

  // Simulasikan latensi jaringan supaya loading state ikut terlihat.
  await new Promise((r) => setTimeout(r, 120));

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(path);
    if (!match) continue;
    const response = route.handler(config, db(), match.slice(1));
    // Simpan ke localStorage setelah request yang mengubah data.
    if (method !== 'get') persist();
    return response;
  }

  return fail(config, 404, `Route not found: ${method.toUpperCase()} ${path}`);
};
