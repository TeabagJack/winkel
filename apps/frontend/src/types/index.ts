// User types
export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'BUYER' | 'APPROVER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  company?: Company;
}

// Company types
export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_APPROVAL' | 'INACTIVE';
export type PaymentTerms = 'NET_30' | 'NET_60' | 'NET_90' | 'IMMEDIATE' | 'CUSTOM';

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone: string;
  status: CompanyStatus;
  paymentTerms: PaymentTerms;
  creditLimit: number;
  currentCredit: number;
}

// Product types
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  basePrice: number;
  quantity: number;
  status: ProductStatus;
  images?: ProductImage[];
  category?: Category;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

// Order types
export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'FAILED'
  | 'REFUNDED';

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Cart types
export interface Cart {
  id: string;
  items: CartItem[];
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
}

// Quote types
export type QuoteStatus = 'DRAFT' | 'SUBMITTED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal?: number;
  total?: number;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  requestedQuantity: number;
  quotedQuantity?: number;
  quotedUnitPrice?: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
