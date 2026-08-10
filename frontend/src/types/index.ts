export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";
export type MovementType = "IN" | "OUT";
export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  followUps?: CustomerFollowUp[];
  challans?: { id: string; challanNumber: string; status: ChallanStatus; totalQuantity: number; createdAt: string }[];
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  note: string;
  followUpDate?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  stockMovements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string;
  quantity: number;
  lineTotal: string;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer?: { id: string; name: string; mobile: string; businessName?: string | null };
  totalQuantity: number;
  status: ChallanStatus;
  createdById: string;
  createdBy?: { id: string; name: string };
  items: ChallanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorShape {
  error: { message: string; details?: unknown };
}
