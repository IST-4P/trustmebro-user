"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Star, Filter, Grid, List } from "lucide-react"
import { api } from "@/lib/api"
import type { Product, Category } from "@/lib/types"

function ProductsContent() {
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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 12
  const [priceRange, setPriceRange] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("")

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
        page: currentPage,
        limit: itemsPerPage,
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
        setTotalPages(1)
        setTotalItems(0)
      } else if (productsRes.data) {
        let items = productsRes.data.items || []
        
        // Client-side filtering by price range
        if (priceRange) {
          items = items.filter((product) => {
            const price = product.basePrice ?? product.price ?? 0
            if (priceRange === "under1m") return price < 1000000
            if (priceRange === "1m-5m") return price >= 1000000 && price <= 5000000
            if (priceRange === "5m-10m") return price >= 5000000 && price <= 10000000
            if (priceRange === "over10m") return price > 10000000
            return true
          })
        }
        
        // Client-side sorting
        if (sortBy === "price-asc") {
          items.sort((a, b) => (a.basePrice ?? a.price ?? 0) - (b.basePrice ?? b.price ?? 0))
        } else if (sortBy === "price-desc") {
          items.sort((a, b) => (b.basePrice ?? b.price ?? 0) - (a.basePrice ?? a.price ?? 0))
        }
        
        setProducts(items)
        setTotalItems(productsRes.data.total || 0)
        setTotalPages(Math.ceil((productsRes.data.total || 0) / itemsPerPage))
      }

      setLoading(false)
    }, 300)

    return () => {
      isActive = false
      clearTimeout(handler)
    }
  }, [search, selectedCategory, emptySearchMessage, currentPage, itemsPerPage, priceRange, sortBy])

  // Không cần filter ở client vì API đã filter theo categoryId rồi

  // Reset về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, priceRange, sortBy])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const generatePageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

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
                        <input 
                          type="radio" 
                          name="price" 
                          id="price-all"
                          checked={priceRange === ""}
                          onChange={() => setPriceRange("")} 
                        />
                        <label htmlFor="price-all" className="text-sm cursor-pointer">Tất cả</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="price" 
                          id="price1"
                          checked={priceRange === "under1m"}
                          onChange={() => setPriceRange("under1m")} 
                        />
                        <label htmlFor="price1" className="text-sm cursor-pointer">Dưới 1.000.000 VND</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="price" 
                          id="price2"
                          checked={priceRange === "1m-5m"}
                          onChange={() => setPriceRange("1m-5m")} 
                        />
                        <label htmlFor="price2" className="text-sm cursor-pointer">1.000.000 - 5.000.000 VND</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="price" 
                          id="price3"
                          checked={priceRange === "5m-10m"}
                          onChange={() => setPriceRange("5m-10m")} 
                        />
                        <label htmlFor="price3" className="text-sm cursor-pointer">5.000.000 - 10.000.000 VND</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="radio" 
                          name="price" 
                          id="price4"
                          checked={priceRange === "over10m"}
                          onChange={() => setPriceRange("over10m")} 
                        />
                        <label htmlFor="price4" className="text-sm cursor-pointer">Trên 10.000.000 VND</label>
                      </div>
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
              <select 
                className="px-4 py-2 border rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">Sắp xếp mặc định</option>
                <option value="price-asc">Giá: thấp đến cao</option>
                <option value="price-desc">Giá: cao đến thấp</option>
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
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{emptySearchMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/buyer/products/${product.id}`}>
                    <div className="relative h-32 sm:h-48 bg-gray-200">
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
                            <Badge variant="success" className="absolute top-1 right-1 text-xs px-1.5 py-0.5">
                              Giảm giá
                            </Badge>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </Link>
                  <CardContent className="p-2 sm:p-4">
                    <Link href={`/buyer/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-800 mb-1 text-xs sm:text-base line-clamp-2">{product.name}</h3>
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2 text-xs text-gray-500 gap-1">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                size={12}
                                className={
                                  j < Math.floor(ratingValue)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                            <span className="ml-1 text-[10px] sm:text-xs">{ratingLabel}</span>
                            <span className="ml-1 hidden sm:inline">({ratingCount})</span>
                          </div>
                          <span className="text-[10px] sm:text-xs">Đã bán {soldCount}</span>
                        </div>
                      )
                    })()}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm sm:text-xl font-bold text-buyer-primary">
                          {(product.basePrice ?? product.price ?? 0).toLocaleString("vi-VN")} VND
                        </span>
                        {(() => {
                          const displayPrice = product.basePrice ?? product.price ?? 0
                          const strikePrice = product.virtualPrice ?? product.salePrice
                          if (strikePrice && strikePrice !== displayPrice) {
                            return (
                              <span className="text-[10px] sm:text-sm text-gray-500 line-through">
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
          {!loading && !error && products.length > 0 && totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="text-sm text-gray-600">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} sản phẩm
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                {generatePageNumbers().map((page, index) => (
                  typeof page === 'number' ? (
                    <Button
                      key={index}
                      variant={currentPage === page ? "buyer" : "outline"}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={index} className="px-3 py-2 text-gray-400">
                      {page}
                    </span>
                  )
                ))}
                <Button 
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  )
}
