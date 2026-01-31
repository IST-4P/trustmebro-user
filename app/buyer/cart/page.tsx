"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, Minus } from "lucide-react"
import { api } from "@/lib/api"
import type { Cart } from "@/lib/types"

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10
  const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} VND`
  const emitCartUpdated = (itemCount?: number) => {
    if (typeof window === "undefined") return
    const detail = typeof itemCount === "number" ? { itemCount } : undefined
    window.dispatchEvent(new CustomEvent("cart-updated", detail ? { detail } : undefined))
  }

  const loadCart = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    const response = await api.cart.get({ page: targetPage, limit })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("CartItemsNotFound")) {
        setCart({
          items: [],
          total: 0,
          itemCount: 0,
          page: targetPage,
          limit,
          totalItems: 0,
          totalPages: 1,
        })
        emitCartUpdated(0)
        setError(null)
        setLoading(false)
        return
      }
      // Handle 401 - redirect to login if unauthorized
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setError(errorMsg)
    } else if (response.data) {
      setCart(response.data)
      emitCartUpdated(response.data.itemCount ?? 0)
      const resolvedTotalPages = Math.max(1, response.data.totalPages ?? 1)
      if (targetPage > resolvedTotalPages) {
        setPage(resolvedTotalPages)
      }
    }
    setLoading(false)
  }, [limit])

  useEffect(() => {
    loadCart(page)
  }, [page, loadCart])

  const updateQuantity = async (cartItemId: string, quantity: number, productId?: string, skuId?: string, shopId?: string) => {
    if (quantity < 1) return
    const response = await api.cart.update({ cartItemId, quantity, productId, skuId, shopId }, { page, limit })
    if (response.error) {
      alert(response.error)
    } else if (response.data) {
      setCart(response.data)
      emitCartUpdated(response.data.itemCount ?? 0)
    }
  }

  const removeItem = async (cartItemId: string) => {
    const response = await api.cart.remove(cartItemId, { page, limit })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("CartItemsNotFound")) {
        setCart({
          items: [],
          total: 0,
          itemCount: 0,
          page,
          limit,
          totalItems: 0,
          totalPages: 1,
        })
        emitCartUpdated(0)
        return
      }
      alert(errorMsg)
    } else if (response.data) {
      setCart(response.data)
      emitCartUpdated(response.data.itemCount ?? 0)
    }
  }

  const handleProceedToCheckout = () => {
    router.push("/buyer/checkout")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Giỏ hàng</h1>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải giỏ hàng...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Giỏ hàng trống</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.product.images && item.product.images[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-2">{item.product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">Phân loại: {item.product.sku}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.productId ?? item.product?.id, item.skuId, item.shopId)}
                          >
                            <Minus size={16} />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.productId ?? item.product?.id, item.skuId, item.shopId)}
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-buyer-primary">
                            {formatVnd((item.price || 0) * (item.quantity || 0))}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={20} className="text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(() => {
              const totalPages = Math.max(1, cart.totalPages ?? 1)
              if (totalPages <= 1) return null
              const start = Math.max(1, page - 2)
              const end = Math.min(totalPages, page + 2)
              const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
              return (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Trước
                  </Button>
                  {pages.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === page ? "buyer" : "outline"}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Sau
                  </Button>
                  <span className="text-sm text-gray-500 ml-2">
                    Trang {page} / {totalPages}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Tóm tắt đơn hàng</h2>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính</span>
                    <span>{formatVnd(cart.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sản phẩm</span>
                    <span>{cart.itemCount}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Tổng cộng</span>
                    <span className="text-buyer-primary">{formatVnd(cart.total || 0)}</span>
                  </div>
                </div>
                <Button
                  variant="buyer"
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToCheckout}
                >
                  Tiến hành thanh toán
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
