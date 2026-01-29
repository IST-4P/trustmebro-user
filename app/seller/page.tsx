import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Package, ShoppingCart, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react"

export default function SellerDashboard() {
  const stats = [
    { label: "Total Revenue", value: "$12,450", change: "+12.5%", trend: "up", icon: TrendingUp },
    { label: "Total Orders", value: "342", change: "+8.2%", trend: "up", icon: ShoppingCart },
    { label: "Products", value: "128", change: "+5", trend: "up", icon: Package },
    { label: "Pending Orders", value: "12", change: "-3", trend: "down", icon: AlertCircle },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your shop.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-seller-accent-blue/10 rounded-lg">
                    <Icon className="text-seller-accent-blue" size={24} />
                  </div>
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="text-seller-accent-green" size={20} />
                  ) : (
                    <ArrowDownRight className="text-seller-accent-red" size={20} />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <div className="flex items-center text-sm">
                  <span className={stat.trend === "up" ? "text-seller-accent-green" : "text-seller-accent-red"}>
                    {stat.change}
                  </span>
                  <span className="text-gray-500 ml-2">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {[65, 80, 45, 90, 70, 85, 95].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-seller-accent-blue rounded-t"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Order #ORD-{String(i).padStart(6, '0')}</p>
                    <p className="text-sm text-gray-600">Customer Name • $129.99</p>
                  </div>
                  <Badge variant={i === 1 ? "warning" : "success"}>
                    {i === 1 ? "Pending" : "Completed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Stock</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <span className="text-sm text-gray-900">Product Name {i}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{20 + i * 5}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">${(20 + i * 5) * 29.99}</td>
                    <td className="px-6 py-4">
                      <Badge variant={i === 1 ? "error" : "success"}>
                        {i === 1 ? "Low Stock" : "In Stock"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
