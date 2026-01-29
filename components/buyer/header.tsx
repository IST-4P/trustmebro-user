"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Search, Menu, X, User, LogIn, LogOut, Bell, Package, Gift, Wallet, ShieldCheck, MessageSquare } from "lucide-react"
import Cookies from "js-cookie"
import { checkAuthStatus, api } from "@/lib/api"
import type { Notification } from "@/lib/types"

export function BuyerHeader() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasSseCount, setHasSseCount] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)
  const notificationOpenRef = useRef(false)
  const dropdownNotifications = notifications.slice(0, 5)

  // Function to check auth status
  const checkAuth = async () => {
    setCheckingAuth(true)
    
    // First, try to check if we have a client-side cookie (fallback)
    const clientToken = Cookies.get("accessToken")
    if (clientToken) {
      setIsAuthenticated(true)
      setCheckingAuth(false)
      return
    }
    
    // If no client-side cookie, check via API (works with HttpOnly cookies)
    const isAuth = await checkAuthStatus()
    setIsAuthenticated(isAuth)
    setCheckingAuth(false)
  }

  const loadCartCount = async () => {
    if (typeof window === "undefined") return
    const response = await api.cart.get({ page: 1, limit: 1 })
    if (response.error) {
      setCartItemCount(0)
      return
    }
    setCartItemCount(response.data?.itemCount ?? 0)
  }

  const isNotificationUnread = (notification: Notification) => {
    return !notification.read && !notification.isRead
  }

  const normalizeNotificationType = (type?: string) => {
    const value = (type || "").toLowerCase()
    if (value.includes("order")) return "order"
    if (value.includes("promotion")) return "promotion"
    if (value.includes("wallet") || value.includes("payment")) return "wallet"
    if (value.includes("trust") || value.includes("system")) return "system"
    if (value.includes("message") || value.includes("chat")) return "message"
    return "default"
  }

  const getNotificationTitle = (notification: Notification) => {
    if (notification.title) return notification.title
    const type = normalizeNotificationType(notification.type)
    switch (type) {
      case "order":
        return "Order update"
      case "promotion":
        return "Promotion"
      case "wallet":
        return "Wallet update"
      case "system":
        return "System update"
      case "message":
        return "New message"
      default:
        return "Notification"
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    return notification.description || notification.message || "You have a new notification."
  }

  const formatNotificationTime = (timestamp?: string) => {
    if (!timestamp) return "Just now"
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return "Just now"
    return date.toLocaleString("vi-VN")
  }

  const getNotificationIcon = (notification: Notification) => {
    const type = normalizeNotificationType(notification.type)
    switch (type) {
      case "order":
        return <Package className="text-buyer-primary" size={18} />
      case "promotion":
        return <Gift className="text-buyer-secondary" size={18} />
      case "wallet":
        return <Wallet className="text-info" size={18} />
      case "system":
        return <ShieldCheck className="text-success" size={18} />
      case "message":
        return <MessageSquare className="text-warning" size={18} />
      default:
        return <Bell className="text-gray-400" size={18} />
    }
  }

  const loadNotifications = async (options?: { silent?: boolean }) => {
    if (!isAuthenticated) return
    const silent = options?.silent ?? false
    if (!silent) {
      setNotificationLoading(true)
    }
    setNotificationError(null)
    const response = await api.notification.list({ page: 1, limit: 20 })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("NotificationNotFound")) {
        setNotifications([])
        setUnreadCount(0)
        setNotificationError(null)
        setNotificationLoading(false)
        return
      }
      setNotificationError(message)
      setNotificationLoading(false)
      return
    }
    const list = response.data || []
    setNotifications(list)
    if (!hasSseCount) {
      const nextUnread = list.filter(isNotificationUnread).length
      setUnreadCount(nextUnread)
    }
    setNotificationLoading(false)
  }

  useEffect(() => {
    // Check authentication status on mount
    if (typeof window !== "undefined") {
      checkAuth()
      
      // Listen for auth status changes (e.g., after login)
      const handleAuthChange = () => {
        checkAuth()
      }

      const handleCartUpdated = (event: Event) => {
        const detail = (event as CustomEvent<{ itemCount?: number }>).detail
        if (typeof detail?.itemCount === "number") {
          setCartItemCount(detail.itemCount)
          return
        }
        loadCartCount()
      }
      
      window.addEventListener("auth-status-changed", handleAuthChange)
      window.addEventListener("cart-updated", handleCartUpdated)
      
      // Cleanup
      return () => {
        window.removeEventListener("auth-status-changed", handleAuthChange)
        window.removeEventListener("cart-updated", handleCartUpdated)
      }
    }
  }, [])

  useEffect(() => {
    loadCartCount()
  }, [isAuthenticated])

  useEffect(() => {
    notificationOpenRef.current = notificationOpen
  }, [notificationOpen])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setHasSseCount(false)
      return
    }
    loadNotifications({ silent: true })
  }, [isAuthenticated])

  useEffect(() => {
    if (!notificationOpen) return
    loadNotifications()
  }, [notificationOpen])

  useEffect(() => {
    if (!notificationOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [notificationOpen])

  useEffect(() => {
    if (!isAuthenticated) return
    let source: EventSource | null = null
    try {
      source = api.notification.sse()
    } catch (error) {
      console.error("Failed to start notification SSE:", error)
      return
    }

    source.onmessage = (event) => {
      if (!event?.data) return
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      const type = String(payload?.type || "").toLowerCase()
      if (type && type !== "notification") return
      const incomingCount = payload?.data?.unreadCount
      if (typeof incomingCount === "number") {
        setUnreadCount(incomingCount)
        setHasSseCount(true)
        window.dispatchEvent(new CustomEvent("notification-updated", { detail: { unreadCount: incomingCount } }))
        if (notificationOpenRef.current) {
          loadNotifications({ silent: true })
        }
      }
    }

    source.onerror = (event) => {
      console.error("Notification SSE error:", event)
    }

    return () => {
      source?.close()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleNotificationUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail
      if (typeof detail?.unreadCount === "number") {
        setUnreadCount(detail.unreadCount)
      }
      if (notificationOpenRef.current) {
        loadNotifications({ silent: true })
      }
    }
    window.addEventListener("notification-updated", handleNotificationUpdated)
    return () => {
      window.removeEventListener("notification-updated", handleNotificationUpdated)
    }
  }, [])

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      // Call logout API to clear HttpOnly cookies on backend
      try {
        await api.auth.logout()
      } catch (error) {
        console.error("Logout API error:", error)
      }
      
      // Remove client-side cookies
      Cookies.remove("accessToken", { path: "/" })
      Cookies.remove("refreshToken", { path: "/" })
      
      // Update auth state immediately
      setIsAuthenticated(false)
      
      // Trigger auth status change event for other components
      window.dispatchEvent(new CustomEvent("auth-status-changed"))
      
      // Redirect to login
      router.push("/buyer/login")
    }
  }

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700 hover:text-buyer-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link href="/buyer" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-buyer-primary to-buyer-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-xl font-bold text-gray-800">TrustMeBro</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/buyer"
              className="text-buyer-primary font-semibold hover:text-buyer-primary/80"
            >
              Home
            </Link>
            <Link
              href="/buyer/products"
              className="text-gray-700 hover:text-buyer-primary transition-colors font-medium"
            >
              Products
            </Link>
            <Link
              href="/buyer/categories"
              className="text-gray-700 hover:text-buyer-primary transition-colors font-medium"
            >
              Categories
            </Link>
            <Link
              href="/buyer/deals"
              className="text-gray-700 hover:text-buyer-primary transition-colors font-medium"
            >
              Deals
            </Link>
            <Link
              href="/buyer/chat"
              className="text-gray-700 hover:text-buyer-primary transition-colors font-medium"
            >
              Chat
            </Link>
            <Link
              href="/buyer/orders"
              className="text-gray-700 hover:text-buyer-primary transition-colors font-medium"
            >
              Orders
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="hidden md:block text-gray-700 hover:text-buyer-primary">
              <Search size={24} />
            </button>
            <Link
              href="/buyer/cart"
              className="relative text-gray-700 hover:text-buyer-primary"
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 ? (
                <span className="absolute -top-2 -right-2 bg-buyer-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              ) : null}
            </Link>
            {isAuthenticated ? (
              <div className="relative" ref={notificationPanelRef}>
                <button
                  className="relative text-gray-700 hover:text-buyer-primary"
                  onClick={() => setNotificationOpen((prev) => !prev)}
                  aria-label="Toggle notifications"
                >
                  <Bell size={24} />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-2 -right-2 bg-buyer-primary text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                {notificationOpen ? (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-gray-800">Notifications</span>
                      <Link
                        href="/buyer/notifications"
                        className="text-sm text-buyer-primary hover:underline"
                        onClick={() => setNotificationOpen(false)}
                      >
                        View all
                      </Link>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificationLoading ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">Loading notifications...</div>
                      ) : notificationError ? (
                        <div className="px-4 py-6 text-center text-sm text-red-500">{notificationError}</div>
                      ) : dropdownNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet</div>
                      ) : (
                        dropdownNotifications.map((notification) => {
                          const unread = isNotificationUnread(notification)
                          const timestamp = notification.createdAt || notification.updatedAt
                          return (
                            <div
                              key={notification.id}
                              className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {getNotificationIcon(notification)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className={`text-sm font-semibold ${unread ? "text-gray-900" : "text-gray-700"}`}>
                                        {getNotificationTitle(notification)}
                                      </p>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {getNotificationMessage(notification)}
                                      </p>
                                    </div>
                                    {unread ? (
                                      <span className="mt-1 h-2 w-2 rounded-full bg-buyer-primary" />
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {formatNotificationTime(timestamp)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <>
                <Link href="/buyer/profile">
                  <Button variant="ghost" size="icon">
                    <User size={20} />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut size={20} />
                </Button>
              </>
            ) : (
              <Link href="/buyer/login">
                <Button variant="buyer" size="sm">
                  <LogIn className="mr-2" size={16} />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t space-y-2">
            <Link
              href="/buyer"
              className="block px-4 py-2 text-buyer-primary font-semibold"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/buyer/products"
              className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Products
            </Link>
            <Link
              href="/buyer/categories"
              className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Categories
            </Link>
            <Link
              href="/buyer/deals"
              className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Deals
            </Link>
            <Link
              href="/buyer/chat"
              className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Chat
            </Link>
            <Link
              href="/buyer/orders"
              className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Orders
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/buyer/profile"
                  className="block px-4 py-2 text-gray-700 hover:text-buyer-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:text-buyer-primary"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/buyer/login"
                className="block px-4 py-2 text-buyer-primary font-semibold"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
