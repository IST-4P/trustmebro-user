import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Package, Truck, CheckCircle2, Printer } from "lucide-react"

export default function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600 mt-1">Order #ORD-{params.id.padStart(6, '0')}</p>
        </div>
        <Button variant="outline">
          <Printer className="mr-2" size={20} />
          Print Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Order Placed", completed: true },
                  { label: "Awaiting Confirmation", completed: true },
                  { label: "Processing", completed: true },
                  { label: "Shipped", completed: false, active: true },
                  { label: "Delivered", completed: false },
                ].map((step, index, array) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {step.completed ? (
                        <div className="w-10 h-10 rounded-full bg-seller-accent-green flex items-center justify-center">
                          <CheckCircle2 className="text-white" size={20} />
                        </div>
                      ) : step.active ? (
                        <div className="w-10 h-10 rounded-full border-2 border-seller-accent-blue flex items-center justify-center">
                          <Truck className="text-seller-accent-blue" size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <Package className="text-gray-300" size={20} />
                        </div>
                      )}
                      {index < array.length - 1 && (
                        <div className={`w-0.5 h-12 ${step.completed ? 'bg-seller-accent-green' : 'bg-gray-300'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <h3 className={`font-semibold ${step.active ? 'text-seller-accent-blue' : step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                        {step.label}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle>Update Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <select id="status" className="w-full px-4 py-2 border rounded-md">
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div>
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input id="tracking" placeholder="Enter tracking number" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Add any notes..." rows={3} />
              </div>
              <Button variant="seller">Update Status</Button>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Product Name {i}</h3>
                      <p className="text-sm text-gray-600">Quantity: 1</p>
                      <p className="text-seller-accent-blue font-semibold mt-1">$79.99</p>
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
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">John Doe</p>
                <p className="text-sm text-gray-600">john@example.com</p>
                <p className="text-sm text-gray-600">+1 234 567 8900</p>
              </div>
              <Button variant="outline" className="w-full mt-4">Contact Customer</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                123 Main Street<br />
                City, State 12345<br />
                United States
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>$239.97</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>$10.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>$20.00</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>$269.97</span>
                </div>
              </div>
              <Badge variant="success" className="mt-4">Paid</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
