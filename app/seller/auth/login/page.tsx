import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SellerLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-seller-primary to-seller-primary-800 text-white p-12 rounded-lg">
          <h1 className="text-4xl font-bold mb-4">TrustMeBro Seller Portal</h1>
          <p className="text-lg opacity-90">
            Manage your shop, products, and orders all in one place. Grow your business with powerful tools and insights.
          </p>
        </div>

        {/* Right Side - Login Form */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to your seller account</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Phone</Label>
                <Input id="email" type="text" placeholder="Enter your email or phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="remember" className="rounded" />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                <Link href="/seller/auth/forgot-password" className="text-sm text-seller-accent-blue hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Button type="submit" variant="seller" className="w-full" size="lg">
                Sign In
              </Button>
              <div className="text-center">
                <Link href="/seller/auth/otp-login" className="text-sm text-seller-accent-blue hover:underline">
                  Sign in with OTP instead
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/seller/auth/register" className="text-seller-accent-blue hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
