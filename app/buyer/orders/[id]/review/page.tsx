"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, Upload, X } from "lucide-react"
import { api } from "@/lib/api"
import type { Order } from "@/lib/types"
import { Toast } from "@/components/ui/toast"

type ReviewItem = {
  id: string
  productName: string
  productImage?: string
  skuValue?: string
  quantity: number
  price?: number
}

type SubmitState = {
  loading?: boolean
  error?: string | null
  success?: boolean
}

type MediaItem = {
  url: string
  type: "image"
  name: string
}

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} VND`

const formatTime = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("vi-VN")
}

export default function OrderReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [contents, setContents] = useState<Record<string, string>>({})
  const [submissions, setSubmissions] = useState<Record<string, SubmitState>>({})
  const [mediaByItem, setMediaByItem] = useState<Record<string, MediaItem[]>>({})
  const [mediaUploading, setMediaUploading] = useState<Record<string, boolean>>({})
  const [mediaError, setMediaError] = useState<Record<string, string | null>>({})
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true)
      setError(null)
      const response = await api.order.get(params.id)
      if (response.error || !response.data) {
        const message = response.error || "Không tìm thấy đơn hàng."
        if (message.includes("401") || message.includes("Unauthorized")) {
          router.push("/buyer/login")
          return
        }
        setError(message)
        setLoading(false)
        return
      }
      setOrder(response.data)
      setLoading(false)
    }

    loadOrder()
  }, [params.id, router])

  const orderItems = useMemo<ReviewItem[]>(() => {
    if (!order) return []
    if (Array.isArray(order.itemsSnapshot) && order.itemsSnapshot.length > 0) {
      return order.itemsSnapshot.map((item) => ({
        id: item.id,
        productName: item.productName || "Sản phẩm",
        productImage: item.productImage,
        skuValue: item.skuValue,
        quantity: item.quantity ?? 1,
        price: item.price,
      }))
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map((item) => ({
        id: item.id,
        productName: item.product?.name || "Sản phẩm",
        productImage: item.product?.images?.[0],
        skuValue: item.product?.sku,
        quantity: item.quantity ?? 1,
        price: item.price,
      }))
    }
    return []
  }, [order])

  const orderCode = order?.code || order?.orderNumber || (order?.id ? order.id.slice(0, 8) : "")
  const orderTime = formatTime(order?.createdAt)

  const handleSubmit = async (itemId: string) => {
    if (!order) return
    const rating = ratings[itemId] || 0
    const content = (contents[itemId] || "").trim()
    const medias = (mediaByItem[itemId] || []).map((item) => item.url)
    if (!rating) {
      setSubmissions((prev) => ({
        ...prev,
        [itemId]: { loading: false, error: "Vui lòng chọn số sao trước khi gửi." },
      }))
      return
    }

    setSubmissions((prev) => ({
      ...prev,
      [itemId]: { loading: true, error: null, success: false },
    }))

    const response = await api.review.create({
      orderId: order.id,
      orderItemId: itemId,
      rating,
      content,
      medias,
    })

    if (response.error) {
      setSubmissions((prev) => ({
        ...prev,
        [itemId]: { loading: false, error: response.error, success: false },
      }))
      setToast({ message: response.error, variant: "error" })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSubmissions((prev) => ({
      ...prev,
      [itemId]: { loading: false, error: null, success: true },
    }))
    
    // Show success toast and redirect
    setToast({ message: "Đánh giá thành công!", variant: "success" })
    setTimeout(() => {
      router.push("/buyer/orders")
    }, 1500)
  }

  const handleMediaChange = async (itemId: string, event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const files = Array.from(input.files || [])
    if (files.length === 0) return
    if (mediaUploading[itemId]) {
      input.value = ""
      return
    }

    setMediaUploading((prev) => ({ ...prev, [itemId]: true }))
    setMediaError((prev) => ({ ...prev, [itemId]: null }))

    try {
      const uploaded: MediaItem[] = []
      for (const file of files) {
        // Only allow images
        if (!file.type.startsWith("image/")) {
          setMediaError((prev) => ({ ...prev, [itemId]: "Chỉ chấp nhận file ảnh" }))
          continue
        }
        
        const presigned = await api.media.imagePresigned({ filename: file.name })
        if (presigned.error || !presigned.data) {
          const message = typeof presigned.error === "string"
            ? presigned.error
            : "Không lấy được link upload."
          setMediaError((prev) => ({ ...prev, [itemId]: message }))
          continue
        }
        const upload = await api.media.uploadToPresignedUrl(presigned.data.presignedUrl, file)
        if (upload.error) {
          const message = typeof upload.error === "string"
            ? upload.error
            : "Upload thất bại."
          setMediaError((prev) => ({ ...prev, [itemId]: message }))
          continue
        }
        uploaded.push({
          url: presigned.data.url,
          type: "image",
          name: file.name,
        })
      }

      if (uploaded.length > 0) {
        setMediaByItem((prev) => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), ...uploaded],
        }))
      }
    } finally {
      setMediaUploading((prev) => ({ ...prev, [itemId]: false }))
      input.value = ""
    }
  }

  const handleRemoveMedia = (itemId: string, url: string) => {
    setMediaByItem((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((item) => item.url !== url),
    }))
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
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Đánh giá đơn hàng</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Đánh giá đơn #{orderCode || params.id}</h1>
          <p className="text-sm text-gray-500 mt-2">
            {orderTime ? `Ngày đặt: ${orderTime}` : "Ngày đặt: --"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/buyer/orders">
            <Button variant="outline">Quay lại đơn hàng</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Card className="border border-gray-200/70 shadow-sm">
          <CardContent className="p-6">
            <p className="text-gray-600">Đang tải đơn hàng...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border border-red-100 bg-red-50/60 shadow-sm">
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      ) : orderItems.length === 0 ? (
        <Card className="border border-gray-200/70 shadow-sm">
          <CardContent className="p-6">
            <p className="text-gray-600">Không tìm thấy sản phẩm để đánh giá.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderItems.map((item) => {
            const rating = ratings[item.id] || 0
            const submitState = submissions[item.id]
            const mediaList = mediaByItem[item.id] || []
            return (
              <Card key={item.id} className="border border-gray-200/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Đánh giá sản phẩm</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.productName}</p>
                      {item.skuValue ? (
                        <p className="text-sm text-gray-500">Phân loại: {item.skuValue}</p>
                      ) : null}
                      <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                      {typeof item.price === "number" ? (
                        <p className="text-sm text-gray-500">Giá: {formatVnd(item.price)}</p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Chọn số sao</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const active = value <= rating
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRatings((prev) => ({ ...prev, [item.id]: value }))}
                            className="rounded-full p-1 hover:scale-105 transition"
                            aria-label={`${value} sao`}
                          >
                            <Star
                              size={22}
                              className={active ? "text-buyer-primary fill-buyer-primary" : "text-gray-300"}
                            />
                          </button>
                        )
                      })}
                      <span className="text-sm text-gray-500 ml-2">
                        {rating ? `${rating}/5` : "Chưa chọn"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Nội dung đánh giá</p>
                    <Textarea
                      rows={4}
                      placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                      value={contents[item.id] || ""}
                      onChange={(event) =>
                        setContents((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Ảnh đánh giá</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-buyer-primary hover:text-buyer-primary transition cursor-pointer">
                        <Upload size={16} />
                        <span>{mediaUploading[item.id] ? "Đang tải..." : "Chọn ảnh"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => handleMediaChange(item.id, event)}
                          disabled={mediaUploading[item.id]}
                        />
                      </label>
                      {mediaList.length > 0 ? (
                        <span className="text-xs text-gray-500">
                          Đã chọn {mediaList.length} tệp
                        </span>
                      ) : null}
                    </div>
                    {mediaError[item.id] ? (
                      <p className="text-xs text-red-600 mt-2">{mediaError[item.id]}</p>
                    ) : null}
                    {mediaList.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {mediaList.map((media) => (
                          <div
                            key={media.url}
                            className="relative rounded-lg border border-gray-200 bg-gray-50 p-2"
                          >
                            <img
                              src={media.url}
                              alt={media.name}
                              className="h-24 w-full rounded-md object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(item.id, media.url)}
                              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800"
                              aria-label="Xóa ảnh"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {submitState?.error ? (
                    <p className="text-sm text-red-600">{submitState.error}</p>
                  ) : null}
                  {submitState?.success ? (
                    <p className="text-sm text-emerald-600">Đã gửi đánh giá.</p>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      variant="buyer"
                      onClick={() => handleSubmit(item.id)}
                      disabled={submitState?.loading || mediaUploading[item.id]}
                    >
                      {submitState?.loading
                        ? "Đang gửi..."
                        : mediaUploading[item.id]
                          ? "Đang tải media..."
                          : "Gửi đánh giá"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
