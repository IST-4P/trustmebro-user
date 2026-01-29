// API Response Types

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Auth Types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RegisterRequest {
  username: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  gender: "MALE" | "FEMALE" | "OTHER"
  code: string
  password: string
}

export interface RegisterResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface ChangePasswordRequest {
  email: string
  password: string // New password
  code: string // OTP code
  processId: string // Process ID from send-otp response
}

export interface SendOTPRequest {
  email: string
  type: "REGISTER" | "LOGIN" | "RESET_PASSWORD" | "CHANGE_PASSWORD"
}

export interface SendOTPResponse {
  data: {}
  message: string
  statusCode: number
  processId: string
  duration: string
}

// User Types
export interface User {
  id: string
  email: string
  phone?: string
  phoneNumber?: string // API returns phoneNumber
  fullName?: string // May not be in API response
  firstName?: string // API returns firstName
  lastName?: string // API returns lastName
  username?: string
  avatar?: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  birthday?: string
  roleId?: string
  roleName?: string
  status?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  avatar?: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  birthday?: string
}

// Address Types
export interface Address {
  id: string
  userId?: string
  // API v1 fields
  name?: string
  address?: string
  ward?: string
  district?: string
  province?: string
  isDefault?: boolean
  // Legacy/UI fields
  label?: string
  fullName?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateAddressRequest {
  // API v1 fields
  name?: string
  address?: string
  ward?: string
  district?: string
  province?: string
  isDefault?: boolean
  // Legacy/UI fields
  label?: string
  fullName?: string
  phone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  id: string
}

// Category Types
export interface Category {
  id: string
  name: string
  slug?: string
  description?: string
  image?: string
  logo?: string
  parentId?: string
  path?: string
  level?: number
  createdAt?: string
  updatedAt?: string
}

// Brand Types
export interface Brand {
  id: string
  name: string
  slug?: string
  description?: string
  logo?: string
  productCount?: number
  soldCount?: number
  categoryIds?: string[]
  categories?: Category[]
  createdAt?: string
  updatedAt?: string
}

// Product Types
export interface Product {
  id: string
  name: string
  images: string[]
  status?: "active" | "inactive" | "draft" | "ACTIVE" | "INACTIVE" | "BANNED" | "DRAFT"
  // API v1 pricing + metrics
  basePrice?: number
  virtualPrice?: number
  minPrice?: number
  maxPrice?: number
  totalStock?: number
  averageRate?: number
  ratingCount?: number
  soldCount?: number
  // Legacy/UI fields
  slug?: string
  description?: string
  price?: number
  salePrice?: number
  categoryId?: string
  category?: Category
  brandId?: string
  brand?: Brand
  sku?: string
  stock?: number
  rating?: number
  reviewCount?: number
  // API v1 product detail fields
  provinceId?: number
  provinceName?: string
  districtId?: number
  districtName?: string
  wardId?: number
  wardName?: string
  brandName?: string
  brandLogo?: string
  categoryIds?: string[]
  categories?: Category[]
  sizeGuide?: string
  variants?: { value: string; options: string[] }[]
  attributes?: { name: string; value: string }[]
  skus?: { id: string; value: string; price: number; stock: number; image?: string }[]
  reviewIds?: string[]
  viewCount?: number
  likeCount?: number
  shopId?: string
  isAvailable?: boolean
  isApproved?: boolean
  isHidden?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductFilters {
  // API v1 filters
  name?: string
  status?: "ACTIVE" | "INACTIVE" | "BANNED" | "DRAFT"
  brandIds?: string[]
  categories?: string[]
  minPrice?: number
  maxPrice?: number
  shopId?: string
  provinceId?: number
  orderBy?: "asc" | "desc"
  sortBy?: "price" | "createdAt" | "sale"
  page?: number
  limit?: number
  // Legacy filters
  categoryId?: string
  brandId?: string
  search?: string
  pageSize?: number
  sortOrder?: "asc" | "desc"
}

// Cart Types
export interface CartItem {
  id: string
  productId?: string
  skuId?: string
  shopId?: string
  quantity: number
  price: number
  product: Product
  productName?: string
  skuValue?: string
  productImage?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
  page?: number
  limit?: number
  totalItems?: number
  totalPages?: number
  groups?: { shopId: string; cartItems: CartItem[] }[]
}

export interface AddToCartRequest {
  productId: string
  skuId?: string
  shopId?: string
  quantity?: number
  skuValue?: string
  productName?: string
  productImage?: string | null
}

export interface UpdateCartItemRequest {
  cartItemId?: string
  productId?: string
  skuId?: string
  shopId?: string
  quantity?: number
  skuValue?: string
  productName?: string
  productImage?: string | null
}

// Order Types
export interface Order {
  id: string
  // API v1 fields
  code?: string
  shopId?: string
  shopName?: string
  status?: "CREATING" | "PENDING" | "CONFIRMED" | "SHIPPING" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  paymentMethod?: "COD" | "WALLET" | "ONLINE" | string
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "pending" | "paid" | "failed" | "refunded"
  paymentId?: string
  itemTotal?: number
  shippingFee?: number
  discount?: number
  grandTotal?: number
  receiver?: { name: string; phone: string; address: string }
  timeline?: { status: string; at: string }[]
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  itemsSnapshot?: Array<{
    id: string
    productId: string
    productImage: string
    productName: string
    skuValue: string
    quantity: number
    price: number
  }>
  firstProductName?: string
  firstProductImage?: string
  // Legacy/UI fields
  orderNumber?: string
  userId?: string
  items?: OrderItem[]
  shippingAddress?: Address
  billingAddress?: Address
  subtotal?: number
  shipping?: number
  tax?: number
  total?: number
  trackingNumber?: string
  createdAt?: string
  updatedAt?: string
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
  total: number
}

export interface CreateOrderRequest {
  // API v1 fields
  shippingFee?: number
  discountCode?: string
  paymentMethod?: "COD" | "WALLET" | "ONLINE"
  receiver?: { name: string; phone: string; address: string }
  orders?: Array<{ shopId: string; cartItemIds: string[] }>
  // Legacy fields
  shippingAddressId?: string
  billingAddressId?: string
  cartItemIds?: string[]
}

// Chat Types
export interface ConversationParticipant {
  id: string
  username: string
  avatar: string
}

export interface ConversationReadStatus {
  isRead: boolean
  lastSeenMessageId?: string | null
  deletedAt?: string | null
}

export interface Conversation {
  id: string
  participantIds: string[]
  lastMessageId?: string | null
  lastMessageContent?: string | null
  lastMessageAt?: string | null
  lastSenderId?: string | null
  readStatus: Record<string, ConversationReadStatus>
  participants: ConversationParticipant[]
}

export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "PRODUCT_CARD"
  | "ORDER_CARD"
  | "STICKER"

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  metadata?: Record<string, any>
  createdAt: string
}

export interface CreateConversationRequest {
  participantIds: string[]
}

export interface SendMessageRequest {
  conversationId: string
  content: string
  type?: MessageType
  metadata?: Record<string, any>
  attachments?: string[]
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type?: "order" | "payment" | "message" | "promotion" | "system" | "ORDER_UPDATE" | "PROMOTION" | "WALLET_UPDATE" | "TRUST_ME_BRO_UPDATE"
  title?: string
  message?: string
  description?: string
  read?: boolean
  isRead?: boolean
  link?: string
  image?: string
  metadata?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export interface UpdateNotificationRequest {
  id: string
  read?: boolean
  isRead?: boolean
}

// Promotion Types
export interface Promotion {
  id: string
  code?: string
  name?: string
  description?: string
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED"
  startsAt?: string
  endsAt?: string
  scope?: "ORDER" | "SHIPPING"
  discountType?: "PERCENT" | "AMOUNT" | "percentage" | "fixed"
  discountValue?: number
  minPurchase?: number
  minOrderSubtotal?: number
  maxDiscount?: number
  totalLimit?: number
  usedCount?: number
  startDate?: string
  endDate?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

// Media Types
export interface PresignedUrlRequest {
  filename: string
}

export interface PresignedUrlResponse {
  presignedUrl: string
  url: string
}

export interface MediaPlayback {
  url: string
  type: string
  duration?: number
}

// Location Types
export interface Province {
  id: number
  name: string
}

export interface District {
  id: number
  name: string
  provinceId: number
}

export interface Ward {
  id: number
  name: string
  districtId: number
  provinceId: number
}

// Review Types
export interface ReviewReply {
  id?: string
  reviewId: string
  shopId: string
  content: string
  createdAt?: string
}

export interface Review {
  id: string
  productId: string
  userId: string
  shopId: string
  orderId: string
  orderItemId: string
  rating: number
  content: string
  medias: string[]
  createdAt?: string
  updatedAt?: string
  reply?: ReviewReply
}

export interface ReviewListItem {
  id: string
  productId: string
  productName?: string
  rating: number
  userId: string
  username?: string
  avatar?: string
  content: string
  medias: string[]
  createdAt?: string
  reply?: ReviewReply
}

export interface ReviewRatingSummary {
  productId: string
  averageRating: number
  totalReviews: number
  oneStarCount: number
  twoStarCount: number
  threeStarCount: number
  fourStarCount: number
  fiveStarCount: number
}

export interface ReviewListResponse {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  reviews: ReviewListItem[]
  rating?: ReviewRatingSummary
}

export interface CreateReviewRequest {
  orderItemId: string
  orderId: string
  rating: number
  content: string
  medias: string[]
}

export interface UpdateReviewRequest {
  id: string
  rating?: number
  content?: string
  medias: string[]
}

// Shop Types
export interface Shop {
  id: string
  ownerId?: string
  name: string
  description?: string
  logo?: string
  address?: string
  phone?: string
  rating?: number
  isOpen?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateShopRequest {
  name: string
  description?: string
  logo?: string
  address?: string
  phone?: string
}

export interface UpdateShopRequest extends Partial<CreateShopRequest> {
  id: string
  isOpen?: boolean
}

// Report Types
export interface CreateReportRequest {
  targetId: string
  targetType: "USER" | "SELLER" | "PRODUCT" | "ORDER" | "MESSAGE" | "REVIEW"
  category: "SCAM" | "FRAUD" | "FAKE" | "HARASSMENT" | "SPAM"
  title: string
  description: string
}

export interface Report {
  id: string
  reporterId: string
  targetId: string
  targetType: "USER" | "SELLER" | "PRODUCT" | "ORDER" | "MESSAGE" | "REVIEW"
  category: "SCAM" | "FRAUD" | "FAKE" | "HARASSMENT" | "SPAM"
  title: string
  description: string
  status: "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED"
  note?: string
  createdAt?: string
  updatedAt?: string
}

// Payment Types
export interface PaymentTransactionRequest {
  id?: number
  gateway?: string
  transactionDate?: string
  accountNumber?: string
  code?: string
  content?: string
  transferType?: "in" | "out"
  transferAmount?: number
  accumulated?: number
  subAccount?: string | null
  referenceCode?: string
  description?: string
}

export interface Payment {
  id: string
  code?: string
  userId?: string
  orderId?: string[]
  method?: "COD" | "ONLINE" | "WALLET" | string
  status?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | string
  amount?: number
  qrCode?: string
  createdAt?: string
  updatedAt?: string
}
