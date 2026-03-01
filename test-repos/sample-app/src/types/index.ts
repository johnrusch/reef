/**
 * Core type definitions for the Sample App API.
 * These types are used throughout the application across all layers.
 */

// ============================================================
// User Types
// ============================================================

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

export interface IUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  stripeCustomerId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreateInput {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

export interface IUserUpdateInput {
  username?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

// ============================================================
// Order Types
// ============================================================

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface IOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface IOrder {
  id: string;
  userId: string;
  items: IOrderItem[];
  status: OrderStatus;
  totalAmount: number;
  paymentIntentId?: string;
  shippingAddress?: IAddress;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// ============================================================
// Product Types
// ============================================================

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================
// Service Types
// ============================================================

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// ============================================================
// Express Extensions
// ============================================================

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
