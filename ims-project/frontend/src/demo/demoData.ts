// Demo data for showcase mode (no backend/database).
// State is stored in the browser's localStorage so it survives refreshes —
// still 100% client-side, no server. The "Reset Data" button restores defaults.
import type {
  AuthUser,
  Branch,
  Category,
  InventoryRow,
  Product,
  PurchaseOrder,
  Sale,
  StockMovement,
  Supplier,
} from '../types';

export interface DemoUser extends AuthUser {
  password: string;
  isActive: boolean;
}

export interface DemoStore {
  branches: Branch[];
  users: DemoUser[];
  categories: Category[];
  products: Product[];
  inventories: InventoryRow[];
  movements: StockMovement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  sales: Sale[];
}

const STORAGE_KEY = 'ims_demo_store_v2';

function hasStorage() {
  return typeof localStorage !== 'undefined';
}

function load(): DemoStore {
  if (hasStorage()) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<DemoStore>;
        // Merge on top of a fresh seed so any fields missing from an older
        // schema (e.g. suppliers/purchaseOrders/sales) are still populated.
        const merged = { ...seed(), ...parsed } as DemoStore;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      } catch {
        // Corrupted data — fall back to a fresh seed.
      }
    }
  }
  const fresh = seed();
  if (hasStorage()) localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

let store: DemoStore = load();

export function db() {
  return store;
}

// Called after every mutation so changes persist in the browser.
export function persist() {
  if (hasStorage()) localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetStore() {
  store = seed();
  persist();
}

// Unique IDs across reloads: timestamp + counter so they never collide with stored data.
let idCounter = 0;
export function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function seed(): DemoStore {
  const branches: Branch[] = [
    { id: 'br-1', name: 'Head Office', address: '1 Merdeka St, Jakarta', phone: '021-1000001' },
    { id: 'br-2', name: 'Bandung Branch', address: '20 Asia Afrika St, Bandung', phone: '022-2000002' },
    { id: 'br-3', name: 'Surabaya Branch', address: '15 Tunjungan St, Surabaya', phone: '031-3000003' },
    { id: 'br-4', name: 'Medan Branch', address: '8 Gatot Subroto St, Medan', phone: '061-4000004' },
  ];

  const users: DemoUser[] = [
    { id: 'us-1', name: 'Sarah Johnson', email: 'admin@ims.test', role: 'ADMIN', branchId: 'br-1', password: 'password123', isActive: true },
    { id: 'us-2', name: 'Michael Chen', email: 'manager@ims.test', role: 'MANAGER', branchId: 'br-1', password: 'password123', isActive: true },
    { id: 'us-3', name: 'Emily Davis', email: 'cashier@ims.test', role: 'CASHIER', branchId: 'br-1', password: 'password123', isActive: true },
    { id: 'us-4', name: 'David Wilson', email: 'warehouse@ims.test', role: 'WAREHOUSE', branchId: 'br-2', password: 'password123', isActive: true },
    { id: 'us-5', name: 'Jessica Brown', email: 'jessica.brown@ims.test', role: 'MANAGER', branchId: 'br-2', password: 'password123', isActive: true },
    { id: 'us-6', name: 'James Miller', email: 'james.miller@ims.test', role: 'CASHIER', branchId: 'br-2', password: 'password123', isActive: true },
    { id: 'us-7', name: 'Linda Garcia', email: 'linda.garcia@ims.test', role: 'MANAGER', branchId: 'br-3', password: 'password123', isActive: true },
    { id: 'us-8', name: 'Robert Martinez', email: 'robert.martinez@ims.test', role: 'CASHIER', branchId: 'br-3', password: 'password123', isActive: true },
    { id: 'us-9', name: 'Patricia Lee', email: 'patricia.lee@ims.test', role: 'WAREHOUSE', branchId: 'br-4', password: 'password123', isActive: true },
    { id: 'us-10', name: 'Thomas Anderson', email: 'thomas.anderson@ims.test', role: 'CASHIER', branchId: 'br-4', password: 'password123', isActive: false },
  ];

  const categories: Category[] = [
    { id: 'ct-1', name: 'Beverages', description: 'Packaged and ready-to-drink beverages' },
    { id: 'ct-2', name: 'Snacks', description: 'Snacks and light bites' },
    { id: 'ct-3', name: 'Household', description: 'Household supplies' },
  ];

  const productSeed: Array<Omit<Product, 'id' | 'category' | 'totalStock'>> = [
    { sku: 'BEV-001', name: 'Mineral Water 600ml', description: null, categoryId: 'ct-1', costPrice: 2500, sellPrice: 4000, unit: 'pcs', reorderPoint: 24, isActive: true },
    { sku: 'BEV-002', name: 'Boxed Tea 250ml', description: null, categoryId: 'ct-1', costPrice: 3500, sellPrice: 5500, unit: 'pcs', reorderPoint: 24, isActive: true },
    { sku: 'BEV-003', name: 'Canned Coffee 240ml', description: null, categoryId: 'ct-1', costPrice: 5000, sellPrice: 8000, unit: 'pcs', reorderPoint: 18, isActive: true },
    { sku: 'SNK-001', name: 'Potato Chips 68g', description: null, categoryId: 'ct-2', costPrice: 8000, sellPrice: 12000, unit: 'pcs', reorderPoint: 12, isActive: true },
    { sku: 'SNK-002', name: 'Chocolate Biscuits 120g', description: null, categoryId: 'ct-2', costPrice: 9000, sellPrice: 13500, unit: 'pcs', reorderPoint: 12, isActive: true },
    { sku: 'SNK-003', name: 'Roasted Peanuts 100g', description: null, categoryId: 'ct-2', costPrice: 6000, sellPrice: 9500, unit: 'pcs', reorderPoint: 15, isActive: true },
    { sku: 'HOM-001', name: 'Dish Soap 800ml', description: null, categoryId: 'ct-3', costPrice: 14000, sellPrice: 19000, unit: 'pcs', reorderPoint: 6, isActive: true },
    { sku: 'HOM-002', name: 'Floor Cleaner 1L', description: null, categoryId: 'ct-3', costPrice: 16000, sellPrice: 22000, unit: 'pcs', reorderPoint: 6, isActive: true },
  ];

  const products: Product[] = productSeed.map((p, i) => ({ ...p, id: `pr-${i + 1}` }));

  // Stock level per branch relative to reorder point: Head Office well-stocked,
  // some branches deliberately low/empty so the low-stock filter is testable.
  const stockPlan = [3, 0.5, 2, 0];
  const inventories: InventoryRow[] = [];
  let invSeq = 0;
  for (const p of products) {
    branches.forEach((branch, bi) => {
      invSeq += 1;
      const quantity = Math.floor(p.reorderPoint * (stockPlan[bi] ?? 1));
      inventories.push({
        id: `inv-seed-${invSeq}`,
        productId: p.id,
        branchId: branch.id,
        quantity,
        isLowStock: quantity <= p.reorderPoint,
        product: { id: p.id, sku: p.sku, name: p.name, unit: p.unit, reorderPoint: p.reorderPoint },
        branch: { id: branch.id, name: branch.name },
      });
    });
  }

  const suppliers: Supplier[] = [
    { id: 'sp-1', name: 'Global Beverage Co.', contact: 'Brian Cox', phone: '021-5550001', email: 'sales@globalbeverage.com', address: 'Pulogadung Industrial Estate, Jakarta', balance: 0 },
    { id: 'sp-2', name: 'Nusantara Snacks Ltd.', contact: 'Sandra Kim', phone: '022-5550002', email: 'order@nusantarasnacks.com', address: 'Soekarno-Hatta Rd, Bandung', balance: 0 },
    { id: 'sp-3', name: 'CleanHome Supplies', contact: 'Andrew Park', phone: '024-5550003', email: null, address: 'Pandanaran St, Semarang', balance: 0 },
  ];

  return {
    branches,
    users,
    categories,
    products,
    inventories,
    movements: [],
    suppliers,
    purchaseOrders: [],
    sales: [],
  };
}
