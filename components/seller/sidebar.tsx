"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react"

export function SellerSidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/seller", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/seller/products", icon: Package, label: "Products" },
    { href: "/seller/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/seller/shop", icon: Store, label: "Shop Profile" },
    { href: "/seller/notifications", icon: Bell, label: "Notifications" },
    { href: "/seller/messages", icon: MessageSquare, label: "Messages" },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:bg-white lg:border-r lg:border-gray-200 lg:pt-20">
        <div className="h-full overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-seller-accent-blue/10 text-seller-accent-blue"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon size={20} className="mr-3" />
                  {item.label}
                </Link>
              )
            })}
            <div className="pt-4 border-t">
              <Link
                href="/seller/settings"
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  pathname === "/seller/settings"
                    ? "bg-seller-accent-blue/10 text-seller-accent-blue"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Settings size={20} className="mr-3" />
                Settings
              </Link>
              <button className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                <LogOut size={20} className="mr-3" />
                Logout
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div className="lg:hidden fixed inset-0 z-50">
        {/* Overlay */}
        <div className="fixed inset-0 bg-black/50"></div>
        {/* Drawer */}
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-white">
          <nav className="p-4 pt-20 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-seller-accent-blue/10 text-seller-accent-blue"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon size={20} className="mr-3" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
