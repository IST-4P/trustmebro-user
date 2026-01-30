"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function OTPVerificationPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Xác minh OTP</CardTitle>
          <CardDescription>
            Nhập mã 6 chữ số gửi đến điện thoại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-semibold"
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Chưa nhận được mã?{" "}
                <button type="button" className="text-buyer-primary hover:underline font-medium">
                  Gửi lại
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Thời gian còn lại: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
            <Button type="submit" variant="buyer" className="w-full" size="lg">
              Xác minh
            </Button>
            <Link href="/buyer/login" className="block text-center text-sm text-gray-600 hover:text-buyer-primary">
              Quay lại đăng nhập
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
