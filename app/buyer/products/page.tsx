"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Star, Filter, Grid, List } from "lucide-react"
import { api } from "@/lib/api"
import type { Product, Category } from "@/lib/types"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const categoryFromUrl = searchParams.get("categoryId") || ""
  const nameFromUrl = searchParams.get("name") || ""
  const [search, setSearch] = useState(nameFromUrl)
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFromUrl)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      const categoriesRes = await api.category.list()

      if (categoriesRes.error) {
        console.error("Failed to load categories:", categoriesRes.error)
        setCategories([])
      } else if (categoriesRes.data) {
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
      } else {
        setCategories([])
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    setSelectedCategory(categoryFromUrl)
  }, [categoryFromUrl])

  useEffect(() => {
    setSearch(nameFromUrl)
  }, [nameFromUrl])

  const emptySearchMessage = search.trim()
    ? "Sản phẩm tìm kiếm hiện không có"
    : "Không tìm thấy sản phẩm"

  useEffect(() => {
    let isActive = true
    const handler = setTimeout(async () => {
      setLoading(true)
      setError(null)

      const productsRes = await api.product.list({
        name: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
      })

      if (!isActive) return

      if (productsRes.error) {
        const rawError = typeof productsRes.error === "string" ? productsRes.error : String(productsRes.error)
        if (rawError.includes("ProductNotFound")) {
          setError(emptySearchMessage)
        } else {
          setError(rawError)
        }
        setProducts([])
      } else if (productsRes.data) {
        setProducts(productsRes.data.items || [])
      }

      setLoading(false)
    }, 300)

    return () => {
      isActive = false
      clearTimeout(handler)
    }
  }, [search, selectedCategory, emptySearchMessage])

  const getProductCategoryIds = (product: Product) => {
    const ids = new Set<string>()
    if (product.categoryId) ids.add(String(product.categoryId))
    if (Array.isArray(product.categoryIds)) {
      product.categoryIds.forEach((id) => {
        if (id) ids.add(String(id))
      })
    }
    if (product.category) {
      const categoryId = typeof product.category === "string"
        ? product.category
        : product.category.id
      if (categoryId) ids.add(String(categoryId))
    }
    if (Array.isArray(product.categories)) {
      product.categories.forEach((category) => {
        const categoryId = typeof category === "string" ? category : category.id
        if (categoryId) ids.add(String(categoryId))
      })
    }
    return Array.from(ids)
  }

  const filteredProducts = selectedCategory
    ? products.filter((product) => {
        const productCategoryIds = getProductCategoryIds(product)
        return productCategoryIds.includes(selectedCategory)
      })
    : products
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full md:hidden"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
            aria-controls="mobile-filters"
          >
            <Filter className="mr-2" size={18} />
            {showFilters ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}
          </Button>
          <div id="mobile-filters" className={showFilters ? "block md:block" : "hidden md:block"}>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <Filter className="mr-2" size={20} />
                  Bộ lọc
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Danh mục</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="category"
                          id="all"
                          checked={selectedCategory === ""}
                          onChange={() => setSelectedCategory("")}
                        />
                        <label htmlFor="all" className="text-sm">Tất cả</label>
                      </div>
                      {Array.isArray(categories) && categories.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="category"
                            id={cat.id}
                            checked={selectedCategory === cat.id}
                            onChange={() => setSelectedCategory(cat.id)}
                          />
                          <label htmlFor={cat.id} className="text-sm">{cat.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Khoảng giá</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price1" />
                        <label htmlFor="price1" className="text-sm">Dưới 1.000.000 VND</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price2" />
                        <label htmlFor="price2" className="text-sm">1.000.000 - 5.000.000 VND</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price3" />
                        <label htmlFor="price3" className="text-sm">5.000.000 - 10.000.000 VND</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Đánh giá</label>
                    <div className="space-y-2">
                      {[4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="flex items-center space-x-2">
                          <input type="checkbox" id={`rating-${rating}`} />
                          <label htmlFor={`rating-${rating}`} className="text-sm flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                              />
                            ))}
                            <span className="ml-1">trở lên</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              className="flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Grid size={20} />
              </Button>
              <Button variant="outline" size="icon">
                <List size={20} />
              </Button>
              <select className="px-4 py-2 border rounded-md">
                <option>Sắp xếp: Nổi bật</option>
                <option>Giá: thấp đến cao</option>
                <option>Giá: cao đến thấp</option>
                <option>Đánh giá</option>
              </select>
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Đang tải sản phẩm...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{emptySearchMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/buyer/products/${product.id}`}>
                    <div className="relative h-48 bg-gray-200">
                      {product.images && product.images[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {(() => {
                        const displayPrice = product.basePrice ?? product.price ?? 0
                        const strikePrice = product.virtualPrice ?? product.salePrice
                        if (strikePrice && strikePrice > displayPrice) {
                          return (
                            <Badge variant="success" className="absolute top-2 right-2">
                              Giảm giá
                            </Badge>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link href={`/buyer/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                    </Link>
                    {(() => {
                      const ratingValue = typeof product.rating === "number"
                        ? product.rating
                        : typeof product.averageRate === "number"
                          ? product.averageRate
                          : 0
                      const ratingCount = product.reviewCount ?? product.ratingCount ?? 0
                      const soldCount = product.soldCount ?? 0
                      const ratingLabel = Number.isFinite(ratingValue)
                        ? ratingValue % 1 === 0
                          ? String(ratingValue)
                          : ratingValue.toFixed(1)
                        : "0"
                      return (
                        <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                size={14}
                                className={
                                  j < Math.floor(ratingValue)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                            <span className="ml-2">{ratingLabel}</span>
                            <span className="ml-1">({ratingCount} đánh giá)</span>
                          </div>
                          <span>Đã bán {soldCount}</span>
                        </div>
                      )
                    })()}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-buyer-primary">
                          {(product.basePrice ?? product.price ?? 0).toLocaleString("vi-VN")} VND
                        </span>
                        {(() => {
                          const displayPrice = product.basePrice ?? product.price ?? 0
                          const strikePrice = product.virtualPrice ?? product.salePrice
                          if (strikePrice && strikePrice !== displayPrice) {
                            return (
                              <span className="text-sm text-gray-500 line-through ml-2">
                                {strikePrice.toLocaleString("vi-VN")} VND
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-8">
            <Button variant="outline" disabled>Trước</Button>
            <Button variant="buyer">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
            <Button variant="outline">Sau</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
