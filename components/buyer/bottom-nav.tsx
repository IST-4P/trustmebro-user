"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingBag, ShoppingCart, User, ListOrdered, MessageSquare, PlaySquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function BuyerBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/buyer", icon: Home, label: "Trang chủ" },
    { href: "/buyer/videos", icon: PlaySquare, label: "Video" },
    { href: "/buyer/products", icon: ShoppingBag, label: "Sản phẩm" },
    { href: "/buyer/chat", icon: MessageSquare, label: "Trò chuyện" },
    { href: "/buyer/orders", icon: ListOrdered, label: "Đơn hàng" },
    { href: "/buyer/profile", icon: User, label: "Hồ sơ" },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                isActive
                  ? "text-buyer-primary"
                  : "text-gray-600 hover:text-buyer-primary"
              )}
            >
              <Icon size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
