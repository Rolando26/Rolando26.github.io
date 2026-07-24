export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAREHOUSE';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  branch?: Branch | null;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  costPrice: number;
  sellPrice: number;
  unit: string;
  reorderPoint: number;
  isActive: boolean;
  totalStock?: number;
}

export interface InventoryRow {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  isLowStock: boolean;
  product: { id: string; sku: string; name: string; unit: string; reorderPoint: number };
  branch: { id: string; name: string };
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface StockMovement {
  id: string;
  productId: string;
  branchId: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { name: string; sku: string };
  user: { name: string } | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  cost: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  status: PurchaseOrderStatus;
  total: number;
  items: PurchaseOrderItem[];
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  number: string;
  branchId: string;
  branchName: string;
  cashierId: string | null;
  cashierName: string | null;
  total: number;
  paymentMethod: string;
  items: SaleItem[];
  createdAt: string;
}
