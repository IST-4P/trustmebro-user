import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  SendOTPRequest,
  SendOTPResponse,
  User,
  UpdateUserRequest,
  Address,
  CreateAddressRequest,
  UpdateAddressRequest,
  Category,
  Brand,
  Product,
  ProductFilters,
  Cart,
  CartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
  Order,
  CreateOrderRequest,
  Conversation,
  Message,
  CreateConversationRequest,
  SendMessageRequest,
  Notification,
  UpdateNotificationRequest,
  Promotion,
  Province,
  District,
  Ward,
  Review,
  ReviewListResponse,
  CreateReviewRequest,
  UpdateReviewRequest,
  Shop,
  CreateShopRequest,
  UpdateShopRequest,
  CreateReportRequest,
  Report,
  PaymentTransactionRequest,
  Payment,
  PresignedUrlRequest,
  PresignedUrlResponse,
  MediaPlayback,
  PaginatedResponse,
} from "./types"

import { getErrorMessage } from "./utils"
import Cookies from "js-cookie"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
const SSE_BASE_URL = process.env.NEXT_PUBLIC_SSE_BASE_URL || ""

if (!API_BASE_URL) {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not set")
}

// Helper to check if we're in development
function isDevelopment(): boolean {
  if (typeof window === "undefined") return false
  return window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
}

// Helper to check if we're using HTTPS
function isHTTPS(): boolean {
  if (typeof window === "undefined") return false
  return window.location.protocol === "https:"
}

// Cookie configuration - adapt based on environment
// On localhost HTTP: secure=false, sameSite=lax
// On localhost HTTPS: secure=true, sameSite=none (for cross-site with backend)
// In production HTTPS: secure=true, sameSite=none
function getCookieOptions() {
  const dev = isDevelopment()
  const https = isHTTPS()
  
  // If HTTPS (even on localhost), use secure=true and sameSite=none for cross-site
  // If HTTP on localhost, use secure=false and sameSite=lax
  return {
    expires: 1, // 1 day (accessToken expires in 24h)
    secure: https, // true if HTTPS, false if HTTP
    sameSite: (https ? "none" : "lax") as "lax" | "none", // none for HTTPS (cross-site), lax for HTTP
    path: "/",
  }
}

function getRefreshCookieOptions() {
  const dev = isDevelopment()
  const https = isHTTPS()
  
  return {
    expires: 7, // 7 days (refreshToken expires in 7 days)
    secure: https,
    sameSite: (https ? "none" : "lax") as "lax" | "none",
    path: "/",
  }
}

// Helper to get auth token from cookies
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  
  return Cookies.get("accessToken") || null
}

// Helper to set auth token in cookies
function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  if (!token || token === "undefined" || token === "null") {
    console.error("Attempted to set invalid accessToken:", token)
    return
  }
  try {
    const options = getCookieOptions()
    Cookies.set("accessToken", token, options)

    // Verify immediate write
    let verification = Cookies.get("accessToken")
    if (verification !== token) {
      // Fallback: try setting directly with document.cookie
      const expires = new Date()
      expires.setTime(expires.getTime() + (options.expires * 24 * 60 * 60 * 1000))
      const cookieString = `accessToken=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=${options.path}; ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite}`
      document.cookie = cookieString
    }
  } catch (error) {
    console.error("Failed to set accessToken cookie:", error)
  }
}

// Helper to set refresh token in cookies
function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return
  if (!token || token === "undefined" || token === "null") {
    console.error("Attempted to set invalid refreshToken:", token)
    return
  }
  try {
    const options = getRefreshCookieOptions()
    Cookies.set("refreshToken", token, options)

    // Verify immediate write
    let verification = Cookies.get("refreshToken")
    if (verification !== token) {
      // Fallback: try setting directly with document.cookie
      const expires = new Date()
      expires.setTime(expires.getTime() + (options.expires * 24 * 60 * 60 * 1000))
      const cookieString = `refreshToken=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=${options.path}; ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite}`
      document.cookie = cookieString
    }
  } catch (error) {
    console.error("Failed to set refreshToken cookie:", error)
  }
}

// Helper to remove auth token from cookies
function removeAuthToken(): void {
  if (typeof window === "undefined") return
  // Remove with both sameSite options to ensure cleanup
  Cookies.remove("accessToken", { path: "/", sameSite: "lax" })
  Cookies.remove("accessToken", { path: "/", sameSite: "none" })
  Cookies.remove("refreshToken", { path: "/", sameSite: "lax" })
  Cookies.remove("refreshToken", { path: "/", sameSite: "none" })
}

// Internal function to refresh token (used by fetchApi to avoid circular dependency)
async function refreshTokenInternal(): Promise<string | null> {
  if (typeof window === "undefined") return null

  const refreshToken = Cookies.get("refreshToken")
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    })

    if (response.ok) {
      const data = await response.json()
      const unwrappedData = data?.data || data
      const accessToken = unwrappedData?.accessToken
      const newRefreshToken = unwrappedData?.refreshToken

      if (accessToken && typeof accessToken === "string") {
        setAuthToken(accessToken)
        if (newRefreshToken && typeof newRefreshToken === "string") {
          setRefreshToken(newRefreshToken)
        }
        return accessToken
      }
    }
  } catch (error) {
    console.error("Failed to refresh token:", error)
  }

  return null
}

// Base fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken()
  const url = `${API_BASE_URL}${endpoint}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Required for cross-site cookies (Set-Cookie from backend)
    })

    if (!response.ok) {
      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const hadToken = getAuthToken()
          const refreshToken = Cookies.get("refreshToken")

          // Try to refresh token if we have a refresh token
          if (refreshToken && hadToken) {
            const newAccessToken = await refreshTokenInternal()
            if (newAccessToken) {
              // Token refreshed, retry the original request
              const retryHeaders: HeadersInit = {
                ...headers,
                Authorization: `Bearer ${newAccessToken}`,
              }
              const retryResponse = await fetch(url, {
                ...options,
                headers: retryHeaders,
                credentials: "include",
              })
              if (retryResponse.ok) {
                const retryData = await retryResponse.json()
                const unwrappedData = retryData?.data || retryData
                return { data: unwrappedData }
              }
            }
          }

          // If refresh failed or no refresh token, clear tokens
          if (hadToken) {
            removeAuthToken()
          }
        }
      }
      const errorData = await response.json().catch(() => ({
        error: response.statusText || "An error occurred",
      }))

      // Extract error message - handle different error response formats
      let errorMessage = "An error occurred"
      if (typeof errorData === "string") {
        errorMessage = errorData
      } else if (errorData?.message) {
        // If message is a string, use it; if it's an object, extract its message property
        if (typeof errorData.message === "string") {
          errorMessage = errorData.message
        } else if (errorData.message && typeof errorData.message === "object" && "message" in errorData.message) {
          errorMessage = String(errorData.message.message)
        } else {
          errorMessage = JSON.stringify(errorData.message)
        }
      } else if (errorData?.error) {
        if (typeof errorData.error === "string") {
          errorMessage = errorData.error
        } else if (errorData.error && typeof errorData.error === "object" && "message" in errorData.error) {
          errorMessage = String(errorData.error.message)
        } else {
          errorMessage = JSON.stringify(errorData.error)
        }
      } else if (errorData?.statusCode) {
        const msg = errorData.message
        errorMessage = `Error ${errorData.statusCode}: ${typeof msg === "string" ? msg : "An error occurred"}`
      }

      return { error: errorMessage }
    }

    const data = await response.json()
    
    // Handle case where API wraps response in a 'data' property
    // If the response is { data: { accessToken: ... } }, unwrap it
    const unwrappedData = data?.data || data
    
    return { data: unwrappedData }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error occurred",
    }
  }
}

function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === "") return
        searchParams.append(key, String(item))
      })
      return
    }
    searchParams.append(key, String(value))
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

function normalizePaginated<T>(data: any, itemsKey: string): PaginatedResponse<T> | null {
  if (!data) return null
  const items = (Array.isArray(data)
    ? data
    : data[itemsKey] || data.items || []) as T[]
  const page = Number(data.page ?? 1)
  const pageSize = Number(data.limit ?? data.pageSize ?? items.length ?? 0)
  const total = Number(data.totalItems ?? data.total ?? items.length ?? 0)
  const totalPages = Number(
    data.totalPages ?? (pageSize ? Math.ceil(total / pageSize) : 1)
  )
  return { items, total, page, pageSize, totalPages }
}

function normalizeAddress(raw: any): Address {
  return {
    id: raw?.id || "",
    userId: raw?.userId,
    name: raw?.name,
    address: raw?.address,
    ward: raw?.ward,
    district: raw?.district,
    province: raw?.province,
    isDefault: raw?.isDefault ?? raw?.isDefaultAddress ?? false,
    label: raw?.label ?? raw?.name ?? raw?.fullName ?? "Address",
    fullName: raw?.fullName ?? raw?.name ?? "",
    phone: raw?.phone ?? raw?.phoneNumber ?? "",
    addressLine1: raw?.addressLine1 ?? raw?.address ?? "",
    addressLine2: raw?.addressLine2,
    city: raw?.city ?? raw?.ward ?? "",
    state: raw?.state ?? raw?.district ?? "",
    zipCode: raw?.zipCode ?? "",
    country: raw?.country ?? raw?.province ?? "",
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  }
}

function normalizeAddressRequest(data: CreateAddressRequest | UpdateAddressRequest) {
  return {
    id: "id" in data ? data.id : undefined,
    name: data.name ?? data.label ?? data.fullName ?? "",
    address: data.address ?? data.addressLine1 ?? "",
    ward: data.ward ?? data.city ?? "",
    district: data.district ?? data.state ?? "",
    province: data.province ?? data.country ?? "",
    isDefault: data.isDefault ?? false,
  }
}

function normalizeProduct(raw: any): Product {
  const basePrice = typeof raw?.basePrice === "number" ? raw.basePrice : undefined
  const virtualPrice = typeof raw?.virtualPrice === "number" ? raw.virtualPrice : undefined
  const rating = typeof raw?.rating === "number"
    ? raw.rating
    : typeof raw?.averageRate === "number"
      ? raw.averageRate
      : undefined
  const reviewCount = typeof raw?.reviewCount === "number"
    ? raw.reviewCount
    : typeof raw?.ratingCount === "number"
      ? raw.ratingCount
      : undefined
  return {
    ...raw,
    price: raw?.price ?? basePrice ?? 0,
    salePrice: raw?.salePrice ?? virtualPrice,
    rating,
    reviewCount,
    images: Array.isArray(raw?.images) ? raw.images : [],
  }
}

function normalizeCart(data: any): Cart | null {
  if (!data) return null
  const page = Number.isFinite(Number(data?.page)) ? Number(data.page) : undefined
  const limit = Number.isFinite(Number(data?.limit)) ? Number(data.limit) : undefined
  const totalItems = Number.isFinite(Number(data?.totalItems)) ? Number(data.totalItems) : undefined
  const totalPages = Number.isFinite(Number(data?.totalPages)) ? Number(data.totalPages) : undefined

  if (Array.isArray(data?.items)) {
    return {
      ...(data as Cart),
      page,
      limit,
      totalItems,
      totalPages,
    }
  }
  const groups = Array.isArray(data?.cartItems) ? data.cartItems : null
  if (!groups) return null
  const items: CartItem[] = []
  groups.forEach((group: any) => {
    const groupItems = Array.isArray(group?.cartItems) ? group.cartItems : []
    groupItems.forEach((item: any) => {
      const price = typeof item?.price === "number" ? item.price : 0
      const product: Product = item?.product || {
        id: item?.productId || "unknown",
        name: item?.productName || "Product",
        images: item?.productImage ? [item.productImage] : [],
        price,
      }
      items.push({
        id: item.id,
        productId: item.productId,
        skuId: item.skuId,
        shopId: item.shopId,
        quantity: item.quantity ?? 1,
        price,
        product,
        productName: item.productName,
        skuValue: item.skuValue,
        productImage: item.productImage,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })
    })
  })
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const total = items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  )
  return {
    items,
    total,
    itemCount,
    page,
    limit,
    totalItems,
    totalPages,
    groups: groups.map((group: any) => ({
      shopId: group.shopId,
      cartItems: (group.cartItems || []).map((item: any) => ({ ...item })),
    })),
  }
}

const cartProductCache = new Map<string, Product>()
const cartProductRequests = new Map<string, Promise<Product | null>>()

async function fetchProductForCart(productId: string): Promise<Product | null> {
  if (!productId) return null
  const cached = cartProductCache.get(productId)
  if (cached) return cached
  const pending = cartProductRequests.get(productId)
  if (pending) return pending

  const request = (async () => {
    const response = await fetchApi<any>(`/api/v1/product/${productId}`)
    if (response.error) return null
    const product = normalizeProduct(response.data)
    cartProductCache.set(productId, product)
    return product
  })()

  cartProductRequests.set(productId, request)
  const result = await request
  cartProductRequests.delete(productId)
  return result
}

function resolveSkuPrice(product: Product, skuId?: string, skuValue?: string): number | undefined {
  if (!Array.isArray(product?.skus) || product.skus.length === 0) return undefined
  if (skuId) {
    const sku = product.skus.find((candidate) => candidate.id === skuId)
    if (typeof sku?.price === "number") return sku.price
  }
  if (skuValue) {
    const normalizedValue = skuValue.toLowerCase().trim()
    const sku = product.skus.find(
      (candidate) => (candidate.value || "").toLowerCase().trim() === normalizedValue
    )
    if (typeof sku?.price === "number") return sku.price
  }
  return undefined
}

function resolveCartItemPrice(item: CartItem, product?: Product | null): number {
  if (typeof item.price === "number" && item.price > 0) return item.price
  const source = product ?? item.product
  if (!source) return typeof item.price === "number" ? item.price : 0

  const skuPrice = resolveSkuPrice(source, item.skuId, item.skuValue)
  if (typeof skuPrice === "number") return skuPrice

  const fallback = source.basePrice ?? source.price ?? source.minPrice ?? 0
  return typeof fallback === "number" ? fallback : 0
}

function mergeCartItemProduct(item: CartItem, product?: Product | null): Product {
  const baseProduct = item.product || {
    id: item.productId || "unknown",
    name: item.productName || "Product",
    images: [],
  }
  if (!product) {
    const images = baseProduct.images?.length
      ? baseProduct.images
      : item.productImage
        ? [item.productImage]
        : []
    return { ...baseProduct, images }
  }

  const images = product.images?.length
    ? product.images
    : baseProduct.images?.length
      ? baseProduct.images
      : item.productImage
        ? [item.productImage]
        : []

  return { ...baseProduct, ...product, images }
}

async function hydrateCartPrices(cart: Cart): Promise<Cart> {
  const items = Array.isArray(cart.items) ? cart.items : []
  const productIds = Array.from(
    new Set(
      items
        .filter((item) => item.productId && (!Number.isFinite(item.price) || item.price <= 0))
        .map((item) => item.productId as string)
    )
  )

  const products = await Promise.all(productIds.map((id) => fetchProductForCart(id)))
  const productMap = new Map<string, Product>()
  productIds.forEach((id, index) => {
    const product = products[index]
    if (product) productMap.set(id, product)
  })

  const enrichedItems = items.map((item) => {
    const fetchedProduct = item.productId ? productMap.get(item.productId) : null
    const mergedProduct = mergeCartItemProduct(item, fetchedProduct)
    const price = resolveCartItemPrice(item, mergedProduct)
    return { ...item, price, product: mergedProduct }
  })

  const computedItemCount = enrichedItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  )
  const computedTotal = enrichedItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  )
  const hasItemCount = typeof cart.itemCount === "number" && Number.isFinite(cart.itemCount)
  const hasTotal = typeof cart.total === "number" && Number.isFinite(cart.total) && cart.total > 0

  return {
    ...cart,
    items: enrichedItems,
    itemCount: hasItemCount ? cart.itemCount : computedItemCount,
    total: hasTotal ? cart.total : computedTotal,
  }
}

async function fetchCartNormalized(params?: { page?: number; limit?: number }): Promise<ApiResponse<Cart>> {
  const query = params ? buildQueryParams(params as Record<string, unknown>) : ""
  const response = await fetchApi<any>(`/api/v1/cart${query}`)
  if (response.error) return { error: response.error }
  const normalized = normalizeCart(response.data)
  if (!normalized) {
    return { data: { items: [], total: 0, itemCount: 0 } }
  }
  const hydrated = await hydrateCartPrices(normalized)
  return { data: hydrated }
}

// Helper to check authentication status by calling protected API
// This works even if cookies are HttpOnly (browser sends them automatically)
export async function checkAuthStatus(): Promise<boolean> {
  if (typeof window === "undefined") return false
  
  try {
    // Try to get user info - if successful, user is authenticated
    const response = await fetch(`${API_BASE_URL}/api/v1/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Required to send HttpOnly cookies
    })
    
    return response.ok // 200 = authenticated, 401/403 = not authenticated
  } catch (error) {
    console.error("Error checking auth status:", error)
    return false
  }
}

// API Client
export const api = {
  // Health
  health: {
    liveness: () => fetchApi<{ status: string }>("/api/v1/health/liveness"),
    readiness: () => fetchApi<{ status: string }>("/api/v1/health/readiness"),
  },

  // Auth
  auth: {
    login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
      // Make direct fetch to access response headers and body
      const url = `${API_BASE_URL}/api/v1/auth/login`
      
      try {
        const fetchResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include", // Required to receive Set-Cookie headers
        })

        // Check if backend sent Set-Cookie headers
        const setCookieHeader = fetchResponse.headers.get("set-cookie")
        const hasSetCookieHeaders = !!setCookieHeader

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({}))
          return { error: getErrorMessage(errorData) }
        }

        // Parse response body
        const data = await fetchResponse.json()
        const unwrappedData = data?.data || data
        const responseData = unwrappedData as LoginResponse

        // Strategy 1: If tokens are in response body, set them client-side (non-HttpOnly)
        if (responseData?.accessToken || responseData?.refreshToken) {
          if (responseData.accessToken && typeof responseData.accessToken === "string" && responseData.accessToken.length > 10) {
            setAuthToken(responseData.accessToken)
          }
          
          if (responseData.refreshToken && typeof responseData.refreshToken === "string" && responseData.refreshToken.length > 10) {
            setRefreshToken(responseData.refreshToken)
          }
        }
        // Strategy 2: If backend sent HttpOnly cookies via Set-Cookie, rely on browser
        // Browser will automatically send HttpOnly cookies with credentials: "include"
        
        // Return success even if no tokens in body - cookies are handled by browser
        return { data: responseData || { message: "Login successful" } as any }
      } catch (error) {
        console.error("Login error:", error)
        return {
          error: error instanceof Error ? error.message : "Network error occurred",
        }
      }
    },

    register: async (data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
      const response = await fetchApi<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      })
      if (response.data) {
        const accessToken = response.data.accessToken
        const refreshToken = response.data.refreshToken

        if (accessToken && typeof accessToken === "string" && accessToken !== "undefined") {
          setAuthToken(accessToken)
        }
        if (refreshToken && typeof refreshToken === "string" && refreshToken !== "undefined") {
          setRefreshToken(refreshToken)
        }
      }
      return response
    },

    refreshToken: async (
      refreshToken?: string
    ): Promise<ApiResponse<RefreshTokenResponse>> => {
      // Get refresh token from cookie if not provided
      const tokenToUse = refreshToken || (typeof window !== "undefined" ? Cookies.get("refreshToken") : null)

      if (!tokenToUse) {
        return { error: "No refresh token available" }
      }

      const response = await fetchApi<RefreshTokenResponse>("/api/v1/auth/refresh-token", {
        method: "POST",
        body: JSON.stringify({ refreshToken: tokenToUse }),
      })
      if (response.data) {
        const accessToken = response.data.accessToken
        const newRefreshToken = response.data.refreshToken

        if (accessToken && typeof accessToken === "string" && accessToken !== "undefined") {
          setAuthToken(accessToken)
        }
        if (newRefreshToken && typeof newRefreshToken === "string" && newRefreshToken !== "undefined") {
          setRefreshToken(newRefreshToken)
        }
      }
      return response
    },

    logout: async (): Promise<ApiResponse<{ message: string }>> => {
      const response = await fetchApi<{ message: string }>("/api/v1/auth/logout", {
        method: "POST",
      })
      removeAuthToken()
      return response
    },

    changePassword: (data: ChangePasswordRequest) =>
      fetchApi<{ message: string }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    sendOTP: (data: SendOTPRequest) =>
      fetchApi<SendOTPResponse>("/api/v1/auth/send-otp", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // User Profile
  user: {
    get: () => fetchApi<User>("/api/v1/user"),
    update: (data: UpdateUserRequest) =>
      fetchApi<User>("/api/v1/user", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  // Addresses
  address: {
    list: async (params?: { page?: number; limit?: number }) => {
      const query = params ? buildQueryParams(params) : ""
      const response = await fetchApi<any>(`/api/v1/address${query}`)
      if (response.error) return response as ApiResponse<Address[]>
      const data = response.data
      const rawList = Array.isArray(data) ? data : data?.addresses || data?.items || []
      const addresses = Array.isArray(rawList) ? rawList.map(normalizeAddress) : []
      return { data: addresses }
    },
    get: async (id: string) => {
      const response = await fetchApi<any>(`/api/v1/address/${id}`)
      if (response.error) return response as ApiResponse<Address>
      return { data: normalizeAddress(response.data) }
    },
    create: async (data: CreateAddressRequest) => {
      const response = await fetchApi<any>("/api/v1/address", {
        method: "POST",
        body: JSON.stringify(normalizeAddressRequest(data)),
      })
      if (response.error) return response as ApiResponse<Address>
      return { data: normalizeAddress(response.data) }
    },
    update: async (data: UpdateAddressRequest) => {
      const response = await fetchApi<any>("/api/v1/address", {
        method: "PUT",
        body: JSON.stringify(normalizeAddressRequest(data)),
      })
      if (response.error) return response as ApiResponse<Address>
      return { data: normalizeAddress(response.data) }
    },
    delete: (id: string) =>
      fetchApi<{ message: string }>(`/api/v1/address/${id}`, {
        method: "DELETE",
      }),
  },

  // Location
  location: {
    provinces: async (): Promise<ApiResponse<Province[]>> => {
      const response = await fetchApi<any>("/api/v1/location/provinces")
      if (response.error) return response as ApiResponse<Province[]>
      const data = response.data
      return { data: Array.isArray(data) ? data : data?.provinces || data?.items || [] } as ApiResponse<Province[]>
    },
    districts: async (provinceId: number | string): Promise<ApiResponse<District[]>> => {
      const response = await fetchApi<any>(`/api/v1/location/districts/${provinceId}`)
      if (response.error) return response as ApiResponse<District[]>
      const data = response.data
      return { data: Array.isArray(data) ? data : data?.districts || data?.items || [] } as ApiResponse<District[]>
    },
    wards: async (districtId: number | string): Promise<ApiResponse<Ward[]>> => {
      const response = await fetchApi<any>(`/api/v1/location/wards/${districtId}`)
      if (response.error) return response as ApiResponse<Ward[]>
      const data = response.data
      return { data: Array.isArray(data) ? data : data?.wards || data?.items || [] } as ApiResponse<Ward[]>
    },
  },

  // Categories
  category: {
    list: async (): Promise<ApiResponse<Category[]>> => {
      const response = await fetchApi<any>("/api/v1/category")
      if (response.error) return response as ApiResponse<Category[]>
      const data = response.data
      const categories = Array.isArray(data) ? data : data?.categories || []
      return { data: Array.isArray(categories) ? categories : [] } as ApiResponse<Category[]>
    },
    get: (id: string) => fetchApi<Category>(`/api/v1/category/${id}`),
  },

  // Brands
  brand: {
    list: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<Brand[]>> => {
      const query = params ? buildQueryParams(params) : ""
      const response = await fetchApi<any>(`/api/v1/brand${query}`)
      if (response.error) return response as ApiResponse<Brand[]>
      const data = response.data
      const brands = Array.isArray(data) ? data : data?.brands || []
      return { data: Array.isArray(brands) ? brands : [] } as ApiResponse<Brand[]>
    },
    get: (id: string) => fetchApi<Brand>(`/api/v1/brand/${id}`),
  },

  // Products
  product: {
    list: async (filters?: ProductFilters) => {
      const resolvedFilters: ProductFilters = { ...(filters || {}) }
      if (resolvedFilters.page === undefined) resolvedFilters.page = 1
      if (resolvedFilters.limit === undefined) {
        resolvedFilters.limit = resolvedFilters.pageSize ?? 10
      }
      if (resolvedFilters.orderBy === undefined) resolvedFilters.orderBy = "desc"
      if (resolvedFilters.sortBy === undefined) resolvedFilters.sortBy = "createdAt"
      if (!resolvedFilters.name && resolvedFilters.search) {
        resolvedFilters.name = resolvedFilters.search
      }
      if (!resolvedFilters.categories && resolvedFilters.categoryId) {
        resolvedFilters.categories = [resolvedFilters.categoryId]
      }
      if (!resolvedFilters.brandIds && resolvedFilters.brandId) {
        resolvedFilters.brandIds = [resolvedFilters.brandId]
      }

      const query = buildQueryParams(resolvedFilters as Record<string, unknown>)
      const response = await fetchApi<any>(`/api/v1/product${query}`)
      if (response.error) return response as ApiResponse<PaginatedResponse<Product>>
      const normalized = normalizePaginated<Product>(response.data, "products")
      if (!normalized) return { data: { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0 } }
      const items = normalized.items.map(normalizeProduct)
      return { data: { ...normalized, items } }
    },
    get: async (id: string) => {
      const response = await fetchApi<any>(`/api/v1/product/${id}`)
      if (response.error) return response as ApiResponse<Product>
      return { data: normalizeProduct(response.data) }
    },
  },

  // Reviews
  review: {
    list: (params?: { page?: number; limit?: number; productId?: string; rating?: number }) => {
      const query = params ? buildQueryParams(params) : ""
      return fetchApi<ReviewListResponse>(`/api/v1/review${query}`)
    },
    my: (params?: { page?: number; limit?: number; shopId?: string }) => {
      const query = params ? buildQueryParams(params) : ""
      return fetchApi<ReviewListResponse>(`/api/v1/review/my${query}`)
    },
    create: (data: CreateReviewRequest) =>
      fetchApi<Review>("/api/v1/review", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: UpdateReviewRequest) =>
      fetchApi<Review>("/api/v1/review", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ message: string }>(`/api/v1/review/${id}`, {
        method: "DELETE",
      }),
  },

  // Shop
  shop: {
    getMine: () => fetchApi<Shop>("/api/v1/shop"),
    get: (id: string) => fetchApi<Shop>(`/api/v1/shop/${id}`),
    create: (data: CreateShopRequest) =>
      fetchApi<Shop>("/api/v1/shop", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (data: UpdateShopRequest) =>
      fetchApi<Shop>("/api/v1/shop", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  // Cart
  cart: {
    get: (params?: { page?: number; limit?: number }) => fetchCartNormalized(params),
    add: async (data: AddToCartRequest) => {
      const response = await fetchApi<any>("/api/v1/cart", {
        method: "POST",
        body: JSON.stringify(data),
      })
      if (response.error) return response as ApiResponse<Cart>
      const normalized = normalizeCart(response.data)
      if (!normalized) return { data: { items: [], total: 0, itemCount: 0 } }
      const hydrated = await hydrateCartPrices(normalized)
      return { data: hydrated }
    },
    update: async (data: UpdateCartItemRequest, params?: { page?: number; limit?: number }) => {
      const response = await fetchApi<any>("/api/v1/cart", {
        method: "PUT",
        body: JSON.stringify(data),
      })
      if (response.error) return response as ApiResponse<Cart>
      const normalized = normalizeCart(response.data)
      if (normalized) {
        if (params && (normalized.page === undefined || normalized.totalPages === undefined)) {
          return fetchCartNormalized(params)
        }
        const hydrated = await hydrateCartPrices(normalized)
        return { data: hydrated }
      }
      return fetchCartNormalized(params)
    },
    remove: async (cartItemId: string, params?: { page?: number; limit?: number }) => {
      const response = await fetchApi<any>(`/api/v1/cart/${cartItemId}`, {
        method: "DELETE",
      })
      if (response.error) return response as ApiResponse<Cart>
      const normalized = normalizeCart(response.data)
      if (normalized) {
        if (params && (normalized.page === undefined || normalized.totalPages === undefined)) {
          return fetchCartNormalized(params)
        }
        const hydrated = await hydrateCartPrices(normalized)
        return { data: hydrated }
      }
      return fetchCartNormalized(params)
    },
  },

  // Orders
  order: {
    list: async (params?: { page?: number; limit?: number; status?: string; paymentId?: string; shopId?: string }): Promise<ApiResponse<Order[]>> => {
      const query = params ? buildQueryParams(params) : ""
      const response = await fetchApi<any>(`/api/v1/order${query}`)
      if (response.error) return response as ApiResponse<Order[]>
      const data = response.data
      const orders = Array.isArray(data) ? data : data?.orders || []
      return { data: Array.isArray(orders) ? orders : [] } as ApiResponse<Order[]>
    },
    get: (orderId: string) => fetchApi<Order>(`/api/v1/order/${orderId}`),
    create: (data: CreateOrderRequest) =>
      fetchApi<Order>("/api/v1/order", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Payment
  payment: {
    get: (paymentId: string) => fetchApi<Payment>(`/api/v1/payment/${paymentId}`),
    transaction: (data: PaymentTransactionRequest) =>
      fetchApi<{ message?: string }>("/api/v1/payment/transaction", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Report
  report: {
    create: (data: CreateReportRequest) =>
      fetchApi<Report>("/api/v1/report", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Chat
  chat: {
    conversations: {
      list: async (params?: { page?: number; limit?: number }) => {
        const query = params ? buildQueryParams(params as Record<string, unknown>) : ""
        const response = await fetchApi<any>(`/api/v1/chat/conversation${query}`)
        if (response.error) return response as ApiResponse<PaginatedResponse<Conversation>>
        const normalized = normalizePaginated<Conversation>(response.data, "conversations")
        if (!normalized) {
          return { data: { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0 } }
        }
        return { data: normalized }
      },
      create: (data: CreateConversationRequest) =>
        fetchApi<Conversation>("/api/v1/chat/conversation", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      sse: () => {
        if (!SSE_BASE_URL) {
          throw new Error("SSE base URL not available")
        }
        const token = getAuthToken()
        const baseUrl = `${SSE_BASE_URL}/api/v1/chat/conversation/sse`
        const url = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
        return new EventSource(url, { withCredentials: true })
      },
    },
    messages: {
      list: async (conversationId: string, params?: { page?: number; limit?: number }) => {
        const query = buildQueryParams({
          conversationId,
          ...(params || {}),
        } as Record<string, unknown>)
        const response = await fetchApi<any>(`/api/v1/chat/message${query}`)
        if (response.error) return response as ApiResponse<PaginatedResponse<Message>>
        const normalized = normalizePaginated<Message>(response.data, "messages")
        if (!normalized) {
          return { data: { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0 } }
        }
        return { data: normalized }
      },
    },
    send: (data: SendMessageRequest) =>
      fetchApi<Message>("/api/v1/chat/message", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Notifications
    notification: {
    list: async (params?: { page?: number; limit?: number; type?: string }): Promise<ApiResponse<Notification[]>> => {
      const query = params ? buildQueryParams(params) : ""
      const response = await fetchApi<any>(`/api/v1/notification${query}`)
      if (response.error) return response as ApiResponse<Notification[]>
      const data = response.data
      const notifications = Array.isArray(data) ? data : data?.notifications || []
      return { data: Array.isArray(notifications) ? notifications : [] } as ApiResponse<Notification[]>
    },
    update: (data: UpdateNotificationRequest) =>
      fetchApi<Notification>("/api/v1/notification", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ message: string }>(`/api/v1/notification/${id}`, {
        method: "DELETE",
      }),
    sse: () => {
      if (!SSE_BASE_URL) {
        throw new Error("SSE base URL not available")
      }
      const token = getAuthToken()
      const baseUrl = `${SSE_BASE_URL}/api/v1/notification/sse`
      const url = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
      return new EventSource(url, { withCredentials: true })
    },
  },

  // Media
  media: {
    imagePresigned: (data: PresignedUrlRequest) =>
      fetchApi<PresignedUrlResponse>("/api/v1/media/image/presigned", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    uploadToPresignedUrl: async (presignedUrl: string, file: File) => {
      try {
        const response = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        })
        if (!response.ok) {
          return { error: response.statusText || "Upload failed" }
        }
        return { data: { success: true } }
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Upload failed",
        }
      }
    },
    tusd: (data: PresignedUrlRequest) =>
      fetchApi<PresignedUrlResponse>("/api/v1/media/tusd", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    playback: (key: string) =>
      fetchApi<MediaPlayback>(`/api/v1/media/playback?key=${key}`),
  },

  // Promotions
  promotion: {
    list: async (params?: {
      page?: number
      limit?: number
      scope?: "ORDER" | "SHIPPING"
      discountType?: "PERCENT" | "AMOUNT"
      code?: string
    }): Promise<ApiResponse<Promotion[]>> => {
      const query = params ? buildQueryParams(params) : ""
      const response = await fetchApi<any>(`/api/v1/promotion${query}`)
      if (response.error) return response as ApiResponse<Promotion[]>
      const data = response.data
      const promotions = Array.isArray(data) ? data : data?.promotions || []
      return { data: Array.isArray(promotions) ? promotions : [] } as ApiResponse<Promotion[]>
    },
    get: (id: string) => fetchApi<Promotion>(`/api/v1/promotion/${id}`),
  },
}

export default api
