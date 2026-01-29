import { SellerSidebar } from "@/components/seller/sidebar"
import { SellerHeader } from "@/components/seller/header"

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <SellerHeader />
      <div className="flex">
        <SellerSidebar />
        <main className="flex-1 p-6 lg:ml-64">{children}</main>
      </div>
    </div>
  )
}
