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
      setError("Email is required")
      setSendingOTP(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setSendingOTP(false)
      return
    }

    if (!formData.username || !formData.firstName || !formData.lastName) {
      setError("Please fill in all required fields")
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
      setError("Failed to send OTP. Please try again.")
    }
    setSendingOTP(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.code) {
      setError("Please enter the OTP code")
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
          <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
          <CardDescription>
            {step === "form" ? "Sign up to get started" : "Enter OTP code sent to your email"}
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
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <select
                  id="gender"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as "MALE" | "FEMALE" | "OTHER" })
                  }
                  required
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="terms" className="rounded" required />
                <Label htmlFor="terms" className="text-sm font-normal">
                  I agree to the{" "}
                  <Link href="/terms" className="text-buyer-primary hover:underline">
                    Terms & Conditions
                  </Link>
                </Label>
              </div>
              <Button type="submit" variant="buyer" className="w-full" size="lg" disabled={sendingOTP}>
                {sendingOTP ? "Sending OTP..." : "Send OTP Code"}
              </Button>
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/buyer/login" className="text-buyer-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 mb-4">
                <p>We've sent a verification code to <strong>{formData.email}</strong></p>
                <p className="mt-1">Please check your email and enter the code below.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">OTP Code *</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
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
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleResendOTP}
                  disabled={sendingOTP}
                >
                  {sendingOTP ? "Sending..." : "Resend Code"}
                </Button>
              </div>
              <Button type="submit" variant="buyer" className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating account..." : "Complete Registration"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
