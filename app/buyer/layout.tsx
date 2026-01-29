"use client"

import { useEffect } from "react"
import Cookies from "js-cookie"
import { BuyerHeader } from "@/components/buyer/header"
import { BuyerBottomNav } from "@/components/buyer/bottom-nav"

export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout component - no need for cookie checking here
  // Header component handles authentication status

  return (
    <div className="min-h-screen">
      <BuyerHeader />
      <main className="pb-20 md:pb-0">{children}</main>
      <BuyerBottomNav />
    </div>
  )
}
