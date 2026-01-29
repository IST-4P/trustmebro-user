"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingBag, ShoppingCart, User, Bell, ListOrdered, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function BuyerBottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/buyer", icon: Home, label: "Home" },
    { href: "/buyer/products", icon: ShoppingBag, label: "Products" },
    { href: "/buyer/cart", icon: ShoppingCart, label: "Cart" },
    { href: "/buyer/chat", icon: MessageSquare, label: "Chat" },
    { href: "/buyer/orders", icon: ListOrdered, label: "Orders" },
    { href: "/buyer/notifications", icon: Bell, label: "Notifications" },
    { href: "/buyer/profile", icon: User, label: "Profile" },
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
