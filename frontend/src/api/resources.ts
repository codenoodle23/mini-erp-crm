import { api } from "./client";
import type {
  AuthUser,
  Challan,
  ChallanStatus,
  Customer,
  CustomerFollowUp,
  CustomerStatus,
  CustomerType,
  MovementType,
  Paginated,
  Product,
  StockMovement,
} from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password }),
  me: () => api.get<{ data: AuthUser }>("/auth/me"),
};

export const customersApi = {
  list: (params: { page?: number; search?: string; status?: CustomerStatus | ""; customerType?: CustomerType | "" }) =>
    api.get<Paginated<Customer>>("/customers", {
      page: params.page,
      search: params.search,
      status: params.status || undefined,
      customerType: params.customerType || undefined,
      pageSize: 20,
    }),
  get: (id: string) => api.get<{ data: Customer }>(`/customers/${id}`),
  create: (input: Partial<Customer>) => api.post<{ data: Customer }>("/customers", input),
  update: (id: string, input: Partial<Customer>) => api.put<{ data: Customer }>(`/customers/${id}`, input),
  addFollowUp: (id: string, input: { note: string; followUpDate?: string }) =>
    api.post<{ data: CustomerFollowUp }>(`/customers/${id}/follow-ups`, input),
};

export const productsApi = {
  list: (params: { page?: number; search?: string; category?: string; lowStock?: boolean }) =>
    api.get<Paginated<Product>>("/products", { ...params, pageSize: 20 }),
  get: (id: string) => api.get<{ data: Product }>(`/products/${id}`),
  create: (input: Partial<Product>) => api.post<{ data: Product }>("/products", input),
  update: (id: string, input: Partial<Product>) => api.put<{ data: Product }>(`/products/${id}`, input),
  recordMovement: (id: string, input: { quantity: number; movementType: MovementType; reason: string }) =>
    api.post<{ data: StockMovement }>(`/products/${id}/stock-movements`, input),
};

export const challansApi = {
  list: (params: { page?: number; status?: ChallanStatus | ""; customerId?: string }) =>
    api.get<Paginated<Challan>>("/challans", {
      page: params.page,
      status: params.status || undefined,
      customerId: params.customerId,
      pageSize: 20,
    }),
  get: (id: string) => api.get<{ data: Challan }>(`/challans/${id}`),
  create: (input: {
    customerId: string;
    items: { productId: string; quantity: number }[];
    status: "DRAFT" | "CONFIRMED";
  }) => api.post<{ data: Challan }>("/challans", input),
  update: (id: string, input: { customerId?: string; items?: { productId: string; quantity: number }[] }) =>
    api.put<{ data: Challan }>(`/challans/${id}`, input),
  confirm: (id: string) => api.post<{ data: Challan }>(`/challans/${id}/confirm`),
  cancel: (id: string) => api.post<{ data: Challan }>(`/challans/${id}/cancel`),
  downloadPdf: (id: string) => api.download(`/challans/${id}/pdf`),
};
