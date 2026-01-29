"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SellerOTPLoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">OTP Login</CardTitle>
          <CardDescription>
            {step === "phone" ? "Enter your phone number" : "Enter the 6-digit code"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 234 567 8900" />
              </div>
              <Button
                type="button"
                variant="seller"
                className="w-full"
                size="lg"
                onClick={() => setStep("otp")}
              >
                Send OTP
              </Button>
              <div className="text-center">
                <Link href="/seller/auth/login" className="text-sm text-seller-accent-blue hover:underline">
                  Use password instead
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6">
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otp]
                      newOtp[index] = e.target.value
                      setOtp(newOtp)
                      if (e.target.value && index < 5) {
                        const nextInput = document.getElementById(`otp-${index + 1}`)
                        nextInput?.focus()
                      }
                    }}
                    id={`otp-${index}`}
                    className="w-12 h-12 text-center text-xl font-semibold"
                  />
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive code?{" "}
                  <button type="button" className="text-seller-accent-blue hover:underline font-medium">
                    Resend
                  </button>
                </p>
              </div>
              <Button type="submit" variant="seller" className="w-full" size="lg">
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("phone")}
              >
                Change Number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
