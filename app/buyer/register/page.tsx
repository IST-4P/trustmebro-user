"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "otp">("form")
  const [loading, setLoading] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processId, setProcessId] = useState<string>("")
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    password: "",
    confirmPassword: "",
    code: "",
  })

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingOTP(true)
    setError(null)

    // Validation
    if (!formData.email) {
      setError("Vui lòng nhập email")
      setSendingOTP(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu không khớp")
      setSendingOTP(false)
      return
    }

    if (!formData.username || !formData.firstName || !formData.lastName) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc")
      setSendingOTP(false)
      return
    }

    const response = await api.auth.sendOTP({
      email: formData.email,
      type: "REGISTER",
    })

    if (response.error) {
      // Ensure error is always a string
      setError(typeof response.error === "string" ? response.error : String(response.error))
      setSendingOTP(false)
      return
    }

    if (response.data && response.data.processId) {
      setProcessId(response.data.processId)
      setStep("otp")
    } else {
      setError("Gửi OTP thất bại. Vui lòng thử lại.")
    }
    setSendingOTP(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.code) {
      setError("Vui lòng nhập mã OTP")
      setLoading(false)
      return
    }

    const response = await api.auth.register({
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phoneNumber || undefined,
      gender: formData.gender,
      code: formData.code,
      password: formData.password,
    })

    if (response.error) {
      // Ensure error is always a string
      setError(typeof response.error === "string" ? response.error : String(response.error))
      setLoading(false)
      return
    }

      if (response.data) {
        // Trigger auth status refresh in Header component
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth-status-changed"))
        }
        
        // Small delay to ensure cookies are set before redirect
        setTimeout(() => {
          router.push("/buyer")
          router.refresh()
        }, 100)
      }
  }

  const handleResendOTP = async () => {
    setSendingOTP(true)
    setError(null)
    const response = await api.auth.sendOTP({
      email: formData.email,
      type: "REGISTER",
    })

    if (response.error) {
      // Ensure error is always a string
      setError(typeof response.error === "string" ? response.error : String(response.error))
    } else if (response.data && response.data.processId) {
      setProcessId(response.data.processId)
      setError(null)
    }
    setSendingOTP(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Tạo tài khoản</CardTitle>
          <CardDescription>
            {step === "form" ? "Đăng ký để bắt đầu" : "Nhập mã OTP đã gửi đến email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
            </div>
          )}

          {step === "form" ? (
            <form className="space-y-4" onSubmit={handleSendOTP}>
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Họ *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Họ"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Tên *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Tên"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Nhập email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Số điện thoại</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Giới tính *</Label>
                <select
                  id="gender"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as "MALE" | "FEMALE" | "OTHER" })
                  }
                  required
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tạo mật khẩu"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="terms" className="rounded" required />
                <Label htmlFor="terms" className="text-sm font-normal">
                  Tôi đồng ý với{" "}
                  <Link href="/terms" className="text-buyer-primary hover:underline">
                    Điều khoản & Điều kiện
                  </Link>
                </Label>
              </div>
              <Button type="submit" variant="buyer" className="w-full" size="lg" disabled={sendingOTP}>
                {sendingOTP ? "Đang gửi OTP..." : "Gửi mã OTP"}
              </Button>
              <p className="text-center text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/buyer/login" className="text-buyer-primary hover:underline font-medium">
                  Đăng nhập
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 mb-4">
                <p>Chúng tôi đã gửi mã xác minh tới <strong>{formData.email}</strong></p>
                <p className="mt-1">Vui lòng kiểm tra email và nhập mã bên dưới.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Mã OTP *</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Nhập mã 6 chữ số"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("form")}
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleResendOTP}
                  disabled={sendingOTP}
                >
                  {sendingOTP ? "Đang gửi..." : "Gửi lại mã"}
                </Button>
              </div>
              <Button type="submit" variant="buyer" className="w-full" size="lg" disabled={loading}>
                {loading ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
