"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const credentials = {
      username,
      password,
    }

    const response = await api.auth.login(credentials)

    if (response.error) {
      setError(typeof response.error === "string" ? response.error : String(response.error))
      setLoading(false)
      return
    }

    if (response.data) {
      // Trigger auth status refresh in Header component
      // Dispatch custom event to notify Header to re-check auth
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-status-changed"))
      }
      
      // Small delay to ensure cookies are set before redirect
      setTimeout(() => {
        router.push("/buyer")
        // Force router refresh to update all components
        router.refresh()
      }, 100)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Chào mừng trở lại</CardTitle>
          <CardDescription>Đăng nhập vào tài khoản</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="remember" className="rounded" />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Ghi nhớ đăng nhập
                </Label>
              </div>
              <Link href="/buyer/forgot-password" className="text-sm text-buyer-primary hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <Button type="submit" variant="buyer" className="w-full" size="lg" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Hoặc tiếp tục với</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button type="button" variant="outline" className="w-full">
                Google
              </Button>
              <Button type="button" variant="outline" className="w-full">
                Facebook
              </Button>
            </div>
            <p className="text-center text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <Link href="/buyer/register" className="text-buyer-primary hover:underline font-medium">
                Đăng ký
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
