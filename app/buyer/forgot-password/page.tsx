import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email để nhận liên kết đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-800">
                Chúng tôi sẽ gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Nhập email" />
            </div>
            <Button type="submit" variant="buyer" className="w-full" size="lg">
              Gửi liên kết đặt lại
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
