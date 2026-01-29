"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Gift, Wallet, ShieldCheck, MessageSquare, Bell, Trash2, CheckCircle } from "lucide-react"
import { api } from "@/lib/api"
import type { Notification } from "@/lib/types"

export default function SellerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState("all")

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
        return <Package className="text-seller-accent-blue" size={20} />
      case "promotion":
        return <Gift className="text-seller-accent-purple" size={20} />
      case "wallet":
        return <Wallet className="text-seller-accent-green" size={20} />
      case "system":
        return <ShieldCheck className="text-seller-accent-blue" size={20} />
      case "message":
        return <MessageSquare className="text-seller-accent-orange" size={20} />
      default:
        return <Bell className="text-gray-400" size={20} />
    }
  }

  const loadNotifications = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    const typeParam = filter !== "all" ? filter : undefined
    const response = await api.notification.list({ page: 1, limit: 50, type: typeParam })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("NotificationNotFound")) {
        setNotifications([])
        setUnreadCount(0)
        setError(null)
        setLoading(false)
        return
      }
      setError(message)
      setLoading(false)
      return
    }
    const list = response.data || []
    setNotifications(list)
    setUnreadCount(list.filter(isNotificationUnread).length)
    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
  }, [filter])

  useEffect(() => {
    const handleNotificationUpdated = () => {
      loadNotifications({ silent: true })
    }
    window.addEventListener("notification-updated", handleNotificationUpdated)
    return () => {
      window.removeEventListener("notification-updated", handleNotificationUpdated)
    }
  }, [])

  const updateNotificationState = (next: Notification[]) => {
    setNotifications(next)
    const nextUnread = next.filter(isNotificationUnread).length
    setUnreadCount(nextUnread)
    window.dispatchEvent(new CustomEvent("notification-updated", { detail: { unreadCount: nextUnread } }))
  }

  const handleMarkRead = async (notification: Notification) => {
    if (!isNotificationUnread(notification)) return
    const response = await api.notification.update({ id: notification.id, isRead: true, read: true })
    if (response.error) {
      alert(response.error)
      return
    }
    updateNotificationState(
      notifications.map((item) =>
        item.id === notification.id ? { ...item, isRead: true, read: true } : item
      )
    )
  }

  const handleDelete = async (notification: Notification) => {
    if (!confirm("Delete this notification?")) return
    const response = await api.notification.delete(notification.id)
    if (response.error) {
      alert(response.error)
      return
    }
    updateNotificationState(notifications.filter((item) => item.id !== notification.id))
  }

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter(isNotificationUnread)
    if (unreadItems.length === 0) return
    setMarkingAll(true)
    const responses = await Promise.all(
      unreadItems.map((item) => api.notification.update({ id: item.id, isRead: true, read: true }))
    )
    const failed = responses.find((item) => item.error)
    if (failed?.error) {
      alert(failed.error)
    }
    const next = notifications.map((item) =>
      isNotificationUnread(item) ? { ...item, isRead: true, read: true } : item
    )
    updateNotificationState(next)
    setMarkingAll(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with your shop activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{unreadCount} unread</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCircle className="mr-2" size={16} />
            Mark all read
          </Button>
          <select
            className="px-4 py-2 border rounded-md text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="ORDER_UPDATE">Orders</option>
            <option value="PROMOTION">Promotions</option>
            <option value="WALLET_UPDATE">Wallet</option>
            <option value="TRUST_ME_BRO_UPDATE">TrustMeBro</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const unread = isNotificationUnread(notification)
            const timestamp = notification.createdAt || notification.updatedAt
            return (
              <Card key={notification.id} className={unread ? "border-seller-accent-blue border-2" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {getNotificationTitle(notification)}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {getNotificationMessage(notification)}
                            </p>
                          </div>
                          {unread && (
                            <div className="w-2 h-2 bg-seller-accent-blue rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatNotificationTime(timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unread ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkRead(notification)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(notification)}
                      >
                        <Trash2 className="mr-2" size={16} />
                        Delete
                      </Button>
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
