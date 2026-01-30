"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, MapPin, Edit, Trash2, Plus } from "lucide-react"
import { api } from "@/lib/api"
import type { Address } from "@/lib/types"

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAddresses()
  }, [])

  const loadAddresses = async () => {
    setLoading(true)
    setError(null)
    const response = await api.address.list()
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      // Handle 401 - redirect to login if unauthorized
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setError(errorMsg)
    } else if (response.data) {
      setAddresses(response.data)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return
    const response = await api.address.delete(id)
    if (response.error) {
      alert(response.error)
    } else {
      loadAddresses()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Địa chỉ của tôi</h1>
        <Button variant="buyer">
          <Plus className="mr-2" size={20} />
          Thêm địa chỉ mới
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải địa chỉ...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chưa có địa chỉ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((address) => (
          <Card key={address.id} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Home className="text-buyer-primary" size={20} />
                  <h3 className="font-semibold text-gray-800">{address.label}</h3>
                </div>
                {address.isDefault && (
                  <Badge variant="success" className="text-xs">Mặc định</Badge>
                )}
              </div>
              <div className="space-y-1 text-gray-600 mb-4">
                <p>{address.fullName}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>{address.city}, {address.state} {address.zipCode}</p>
                <p>{address.country}</p>
                <p>Điện thoại: {address.phone}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="mr-2" size={16} />
                  Sửa
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600"
                  onClick={() => handleDelete(address.id)}
                >
                  <Trash2 className="mr-2" size={16} />
                  Xóa
                </Button>
              </div>
              {!address.isDefault && (
                <Button variant="buyerOutline" size="sm" className="w-full mt-2">
                  Đặt làm mặc định
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  )
}
