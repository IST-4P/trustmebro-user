"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { api } from "@/lib/api"
import type { Order } from "@/lib/types"

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "CREATING", label: "Đang tạo" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "SHIPPING", label: "Đang giao" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã hủy" },
  { key: "REFUNDED", label: "Hoàn tiền" },
]

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} VND`

const normalizeStatus = (status?: string) => (status || "").toUpperCase()

const statusLabel = (status?: string) => {
  const normalized = normalizeStatus(status)
  switch (normalized) {
    case "CREATING":
      return "Đang tạo"
    case "PENDING":
      return "Chờ xác nhận"
    case "CONFIRMED":
      return "Đã xác nhận"
    case "SHIPPING":
      return "Đang giao"
    case "COMPLETED":
      return "Hoàn thành"
    case "CANCELLED":
      return "Đã hủy"
    case "REFUNDED":
      return "Hoàn tiền"
    default:
      return normalized || "Không xác định"
  }
}

const statusBadgeVariant = (status?: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === "CREATING") return "secondary"
  if (normalized === "COMPLETED") return "success"
  if (normalized === "SHIPPING") return "info"
  if (normalized === "CANCELLED") return "destructive"
  if (normalized === "REFUNDED") return "warning"
  return "default"
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setError(null)
      const statusParam = selectedStatus === "ALL" ? undefined : selectedStatus
      const response = await api.order.list({ page: 1, limit: 20, status: statusParam })
      if (response.error) {
        const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
        if (errorMsg.includes("OrdersNotFound") || errorMsg.includes("404")) {
          setOrders([])
          setLoading(false)
          return
        }
        if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            window.location.href = "/buyer/login"
            return
          }
        }
        setError(errorMsg)
        setLoading(false)
        return
      }
      setOrders(response.data || [])
      setLoading(false)
    }

    loadOrders()
  }, [selectedStatus])

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (!keyword) return true
      const haystack = [
        order.code,
        order.shopName,
        order.firstProductName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }, [orders, search, selectedStatus])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Lịch sử đơn hàng</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_TABS.map((status) => (
            <Button
              key={status.key}
              variant={status.key === selectedStatus ? "buyer" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(status.key)}
            >
              {status.label}
            </Button>
          ))}
        </div>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Tìm theo mã đơn, shop, sản phẩm..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải đơn hàng...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chưa có đơn hàng nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const total = order.grandTotal ?? order.total ?? order.itemTotal ?? 0
            const createdAt = order.createdAt ? new Date(order.createdAt) : null
            const createdLabel = createdAt
              ? createdAt.toLocaleDateString("vi-VN")
              : ""
            const itemCount = order.itemsSnapshot?.length ?? order.items?.length
            const image = order.firstProductImage || order.itemsSnapshot?.[0]?.productImage || ""
            const name = order.firstProductName || order.itemsSnapshot?.[0]?.productName || "Đơn hàng"
            const normalizedStatus = (order.status || "").toUpperCase()
            const canReview = normalizedStatus === "COMPLETED"

            return (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {image ? (
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">
                            {order.code ? `Đơn hàng #${order.code}` : `Đơn hàng #${order.id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {createdLabel ? `Ngày đặt: ${createdLabel}` : "Ngày đặt: --"}
                          </p>
                          <p className="text-sm text-gray-600">{name}</p>
                        </div>
                        <Badge variant={statusBadgeVariant(order.status)} className="mt-2 md:mt-0">
                          {statusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {typeof itemCount === "number" ? (
                          <Badge variant="outline">{itemCount} sản phẩm</Badge>
                        ) : null}
                        <Badge variant="outline">Tổng: {formatVnd(total)}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/buyer/orders/${order.id}`}>
                          <Button variant="outline" size="sm">Xem chi tiết</Button>
                        </Link>
                        {canReview ? (
                          <Link href={`/buyer/orders/${order.id}/review`}>
                            <Button variant="buyer" size="sm">Đánh giá</Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
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
