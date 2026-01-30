"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, RefreshCcw, Search, ShoppingBag } from "lucide-react"
import { api } from "@/lib/api"
import type { Category } from "@/lib/types"

type FilterMode = "all" | "top" | "sub"
type SortMode = "name-asc" | "name-desc" | "newest"

const getCategoryImage = (category: Category) => category.logo || category.image || ""

const normalizeText = (value?: string) => (value || "").toLowerCase().trim()

const parseDate = (value?: string) => {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [sortMode, setSortMode] = useState<SortMode>("name-asc")

  const loadCategories = async () => {
    setLoading(true)
    setError(null)
    const response = await api.category.list()
    if (response.error) {
      const message = typeof response.error === "string" ? response.error : String(response.error)
      if (message.includes("CategoryNotFound") || message.includes("404")) {
        setCategories([])
        setLoading(false)
        return
      }
      setError(message)
      setLoading(false)
      return
    }
    const list = Array.isArray(response.data) ? response.data : []
    setCategories(list)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const topLevelCount = categories.filter((category) => !category.parentId).length

  const filteredCategories = useMemo(() => {
    const keyword = normalizeText(search)
    let list = categories
    if (filterMode === "top") {
      list = list.filter((category) => !category.parentId)
    } else if (filterMode === "sub") {
      list = list.filter((category) => !!category.parentId)
    }
    if (keyword) {
      list = list.filter((category) => {
        const name = normalizeText(category.name)
        const description = normalizeText(category.description)
        return name.includes(keyword) || description.includes(keyword)
      })
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sortMode === "name-asc") {
        return normalizeText(a.name).localeCompare(normalizeText(b.name))
      }
      if (sortMode === "name-desc") {
        return normalizeText(b.name).localeCompare(normalizeText(a.name))
      }
      return parseDate(b.createdAt) - parseDate(a.createdAt)
    })
    return sorted
  }, [categories, search, filterMode, sortMode])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Danh mục</h1>
          <p className="text-gray-600 mt-1">
            Duyệt theo danh mục để tìm sản phẩm nhanh hơn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{categories.length} tổng</Badge>
          <Badge variant="secondary">{topLevelCount} cấp 1</Badge>
          <Button
            type="button"
            variant="buyerOutline"
            size="sm"
            onClick={loadCategories}
            disabled={loading}
          >
            <RefreshCcw className="mr-2" size={16} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Tìm danh mục..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={filterMode === "all" ? "buyer" : "outline"}
              onClick={() => setFilterMode("all")}
            >
              Tất cả
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === "top" ? "buyer" : "outline"}
              onClick={() => setFilterMode("top")}
            >
              Cấp 1
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterMode === "sub" ? "buyer" : "outline"}
              onClick={() => setFilterMode("sub")}
            >
              Danh mục con
            </Button>
          </div>
        </div>
        <select
          className="h-10 rounded-md border px-3 text-sm"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="name-asc">Sắp xếp: Tên A-Z</option>
          <option value="name-desc">Sắp xếp: Tên Z-A</option>
          <option value="newest">Sắp xếp: Mới nhất</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải danh mục...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Không tìm thấy danh mục</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category, index) => {
            const id = String(category.id ?? "")
            const image = getCategoryImage(category)
            const isTopLevel = !category.parentId
            const link = id ? `/buyer/products?categoryId=${encodeURIComponent(id)}` : "/buyer/products"
            const key = id || category.slug || category.name || `category-${index}`
            return (
              <Link key={key} href={link} className="block h-full">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-buyer-primary/10 flex items-center justify-center overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={category.name || "Danh mục"}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <ShoppingBag className="text-buyer-primary" size={28} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {category.name || "Danh mục"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {category.description || "Xem sản phẩm trong danh mục này."}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant={isTopLevel ? "info" : "secondary"}>
                            {isTopLevel ? "Cấp 1" : "Danh mục con"}
                          </Badge>
                          {category.slug ? (
                            <span className="text-xs text-gray-500">/{category.slug}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-buyer-primary">
                      <span className="font-medium">Xem sản phẩm</span>
                      <ArrowRight size={16} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
