"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, CheckCircle2, Circle, Clock, X } from "lucide-react"
import { api } from "@/lib/api"
import type { Order, Payment } from "@/lib/types"
import { Toast } from "@/components/ui/toast"

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} VND`

const formatTime = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("vi-VN")
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Parse VietQR link to extract bank details
  const parseVietQrLink = (link: string) => {
    try {
      const url = new URL(link)
      const params = new URLSearchParams(url.search)
      return {
        bank: params.get('bank') || '',
        account: params.get('account') || '',
        amount: params.get('amount') || '',
        content: params.get('content') || ''
      }
    } catch {
      return null
    }
  }

  // Load payment details
  const loadPayment = async (paymentId: string) => {
    try {
      const response = await api.payment.get(paymentId)
      if (response.data) {
        setPayment(response.data)
      } else if (response.error) {
        setPaymentError(response.error)
      }
    } catch (err) {
      setPaymentError("Không thể tải thông tin thanh toán")
    }
  }

  // Load payment details and monitor status via SSE
  useEffect(() => {
    if (!order?.paymentId || order.paymentStatus !== "PENDING") return

    let source: EventSource | null = null

    // Load payment details first
    loadPayment(order.paymentId)

    // Connect to SSE
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const sseUrl = `${baseUrl}/api/v1/payment/sse`
    
    source = new EventSource(sseUrl, { withCredentials: true })

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Check if this payment update is for our order
        if (data.orderId === order.id) {
          // Update payment status
          if (data.status === "COMPLETED") {
            setToast({ message: "Thanh toán thành công!", variant: "success" })
            setShowPaymentModal(false)
            // Reload order data
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          } else if (data.status === "FAILED") {
            setToast({ message: "Thanh toán thất bại", variant: "error" })
            setPaymentError("Thanh toán không thành công")
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err)
      }
    }

    source.onerror = () => {
      console.error("SSE connection error")
      source?.close()
    }

    return () => {
      source?.close()
    }
  }, [order?.paymentId, order?.paymentStatus, order?.id])

  // Show payment QR modal
  const handleShowPayment = () => {
    if (payment) {
      setShowPaymentModal(true)
    } else if (order?.paymentId) {
      // Reload payment if not loaded yet
      setPaymentLoading(true)
      loadPayment(order.paymentId).finally(() => {
        setPaymentLoading(false)
        setShowPaymentModal(true)
      })
    }
  }

  const handleContactSeller = async () => {
    if (!order?.shopId) {
      setToast({ message: "Không thể kết nối với người bán", variant: "error" })
      setTimeout(() => setToast(null), 2500)
      return
    }

    setChatLoading(true)
    try {
      // Get shop info to find ownerId
      let ownerId: string | undefined
      
      if (order.shopId) {
        const shopResponse = await api.shop.get(order.shopId)
        if (shopResponse.data?.ownerId) {
          ownerId = shopResponse.data.ownerId
        }
      }

      if (!ownerId) {
        setToast({ message: "Không tìm thấy thông tin người bán", variant: "error" })
        setTimeout(() => setToast(null), 2500)
        setChatLoading(false)
        return
      }

      const response = await api.chat.conversations.create({
        participantIds: [ownerId]
      })

      if (response.error) {
        setToast({ message: response.error, variant: "error" })
        setTimeout(() => setToast(null), 2500)
      } else if (response.data?.id) {
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
    const loadOrder = async () => {
      setLoading(true)
      setError(null)
      // Try to get shopId from URL params if available
      const urlParams = new URLSearchParams(window.location.search)
      const shopId = urlParams.get('shopId') || undefined
      const response = await api.order.get(params.id, shopId)
      if (response.error || !response.data) {
        const message = response.error || "Không tìm thấy đơn hàng."
        if (typeof message === "string" && (message.includes("401") || message.includes("Unauthorized"))) {
          router.push("/buyer/login")
          return
        }
        setError(typeof message === "string" ? message : "Không tìm thấy đơn hàng.")
        setLoading(false)
        return
      }
      setOrder(response.data)
      setLoading(false)
    }

    loadOrder()
  }, [params.id, router])

  // Determine order steps based on status and payment
  const getOrderSteps = () => {
    if (!order) return []
    
    const status = order.status || "PENDING"
    const paymentStatus = order.paymentStatus || "PENDING"
    const paymentMethod = order.paymentMethod || "COD"
    
    // If payment method is ONLINE and payment is pending, show payment pending step
    if (paymentMethod === "ONLINE" && paymentStatus === "PENDING") {
      return [
        { 
          label: "Chờ thanh toán", 
          completed: false,
          active: true,
          isPending: true
        },
        { 
          label: "Đã xác nhận", 
          completed: false,
          active: false
        },
        { 
          label: "Đang xử lý", 
          completed: false,
          active: false
        },
        { 
          label: "Đã giao cho vận chuyển", 
          completed: false,
          active: false
        },
        { 
          label: "Đang vận chuyển", 
          completed: false,
          active: false
        },
        { 
          label: "Đã giao", 
          completed: false,
          active: false
        },
      ]
    }
    
    const steps = [
      { 
        label: "Đã xác nhận", 
        completed: status !== "PENDING" && status !== "pending" && status !== "CREATING" && status !== "CANCELLED" && status !== "cancelled",
        active: status === "PENDING" || status === "pending"
      },
      { 
        label: "Đang xử lý", 
        completed: ["CONFIRMED", "processing", "shipped", "COMPLETED", "delivered"].includes(status),
        active: status === "CONFIRMED" || status === "processing"
      },
      { 
        label: "Đang vận chuyển", 
        completed: ["shipped", "COMPLETED", "delivered"].includes(status),
        active: status === "shipped"
      },
      { 
        label: "Đã giao", 
        completed: status === "COMPLETED" || status === "delivered",
        active: status === "COMPLETED" || status === "delivered"
      },
    ]
    
    return steps
  }

  const steps = getOrderSteps()
  
  const orderItems = order?.items || order?.itemsSnapshot || []
  const orderCode = order?.code || order?.orderNumber || (order?.id ? `#${order.id.slice(0, 8).toUpperCase()}` : "")
  const shippingAddress = order?.shippingAddress
  const totalAmount = order?.grandTotal || order?.total || 0
  const paymentMethod = order?.paymentMethod || "COD"
  const trackingNumber = order?.trackingNumber

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải đơn hàng...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600">{error || "Không tìm thấy đơn hàng"}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push("/buyer/orders")}
          >
            Quay lại danh sách đơn hàng
          </Button>
        </div>
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
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Chi tiết đơn hàng</h1>
        <Button variant="outline">In hóa đơn</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Trạng thái đơn hàng</h2>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {step.completed ? (
                        <div className="w-10 h-10 rounded-full bg-buyer-primary flex items-center justify-center">
                          <CheckCircle2 className="text-white" size={20} />
                        </div>
                      ) : step.active ? (
                        <div className="w-10 h-10 rounded-full border-2 border-buyer-primary flex items-center justify-center">
                          <Clock className="text-buyer-primary" size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <Circle className="text-gray-300" size={20} />
                        </div>
                      )}
                      {index < steps.length - 1 && (
                        <div className={`w-0.5 h-12 ${step.completed ? 'bg-buyer-primary' : 'bg-gray-300'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h3 className={`font-semibold ${step.active ? 'text-buyer-primary' : step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </h3>
                      {step.active && trackingNumber && (
                        <p className="text-sm text-gray-600 mt-1">
                          Mã vận đơn: {trackingNumber}
                        </p>
                      )}
                      {step.active && order.status === "PENDING" && !((step as any).isPending) && (
                        <p className="text-sm text-gray-600 mt-1">
                          Đơn hàng đang chờ xác nhận
                        </p>
                      )}
                      {step.active && (step as any).isPending && (
                        <p className="text-sm text-red-600 mt-1">
                          Vui lòng thanh toán để hoàn tất đơn hàng
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sản phẩm trong đơn</h2>
              <div className="space-y-4">
                {orderItems.length === 0 ? (
                  <p className="text-gray-600">Không có sản phẩm trong đơn hàng</p>
                ) : (
                  orderItems.map((item: any, index: number) => {
                    const productName = item.productName || item.product?.name || "Sản phẩm"
                    const productImage = item.productImage || item.product?.images?.[0]
                    const quantity = item.quantity || 1
                    const price = item.price || item.product?.basePrice || 0
                    const skuValue = item.skuValue || item.product?.sku
                    
                    return (
                      <div key={item.id || index} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {productImage ? (
                            <img 
                              src={productImage} 
                              alt={productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="text-gray-400" size={32} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{productName}</h3>
                          {skuValue && (
                            <p className="text-sm text-gray-500">Phân loại: {skuValue}</p>
                          )}
                          <p className="text-sm text-gray-600">Số lượng: {quantity}</p>
                          <p className="text-buyer-primary font-semibold mt-1">{formatVnd(price)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Địa chỉ giao hàng</h2>
              {shippingAddress ? (
                <div className="text-gray-600">
                  {(shippingAddress.name || shippingAddress.fullName) && (
                    <p className="font-medium text-gray-800 mb-1">{shippingAddress.name || shippingAddress.fullName}</p>
                  )}
                  {shippingAddress.phone && (
                    <p className="mb-2">{shippingAddress.phone}</p>
                  )}
                  <p>
                    {shippingAddress.addressLine1 || shippingAddress.address}
                    {shippingAddress.addressLine2 && <><br />{shippingAddress.addressLine2}</>}
                  </p>
                  {(shippingAddress.ward || shippingAddress.district || shippingAddress.province) && (
                    <p>
                      {[shippingAddress.ward, shippingAddress.district, shippingAddress.province]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ) : order?.receiverName ? (
                <div className="text-gray-600">
                  <p className="font-medium text-gray-800 mb-1">{order.receiverName}</p>
                  {order.receiverPhone && (
                    <p className="mb-2">{order.receiverPhone}</p>
                  )}
                  {order.receiverAddress && (
                    <p>{order.receiverAddress}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Chưa có thông tin địa chỉ</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin thanh toán</h2>
              <div className="text-gray-600 space-y-2">
                <p>Phương thức: {paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : paymentMethod}</p>
                {order.paymentStatus && (
                  <p>
                    Trạng thái thanh toán: {" "}
                    <span className={
                      order.paymentStatus === "SUCCESS" || order.paymentStatus === "paid"
                        ? "text-green-600 font-medium" 
                        : order.paymentStatus === "PENDING" || order.paymentStatus === "pending"
                        ? "text-yellow-600 font-medium"
                        : "text-gray-600"
                    }>
                      {order.paymentStatus === "SUCCESS" || order.paymentStatus === "paid" ? "Đã thanh toán" : 
                       order.paymentStatus === "PENDING" || order.paymentStatus === "pending" ? "Chờ thanh toán" : 
                       order.paymentStatus === "FAILED" || order.paymentStatus === "failed" ? "Thanh toán thất bại" :
                       order.paymentStatus === "REFUNDED" || order.paymentStatus === "refunded" ? "Đã hoàn tiền" :
                       "Chưa thanh toán"}
                    </span>
                  </p>
                )}
                <p className="font-semibold text-gray-800 text-lg mt-3">
                  Tổng: {formatVnd(totalAmount)}
                </p>
                {order.createdAt && (
                  <p className="text-sm">Ngày đặt: {formatTime(order.createdAt)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {order.paymentMethod === "ONLINE" && order.paymentStatus === "PENDING" && (
              <Button 
                variant="buyer" 
                className="w-full"
                onClick={handleShowPayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? "Đang tải..." : "Xem mã QR thanh toán"}
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant="buyer" 
                className="flex-1"
                onClick={() => {
                  if (trackingNumber) {
                    // Open tracking page or modal
                    alert(`Mã vận đơn: ${trackingNumber}`)
                  }
                }}
                disabled={!trackingNumber}
              >
                Theo dõi đơn hàng
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleContactSeller}
                disabled={chatLoading}
              >
                {chatLoading ? "Đang kết nối..." : "Liên hệ người bán"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && payment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-4 text-center">Thanh toán đơn hàng</h2>

            {paymentError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600 text-sm">{paymentError}</p>
              </div>
            ) : payment.qrCode ? (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img 
                      src={payment.qrCode} 
                      alt="QR Code thanh toán"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                </div>

                {/* Bank Transfer Info */}
                {(() => {
                  const bankInfo = parseVietQrLink(payment.qrCode)
                  return bankInfo ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-gray-800 mb-3">Thông tin chuyển khoản</h3>
                      {bankInfo.bank && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ngân hàng:</span>
                          <span className="font-medium">{bankInfo.bank}</span>
                        </div>
                      )}
                      {bankInfo.account && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số tài khoản:</span>
                          <span className="font-medium">{bankInfo.account}</span>
                        </div>
                      )}
                      {bankInfo.amount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số tiền:</span>
                          <span className="font-medium text-buyer-primary">
                            {formatVnd(Number(bankInfo.amount))}
                          </span>
                        </div>
                      )}
                      {bankInfo.content && (
                        <div className="flex flex-col">
                          <span className="text-gray-600 mb-1">Nội dung:</span>
                          <span className="font-medium">{bankInfo.content}</span>
                        </div>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Hướng dẫn:</span> Quét mã QR hoặc chuyển khoản theo thông tin trên. 
                    Hệ thống sẽ tự động xác nhận thanh toán sau khi nhận được tiền.
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <Clock size={20} />
                  <span className="text-sm font-medium">Đang chờ thanh toán...</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Đang tải thông tin thanh toán...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
