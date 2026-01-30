import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, CheckCircle2, Circle } from "lucide-react"

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const steps = [
    { label: "Đã xác nhận", completed: true },
    { label: "Đang xử lý", completed: true },
    { label: "Đã giao cho vận chuyển", completed: true },
    { label: "Đang vận chuyển", completed: true, active: true },
    { label: "Đã giao", completed: false },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Chi tiết đơn hàng</h1>
        <Button variant="outline">In hóa đơn</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-6">Trạng thái đơn hàng</h2>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {step.completed ? (
                        <div className="w-10 h-10 rounded-full bg-buyer-primary flex items-center justify-center">
                          <CheckCircle2 className="text-white" size={20} />
                        </div>
                      ) : step.active ? (
                        <div className="w-10 h-10 rounded-full border-2 border-buyer-primary flex items-center justify-center">
                          <Truck className="text-buyer-primary" size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <Circle className="text-gray-300" size={20} />
                        </div>
                      )}
                      {index < steps.length - 1 && (
                        <div className={`w-0.5 h-12 ${step.completed ? 'bg-buyer-primary' : 'bg-gray-300'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h3 className={`font-semibold ${step.active ? 'text-buyer-primary' : step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </h3>
                      {step.active && (
                        <p className="text-sm text-gray-600 mt-1">
                          Mã vận đơn: TRACK123456789
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sản phẩm trong đơn</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Tên sản phẩm {i}</h3>
                      <p className="text-sm text-gray-600">Số lượng: 1</p>
                      <p className="text-buyer-primary font-semibold mt-1">$79.99</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Địa chỉ giao hàng</h2>
              <p className="text-gray-600">
                123 Main Street<br />
                Thành phố, Bang 12345<br />
                Hoa Kỳ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin thanh toán</h2>
              <p className="text-gray-600">
                Thẻ kết thúc bằng 3456<br />
                Tổng: $269.97
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="buyer" className="flex-1">Theo dõi đơn hàng</Button>
            <Button variant="outline" className="flex-1">Liên hệ người bán</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
