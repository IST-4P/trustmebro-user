"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Calendar,
  RefreshCcw,
  Search,
  Tag,
  Truck,
} from "lucide-react"
import { api } from "@/lib/api"
import type { Promotion } from "@/lib/types"

type ScopeFilter = "all" | "order" | "shipping"
type DiscountFilter = "all" | "percent" | "amount"
type SortMode = "newest" | "ending" | "value"

const formatVnd = (value: number) =>
  `${Math.round(value).toLocaleString("vi-VN")} ₫`

const normalizeText = (value?: string) => (value || "").toLowerCase().trim()

const getDiscountType = (promotion: Promotion) => {
  const type = (promotion.discountType || "").toLowerCase()
  if (type === "percent" || type === "percentage") return "percent"
  if (type === "amount" || type === "fixed") return "amount"
  return "unknown"
}

const getDateRange = (promotion: Promotion) => {
  const start = promotion.startsAt || promotion.startDate
  const end = promotion.endsAt || promotion.endDate
  const parse = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("vi-VN")
  }
  const startLabel = parse(start)
  const endLabel = parse(end)
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
  if (startLabel) return `Từ ${startLabel}`
  if (endLabel) return `Đến ${endLabel}`
  return "Luôn sẵn sàng"
}

const getDiscountLabel = (promotion: Promotion) => {
  const value = promotion.discountValue ?? 0
  const type = getDiscountType(promotion)
  if (type === "percent") return `Giảm ${value}%`
  if (type === "amount") return `Giảm ${formatVnd(value)}`
  return "Ưu đãi đặc biệt"
}

const getScopeLabel = (promotion: Promotion) => {
  if (promotion.scope === "SHIPPING") return "Vận chuyển"
  if (promotion.scope === "ORDER") return "Đơn hàng"
  return "Tổng quát"
}

const getStatusLabel = (promotion: Promotion) => {
  if (promotion.status === "ACTIVE" || promotion.isActive) return "Đang áp dụng"
  if (promotion.status === "PAUSED") return "Tạm dừng"
  if (promotion.status === "ENDED") return "Đã kết thúc"
  if (promotion.status === "DRAFT") return "Nháp"
  return "Đang cập nhật"
}

const getStatusVariant = (promotion: Promotion) => {
  if (promotion.status === "ACTIVE" || promotion.isActive) return "success"
  if (promotion.status === "ENDED") return "destructive"
  if (promotion.status === "PAUSED") return "warning"
  if (promotion.status === "DRAFT") return "secondary"
  return "info"
}

const getPromotionValue = (promotion: Promotion) => {
  const value = promotion.discountValue ?? 0
  const type = getDiscountType(promotion)
  if (type === "percent") return value
  if (type === "amount") return value / 1000
  return 0
}

export default function DealsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all")
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")

  const loadPromotions = async () => {
    setLoading(true)
    setError(null)
    const response = await api.promotion.list({ page: 1, limit: 50 })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (
        message.includes("PromotionsNotFound") ||
        message.includes("Error.PromotionsNotFound") ||
        message.includes("404")
      ) {
        setPromotions([])
        setError(null)
        setLoading(false)
        return
      }
      if (message.includes("401") || message.includes("Unauthorized")) {
        if (typeof window !== "undefined") {
          window.location.href = "/buyer/login"
        }
        return
      }
      setError(message)
      setLoading(false)
      return
    }
    setPromotions(response.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  const activeCount = promotions.filter(
    (promotion) => promotion.status === "ACTIVE" || promotion.isActive
  ).length

  const filteredPromotions = useMemo(() => {
    const keyword = normalizeText(search)
    let list = promotions
    if (scopeFilter === "order") {
      list = list.filter((promotion) => promotion.scope === "ORDER")
    } else if (scopeFilter === "shipping") {
      list = list.filter((promotion) => promotion.scope === "SHIPPING")
    }
    if (discountFilter === "percent") {
      list = list.filter((promotion) => getDiscountType(promotion) === "percent")
    } else if (discountFilter === "amount") {
      list = list.filter((promotion) => getDiscountType(promotion) === "amount")
    }
    if (keyword) {
      list = list.filter((promotion) => {
        const haystack = [
          promotion.code,
          promotion.name,
          promotion.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(keyword)
      })
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sortMode === "value") {
        return getPromotionValue(b) - getPromotionValue(a)
      }
      if (sortMode === "ending") {
        const endA = Date.parse(a.endsAt || a.endDate || "") || 0
        const endB = Date.parse(b.endsAt || b.endDate || "") || 0
        return endA - endB
      }
      const createdA = Date.parse(a.createdAt || "") || 0
      const createdB = Date.parse(b.createdAt || "") || 0
      return createdB - createdA
    })
    return sorted
  }, [promotions, search, scopeFilter, discountFilter, sortMode])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Deals & Promotions</h1>
          <p className="text-gray-600 mt-1">
            Tận dụng ưu đãi tốt nhất trước khi hết hạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{promotions.length} tổng</Badge>
          <Badge variant="success">{activeCount} đang chạy</Badge>
          <Button
            type="button"
            variant="buyerOutline"
            size="sm"
            onClick={loadPromotions}
            disabled={loading}
          >
            <RefreshCcw className="mr-2" size={16} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search promo code or name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={scopeFilter === "all" ? "buyer" : "outline"}
              onClick={() => setScopeFilter("all")}
            >
              Tất cả
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scopeFilter === "order" ? "buyer" : "outline"}
              onClick={() => setScopeFilter("order")}
            >
              Đơn hàng
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scopeFilter === "shipping" ? "buyer" : "outline"}
              onClick={() => setScopeFilter("shipping")}
            >
              Vận chuyển
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={discountFilter === "all" ? "buyer" : "outline"}
              onClick={() => setDiscountFilter("all")}
            >
              Mọi loại
            </Button>
            <Button
              type="button"
              size="sm"
              variant={discountFilter === "percent" ? "buyer" : "outline"}
              onClick={() => setDiscountFilter("percent")}
            >
              % giảm
            </Button>
            <Button
              type="button"
              size="sm"
              variant={discountFilter === "amount" ? "buyer" : "outline"}
              onClick={() => setDiscountFilter("amount")}
            >
              Số tiền
            </Button>
          </div>
        </div>
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="newest">Sort: Newest</option>
          <option value="ending">Sort: Ending soon</option>
          <option value="value">Sort: Highest value</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading deals...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chưa có ưu đãi nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPromotions.map((promotion, index) => {
            const code = promotion.code || "PROMO"
            const key = promotion.id || promotion.code || promotion.name || `promotion-${index}`
            const minSpend = promotion.minPurchase ?? promotion.minOrderSubtotal
            const maxDiscount = promotion.maxDiscount
            return (
              <Card key={key} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-buyer-accent/60 flex items-center justify-center">
                        {promotion.scope === "SHIPPING" ? (
                          <Truck className="text-buyer-dark" size={24} />
                        ) : (
                          <Tag className="text-buyer-dark" size={24} />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={getStatusVariant(promotion)}>{getStatusLabel(promotion)}</Badge>
                          <Badge variant="secondary">{getScopeLabel(promotion)}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {promotion.name || "Ưu đãi đặc biệt"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {promotion.description || "Áp dụng ngay để tiết kiệm chi phí."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:text-left">
                      <p className="text-2xl font-bold text-buyer-primary">
                        {getDiscountLabel(promotion)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">Mã: {code}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>{getDateRange(promotion)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Min spend: </span>
                      {minSpend ? formatVnd(minSpend) : "Không yêu cầu"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Max discount: </span>
                      {maxDiscount ? formatVnd(maxDiscount) : "Không giới hạn"}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-gray-500">
                      Đã dùng {promotion.usedCount ?? 0} / {promotion.totalLimit ?? "∞"}
                    </div>
                    <Link href="/buyer/products" className="inline-flex items-center text-sm font-semibold text-buyer-primary">
                      Shop now
                      <ArrowRight className="ml-2" size={16} />
                    </Link>
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
