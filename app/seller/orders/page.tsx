import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Package, CheckCircle2, X } from "lucide-react"
import Link from "next/link"

export default function SellerOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-600 mt-1">Manage and track your orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
            <Button
              key={status}
              variant={status === "All" ? "seller" : "outline"}
              size="sm"
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input placeholder="Search orders..." className="pl-10" />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-gray-900">Order #ORD-{String(i).padStart(6, '0')}</h3>
                    <Badge variant={i === 1 ? "warning" : i === 2 ? "info" : "success"}>
                      {i === 1 ? "Pending" : i === 2 ? "Processing" : "Shipped"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Customer: John Doe • Jan 15, 2024</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">3 items</Badge>
                    <Badge variant="outline">Total: $239.97</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {i === 1 && (
                    <>
                      <Button variant="seller" size="sm">
                        <CheckCircle2 className="mr-2" size={16} />
                        Accept
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <X className="mr-2" size={16} />
                        Reject
                      </Button>
                    </>
                  )}
                  {i === 2 && (
                    <Button variant="seller" size="sm">
                      Mark Shipped
                    </Button>
                  )}
                  <Link href={`/seller/orders/${i}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
