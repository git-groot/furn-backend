export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  token_version: number;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type UserWithoutPassword = Omit<User, 'password_hash'>;

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserWithoutPassword;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  subcategories?: Category[];
}

export interface ProductSpecification {
  dimensions?: string; // e.g. "64 x 23 x 34 Inch"
  primary_material: string; // e.g. "Teak Wood"
  secondary_material?: string;
  upholstery_material?: string;
  finish?: string;
  assembly_required: boolean;
  dispatch_time: string; // e.g. "2 to 3 Weeks"
  warranty: string; // e.g. "1 Year"
  care_guide?: string;
  country_of_origin: string;
}

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  title: string;
  slug: string;
  sku: string;
  short_description?: string;
  description: string;
  base_price: number;
  compare_at_price?: number;
  primary_material: string;
  secondary_material?: string;
  dimensions?: string;
  assembly_required: boolean;
  finish?: string;
  dispatch_time: string;
  warranty: string;
  care_guide?: string;
  is_featured: boolean;
  is_active: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  primary_image?: string;
  avg_rating?: number;
  review_count?: number;
  // Aliases for convenience
  name?: string;
  price?: number;
  discount_price?: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id?: string | null;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  wood_type: string;
  size?: string;
  finish?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  is_active: boolean;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  category?: Category;
  specifications: ProductSpecification;
}

export interface Cart {
  id: string;
  user_id?: string | null;
  session_token?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  created_at: Date;
  updated_at: Date;
  product_title?: string;
  product_slug?: string;
  variant_title?: string;
  wood_type?: string;
  size?: string;
  unit_price?: number;
  compare_at_price?: number;
  image_url?: string;
  stock_quantity?: number;
}

export interface CartWithItems extends Cart {
  items: CartItem[];
  subtotal: number;
  total_items: number;
}

export type OrderStatus =
  'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'cod' | 'card' | 'upi' | 'netbanking';

export interface OrderAddressSnapshot {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  shipping_address_snapshot: OrderAddressSnapshot;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  product_title: string;
  variant_title?: string;
  sku: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export type AddressType = 'home' | 'work' | 'other';

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  address_type: AddressType;
  created_at: Date;
  updated_at: Date;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment: string;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  created_at: Date;
}

export interface ReviewWithUser extends Review {
  user_name: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ProductFilterQuery extends PaginationQuery {
  category?: string;
  wood_type?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  featured?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: any;
  errors?: any;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata?: any;
  created_at: Date;
}

export interface AdminProductFilterQuery extends PaginationQuery {
  category?: string;
  status?: 'active' | 'inactive' | 'deleted' | 'all';
  stock?: 'in_stock' | 'low_stock' | 'out_of_stock';
  search?: string;
}

export interface AdminUserFilterQuery extends PaginationQuery {
  role?: UserRole;
  status?: 'active' | 'inactive' | 'deleted' | 'all';
  search?: string;
}

