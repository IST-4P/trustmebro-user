"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Flag, Star, ShoppingCart, Heart, Share2, Store, MapPin, Phone } from "lucide-react"
import { api } from "@/lib/api"
import { Toast } from "@/components/ui/toast"
import type { Product, ReviewListItem, ReviewRatingSummary, Shop } from "@/lib/types"

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "reviews">("description")
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [reviewSummary, setReviewSummary] = useState<ReviewRatingSummary | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportCategory, setReportCategory] = useState<"SCAM" | "FRAUD" | "FAKE" | "HARASSMENT" | "SPAM">("SCAM")
  const [reportTitle, setReportTitle] = useState("")
  const [reportDescription, setReportDescription] = useState("")
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)
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
        setReviews([])
        setReviewSummary(null)
        setReviewError(null)
        setReviewsLoaded(false)
        const firstImage = response.data.images?.[0] || null
        setActiveImage(firstImage)
        const defaults = (response.data.variants || []).map((variant) => variant.options?.[0] || "")
        setSelectedOptions(defaults)
        
        // Load shop info if shopId exists
        console.log("Product data:", response.data)
        console.log("Product shopId:", response.data.shopId)
        if (response.data.shopId) {
          console.log("Loading shop with ID:", response.data.shopId)
          const shopResponse = await api.shop.get(response.data.shopId)
          console.log("Shop response:", shopResponse)
          if (shopResponse.data) {
            setShop(shopResponse.data)
          }
        } else {
          console.log("No shopId found in product")
          setShop(null)
        }
      }
      setLoading(false)
    }

    loadProduct()
  }, [params.id])

  const ratingValue = product?.rating ?? product?.averageRate ?? 0
  const reviewCount = product?.reviewCount ?? product?.ratingCount ?? 0
  const attributes = product?.attributes || []

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|#|$)/i.test(url)

  const formatReviewTime = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("vi-VN")
  }

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
    const skuPrice = typeof selectedSku?.price === "number" && selectedSku.price > 0 ? selectedSku.price : undefined
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
      setToast({ message: "Sản phẩm chưa có đủ thông tin SKU/Cửa hàng để thêm vào giỏ.", variant: "error" })
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

  const handleCloseReport = () => {
    setReportOpen(false)
    setReportCategory("SCAM")
    setReportTitle("")
    setReportDescription("")
    setReportError(null)
    setReportSuccess(false)
  }

  const handleSubmitReport = async () => {
    if (!product) return
    const title = reportTitle.trim()
    const description = reportDescription.trim()
    if (!title || !description) {
      setReportError("Vui lòng nhập đầy đủ tiêu đề và mô tả.")
      return
    }
    if (title.length < 10) {
      setReportError("Tiêu đề phải có ít nhất 10 ký tự.")
      return
    }
    if (description.length < 10) {
      setReportError("Mô tả chi tiết phải có ít nhất 10 ký tự.")
      return
    }
    setReportSubmitting(true)
    setReportError(null)
    setReportSuccess(false)

    const response = await api.report.create({
      targetId: product.id,
      targetType: "PRODUCT",
      category: reportCategory,
      title,
      description,
    })

    if (response.error) {
      const message = typeof response.error === "string" ? response.error : "Không thể gửi báo cáo."
      if (message.includes("401") || message.includes("Unauthorized")) {
        window.location.href = "/buyer/login"
        return
      }
      setReportError(message)
      setReportSubmitting(false)
      return
    }

    setReportSubmitting(false)
    setReportSuccess(true)
  }

  const loadReviews = async () => {
    if (!product?.id) return
    setReviewLoading(true)
    setReviewError(null)
    const response = await api.review.list({ page: 1, limit: 20, productId: product.id })
    if (response.error || !response.data) {
      setReviewError(typeof response.error === "string" ? response.error : "Không thể tải đánh giá.")
      setReviewLoading(false)
      return
    }
    setReviews(response.data.reviews || [])
    setReviewSummary(response.data.rating || null)
    setReviewsLoaded(true)
    setReviewLoading(false)
  }

  useEffect(() => {
    if (activeTab !== "reviews") return
    if (reviewsLoaded) return
    loadReviews()
  }, [activeTab, reviewsLoaded, product?.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải sản phẩm...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">{error || "Không tìm thấy sản phẩm"}</p>
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
            {isInStock ? "Còn hàng" : "Hết hàng"}
          </Badge>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{product.name}</h1>
          <div
            className="flex items-center mb-4 cursor-pointer"
            onClick={() => {
              setActiveTab("reviews")
              tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            role="button"
            aria-label="Xem đánh giá sản phẩm"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={20}
                className={i < Math.floor(ratingValue) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
              />
            ))}
            <span className="text-sm text-gray-600 ml-2">({reviewCount} đánh giá)</span>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-buyer-primary">{Number(displayPrice.price).toLocaleString("vi-VN")} VND</span>
            {displayPrice.original && displayPrice.original !== displayPrice.price && (
              <span className="text-xl text-gray-500 line-through ml-2">{Number(displayPrice.original).toLocaleString("vi-VN")} VND</span>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            {product.description || "Chưa có mô tả."}
          </p>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {(product.variants || []).length > 0 ? (
              (product.variants || []).map((variant, variantIndex) => (
                <div key={variant.value || `variant-${variantIndex}`}>
                  <label className="text-sm font-medium mb-2 block">
                    {variant.value || "Tùy chọn"}
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
            
            {/* Stock Display */}
            {selectedSku && selectedSku.stock !== undefined && (
              <div className="mb-2">
                <p className="text-sm text-gray-600">
                  Kho: <span className="font-semibold text-gray-800">{selectedSku.stock} sản phẩm</span>
                </p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-2 block">Số lượng</label>
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
              Thêm vào giỏ hàng
            </Button>
            <Button variant="buyerSecondary" size="lg">
              Mua ngay
            </Button>
            <Button variant="outline" size="icon">
              <Heart size={20} />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 size={20} />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setReportOpen(true)}>
              <Flag size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Shop Info */}
      {shop && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {shop.logo ? (
                  <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-buyer-primary/10">
                    <Store className="text-buyer-primary" size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{shop.name}</h3>
                {shop.description && (
                  <p className="text-sm text-gray-600 mb-3">{shop.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {shop.address && (
                    <div className="flex items-center gap-1">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{shop.address}</span>
                    </div>
                  )}
                  {shop.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={16} className="text-gray-400" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                  {shop.rating !== undefined && shop.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span>{shop.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = `/buyer/shop/${shop.id}`}
              >
                Xem cửa hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card>
        <CardContent className="p-6">
          <div className="border-b mb-4" ref={tabsRef}>
            <div className="flex gap-4">
              <button
                className={`pb-2 text-sm font-semibold transition-colors ${
                  activeTab === "description"
                    ? "border-b-2 border-buyer-primary text-gray-900"
                    : "text-gray-600 hover:text-buyer-primary"
                }`}
                onClick={() => setActiveTab("description")}
              >
                Mô tả
              </button>
              <button
                className={`pb-2 text-sm font-semibold transition-colors ${
                  activeTab === "specs"
                    ? "border-b-2 border-buyer-primary text-gray-900"
                    : "text-gray-600 hover:text-buyer-primary"
                }`}
                onClick={() => setActiveTab("specs")}
              >
                Thông số
              </button>
              <button
                className={`pb-2 text-sm font-semibold transition-colors ${
                  activeTab === "reviews"
                    ? "border-b-2 border-buyer-primary text-gray-900"
                    : "text-gray-600 hover:text-buyer-primary"
                }`}
                onClick={() => setActiveTab("reviews")}
              >
                Đánh giá ({reviewCount})
              </button>
            </div>
          </div>
          {activeTab === "description" ? (
            <div>
              <p className="text-gray-600">
                {product.description || "Mô tả chi tiết sản phẩm ở đây."}
              </p>
            </div>
          ) : null}
          {activeTab === "specs" ? (
            <div>
              {attributes.length === 0 ? (
                <p className="text-gray-600">Chưa có thông số cho sản phẩm này.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attributes.map((item) => (
                    <div
                      key={`${item.name}-${item.value}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{item.name}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {activeTab === "reviews" ? (
            <div className="space-y-4">
              {reviewLoading ? (
                <p className="text-gray-600">Đang tải đánh giá...</p>
              ) : reviewError ? (
                <p className="text-red-600">{reviewError}</p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-600">Chưa có đánh giá nào.</p>
              ) : (
                <>
                  {reviewSummary ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-sm text-gray-600">Đánh giá trung bình</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-gray-800">
                          {reviewSummary.averageRating.toFixed(1)}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={`summary-${i}`}
                              size={16}
                              className={i < Math.round(reviewSummary.averageRating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {reviewSummary.totalReviews} đánh giá
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border border-gray-200 bg-white px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {review.username || "Khách hàng"}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={`${review.id}-star-${i}`}
                                  size={14}
                                  className={i < Math.floor(review.rating)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"}
                                />
                              ))}
                              <span className="text-xs text-gray-500 ml-2">
                                {formatReviewTime(review.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {review.content ? (
                          <p className="text-sm text-gray-700 mt-3">{review.content}</p>
                        ) : null}
                        {review.medias && review.medias.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {review.medias.map((media) => (
                              <div key={media} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                                {isVideoUrl(media) ? (
                                  <video
                                    src={media}
                                    className="h-24 w-full rounded-md object-cover"
                                    controls
                                  />
                                ) : (
                                  <img
                                    src={media}
                                    alt="review media"
                                    className="h-24 w-full rounded-md object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
      {reportOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Báo cáo sản phẩm</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">Gửi báo cáo</h3>
              </div>
              <Button variant="outline" size="icon" onClick={handleCloseReport}>
                ✕
              </Button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Danh mục</label>
                <select
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={reportCategory}
                  onChange={(event) => setReportCategory(event.target.value as typeof reportCategory)}
                >
                  <option value="SCAM">Lừa đảo</option>
                  <option value="FRAUD">Gian lận</option>
                  <option value="FAKE">Hàng giả</option>
                  <option value="HARASSMENT">Quấy rối</option>
                  <option value="SPAM">Spam</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tiêu đề</label>
                <Input
                  value={reportTitle}
                  onChange={(event) => setReportTitle(event.target.value)}
                  placeholder="Nhập tiêu đề báo cáo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mô tả chi tiết</label>
                <Textarea
                  rows={4}
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  placeholder="Mô tả lý do báo cáo..."
                />
              </div>
              {reportError ? (
                <p className="text-sm text-red-600">{reportError}</p>
              ) : null}
              {reportSuccess ? (
                <p className="text-sm text-emerald-600">Đã gửi báo cáo. Cảm ơn bạn!</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseReport} disabled={reportSubmitting}>
                  Hủy
                </Button>
                <Button variant="buyer" onClick={handleSubmitReport} disabled={reportSubmitting}>
                  {reportSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
