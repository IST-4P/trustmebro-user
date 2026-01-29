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
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const searchParams = useSearchParams()
  const categoryFromUrl = searchParams.get("categoryId") || ""

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setSelectedCategory(categoryFromUrl)
  }, [categoryFromUrl])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const [productsRes, categoriesRes] = await Promise.all([
      api.product.list(),
      api.category.list(),
    ])

    if (productsRes.error) {
      setError(typeof productsRes.error === "string" ? productsRes.error : String(productsRes.error))
    } else if (productsRes.data) {
      setProducts(productsRes.data.items || [])
    }

    if (categoriesRes.error) {
      console.error("Failed to load categories:", categoriesRes.error)
      setCategories([])
    } else if (categoriesRes.data) {
      // Ensure categories is always an array
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : [])
    } else {
      setCategories([])
    }

    setLoading(false)
  }

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

  const filteredProducts = products.filter((product) => {
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (selectedCategory) {
      const productCategoryIds = getProductCategoryIds(product)
      if (!productCategoryIds.includes(selectedCategory)) {
        return false
      }
    }
    return true
  })
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
                  Filters
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="category"
                          id="all"
                          checked={selectedCategory === ""}
                          onChange={() => setSelectedCategory("")}
                        />
                        <label htmlFor="all" className="text-sm">All</label>
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
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price1" />
                        <label htmlFor="price1" className="text-sm">Under $50</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price2" />
                        <label htmlFor="price2" className="text-sm">$50 - $100</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" name="price" id="price3" />
                        <label htmlFor="price3" className="text-sm">$100 - $200</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rating</label>
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
                            <span className="ml-1">& Up</span>
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
              placeholder="Search products..."
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
                <option>Sort by: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
              </select>
            </div>
          </div>

          {/* Products */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No products found</p>
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
                              Sale
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
                          ${product.basePrice ?? product.price ?? 0}
                        </span>
                        {(() => {
                          const displayPrice = product.basePrice ?? product.price ?? 0
                          const strikePrice = product.virtualPrice ?? product.salePrice
                          if (strikePrice && strikePrice !== displayPrice) {
                            return (
                              <span className="text-sm text-gray-500 line-through ml-2">
                                ${strikePrice}
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
            <Button variant="outline" disabled>Previous</Button>
            <Button variant="buyer">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
            <Button variant="outline">Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
