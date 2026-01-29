import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingBag, Star, TrendingUp } from "lucide-react"

const API_BASE_URL = "https://trustmebro-web.hacmieu.xyz"

type Category = {
  id: string
  name: string
  logo?: string
}

type Product = {
  id: string
  name: string
  images?: string[]
  image?: string
  thumbnail?: string
  basePrice?: number
  price?: number
  minPrice?: number
  maxPrice?: number
  salePrice?: number
  virtualPrice?: number
  rating?: number
  averageRate?: number
}

const formatVnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`

const shuffleArray = <T,>(items: T[]) => {
  const array = [...items]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

const getProductImage = (product: Product) => {
  if (Array.isArray(product.images) && product.images[0]) return product.images[0]
  if (typeof product.image === "string") return product.image
  if (typeof product.thumbnail === "string") return product.thumbnail
  return ""
}

const getProductPrice = (product: Product) =>
  product.basePrice ?? product.price ?? product.minPrice ?? 0

const getProductOriginalPrice = (product: Product) =>
  product.virtualPrice ?? product.salePrice ?? product.maxPrice

const getProductRating = (product: Product) =>
  product.rating ?? product.averageRate ?? 0

export const dynamic = "force-dynamic"

export default async function BuyerHome() {
  let categories: Category[] = []
  let featuredProducts: Product[] = []

  try {
    const categoryResponse = await fetch(`${API_BASE_URL}/api/v1/category`, { cache: "no-store" })
    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json()
      const rawCategories = categoryData?.data?.categories ?? categoryData?.data ?? []
      categories = Array.isArray(rawCategories) ? rawCategories : []
    }
  } catch {
    categories = []
  }

  try {
    const productResponse = await fetch(
      `${API_BASE_URL}/api/v1/product?page=1&limit=10&orderBy=desc&sortBy=createdAt`,
      { cache: "no-store" }
    )
    if (productResponse.ok) {
      const productData = await productResponse.json()
      const rawProducts = productData?.data?.products ?? productData?.data?.items ?? productData?.data ?? []
      const items = Array.isArray(rawProducts) ? rawProducts : []
      featuredProducts = items.slice(0, 4)
    }
  } catch {
    featuredProducts = []
  }

  const displayCategories = shuffleArray(categories).slice(0, 6)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-buyer-primary to-buyer-secondary rounded-2xl p-8 md:p-12 text-white mb-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to TrustMeBro
          </h1>
          <p className="text-lg md:text-xl mb-6 opacity-90">
            Your trusted marketplace for quality products at great prices
          </p>
          <Link href="/buyer/products">
            <Button size="lg" variant="buyer" className="bg-white text-buyer-primary hover:bg-gray-100">
              Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {displayCategories.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-gray-600">
                No categories found.
              </CardContent>
            </Card>
          ) : (
            displayCategories.map((category) => (
              <Link
                key={category.id}
                href={`/buyer/products?categoryId=${category.id}`}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-buyer-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 overflow-hidden">
                      {category.logo ? (
                        <img
                          src={category.logo}
                          alt={category.name}
                          className="w-full h-full object-contain p-3"
                        />
                      ) : (
                        <ShoppingBag className="text-buyer-primary" size={32} />
                      )}
                    </div>
                    <p className="font-semibold text-gray-800">{category.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Featured Products</h2>
          <Link href="/buyer/products">
            <Button variant="ghost" className="text-buyer-primary">
              View All
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-6 text-center text-gray-600">
                No featured products found.
              </CardContent>
            </Card>
          ) : (
            featuredProducts.map((product) => {
              const price = getProductPrice(product)
              const originalPrice = getProductOriginalPrice(product)
              const ratingValue = getProductRating(product)
              const image = getProductImage(product)
              return (
                <Link
                  key={product.id}
                  href={`/buyer/products/${product.id}`}
                  className="block"
                  aria-label={`View ${product.name}`}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-48 bg-gray-200">
                      {image ? (
                        <img src={image} alt={product.name} className="w-full h-full object-cover" />
                      ) : null}
                      <div className="absolute top-2 right-2 bg-buyer-accent text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                        HOT
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                      <div className="flex items-center mb-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={index < Math.round(ratingValue)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xl font-bold text-buyer-primary">
                          {formatVnd(price)}
                        </span>
                        {originalPrice && originalPrice > price ? (
                          <span className="text-sm text-gray-500 line-through">
                            {formatVnd(originalPrice)}
                          </span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white rounded-xl p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <TrendingUp className="text-buyer-primary mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-800 mb-1">Best Prices</h3>
            <p className="text-sm text-gray-600">Competitive pricing guaranteed</p>
          </div>
          <div>
            <Star className="text-buyer-primary mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-800 mb-1">Quality Assured</h3>
            <p className="text-sm text-gray-600">Verified sellers only</p>
          </div>
          <div>
            <ShoppingBag className="text-buyer-primary mx-auto mb-3" size={32} />
            <h3 className="font-semibold text-gray-800 mb-1">Fast Delivery</h3>
            <p className="text-sm text-gray-600">Quick and reliable shipping</p>
          </div>
        </div>
      </section>
    </div>
  )
}
