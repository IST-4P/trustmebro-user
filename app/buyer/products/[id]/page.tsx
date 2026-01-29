"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, Heart, Share2 } from "lucide-react"
import { api } from "@/lib/api"
import { Toast } from "@/components/ui/toast"
import type { Product } from "@/lib/types"

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const emitCartUpdated = (itemCount?: number) => {
    if (typeof window === "undefined") return
    const detail = typeof itemCount === "number" ? { itemCount } : undefined
    window.dispatchEvent(new CustomEvent("cart-updated", detail ? { detail } : undefined))
  }

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true)
      setError(null)
      const response = await api.product.get(params.id)
      if (response.error) {
        setError(typeof response.error === "string" ? response.error : String(response.error))
        setProduct(null)
      } else if (response.data) {
        setProduct(response.data)
        const firstImage = response.data.images?.[0] || null
        setActiveImage(firstImage)
        const defaults = (response.data.variants || []).map((variant) => variant.options?.[0] || "")
        setSelectedOptions(defaults)
      }
      setLoading(false)
    }

    loadProduct()
  }, [params.id])

  const ratingValue = product?.rating ?? product?.averageRate ?? 0
  const reviewCount = product?.reviewCount ?? product?.ratingCount ?? 0

  const selectedSku = useMemo(() => {
    if (!product?.skus?.length) return null
    if (!product.variants?.length) return product.skus[0]

    const normalizedSelected = selectedOptions
      .map((option) => option?.toString().toLowerCase().trim())
      .filter(Boolean)

    if (!normalizedSelected.length) return product.skus[0]

    const matches = product.skus.find((sku) => {
      const skuValue = sku.value || ""
      const normalizedSku = skuValue.toLowerCase()
      const tokens = skuValue
        .split(/[/,;|\\-]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
      return normalizedSelected.every(
        (selected) => tokens.includes(selected) || normalizedSku.includes(selected)
      )
    })

    return matches || product.skus[0]
  }, [product, selectedOptions])

  const displayPrice = useMemo(() => {
    if (!product) return { price: 0, original: undefined as number | undefined }
    const skuPrice = typeof selectedSku?.price === "number" ? selectedSku.price : undefined
    const price = skuPrice ?? product.basePrice ?? product.price ?? 0
    const original = product.virtualPrice ?? product.salePrice
    return { price, original }
  }, [product, selectedSku])

  const isInStock = selectedSku?.stock !== undefined
    ? selectedSku.stock > 0
    : (product?.totalStock ?? product?.stock ?? 0) > 0

  useEffect(() => {
    if (selectedSku?.image) {
      setActiveImage(selectedSku.image)
    }
  }, [selectedSku])

  const handleAddToCart = async () => {
    if (!product) return
    const sku = selectedSku
    const shopId = product.shopId
    if (!shopId || !sku?.id) {
      setToast({ message: "Product chưa có đủ thông tin SKU/Shop để thêm vào giỏ.", variant: "error" })
      return
    }
    const response = await api.cart.add({
      productId: product.id,
      skuId: sku.id,
      shopId: shopId,
      quantity,
      skuValue: sku.value,
      productName: product.name,
      productImage: product.images?.[0] || null,
    })
    if (response.error) {
      setToast({ message: response.error, variant: "error" })
    } else {
      setToast({ message: "Đã thêm vào giỏ hàng thành công!", variant: "success" })
      emitCartUpdated(response.data?.itemCount)
    }
    window.setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">{error || "Product not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(product.images || []).slice(0, 4).map((img) => (
              <button
                key={img}
                className="aspect-square bg-gray-200 rounded cursor-pointer hover:ring-2 ring-buyer-primary overflow-hidden"
                onClick={() => setActiveImage(img)}
              >
                <img src={img} alt={product.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <Badge variant={isInStock ? "success" : "destructive"} className="mb-2">
            {isInStock ? "In Stock" : "Out of Stock"}
          </Badge>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{product.name}</h1>
          <div className="flex items-center mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                className={i < Math.floor(ratingValue) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
              />
            ))}
            <span className="text-sm text-gray-600 ml-2">({reviewCount} reviews)</span>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-buyer-primary">${displayPrice.price}</span>
            {displayPrice.original && displayPrice.original !== displayPrice.price && (
              <span className="text-xl text-gray-500 line-through ml-2">${displayPrice.original}</span>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            {product.description || "No description provided."}
          </p>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {(product.variants || []).length > 0 ? (
              (product.variants || []).map((variant, variantIndex) => (
                <div key={variant.value || `variant-${variantIndex}`}>
                  <label className="text-sm font-medium mb-2 block">
                    {variant.value || "Option"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(variant.options || []).map((option) => {
                      const isSelected = selectedOptions[variantIndex] === option
                      return (
                        <button
                          key={`${variant.value}-${option}`}
                          className={`px-4 py-2 border-2 rounded-md transition-colors ${
                            isSelected
                              ? "border-buyer-primary bg-buyer-primary/10 text-buyer-primary"
                              : "border-gray-300 hover:border-buyer-primary"
                          }`}
                          onClick={() => {
                            setSelectedOptions((prev) => {
                              const next = [...prev]
                              next[variantIndex] = option
                              return next
                            })
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : null}
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((prev) => prev + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="buyer" size="lg" className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2" size={20} />
              Add to Cart
            </Button>
            <Button variant="buyerSecondary" size="lg">
              Buy Now
            </Button>
            <Button variant="outline" size="icon">
              <Heart size={20} />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <div className="border-b mb-4">
            <div className="flex gap-4">
              <button className="pb-2 border-b-2 border-buyer-primary font-semibold">Description</button>
              <button className="pb-2 text-gray-600 hover:text-buyer-primary">Specifications</button>
              <button className="pb-2 text-gray-600 hover:text-buyer-primary">Reviews ({reviewCount})</button>
            </div>
          </div>
          <div>
            <p className="text-gray-600">
              {product.description || "Detailed product description goes here."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
