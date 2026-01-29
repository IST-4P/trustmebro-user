# API Integration Guide

This document describes the API integration for the TrustMeBro-Web Buyer application.

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SSE_BASE_URL=http://localhost:8080
```

## API Client

All API calls are centralized in `lib/api.ts`. The client handles:
- Authentication token management
- Error handling
- Request/response formatting
- Type-safe interfaces

## Usage Examples

### Authentication

```typescript
import { api } from "@/lib/api"

// Login
const response = await api.auth.login({
  email: "user@example.com",
  password: "password123"
})

if (response.data) {
  // Token is automatically stored
  router.push("/buyer")
}
```

### Products

```typescript
// List products with filters
const response = await api.product.list({
  categoryId: "cat123",
  minPrice: 10,
  maxPrice: 100,
  page: 1,
  pageSize: 20
})

// Get single product
const product = await api.product.get("product-id")
```

### Cart

```typescript
// Get cart
const cart = await api.cart.get()

// Add to cart
await api.cart.add({
  productId: "prod123",
  quantity: 1
})

// Update quantity
await api.cart.update({
  cartItemId: "item123",
  quantity: 2
})

// Remove item
await api.cart.remove("item123")
```

### User Profile

```typescript
// Get user
const user = await api.user.get()

// Update user
await api.user.update({
  fullName: "John Doe",
  email: "john@example.com"
})
```

### Addresses

```typescript
// List addresses
const addresses = await api.address.list()

// Create address
await api.address.create({
  label: "Home",
  fullName: "John Doe",
  phone: "+1234567890",
  addressLine1: "123 Main St",
  city: "City",
  state: "State",
  zipCode: "12345",
  country: "USA",
  isDefault: true
})
```

### Orders

```typescript
// List orders
const orders = await api.order.list()

// Get order details
const order = await api.order.get("order-id")

// Create order
await api.order.create({
  shippingAddressId: "addr123",
  paymentMethod: "card",
  cartItemIds: ["item1", "item2"]
})
```

### Notifications (SSE)

```typescript
// Connect to notification stream
const eventSource = api.notification.sse()

eventSource.addEventListener("message", (event) => {
  const notification = JSON.parse(event.data)
  // Handle notification
})

eventSource.addEventListener("error", (error) => {
  console.error("SSE error:", error)
})
```

## Type Safety

All API responses are typed using interfaces defined in `lib/types.ts`. This ensures:
- Type checking at compile time
- IntelliSense support in IDEs
- Better error prevention

## Error Handling

The API client returns responses in the format:

```typescript
{
  data?: T
  error?: string
}
```

Always check for errors:

```typescript
const response = await api.product.list()

if (response.error) {
  // Handle error
  console.error(response.error)
  return
}

// Use data
const products = response.data
```

## Authentication

Tokens are automatically managed:
- Stored in `localStorage` after login
- Included in request headers
- Removed on logout

To manually refresh token:

```typescript
const refreshToken = localStorage.getItem("refreshToken")
if (refreshToken) {
  await api.auth.refreshToken(refreshToken)
}
```

## Pages Updated

The following Buyer pages have been integrated with APIs:

- ✅ Login (`/buyer/login`)
- ✅ Register (`/buyer/register`)
- ✅ Products (`/buyer/products`)
- ✅ Cart (`/buyer/cart`)
- ✅ Profile (`/buyer/profile`)
- ✅ Addresses (`/buyer/addresses`)

Remaining pages to integrate:
- Product Detail (`/buyer/products/[id]`)
- Checkout (`/buyer/checkout`)
- Orders (`/buyer/orders`)
- Order Detail (`/buyer/orders/[id]`)
- Notifications (`/buyer/notifications`)
- Chat (`/buyer/chat`)
- OTP Verification (`/buyer/otp-verification`)
