"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, Bell, User, Menu, Package, Gift, Wallet, ShieldCheck, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Cookies from "js-cookie"
import { api } from "@/lib/api"
import type { Notification } from "@/lib/types"

export function SellerHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasSseCount, setHasSseCount] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)
  const notificationOpenRef = useRef(false)
  const dropdownNotifications = notifications.slice(0, 5)

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
        return <Package className="text-seller-accent-blue" size={18} />
      case "promotion":
        return <Gift className="text-seller-accent-purple" size={18} />
      case "wallet":
        return <Wallet className="text-seller-accent-green" size={18} />
      case "system":
        return <ShieldCheck className="text-seller-accent-blue" size={18} />
      case "message":
        return <MessageSquare className="text-seller-accent-orange" size={18} />
      default:
        return <Bell className="text-gray-400" size={18} />
    }
  }

  const loadNotifications = async (options?: { silent?: boolean }) => {
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
    notificationOpenRef.current = notificationOpen
  }, [notificationOpen])

  useEffect(() => {
    loadNotifications({ silent: true })
  }, [])

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
    const token = Cookies.get("accessToken")
    if (!token) return
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
  }, [])

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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 lg:ml-64">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu size={24} />
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input placeholder="Search orders, products..." className="pl-10" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="relative" ref={notificationPanelRef}>
              <button
                className="relative text-gray-600 hover:text-gray-900"
                onClick={() => setNotificationOpen((prev) => !prev)}
                aria-label="Toggle notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 ? (
                  <Badge variant="error" className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 p-0 flex items-center justify-center text-[10px]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                ) : null}
              </button>
              {notificationOpen ? (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="font-semibold text-gray-800">Notifications</span>
                    <Link
                      href="/seller/notifications"
                      className="text-sm text-seller-accent-blue hover:underline"
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
                                    <span className="mt-1 h-2 w-2 rounded-full bg-seller-accent-blue" />
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
            <Link href="/seller/profile">
              <Button variant="ghost" size="icon">
                <User size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
