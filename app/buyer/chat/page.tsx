"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Cookies from "js-cookie"
import { io, type Socket } from "socket.io-client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Search, Paperclip, Smile } from "lucide-react"
import { api } from "@/lib/api"
import type { Conversation, Message, MessageType, User } from "@/lib/types"

const CHAT_WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || ""

function deriveSocketPath(url: string): string {
  try {
    const parsed = new URL(url)
    let path = parsed.pathname || ""
    if (path.endsWith("/")) path = path.slice(0, -1)
    const segments = path.split("/").filter(Boolean)
    if (segments.length > 0) {
      segments.pop()
    }
    const basePath = segments.length > 0 ? `/${segments.join("/")}` : ""
    return `${basePath}/socket.io`
  } catch {
    return "/socket.io"
  }
}

function formatChatTime(timestamp?: string | null) {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatConversationTime(timestamp?: string | null) {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("vi-VN")
}

function sortMessages(items: Message[]) {
  return [...items].sort((a, b) => {
    const left = new Date(a.createdAt).getTime()
    const right = new Date(b.createdAt).getTime()
    return left - right
  })
}

function normalizeMessageType(value?: string): MessageType {
  const candidate = String(value || "TEXT").toUpperCase()
  if (
    candidate === "IMAGE" ||
    candidate === "VIDEO" ||
    candidate === "PRODUCT_CARD" ||
    candidate === "ORDER_CARD" ||
    candidate === "STICKER"
  ) {
    return candidate as MessageType
  }
  return "TEXT"
}

function extractMessage(payload: any, fallbackConversationId?: string | null): Message | null {
  if (!payload) return null
  const data = payload?.data?.message || payload?.message || payload?.data || payload
  const conversationId = data?.conversationId || fallbackConversationId
  const metadata = data?.metadata
  const metadataUrl =
    metadata && typeof metadata === "object"
      ? metadata.url || metadata.imageUrl || metadata.src
      : null
  const contentValue = data?.content || metadataUrl
  if (!conversationId || !contentValue) return null
  return {
    id: String(data.id || `ws-${Date.now()}`),
    conversationId: String(conversationId),
    senderId: String(data.senderId || data?.senderId?.id || data?.sender?.id || ""),
    content: String(contentValue || ""),
    type: normalizeMessageType(data.type),
    metadata: metadata || {},
    createdAt: String(data.createdAt || new Date().toISOString()),
  }
}

function getClientToken(): string | null {
  if (typeof window === "undefined") return null
  return (
    Cookies.get("accessToken") ||
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("authToken") ||
    null
  )
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationLoading, setConversationLoading] = useState(true)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [messageLoading, setMessageLoading] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [showListView, setShowListView] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const selectedConversationRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const emojiList = [
    "😀",
    "😂",
    "😍",
    "🥰",
    "😎",
    "🤔",
    "😭",
    "👍",
    "🙏",
    "🔥",
    "🎉",
    "❤️",
  ]

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  )

  const getConversationPeer = (conversation: Conversation | null) => {
    if (!conversation) return null
    const participants = Array.isArray(conversation.participants) ? conversation.participants : []
    if (user?.id) {
      return participants.find((participant) => participant.id !== user.id) || participants[0]
    }
    return participants[0]
  }

  const isConversationUnread = (conversation: Conversation) => {
    if (!user?.id) return false
    const status = conversation.readStatus?.[user.id]
    if (!status) return false
    return !status.isRead && !!conversation.lastMessageId
  }

  const filteredConversations = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase()
    if (!keyword) return conversations
    return conversations.filter((conversation) => {
      const peer = getConversationPeer(conversation)
      const name = peer?.username || ""
      return name.toLowerCase().includes(keyword)
    })
  }, [conversations, searchValue, user?.id])

  const loadUser = async () => {
    const response = await api.user.get()
    if (response.error) return
    if (response.data) {
      setUser(response.data)
    }
  }

  const loadConversations = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setConversationLoading(true)
    }
    setConversationError(null)
    const response = await api.chat.conversations.list({ page: 1, limit: 50 })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
        if (typeof window !== "undefined") {
          window.location.href = "/buyer/login"
        }
        return
      }
      const normalizedMessage = message.toLowerCase()
      if (normalizedMessage.includes("conversationnotfound") || normalizedMessage.includes("conversationsnotfound")) {
        setConversations([])
        setConversationLoading(false)
        return
      }
      setConversationError(message)
      setConversationLoading(false)
      return
    }
    const list = response.data?.items || []
    const sorted = [...list].sort((left, right) => {
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0
      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0
      return rightTime - leftTime
    })
    setConversations(sorted)
    setConversationLoading(false)
  }

  const loadMessages = async (conversationId: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setMessageLoading(true)
    }
    setMessageError(null)
    const response = await api.chat.messages.list(conversationId, { page: 1, limit: 100 })
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
        if (typeof window !== "undefined") {
          window.location.href = "/buyer/login"
        }
        return
      }
      const normalizedMessage = message.toLowerCase()
      if (normalizedMessage.includes("messagenotfound") || normalizedMessage.includes("messagesnotfound")) {
        setMessages([])
        setMessageLoading(false)
        return
      }
      setMessageError(message)
      setMessageLoading(false)
      return
    }
    const list = response.data?.items || []
    setMessages(sortMessages(list))
    setMessageLoading(false)
  }

  const sendSocketMessage = async (payload: {
    type: MessageType
    content: string
    metadata?: Record<string, any>
  }) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) {
      setMessageError("Socket.IO chưa kết nối. Vui lòng cấu hình NEXT_PUBLIC_CHAT_WS_URL hoặc kiểm tra server.")
      return false
    }
    try {
      socket.emit("sendMessage", {
        type: payload.type,
        content: payload.content,
        metadata: payload.metadata || {},
      })
      return true
    } catch (error) {
      console.error("Chat socket send error:", error)
      setMessageError("Không gửi được tin nhắn qua Socket.IO.")
      return false
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversationId) return
    const trimmed = messageInput.trim()
    if (!trimmed) return
    if (sending) return

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: user?.id || "me",
      content: trimmed,
      type: "TEXT",
      metadata: {},
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => sortMessages([...prev, optimisticMessage]))
    setMessageInput("")
    setSending(true)

    const ok = await sendSocketMessage({
      type: "TEXT",
      content: trimmed,
      metadata: {},
    })
    if (!ok) {
      setMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id))
      setSending(false)
      return
    }

    setSending(false)
    loadConversations({ silent: true })
    setTimeout(() => {
      if (selectedConversationRef.current) {
        loadMessages(selectedConversationRef.current, { silent: true })
      }
    }, 800)
  }

  const handlePickEmoji = (emoji: string) => {
    setMessageInput((prev) => `${prev}${emoji}`)
    setEmojiOpen(false)
  }

  const formatConversationPreview = (conversation: Conversation) => {
    const content = conversation.lastMessageContent || ""
    const looksLikeUrl = /^https?:\/\//i.test(content)
    if (!looksLikeUrl) return content || "No messages yet"
    const lower = content.toLowerCase()
    if (lower.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/)) {
      return "📷 Image"
    }
    return "🔗 Attachment"
  }

  const handleSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file || !selectedConversationId) return
    if (imageUploading) return

    setMessageError(null)
    setImageUploading(true)

    const presigned = await api.media.imagePresigned({ filename: file.name })
    if (presigned.error || !presigned.data) {
      setMessageError(
        typeof presigned.error === "string" ? presigned.error : "Không lấy được link upload ảnh."
      )
      setImageUploading(false)
      input.value = ""
      return
    }

    const upload = await api.media.uploadToPresignedUrl(presigned.data.presignedUrl, file)
    if (upload.error) {
      setMessageError(typeof upload.error === "string" ? upload.error : "Upload ảnh thất bại.")
      setImageUploading(false)
      input.value = ""
      return
    }

    const imageUrl = presigned.data.url
    const optimisticMessage: Message = {
      id: `temp-image-${Date.now()}`,
      conversationId: selectedConversationId,
      senderId: user?.id || "me",
      content: imageUrl,
      type: "IMAGE",
      metadata: {
        url: imageUrl,
        filename: file.name,
        size: file.size,
        mime: file.type,
      },
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => sortMessages([...prev, optimisticMessage]))

    const ok = await sendSocketMessage({
      type: "IMAGE",
      content: imageUrl,
      metadata: {
        url: imageUrl,
        filename: file.name,
        size: file.size,
        mime: file.type,
      },
    })

    if (!ok) {
      setMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id))
      setImageUploading(false)
      input.value = ""
      return
    }

    setImageUploading(false)
    input.value = ""
    loadConversations({ silent: true })
    setTimeout(() => {
      if (selectedConversationRef.current) {
        loadMessages(selectedConversationRef.current, { silent: true })
      }
    }, 800)
  }

  useEffect(() => {
    loadUser()
    loadConversations()
  }, [])

  useEffect(() => {
    // Don't auto-select if user wants to stay in list view
    if (!selectedConversationId && conversations.length > 0 && !showListView) {
      setSelectedConversationId(conversations[0].id)
      return
    }
    if (selectedConversationId && conversations.length === 0) {
      setSelectedConversationId(null)
      setShowListView(true)
      return
    }
    if (
      selectedConversationId &&
      conversations.length > 0 &&
      !conversations.find((conversation) => conversation.id === selectedConversationId)
    ) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId, showListView])

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }
    loadMessages(selectedConversationId)
  }, [selectedConversationId])

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!target) return
      const emojiButton = (target as HTMLElement).closest?.("[data-emoji-toggle]")
      const emojiMenu = (target as HTMLElement).closest?.("[data-emoji-menu]")
      if (!emojiButton && !emojiMenu) {
        setEmojiOpen(false)
      }
    }
    if (emojiOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [emojiOpen])

  useEffect(() => {
    let source: EventSource | null = null
    try {
      source = api.chat.conversations.sse()
    } catch (error) {
      console.error("Failed to start conversation SSE:", error)
      return
    }

    source.onmessage = () => {
      loadConversations({ silent: true })
    }

    source.onerror = (event) => {
      console.error("Chat SSE error:", event)
    }

    return () => {
      source?.close()
    }
  }, [user?.id])

  useEffect(() => {
    if (!CHAT_WS_URL || !selectedConversationId) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const token = getClientToken()
    const authToken = token ? `Bearer ${token}` : undefined
    const socketPath = deriveSocketPath(CHAT_WS_URL)
    const query: Record<string, string> = {
      conversationId: selectedConversationId,
    }
    if (token) {
      query.token = token
      query.accessToken = token
      query.authorization = authToken || token
    }

    const socket = io(CHAT_WS_URL, {
      transports: ["websocket"],
      withCredentials: true,
      path: socketPath,
      query,
      auth: token
        ? {
            token,
            accessToken: token,
            authorization: authToken || token,
          }
        : undefined,
    })

    socketRef.current = socket

    const handleIncoming = (payload: any) => {
      const message = extractMessage(payload, selectedConversationRef.current)
      if (!message) return

      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev
        }
        const withoutTemp = prev.filter((item) => {
          if (!item.id.startsWith("temp-")) return true
          return (
            item.conversationId !== message.conversationId ||
            item.senderId !== message.senderId ||
            item.content !== message.content
          )
        })
        return sortMessages([...withoutTemp, message])
      })

      if (message.conversationId !== selectedConversationRef.current) {
        loadConversations({ silent: true })
      }
    }

    socket.on("connect", () => {
      setMessageError(null)
    })

    socket.on("connect_error", (error) => {
      console.error("Chat socket connect error:", error)
      const hint = token ? "" : " (thiếu accessToken trên client)"
      setMessageError(
        error?.message
          ? `Socket.IO lỗi: ${error.message}${hint}`
          : `Không kết nối được Socket.IO.${hint}`
      )
    })

    socket.on("newMessage", handleIncoming)
    socket.on("message", handleIncoming)

    return () => {
      socket.off("newMessage", handleIncoming)
      socket.off("message", handleIncoming)
      socket.disconnect()
      socketRef.current = null
    }
  }, [selectedConversationId, user?.id])

  const activePeer = getConversationPeer(selectedConversation)

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-140px)] md:container md:mx-auto md:px-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6 h-full min-h-0">
        {/* Conversations List - Hidden on mobile when conversation is selected */}
        <div className={`lg:col-span-1 flex flex-col gap-2 md:gap-4 min-h-0 ${selectedConversationId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="relative px-4 md:px-0 pt-4 md:pt-0">
            <Search className="absolute left-7 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Tìm cuộc trò chuyện..."
              className="pl-10"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 px-4 md:px-0 md:pr-1">
            {conversationLoading ? (
              <div className="text-sm text-gray-600">Đang tải cuộc trò chuyện...</div>
            ) : conversationError ? (
              <div className="text-sm text-red-600">{conversationError}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-sm text-gray-600">Không có cuộc trò chuyện</div>
            ) : (
              filteredConversations.map((conversation) => {
                const peer = getConversationPeer(conversation)
                const unread = isConversationUnread(conversation)
                const name = peer?.username || "Không rõ"
                return (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedConversationId === conversation.id ? "border-buyer-primary border-2" : ""
                    }`}
                    onClick={() => {
                      setSelectedConversationId(conversation.id)
                      setShowListView(false)
                    }}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-buyer-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate">{name}</h3>
                            {unread ? (
                              <Badge variant="info" className="text-xs">
                                Mới
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 truncate">
                            {formatConversationPreview(conversation)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatConversationTime(conversation.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Window - Full screen on mobile when conversation is selected */}
        <div className={`lg:col-span-2 flex flex-col min-h-0 ${selectedConversationId ? 'flex' : 'hidden lg:flex'}`}>
          <Card className="flex-1 flex flex-col min-h-0 rounded-none md:rounded-lg">
            <CardContent className="p-3 md:p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setSelectedConversationId(null)
                    setShowListView(true)
                  }}
                  className="lg:hidden w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-buyer-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {(activePeer?.username || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base text-gray-800">
                    {activePeer?.username || "Chọn cuộc trò chuyện"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedConversation ? "Đang trò chuyện" : "Chưa chọn cuộc trò chuyện"}
                  </p>
                </div>
              </div>
            </CardContent>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
              {messageLoading ? (
                <div className="text-sm text-gray-600">Đang tải tin nhắn...</div>
              ) : messageError ? (
                <div className="text-sm text-red-600">{messageError}</div>
              ) : !selectedConversation ? (
                <div className="text-sm text-gray-600">Chọn cuộc trò chuyện để bắt đầu.</div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-600">Chưa có tin nhắn.</div>
              ) : (
                messages.map((msg) => {
                  const isMine = user?.id ? msg.senderId === user.id : false
                  const metadataUrl =
                    msg.metadata && typeof msg.metadata === "object"
                      ? (msg.metadata as any).url || (msg.metadata as any).imageUrl || (msg.metadata as any).src
                      : null
                  const imageUrl =
                    msg.type === "IMAGE"
                      ? (metadataUrl as string | null) || msg.content
                      : null
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[70%] rounded-lg p-2 md:p-3 ${
                          isMine ? "bg-buyer-primary text-white" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {imageUrl ? (
                          <div className="space-y-2">
                            <img
                              src={imageUrl}
                              alt="Ảnh trò chuyện"
                              loading="lazy"
                              className="max-w-[200px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[380px] rounded-md border border-white/20"
                            />
                            {msg.content && msg.content !== imageUrl ? (
                              <p className="text-sm">{msg.content}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm break-words">{msg.content}</p>
                        )}
                        <p className={`text-xs mt-1 ${isMine ? "text-white/70" : "text-gray-500"}`}>
                          {formatChatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t p-3 md:p-4">
              <div className="flex gap-2 items-center relative">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectImage}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!selectedConversation || imageUploading}
                  title="Gửi ảnh"
                >
                  <Paperclip size={18} className="md:w-5 md:h-5" />
                </Button>
                <Input
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 text-sm md:text-base"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={!selectedConversation || sending}
                />
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10"
                    onClick={() => setEmojiOpen((prev) => !prev)}
                    disabled={!selectedConversation}
                    title="Biểu tượng cảm xúc"
                    data-emoji-toggle
                  >
                    <Smile size={18} className="md:w-5 md:h-5" />
                  </Button>
                  {emojiOpen ? (
                    <div className="absolute bottom-12 right-0 w-56 md:w-64 max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1 z-20" data-emoji-menu>
                      {emojiList.map((emoji) => (
                        <button
                          key={emoji}
                          className="text-base md:text-lg hover:bg-gray-100 rounded p-1"
                          onClick={() => handlePickEmoji(emoji)}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="buyer"
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  onClick={handleSendMessage}
                  disabled={!selectedConversation || sending || !messageInput.trim()}
                >
                  <Send size={18} className="md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
