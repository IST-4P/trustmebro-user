import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TrustMeBro - Chợ trực tuyến tin cậy",
  description: "Nền tảng thương mại điện tử đa nhà bán",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} app-shell`}>{children}</body>
    </html>
  )
}
