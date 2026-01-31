"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { Store, MapPin, Phone, Star, Package, ChevronLeft, MessageCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Toast } from "@/components/ui/toast"

type Shop = {
  id: string
  name: string
  description?: string
  logo?: string
  address?: string
  phone?: string
  rating?: number
  isOpen: boolean
  ownerId?: string
}

type Product = {
  id: string
  name: string
  images?: string[]
  basePrice?: number
  price?: number
  rating?: number
  stock?: number
}

export default function ShopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params?.id as string

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)

  const handleStartChat = async () => {
    if (!shop?.ownerId) {
      setToast({ message: "Không thể bắt đầu chat với cửa hàng này", variant: "error" })
      setTimeout(() => setToast(null), 2500)
      return
    }

    setChatLoading(true)
    try {
      const response = await api.chat.conversations.create({
        participantIds: [shop.ownerId]
      })

      if (response.error) {
        setToast({ message: response.error, variant: "error" })
        setTimeout(() => setToast(null), 2500)
      } else if (response.data?.id) {
        // Redirect to chat page with conversation id
        router.push(`/buyer/chat?conversationId=${response.data.id}`)
      } else {
        setToast({ message: "Không thể tạo cuộc trò chuyện", variant: "error" })
        setTimeout(() => setToast(null), 2500)
      }
    } catch (err) {
      setToast({ message: "Có lỗi xảy ra khi kết nối chat", variant: "error" })
      setTimeout(() => setToast(null), 2500)
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    const loadShopData = async () => {
      if (!shopId) return

      setLoading(true)
      setError(null)

      try {
        // Load shop info directly from API (no auth required for public view)
        const shopResponse = await fetch(
          `https://trustmebro-web.hacmieu.xyz/api/v1/shop/${shopId}`,
          { cache: "no-store" }
        )

        if (!shopResponse.ok) {
          setError("Không tìm thấy cửa hàng")
          setLoading(false)
          return
        }

        const shopData = await shopResponse.json()
        setShop(shopData?.data || null)

        // Load shop products
        const productsResponse = await fetch(
          `https://trustmebro-web.hacmieu.xyz/api/v1/product?shopId=${shopId}&page=1&limit=20`,
          { cache: "no-store" }
        )

        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          const rawProducts = productsData?.data?.products ?? productsData?.data?.items ?? []
          setProducts(Array.isArray(rawProducts) ? rawProducts : [])
        }
      } catch (err) {
        setError("Có lỗi xảy ra khi tải thông tin cửa hàng")
      } finally {
        setLoading(false)
      }
    }

    loadShopData()
  }, [shopId])

  const formatPrice = (value?: number) => {
    if (!value) return "0 VND"
    return `${Math.round(value).toLocaleString("vi-VN")} VND`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-buyer-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải thông tin cửa hàng...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error || "Không tìm thấy cửa hàng"}</p>
              <Button onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Button>

      {/* Shop Header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Shop Logo */}
            <div className="flex-shrink-0">
              {shop.logo ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                  <Image
                    src={shop.logo}
                    alt={shop.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-buyer-primary to-buyer-secondary rounded-lg flex items-center justify-center">
                  <Store className="h-16 w-16 text-white" />
                </div>
              )}
            </div>

            {/* Shop Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{shop.name}</h1>
                  <div className="flex items-center gap-2">
                    {shop.isOpen ? (
                      <Badge className="bg-green-500">Đang mở cửa</Badge>
                    ) : (
                      <Badge variant="secondary">Đã đóng cửa</Badge>
                    )}
                    {shop.rating !== undefined && shop.rating > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{shop.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Chat Button */}
                {shop.ownerId && (
                  <Button
                    variant="buyer"
                    onClick={handleStartChat}
                    disabled={chatLoading}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {chatLoading ? "Đang kết nối..." : "Chat với shop"}
                  </Button>
                )}
              </div>

              {shop.description && (
                <p className="text-gray-600 mb-4">{shop.description}</p>
              )}

              <div className="space-y-2">
                {shop.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                    <span>{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{shop.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sản phẩm của cửa hàng ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Cửa hàng chưa có sản phẩm nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/buyer/products/${product.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative bg-gray-100">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-gray-300" />
                        </div>
                      )}
                      {product.stock !== undefined && product.stock <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="secondary">Hết hàng</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-buyer-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-buyer-primary">
                          {formatPrice(product.basePrice ?? product.price)}
                        </p>
                        {product.rating !== undefined && product.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
