"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Package, Gift, Wallet, ShieldCheck, MessageSquare, Trash2, CheckCircle } from "lucide-react"
import { api } from "@/lib/api"
import type { Notification } from "@/lib/types"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)

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
        return <Package className="text-buyer-primary" size={20} />
      case "promotion":
        return <Gift className="text-buyer-secondary" size={20} />
      case "wallet":
        return <Wallet className="text-info" size={20} />
      case "system":
        return <ShieldCheck className="text-success" size={20} />
      case "message":
        return <MessageSquare className="text-warning" size={20} />
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
    const response = await api.notification.list({ page: 1, limit: 50 })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("NotificationNotFound")) {
        setNotifications([])
        setUnreadCount(0)
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
    const list = response.data || []
    setNotifications(list)
    setUnreadCount(list.filter(isNotificationUnread).length)
    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with your account activity</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{unreadCount} unread</Badge>
          <Button
            variant="buyerOutline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCircle className="mr-2" size={16} />
            Mark all read
          </Button>
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
              <Card key={notification.id} className={unread ? "border-buyer-primary border-2" : ""}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800 mb-1">
                              {getNotificationTitle(notification)}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {getNotificationMessage(notification)}
                            </p>
                          </div>
                          {unread && (
                            <div className="w-2 h-2 bg-buyer-primary rounded-full"></div>
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
