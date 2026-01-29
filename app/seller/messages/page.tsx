"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Send, Paperclip, Smile } from "lucide-react"

export default function SellerMessagesPage() {
  const [selectedChat, setSelectedChat] = useState(1)

  const conversations = [
    { id: 1, name: "John Doe", lastMessage: "When will my order arrive?", time: "2m ago", unread: 2 },
    { id: 2, name: "Jane Smith", lastMessage: "Thank you for the quick delivery!", time: "1h ago", unread: 0 },
    { id: 3, name: "Bob Johnson", lastMessage: "Is this product available?", time: "3h ago", unread: 1 },
  ]

  const messages = [
    { id: 1, sender: "customer", text: "Hello! When will my order arrive?", time: "10:30 AM" },
    { id: 2, sender: "seller", text: "Your order is scheduled to arrive on Jan 20, 2024", time: "10:32 AM" },
    { id: 3, sender: "customer", text: "Great, thank you!", time: "10:33 AM" },
  ]

  return (
    <div className="space-y-6 h-[calc(100vh-200px)]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">Communicate with your customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedChat === conv.id ? "border-seller-accent-blue border-2" : ""
                }`}
                onClick={() => setSelectedChat(conv.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-seller-accent-blue rounded-full flex items-center justify-center text-white font-semibold">
                      {conv.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                        {conv.unread > 0 && (
                          <Badge variant="info" className="text-xs">{conv.unread}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-gray-500 mt-1">{conv.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-seller-accent-blue rounded-full flex items-center justify-center text-white font-semibold">
                  J
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">John Doe</h3>
                  <p className="text-xs text-gray-500">Order #ORD-000001</p>
                </div>
              </div>
            </CardContent>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "seller" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender === "seller"
                        ? "bg-seller-accent-blue text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "seller" ? "text-white/70" : "text-gray-500"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip size={20} />
                </Button>
                <Input placeholder="Type a message..." className="flex-1" />
                <Button variant="ghost" size="icon">
                  <Smile size={20} />
                </Button>
                <Button variant="seller" size="icon">
                  <Send size={20} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
