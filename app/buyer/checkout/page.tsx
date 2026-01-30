"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Toast } from "@/components/ui/toast"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import type { Cart, Order, Payment, Promotion, User } from "@/lib/types"

function CheckoutContent() {
  const [step, setStep] = useState(1)
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [hasAddress, setHasAddress] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [shippingForm, setShippingForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  })
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "overnight">("standard")
  const [formError, setFormError] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD")
  const [payment, setPayment] = useState<Payment | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [promotionCode, setPromotionCode] = useState("")
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)
  const [promotionLoading, setPromotionLoading] = useState(false)
  const [promotionError, setPromotionError] = useState<string | null>(null)
  const [showPromotionDetail, setShowPromotionDetail] = useState(false)
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([])
  const [promotionListLoading, setPromotionListLoading] = useState(false)
  const [promotionListError, setPromotionListError] = useState<string | null>(null)
  const [promotionListLoaded, setPromotionListLoaded] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" | "info" } | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const paymentRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, variant: "success" | "error" | "info" = "info") => {
    setToast({ message, variant })
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (paymentRedirectRef.current) {
        clearTimeout(paymentRedirectRef.current)
      }
    }
  }, [])

  const shippingFee = useMemo(() => {
    switch (shippingMethod) {
      case "express":
        return 20000
      case "overnight":
        return 40000
      default:
        return 10000
    }
  }, [shippingMethod])

  const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} VND`

  const splitName = (fullName: string) => {
    const normalized = fullName.trim()
    if (!normalized) return { firstName: "", lastName: "" }
    const parts = normalized.split(/\s+/)
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" }
    }
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    }
  }

  const buildOrderPayload = (currentCart: Cart) => {
    if (Array.isArray(currentCart.groups) && currentCart.groups.length > 0) {
      return currentCart.groups
        .map((group) => ({
          shopId: group.shopId,
          cartItemIds: (group.cartItems || [])
            .map((item) => item.id)
            .filter((id) => typeof id === "string" && id.length > 0),
        }))
        .filter((orderItem) => orderItem.shopId && orderItem.cartItemIds.length > 0)
    }

    const grouped = new Map<string, string[]>()
    currentCart.items.forEach((item) => {
      const shopId = item.shopId ?? item.product?.shopId
      if (!shopId || !item.id) return
      const list = grouped.get(shopId) ?? []
      list.push(item.id)
      grouped.set(shopId, list)
    })

    return Array.from(grouped.entries()).map(([shopId, cartItemIds]) => ({
      shopId,
      cartItemIds,
    }))
  }

  const buildReceiverAddress = () => shippingForm.address.trim()

  const resolvePaymentMethod = () => paymentMethod

  const parseVietQrLink = (qrCode?: string) => {
    if (!qrCode) return null
    try {
      const url = new URL(qrCode)
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts.length < 4) return null
      const bank = parts[0]
      const account = parts[1]
      const amount = Number(parts[2])
      const contentRaw = parts.slice(3).join("/")
      const content = decodeURIComponent(contentRaw.replace(/\.png$/i, ""))
      return {
        bank,
        account,
        amount: Number.isFinite(amount) ? amount : undefined,
        content,
      }
    } catch {
      const parts = qrCode.split("/").filter(Boolean)
      if (parts.length < 4) return null
      const bank = parts[parts.length - 4]
      const account = parts[parts.length - 3]
      const amount = Number(parts[parts.length - 2])
      const contentRaw = parts[parts.length - 1]
      const content = decodeURIComponent(contentRaw.replace(/\.png$/i, ""))
      return {
        bank,
        account,
        amount: Number.isFinite(amount) ? amount : undefined,
        content,
      }
    }
  }

  const paymentInfo = useMemo(() => parseVietQrLink(payment?.qrCode), [payment?.qrCode])

  const normalizePromotionScope = (scope?: string) => {
    const normalized = (scope || "").toUpperCase()
    return normalized === "SHIPPING" ? "SHIPPING" : "ORDER"
  }

  const normalizeDiscountType = (discountType?: string) => {
    const normalized = (discountType || "").toUpperCase()
    if (normalized === "PERCENTAGE") return "PERCENT"
    if (normalized === "FIXED") return "AMOUNT"
    if (normalized === "PERCENT" || normalized === "AMOUNT") return normalized
    return "AMOUNT"
  }

  const parsePromotionDate = (value?: string) => {
    if (!value) return null
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }

  const formatPromotionDate = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("vi-VN")
  }

  const formatPromotionWindow = (promotion: Promotion) => {
    const startLabel = formatPromotionDate(promotion.startsAt || promotion.startDate)
    const endLabel = formatPromotionDate(promotion.endsAt || promotion.endDate)
    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
    if (endLabel) return `Hết hạn ${endLabel}`
    if (startLabel) return `Bắt đầu ${startLabel}`
    return ""
  }

  const describePromotionStatus = (promotion: Promotion) => {
    const status = (promotion.status || "").toUpperCase()
    switch (status) {
      case "ACTIVE":
        return "Đang hoạt động"
      case "PAUSED":
        return "Tạm dừng"
      case "ENDED":
        return "Hết hạn"
      case "DRAFT":
        return "Nháp"
      default:
        return "Không rõ trạng thái"
    }
  }

  const describePromotion = (promotion: Promotion) => {
    const scope = normalizePromotionScope(promotion.scope)
    const type = normalizeDiscountType(promotion.discountType)
    const discountValue = Number.isFinite(Number(promotion.discountValue))
      ? Number(promotion.discountValue)
      : 0
    const scopeLabel = scope === "SHIPPING" ? "Giảm phí ship" : "Giảm giá đơn"
    const discountLabel = type === "PERCENT"
      ? `${discountValue}%`
      : formatVnd(discountValue)
    const maxDiscount = Number.isFinite(Number(promotion.maxDiscount))
      ? Number(promotion.maxDiscount)
      : 0
    const maxLabel = maxDiscount > 0
      ? `Tối đa ${formatVnd(maxDiscount)}`
      : null
    const minPurchaseSource = promotion.minPurchase ?? promotion.minOrderSubtotal
    const minPurchase = Number.isFinite(Number(minPurchaseSource))
      ? Number(minPurchaseSource)
      : 0
    const minLabel = minPurchase > 0
      ? `Đơn tối thiểu ${formatVnd(minPurchase)}`
      : null
    return [scopeLabel, `Giảm ${discountLabel}`, maxLabel, minLabel].filter(Boolean).join(" • ")
  }

  const evaluatePromotion = (promotion: Promotion, subtotal: number, shipping: number) => {
    const scope = normalizePromotionScope(promotion.scope)
    const type = normalizeDiscountType(promotion.discountType)
    const discountValue = Number.isFinite(Number(promotion.discountValue))
      ? Number(promotion.discountValue)
      : 0
    const status = (promotion.status || "").toUpperCase()
    const isActive = promotion.isActive !== false
    const startAt = parsePromotionDate(promotion.startsAt || promotion.startDate)
    const endAt = parsePromotionDate(promotion.endsAt || promotion.endDate)
    const now = Date.now()

    if (status && status !== "ACTIVE") {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá chưa hoạt động." }
    }
    if (!isActive) {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá chưa hoạt động." }
    }
    if (startAt && now < startAt) {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá chưa đến thời gian áp dụng." }
    }
    if (endAt && now > endAt) {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá đã hết hạn." }
    }
    const totalLimit = Number.isFinite(Number(promotion.totalLimit))
      ? Number(promotion.totalLimit)
      : 0
    if (totalLimit > 0) {
      const usedCount = Number.isFinite(Number(promotion.usedCount))
        ? Number(promotion.usedCount)
        : 0
      if (usedCount >= totalLimit) {
        return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá đã hết lượt sử dụng." }
      }
    }
    const minPurchaseSource = promotion.minPurchase ?? promotion.minOrderSubtotal
    const minPurchase = Number.isFinite(Number(minPurchaseSource))
      ? Number(minPurchaseSource)
      : 0
    if (minPurchase > 0) {
      if (subtotal < minPurchase) {
        return {
          isValid: false,
          discount: 0,
          scope,
          type,
          reason: `Đơn tối thiểu ${formatVnd(minPurchase)}.`,
        }
      }
    }

    const baseAmount = scope === "SHIPPING" ? shipping : subtotal
    if (baseAmount <= 0) {
      return {
        isValid: false,
        discount: 0,
        scope,
        type,
        reason: scope === "SHIPPING"
          ? "Chưa có phí vận chuyển để áp dụng mã."
          : "Chưa có giá trị đơn hàng để áp dụng mã.",
      }
    }

    if (discountValue <= 0) {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá không hợp lệ." }
    }

    let discount = type === "PERCENT"
      ? baseAmount * (discountValue / 100)
      : discountValue

    const maxDiscount = Number.isFinite(Number(promotion.maxDiscount))
      ? Number(promotion.maxDiscount)
      : 0
    if (maxDiscount > 0) {
      discount = Math.min(discount, maxDiscount)
    }

    discount = Math.min(discount, baseAmount)
    discount = Math.max(0, Math.round(discount))

    if (discount <= 0) {
      return { isValid: false, discount: 0, scope, type, reason: "Mã giảm giá không áp dụng được." }
    }

    return { isValid: true, discount, scope, type }
  }

  const loadPayment = useCallback(
    async (paymentId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent
      if (!silent) {
        setPaymentLoading(true)
        setPaymentError(null)
      }
      const response = await api.payment.get(paymentId)
      if (response.error || !response.data) {
        if (!silent) {
          setPayment(null)
          setPaymentError(response.error || "Không thể tạo thông tin thanh toán.")
          setPaymentLoading(false)
        }
        return null
      }
      setPayment(response.data)
      setPaymentError(null)
      if (!silent) {
        setPaymentLoading(false)
      }
      return response.data
    },
    []
  )

  const isPaymentFinal = useCallback((status?: string) => {
    const normalized = (status || "").toUpperCase()
    return ["SUCCESS", "PAID", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"].includes(normalized)
  }, [])

  const isPaymentSuccess = useCallback((status?: string) => {
    const normalized = (status || "").toUpperCase()
    return ["SUCCESS", "PAID", "COMPLETED"].includes(normalized)
  }, [])

  const isPaymentFailure = useCallback((status?: string) => {
    const normalized = (status || "").toUpperCase()
    return ["FAILED", "CANCELLED"].includes(normalized)
  }, [])

  const refreshOrderStatus = useCallback(async (id?: string) => {
    const targetId = id || order?.id || orderId || undefined
    if (!targetId) return
    const response = await api.order.get(targetId)
    if (response?.data) {
      setOrder(response.data)
    }
  }, [order?.id, orderId])

  useEffect(() => {
    if (!orderId) return
    if (order && order.id === orderId) return
    const loadOrder = async () => {
      setOrderLoading(true)
      setOrderError(null)
      const response = await api.order.get(orderId)
      if (response.error || !response.data) {
        const listResponse = await api.order.list({ page: 1, limit: 10 })
        const orders = listResponse.data || []
        const match = orders.find((item) => item.id === orderId) || null
        if (!match) {
          setOrderError(response.error || listResponse.error || "Không tìm thấy đơn hàng.")
          setOrder(null)
          setOrderLoading(false)
          return
        }
        setOrder(match)
        setOrderLoading(false)
        return
      }
      setOrder(response.data)
      setOrderLoading(false)
    }

    loadOrder()
  }, [orderId, order])

  const loadUser = async () => {
    const response = await api.user.get()
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      return
    }
    if (response.data) {
      setUser(response.data)
    }
  }

  const loadCart = async () => {
    setCartLoading(true)
    setCartError(null)
    const response = await api.cart.get({ page: 1, limit: 50 })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("CartItemsNotFound")) {
        setCart({
          items: [],
          total: 0,
          itemCount: 0,
          page: 1,
          limit: 50,
          totalItems: 0,
          totalPages: 1,
        })
        setCartError(null)
        setCartLoading(false)
        return
      }
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setCartError(errorMsg)
      setCart(null)
      setCartLoading(false)
      return
    }
    setCart(response.data || null)
    setCartLoading(false)
  }

  const loadAddress = async () => {
    setAddressLoading(true)
    setAddressError(null)
    const response = await api.address.list({ page: 1, limit: 10 })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      const isNotFound = errorMsg.includes("AddressNotFound") || errorMsg.includes("404")
      if (!isNotFound) {
        setAddressError(errorMsg)
      }
      setHasAddress(false)
      setAddressLoading(false)
      return
    }
    const addresses = response.data || []
    if (addresses.length === 0) {
      setHasAddress(false)
      setAddressLoading(false)
      return
    }
    setHasAddress(true)
    const primary = addresses.find((item) => item.isDefault) || addresses[0]
    const { firstName, lastName } = splitName(primary.name || "")
    const addressParts = [
      primary.address || primary.addressLine1 || "",
      primary.ward || "",
      primary.district || "",
      primary.province || "",
    ].filter(Boolean)
    const fullAddress = addressParts.join(", ")

    setShippingForm((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      phone: prev.phone || primary.phone || "",
      address: prev.address || fullAddress,
    }))
    setAddressLoading(false)
  }

  const loadPromotions = async (options?: { silent?: boolean }) => {
    if (order || orderId) return
    const silent = options?.silent
    if (!silent) {
      setPromotionListLoading(true)
      setPromotionListError(null)
    }

    const response = await api.promotion.list({ page: 1, limit: 200 })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setPromotionListError(errorMsg)
      setAvailablePromotions([])
      if (!silent) {
        setPromotionListLoading(false)
        setPromotionListLoaded(true)
      }
      return
    }

    setAvailablePromotions(response.data || [])
    setPromotionListError(null)
    if (!silent) {
      setPromotionListLoading(false)
      setPromotionListLoaded(true)
    }
  }

  useEffect(() => {
    if (orderId) return
    loadUser()
    loadCart()
    loadAddress()
    loadPromotions()
  }, [orderId])

  useEffect(() => {
    if (order) {
      setStep(2)
    }
  }, [order])

  useEffect(() => {
    if (!order) {
      setPayment(null)
      setPaymentError(null)
      return
    }
    const method = (order.paymentMethod || "").toUpperCase()
    if (method !== "ONLINE") {
      setPayment(null)
      setPaymentError(null)
      return
    }
    if (!order.paymentId) {
      setPayment(null)
      setPaymentError("Không tìm thấy thông tin thanh toán.")
      return
    }
    if (payment?.id === order.paymentId) return
    loadPayment(order.paymentId)
  }, [order, payment?.id, loadPayment])

  useEffect(() => {
    if (!order) return
    const method = (order.paymentMethod || "").toUpperCase()
    if (method !== "ONLINE") return
    if (!order.paymentId) return

    const baseUrl = process.env.NEXT_PUBLIC_SSE_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
    const sseUrl = baseUrl ? `${baseUrl}/api/v1/payment/sse` : "/api/v1/payment/sse"
    let source: EventSource | null = null

    try {
      source = new EventSource(sseUrl, { withCredentials: true })
    } catch (error) {
      console.error("Failed to start payment SSE:", error)
      return
    }

    const currentPaymentId = order.paymentId

    source.onmessage = async (event) => {
      if (!event?.data) return
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (payload?.type && String(payload.type).toLowerCase() !== "payment") return
      const incomingPaymentId = payload?.data?.paymentId
      if (!incomingPaymentId || incomingPaymentId !== currentPaymentId) return
      const refreshed = await loadPayment(incomingPaymentId, { silent: true })
      if (isPaymentFinal(refreshed?.status)) {
        source?.close()
        if (isPaymentSuccess(refreshed?.status)) {
          showToast("Thanh toán thành công. Đơn hàng đã được cập nhật.", "success")
          setShowPaymentModal(false)
          setShowPaymentSuccessModal(true)
          if (paymentRedirectRef.current) {
            clearTimeout(paymentRedirectRef.current)
          }
          paymentRedirectRef.current = setTimeout(() => {
            router.push("/buyer/orders")
          }, 2000)
        } else if (isPaymentFailure(refreshed?.status)) {
          showToast("Thanh toán thất bại. Vui lòng thử lại hoặc chọn phương thức khác.", "error")
        } else {
          showToast("Thanh toán đã hoàn tất.", "info")
        }
        refreshOrderStatus(order.id)
      }
    }

    source.onerror = (event) => {
      console.error("Payment SSE error:", event)
    }

    return () => {
      source?.close()
    }
  }, [order, loadPayment, isPaymentFinal, isPaymentSuccess, isPaymentFailure, showToast, refreshOrderStatus, router])

  const handleOpenPaymentModal = () => {
    setShowPaymentModal(true)
    if (order?.paymentId) {
      loadPayment(order.paymentId, { silent: !!payment?.qrCode })
    }
  }

  useEffect(() => {
    if (!user) return
    const { firstName, lastName } = splitName(user.fullName || "")
    setShippingForm((prev) => ({
      ...prev,
      email: prev.email || user.email || "",
      firstName: prev.firstName || user.firstName || firstName,
      lastName: prev.lastName || user.lastName || lastName,
      phone: prev.phone || user.phoneNumber || user.phone || "",
    }))
  }, [user])

  const receiver = useMemo(() => {
    if (!order) return null
    if (order.receiver) return order.receiver
    if (order.receiverName || order.receiverPhone || order.receiverAddress) {
      return {
        name: order.receiverName || "",
        phone: order.receiverPhone || "",
        address: order.receiverAddress || "",
      }
    }
    const fallbackAddress = buildReceiverAddress()
    if (fallbackAddress) {
      return {
        name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
        phone: shippingForm.phone,
        address: fallbackAddress,
      }
    }
    return null
  }, [order, shippingForm])

  const orderItems = useMemo(() => {
    if (!order) return []
    if (Array.isArray(order.itemsSnapshot) && order.itemsSnapshot.length > 0) return order.itemsSnapshot
    if (Array.isArray(order.items) && order.items.length > 0) return order.items
    if (cart && cart.items.length > 0) {
      return cart.items.map((item) => ({
        id: item.id,
        productImage: item.productImage || item.product?.images?.[0],
        productName: item.productName || item.product?.name || "Sản phẩm",
        skuValue: item.skuValue,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      }))
    }
    return []
  }, [order, cart])

  const cartSubtotal = cart?.total ?? 0
  const orderSubtotal = order?.itemTotal ?? order?.subtotal ?? 0
  const orderShippingFee = order?.shippingFee ?? 0
  const promotionBase = order
    ? { subtotal: orderSubtotal, shipping: orderShippingFee }
    : { subtotal: cartSubtotal, shipping: shippingFee }
  const promotionEvaluation = appliedPromotion
    ? evaluatePromotion(appliedPromotion, promotionBase.subtotal, promotionBase.shipping)
    : null

  const summary = useMemo(() => {
    if (order) {
      const subtotal = order.itemTotal ?? order.subtotal ?? 0
      const shipping = order.shippingFee ?? 0
      const total = order.grandTotal ?? order.total ?? subtotal + shipping - (order.discount ?? 0)
      let discount = Number.isFinite(Number(order.discount)) ? Number(order.discount) : 0
      if (!discount || discount <= 0) {
        const derived = Math.round(subtotal + shipping - total)
        if (Number.isFinite(derived) && derived > 0) {
          discount = derived
        }
      }
      return { subtotal, shippingFee: shipping, discount, total }
    }
    if (cart) {
      const subtotal = cart.total ?? 0
      const discount = promotionEvaluation?.isValid ? promotionEvaluation.discount : 0
      const total = subtotal + shippingFee - discount
      return { subtotal, shippingFee, discount, total }
    }
    return null
  }, [order, cart, shippingFee, promotionEvaluation?.discount, promotionEvaluation?.isValid])

  const validateShipping = () => {
    const fullName = `${shippingForm.firstName} ${shippingForm.lastName}`.trim()
    if (!fullName) return "Vui lòng nhập họ tên."
    if (!shippingForm.phone.trim()) return "Vui lòng nhập số điện thoại."
    if (!shippingForm.address.trim()) return "Vui lòng nhập địa chỉ giao hàng."
    return null
  }

  const handleStep1Next = () => {
    const error = validateShipping()
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setCreateError(null)
    setStep(2)
  }

  const promotionSummary = appliedPromotion ? describePromotion(appliedPromotion) : null
  const canApplyPromotion = !order && !orderId
  const filteredPromotions = useMemo(() => {
    if (availablePromotions.length === 0) return []
    const keyword = promotionCode.trim().toLowerCase()
    const appliedCode = (appliedPromotion?.code || "").toLowerCase()
    if (!keyword || (appliedCode && keyword === appliedCode)) return availablePromotions
    return availablePromotions.filter((promotion) => {
      const code = (promotion.code || "").toLowerCase()
      const name = (promotion.name || "").toLowerCase()
      return code.includes(keyword) || name.includes(keyword)
    })
  }, [availablePromotions, promotionCode, appliedPromotion?.code])

  const applyPromotionByCode = async (rawCode: string, presetPromotion?: Promotion) => {
    if (!canApplyPromotion) {
      setPromotionError("Đơn hàng đã tạo, không thể áp dụng mã giảm giá.")
      return
    }
    const code = rawCode.trim()
    if (!code) {
      setPromotionError("Vui lòng nhập mã giảm giá.")
      return
    }
    if (cartLoading) {
      setPromotionError("Đang tải giỏ hàng, vui lòng thử lại.")
      return
    }
    if (!cart || cart.items.length === 0) {
      setPromotionError("Giỏ hàng đang trống.")
      return
    }

    setPromotionLoading(true)
    setPromotionError(null)

    let match = presetPromotion
    if (!match || !match.id || (code && (match.code || "").toLowerCase() !== code.toLowerCase())) {
      const cachedMatch = availablePromotions.find(
        (promotion) => (promotion.code || "").toLowerCase() === code.toLowerCase()
      )
      if (cachedMatch) {
        match = cachedMatch
      } else {
        const response = await api.promotion.list({ page: 1, limit: 200, code })
        if (response.error) {
          setPromotionError(response.error)
          setPromotionLoading(false)
          return
        }

        const promotions = response.data || []
        match = promotions.find(
          (promotion) => (promotion.code || "").toLowerCase() === code.toLowerCase()
        )
      }
    }

    if (!match || !match.id) {
      setPromotionError("Không tìm thấy mã giảm giá.")
      setPromotionLoading(false)
      return
    }

    const detailResponse = await api.promotion.get(match.id)
    if (detailResponse.error || !detailResponse.data) {
      setPromotionError(detailResponse.error || "Không thể lấy thông tin mã giảm giá.")
      setPromotionLoading(false)
      return
    }

    const promotionDetail = detailResponse.data
    const evaluation = evaluatePromotion(promotionDetail, cartSubtotal, shippingFee)
    if (!evaluation.isValid) {
      setPromotionError(evaluation.reason || "Mã giảm giá không hợp lệ.")
      setPromotionLoading(false)
      return
    }

    setAppliedPromotion(promotionDetail)
    setPromotionCode(promotionDetail.code || code)
    setShowPromotionDetail(false)
    setPromotionError(null)
    setPromotionLoading(false)
  }

  const handleApplyPromotion = async () => {
    await applyPromotionByCode(promotionCode)
  }

  const handleSelectPromotion = (promotion: Promotion) => {
    if (!canApplyPromotion) return
    const code = promotion.code || ""
    if (!code) return
    if (appliedPromotion?.id && appliedPromotion.id === promotion.id) return
    setPromotionCode(code)
    setPromotionError(null)
    applyPromotionByCode(code, promotion)
  }

  const handleRemovePromotion = () => {
    if (!canApplyPromotion) return
    setAppliedPromotion(null)
    setPromotionCode("")
    setPromotionError(null)
    setShowPromotionDetail(false)
  }

  const promotionDetailRows = useMemo(() => {
    if (!appliedPromotion) return []
    const scope = normalizePromotionScope(appliedPromotion.scope)
    const type = normalizeDiscountType(appliedPromotion.discountType)
    const discountValue = Number.isFinite(Number(appliedPromotion.discountValue))
      ? Number(appliedPromotion.discountValue)
      : 0
    const maxDiscount = Number.isFinite(Number(appliedPromotion.maxDiscount))
      ? Number(appliedPromotion.maxDiscount)
      : 0
    const minPurchaseSource = appliedPromotion.minPurchase ?? appliedPromotion.minOrderSubtotal
    const minPurchase = Number.isFinite(Number(minPurchaseSource))
      ? Number(minPurchaseSource)
      : 0

    return [
      { label: "Mã", value: appliedPromotion.code || "-" },
      { label: "Tên", value: appliedPromotion.name || "-" },
      { label: "Mô tả", value: appliedPromotion.description || "-" },
      { label: "Phạm vi", value: scope === "SHIPPING" ? "Giảm phí ship" : "Giảm giá đơn" },
      {
        label: "Giảm",
        value: type === "PERCENT" ? `${discountValue}%` : formatVnd(discountValue),
      },
      { label: "Giảm tối đa", value: maxDiscount > 0 ? formatVnd(maxDiscount) : "-" },
      { label: "Đơn tối thiểu", value: minPurchase > 0 ? formatVnd(minPurchase) : "-" },
      { label: "Hiệu lực", value: formatPromotionDate(appliedPromotion.startsAt || appliedPromotion.startDate) || "-" },
      { label: "Hết hạn", value: formatPromotionDate(appliedPromotion.endsAt || appliedPromotion.endDate) || "-" },
      { label: "Trạng thái", value: appliedPromotion.status || "-" },
      {
        label: "Lượt dùng",
        value: Number.isFinite(Number(appliedPromotion.usedCount))
          ? `${Number(appliedPromotion.usedCount)}/${Number(appliedPromotion.totalLimit ?? 0) || "-"}`
          : "-",
      },
    ]
  }, [appliedPromotion])

  const handlePlaceOrder = async () => {
    if (creatingOrder) return
    setCreateError(null)
    const error = validateShipping()
    if (error) {
      setCreateError(error)
      return
    }
    if (cartLoading) {
      setCreateError("Đang tải giỏ hàng, vui lòng thử lại sau.")
      return
    }
    if (!cart || cart.items.length === 0) {
      setCreateError("Giỏ hàng đang trống.")
      return
    }
    const orders = buildOrderPayload(cart)
    if (orders.length === 0) {
      setCreateError("Không tìm thấy sản phẩm hợp lệ để tạo đơn.")
      return
    }

    const receiver = {
      name: `${shippingForm.firstName} ${shippingForm.lastName}`.trim(),
      phone: shippingForm.phone.trim(),
      address: buildReceiverAddress(),
    }
    if (!receiver.name || !receiver.phone || !receiver.address) {
      setCreateError("Thiếu thông tin giao hàng.")
      return
    }

    setCreatingOrder(true)
    const discountCode = promotionEvaluation?.isValid
      ? appliedPromotion?.code || promotionCode.trim()
      : undefined
    const response = await api.order.create({
      paymentMethod: resolvePaymentMethod(),
      shippingFee,
      discountCode,
      receiver,
      orders,
    })

    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setCreatingOrder(false)
      setCreateError(errorMsg)
      return
    }

    const createdOrder = (response.data as any)?.orders?.[0] ?? response.data
    if (createdOrder) {
      setOrder(createdOrder)
      setStep(2)
      if (createdOrder.id) {
        router.replace(`/buyer/checkout?orderId=${createdOrder.id}`)
      }
    } else {
      setCreateError("Không thể tạo đơn hàng.")
    }
    setCreatingOrder(false)
  }

  const paymentMethodLabel = (method?: string) => {
    const normalized = (method || "").toUpperCase()
    switch (normalized) {
      case "ONLINE":
        return "Thanh toán online (QR)"
      case "WALLET":
        return "Thanh toán ví"
      default:
        return "Thanh toán khi nhận hàng (COD)"
    }
  }
  const paymentLabel = paymentMethodLabel(paymentMethod)
  const stepLabels = ["Giao hàng", "Xác nhận"]
  const statusLabel = (status?: string) => {
    const normalized = (status || "").toUpperCase()
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

  const statusBadgeVariant = (
    status?: string
  ): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "error" | "info" => {
    const normalized = (status || "").toUpperCase()
    if (normalized === "CREATING") return "secondary"
    if (normalized === "PENDING") return "warning"
    if (normalized === "CONFIRMED") return "info"
    if (normalized === "SHIPPING") return "info"
    if (normalized === "COMPLETED") return "success"
    if (normalized === "CANCELLED") return "destructive"
    if (normalized === "REFUNDED") return "warning"
    return "default"
  }

  const formatOrderTime = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("vi-VN")
  }

  const orderCodeLabel = order?.code || order?.orderNumber || (order?.id ? order.id.slice(0, 8) : "")
  const orderTimeLabel = formatOrderTime(order?.updatedAt || order?.createdAt)
  const paymentStatus = payment?.status || order?.paymentStatus
  const isPaymentSuccessStatus = isPaymentSuccess(paymentStatus)
  const isPaymentFailureStatus = isPaymentFailure(paymentStatus)
  const showBackButton = Boolean(orderId)

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.push("/buyer/orders")
  }, [router])

  return (
    <div className="relative">
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <div className="container mx-auto px-4 py-10 relative">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            {showBackButton ? (
              <div className="w-fit">
                <Button
                  type="button"
                  variant="buyerOutline"
                  size="sm"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft size={16} />
                  Quay lại
                </Button>
              </div>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-buyer-primary/80">
              Thanh toán an toàn
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Thanh toán</h1>
            <p className="text-sm text-gray-600 mt-2">
              Hoàn tất đơn hàng của bạn trong vài bước nhanh chóng.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-3">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1
              const isActive = step >= stepNumber
              const isCompleted = step > stepNumber
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-full border-2 flex items-center justify-center font-semibold ${
                      isActive
                        ? "border-buyer-primary bg-buyer-primary text-white shadow-sm"
                        : "border-gray-200 text-gray-500 bg-white"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : stepNumber}
                  </div>
                  <div className="hidden sm:block text-sm font-semibold text-gray-700">
                    {label}
                  </div>
                  {index < stepLabels.length - 1 ? (
                    <div
                      className={`h-px w-10 sm:w-16 ${step > stepNumber ? "bg-buyer-primary" : "bg-gray-200"}`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {orderLoading ? (
            <Card className="border border-gray-200/70 shadow-sm">
              <CardContent className="p-6">
                <p className="text-gray-600">Đang tải đơn hàng...</p>
              </CardContent>
            </Card>
          ) : orderError ? (
            <Card className="border border-gray-200/70 shadow-sm">
              <CardContent className="p-6">
                <p className="text-red-600">{orderError}</p>
              </CardContent>
            </Card>
          ) : order ? (
            <>
              <Card className="border border-gray-200/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Thông tin giao hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{receiver?.name || "Khách hàng"}</p>
                  {receiver?.phone ? <p className="text-gray-600">{receiver.phone}</p> : null}
                    <p className="text-gray-600">{receiver?.address || "Chưa có địa chỉ"}</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-200/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Sản phẩm trong đơn</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderItems.length === 0 ? (
                    <p className="text-gray-600">Không có sản phẩm trong đơn.</p>
                  ) : (
                    orderItems.map((item: any) => {
                      const image = item.productImage || item.product?.images?.[0]
                      const name = item.productName || item.product?.name || "Sản phẩm"
                      const skuValue = item.skuValue
                      const price = typeof item.price === "number" ? item.price : 0
                      const quantity = typeof item.quantity === "number" ? item.quantity : 0
                      const total = typeof item.total === "number" ? item.total : price * quantity
                      return (
                        <div key={item.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                          <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                            {image ? (
                              <img src={image} alt={name} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{name}</p>
                            {skuValue ? (
                              <p className="text-sm text-gray-600">SKU: {skuValue}</p>
                            ) : null}
                            <p className="text-sm text-gray-600">Số lượng: {quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">{formatVnd(total)}</p>
                            <p className="text-sm text-gray-500">{formatVnd(price)} / sản phẩm</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
              <Card className="border border-gray-200/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Trạng thái đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Trạng thái</span>
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {statusLabel(order.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Thanh toán</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {paymentMethodLabel(order.paymentMethod || "COD")}
                    </span>
                  </div>
                  {orderCodeLabel ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Mã đơn</span>
                      <span className="text-sm font-semibold text-gray-800">#{orderCodeLabel}</span>
                    </div>
                  ) : null}
                  {orderTimeLabel ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cập nhật</span>
                      <span className="text-sm text-gray-500">{orderTimeLabel}</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <Card className="border border-gray-200/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Thanh toán</CardTitle>
                </CardHeader>
                <CardContent>
                  {(order.paymentMethod || "").toUpperCase() === "ONLINE" ? (
                    isPaymentSuccessStatus ? (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        Đã thanh toán thành công.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="buyer"
                          className="w-full"
                          onClick={handleOpenPaymentModal}
                          disabled={paymentLoading}
                        >
                          Thanh Toán
                        </Button>
                        {isPaymentFailureStatus ? (
                          <p className="text-xs text-amber-600">
                            Thanh toán trước đó không thành công. Bạn có thể thử lại.
                          </p>
                        ) : null}
                      </div>
                    )
                  ) : (
                    <p className="text-gray-600">Thanh toán khi nhận hàng.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : step === 1 && (
            <Card className="border border-gray-200/70 shadow-sm">
              <CardHeader>
                <CardTitle>Thông tin giao hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addressLoading ? (
                  <p className="text-sm text-gray-600">Đang tải địa chỉ...</p>
                ) : null}
                {addressError ? (
                  <p className="text-sm text-red-600">{addressError}</p>
                ) : null}
                {hasAddress ? (
                  <p className="text-sm text-gray-600">
                    Đang dùng địa chỉ mặc định từ hồ sơ của bạn. Bạn có thể chỉnh sửa nếu cần.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Họ</Label>
                    <Input
                      id="firstName"
                      value={shippingForm.firstName}
                      onChange={(e) =>
                        setShippingForm((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Tên</Label>
                    <Input
                      id="lastName"
                      value={shippingForm.lastName}
                      onChange={(e) =>
                        setShippingForm((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingForm.email}
                    onChange={(e) =>
                      setShippingForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Điện thoại</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingForm.phone}
                    onChange={(e) =>
                      setShippingForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={shippingForm.address}
                    onChange={(e) =>
                      setShippingForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Phương thức giao hàng</Label>
                  <RadioGroup
                    value={shippingMethod}
                    onValueChange={(value) =>
                      setShippingMethod(value as "standard" | "express" | "overnight")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="standard" />
                      <Label htmlFor="standard">Tiêu chuẩn (5-7 ngày) - 10.000 ₫</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="express" id="express" />
                      <Label htmlFor="express">Nhanh (2-3 ngày) - 20.000 ₫</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="overnight" id="overnight" />
                      <Label htmlFor="overnight">Hỏa tốc - 40.000 ₫</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Phương thức thanh toán</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) => setPaymentMethod(value as "COD" | "ONLINE")}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="COD" id="cod" />
                      <Label htmlFor="cod">Thanh toán khi nhận hàng (COD)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONLINE" id="online" />
                      <Label htmlFor="online">Thanh toán online (QR)</Label>
                    </div>
                  </RadioGroup>
                  {paymentMethod === "ONLINE" ? (
                    <p className="text-sm text-gray-600 mt-2">
                      Sau khi đặt hàng, mã QR sẽ hiển thị để bạn thanh toán.
                    </p>
                  ) : null}
                </div>
                {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
                <Button variant="buyer" className="w-full shadow-sm" onClick={handleStep1Next}>
                  Continue to Review
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && !order && (
            <Card className="border border-gray-200/70 shadow-sm">
              <CardHeader>
                <CardTitle>Xác nhận đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Địa chỉ giao hàng</h3>
                    <p className="text-gray-600">
                      {`${shippingForm.firstName} ${shippingForm.lastName}`.trim() || "Khách hàng"}
                    </p>
                    {shippingForm.phone ? (
                      <p className="text-gray-600">{shippingForm.phone}</p>
                    ) : null}
                    <p className="text-gray-600">{buildReceiverAddress() || "Chưa có địa chỉ"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Phương thức thanh toán</h3>
                    <p className="text-gray-600">{paymentLabel}</p>
                    {paymentMethod === "ONLINE" ? (
                      <p className="text-sm text-gray-500 mt-1">
                        Mã QR sẽ xuất hiện ngay sau khi đặt hàng.
                      </p>
                    ) : null}
                  </div>
                  {cart && cart.items.length > 0 ? (
                    <div>
                      <h3 className="font-semibold mb-2">Sản phẩm</h3>
                      <div className="space-y-3">
                        {cart.items.map((item) => {
                          const image = item.productImage || item.product?.images?.[0]
                          const name = item.productName || item.product?.name || "Sản phẩm"
                          const total = (item.price || 0) * (item.quantity || 0)
                          return (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                {image ? (
                                  <img src={image} alt={name} className="w-full h-full object-cover" />
                                ) : null}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{name}</p>
                                {item.skuValue ? (
                                  <p className="text-xs text-gray-600">SKU: {item.skuValue}</p>
                                ) : null}
                                <p className="text-xs text-gray-600">Số lượng: {item.quantity}</p>
                              </div>
                              <p className="text-sm font-semibold text-gray-800">
                                {formatVnd(total)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                  {cart && cart.items.length === 0 ? (
                    <p className="text-sm text-red-600">Giỏ hàng đang trống.</p>
                  ) : null}
                  {cartLoading ? (
                    <p className="text-sm text-gray-600">Đang tải giỏ hàng...</p>
                  ) : null}
                  {cartError ? (
                    <p className="text-sm text-red-600">{cartError}</p>
                  ) : null}
                  {createError ? (
                    <p className="text-sm text-red-600">{createError}</p>
                  ) : null}
                  <Button
                    variant="buyer"
                    className="w-full shadow-sm"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={creatingOrder}
                  >
                    {creatingOrder ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-r from-buyer-primary to-buyer-secondary px-6 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80">Tóm tắt đơn hàng</p>
              <h2 className="text-xl font-bold">Tóm tắt đơn hàng</h2>
              <p className="text-sm text-white/80 mt-1">
                {summary ? formatVnd(summary.total) : cartLoading ? "--" : "0 ₫"}
              </p>
            </div>
            <CardContent className="p-6">
              {orderItems.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {orderItems.map((item: any) => {
                    const image = item.productImage || item.product?.images?.[0]
                    const name = item.productName || item.product?.name || "Sản phẩm"
                    const skuValue = item.skuValue
                    const price = typeof item.price === "number" ? item.price : 0
                    const quantity = typeof item.quantity === "number" ? item.quantity : 0
                    const total = typeof item.total === "number" ? item.total : price * quantity
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-2">
                        <div className="w-12 h-12 bg-white rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{name}</p>
                          {skuValue ? (
                            <p className="text-xs text-gray-600">Phân loại: {skuValue}</p>
                          ) : null}
                          <p className="text-xs text-gray-600">Số lượng: {quantity}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{formatVnd(total)}</p>
                      </div>
                    )
                  })}
                </div>
              ) : null}
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 mb-4">
                <p className="text-sm font-semibold text-gray-800">Mã giảm giá</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={promotionCode}
                    onChange={(e) => {
                      setPromotionCode(e.target.value)
                      if (promotionError) setPromotionError(null)
                    }}
                    placeholder="Nhập mã giảm giá"
                    list={availablePromotions.length > 0 ? "promotion-code-options" : undefined}
                    disabled={promotionLoading || !canApplyPromotion}
                  />
                  <Button
                    type="button"
                    variant="buyer"
                    onClick={handleApplyPromotion}
                    disabled={promotionLoading || !canApplyPromotion}
                  >
                    {promotionLoading ? "Đang áp dụng..." : "Áp dụng"}
                  </Button>
                </div>
                {availablePromotions.length > 0 ? (
                  <datalist id="promotion-code-options">
                    {availablePromotions.map((promotion) =>
                      promotion.code ? (
                        <option key={promotion.id} value={promotion.code}>
                          {promotion.name || promotion.code}
                        </option>
                      ) : null
                    )}
                  </datalist>
                ) : null}
                {!canApplyPromotion ? (
                  <p className="text-xs text-gray-500 mt-2">
                    Đơn hàng đã tạo, không thể áp dụng mã giảm giá.
                  </p>
                ) : (
                  <>
                    {promotionError ? (
                      <p className="text-xs text-red-600 mt-2">{promotionError}</p>
                    ) : null}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-gray-400">
                        <span>Mã trong tài khoản</span>
                        <button
                          type="button"
                          onClick={() => loadPromotions()}
                          disabled={promotionListLoading}
                          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-buyer-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {promotionListLoading ? "Đang tải..." : "Làm mới"}
                        </button>
                      </div>
                      {promotionListError ? (
                        <p className="text-xs text-red-600">{promotionListError}</p>
                      ) : null}
                      {promotionListLoaded && !promotionListLoading && !promotionListError && filteredPromotions.length === 0 ? (
                        <p className="text-xs text-gray-500">
                          Chưa có mã giảm giá phù hợp.
                        </p>
                      ) : null}
                      {filteredPromotions.length > 0 ? (
                        <div className="max-h-48 space-y-2 overflow-auto pr-1">
                          {filteredPromotions.map((promotion) => {
                            const scope = normalizePromotionScope(promotion.scope)
                            const scopeLabel = scope === "SHIPPING" ? "Giảm phí ship" : "Giảm giá đơn"
                            const timeLabel = formatPromotionWindow(promotion)
                            const statusLabel = promotion.status ? describePromotionStatus(promotion) : ""
                            const isApplied = appliedPromotion?.id === promotion.id
                            const meta = [scopeLabel, timeLabel, statusLabel].filter(Boolean).join(" • ")
                            return (
                              <div
                                key={promotion.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {promotion.code || "-"}
                                  </p>
                                  {promotion.name ? (
                                    <p className="text-xs text-gray-500">{promotion.name}</p>
                                  ) : null}
                                  {meta ? (
                                    <p className="text-[11px] text-gray-400">{meta}</p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSelectPromotion(promotion)}
                                  disabled={promotionLoading || !canApplyPromotion || isApplied}
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isApplied
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-gray-200 text-gray-700 hover:border-buyer-primary hover:text-buyer-primary"
                                  }`}
                                >
                                  {isApplied ? "Đã áp dụng" : "Chọn"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
                {appliedPromotion ? (
                  <div
                    className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                      promotionEvaluation?.isValid
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-amber-100 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{appliedPromotion.code || promotionCode}</p>
                        {promotionSummary ? <p className="mt-1">{promotionSummary}</p> : null}
                        {!promotionEvaluation?.isValid ? (
                          <p className="mt-1">
                            {promotionEvaluation?.reason || "Mã giảm giá không còn hợp lệ."}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPromotionDetail((prev) => !prev)}
                          disabled={!canApplyPromotion}
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                            promotionEvaluation?.isValid
                              ? "border-emerald-200 text-emerald-700"
                              : "border-amber-200 text-amber-700"
                          } ${
                            canApplyPromotion
                              ? promotionEvaluation?.isValid
                                ? "hover:border-emerald-300"
                                : "hover:border-amber-300"
                              : "cursor-not-allowed opacity-60"
                          }`}
                        >
                          {showPromotionDetail ? "Ẩn chi tiết" : "Xem chi tiết"}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePromotion}
                          disabled={!canApplyPromotion}
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                            promotionEvaluation?.isValid
                              ? "border-emerald-200 text-emerald-700"
                              : "border-amber-200 text-amber-700"
                          } ${
                            canApplyPromotion
                              ? promotionEvaluation?.isValid
                                ? "hover:border-emerald-300"
                                : "hover:border-amber-300"
                              : "cursor-not-allowed opacity-60"
                          }`}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    {showPromotionDetail && promotionDetailRows.length > 0 ? (
                      <div className="mt-3 space-y-1 rounded-md border border-black/5 bg-white/70 p-3 text-gray-700">
                        {promotionDetailRows.map((row) => (
                          <div key={row.label} className="flex items-start justify-between gap-3">
                            <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400">
                              {row.label}
                            </span>
                            <span className="text-sm text-right text-gray-700">
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span>
                    {summary ? formatVnd(summary.subtotal) : cartLoading ? "--" : "0 ₫"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span>
                    {summary ? formatVnd(summary.shippingFee) : cartLoading ? "--" : "0 ₫"}
                  </span>
                </div>
                {summary && summary.discount > 0 ? (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>
                      Giảm giá{!order && appliedPromotion?.code ? ` (${appliedPromotion.code})` : ""}
                    </span>
                    <span>-{formatVnd(summary.discount)}</span>
                  </div>
                ) : null}
                {!summary ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Thuế</span>
                    <span>{cartLoading ? "--" : "0 ₫"}</span>
                  </div>
                ) : null}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Tổng cộng</span>
                  <span className="text-buyer-primary text-xl">
                    {summary ? formatVnd(summary.total) : cartLoading ? "--" : "0 ₫"}
                  </span>
                </div>
              </div>
              {!order && cartError ? (
                <p className="text-sm text-red-600">{cartError}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      {showPaymentModal && (order?.paymentMethod || "").toUpperCase() === "ONLINE" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-buyer-primary/80">
                  Thanh toán online
                </p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">Quét mã QR để thanh toán</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              {paymentLoading ? (
                <p className="text-gray-600">Đang tạo mã thanh toán...</p>
              ) : paymentError ? (
                <p className="text-sm text-red-600">{paymentError}</p>
              ) : payment?.qrCode ? (
                <>
                  <div className="mx-auto w-full max-w-[360px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <img src={payment.qrCode} alt="QR thanh toán" className="w-full h-auto" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500">Ngân hàng</span>
                      <span className="font-semibold text-gray-900">
                        {paymentInfo?.bank || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500">Số tài khoản</span>
                      <span className="font-semibold text-gray-900">
                        {paymentInfo?.account || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500">Số tiền</span>
                      <span className="font-semibold text-gray-900">
                        {formatVnd(paymentInfo?.amount ?? summary?.total ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-500">Nội dung chuyển khoản</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {paymentInfo?.content || "-"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Vui lòng chuyển đúng số tiền và nội dung để hệ thống tự động xác nhận.
                  </p>
                </>
              ) : (
                <p className="text-gray-600">Chưa có mã QR thanh toán.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {showPaymentSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500/80">
                  Thanh toán thành công
                </p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">Đơn hàng đã được ghi nhận</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentSuccessModal(false)}
                className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-sm text-gray-600">
                Chúng tôi đang chuyển bạn tới trang đơn hàng để theo dõi trạng thái.
              </p>
              <Button
                type="button"
                variant="buyer"
                className="w-full"
                onClick={() => router.push("/buyer/orders")}
              >
                Xem đơn hàng ngay
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
