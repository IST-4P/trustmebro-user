"use client"

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import type { Shop } from "@/lib/types"
import { Upload, Save } from "lucide-react"

type ShopFormState = {
  name: string
  description: string
  logo: string
  address: string
  phone: string
  isOpen: boolean
}

const emptyForm: ShopFormState = {
  name: "",
  description: "",
  logo: "",
  address: "",
  phone: "",
  isOpen: true,
}

function mapShopToForm(shop: Shop | null): ShopFormState {
  if (!shop) return { ...emptyForm }
  return {
    name: shop.name || "",
    description: shop.description || "",
    logo: shop.logo || "",
    address: shop.address || "",
    phone: shop.phone || "",
    isOpen: shop.isOpen ?? true,
  }
}

export default function ShopProfilePage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [formData, setFormData] = useState<ShopFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadShop = async () => {
      setLoading(true)
      setError(null)
      const response = await api.shop.getMine()
      if (response.error) {
        const errorMessage = typeof response.error === "string" ? response.error : String(response.error)
        const isNotFound = errorMessage.includes("404") || errorMessage.toLowerCase().includes("shopnotfound")
        if (!isNotFound) {
          setError(errorMessage)
        }
        setShop(null)
        setFormData(mapShopToForm(null))
      } else if (response.data) {
        setShop(response.data)
        setFormData(mapShopToForm(response.data))
      }
      setLoading(false)
    }

    loadShop()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const name = formData.name.trim()
    if (!name) {
      setError("Shop name is required.")
      setSaving(false)
      return
    }

    const payload = {
      name,
      description: formData.description.trim() || undefined,
      logo: formData.logo.trim() || undefined,
      address: formData.address.trim() || undefined,
      phone: formData.phone.trim() || undefined,
    }

    const response = shop?.id
      ? await api.shop.update({ id: shop.id, isOpen: formData.isOpen, ...payload })
      : await api.shop.create(payload)

    if (response.error) {
      setError(typeof response.error === "string" ? response.error : String(response.error))
    } else if (response.data) {
      setShop(response.data)
      setFormData(mapShopToForm(response.data))
      setToast({
        message: shop?.id ? "Shop updated successfully!" : "Shop created successfully!",
        variant: "success",
      })
      window.setTimeout(() => setToast(null), 2500)
    }
    setSaving(false)
  }

  const handleReset = () => {
    setFormData(mapShopToForm(shop))
    setError(null)
  }

  const handleLogoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const presigned = await api.media.imagePresigned({ filename: file.name })
    if (presigned.error || !presigned.data?.presignedUrl || !presigned.data?.url) {
      setError(presigned.error || "Failed to create upload URL. Please try again.")
      setUploading(false)
      event.target.value = ""
      return
    }

    const upload = await api.media.uploadToPresignedUrl(presigned.data.presignedUrl, file)
    if (upload.error) {
      setError(upload.error)
    } else {
      setFormData((prev) => ({ ...prev, logo: presigned.data.url }))
    }
    setUploading(false)
    event.target.value = ""
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Profile</h1>
          <p className="text-gray-600 mt-1">Manage your shop information and branding</p>
        </div>
        <div className="text-center py-12 text-gray-600">Loading shop...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shop Profile</h1>
        <p className="text-gray-600 mt-1">Manage your shop information and branding</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}

      {!shop ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
          You do not have a shop yet. Fill in the details below to create one.
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Shop Logo</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mt-2">
                {formData.logo ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={formData.logo}
                      alt={formData.name || "Shop logo"}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                    <span className="text-xs text-gray-500">Logo preview</span>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-sm text-gray-600 mb-1">Upload your shop logo</p>
                    <p className="text-xs text-gray-500">Recommended: 200x200px</p>
                  </>
                )}
                <div className="mt-4 flex flex-col items-center gap-3">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Choose Logo"}
                  </Button>
                  <span className="text-xs text-gray-500">
                    {formData.logo ? "Logo selected" : "No file chosen"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shopName">Shop Name *</Label>
              <Input
                id="shopName"
                placeholder="Enter shop name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Enter shop address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell customers about your shop..."
                rows={4}
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isOpen"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-seller-accent-blue"
                checked={formData.isOpen}
                onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
              />
              <Label htmlFor="isOpen">Shop is open for orders</Label>
            </div>
          </CardContent>
        </Card>

        {/* Shop Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Shop Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Rating</span>
              <span className="font-medium">
                {typeof shop?.rating === "number" ? shop.rating.toFixed(1) : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={formData.isOpen ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                {formData.isOpen ? "Open" : "Closed"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4">
          <Button variant="seller" size="lg" type="submit" disabled={saving}>
            <Save className="mr-2" size={20} />
            {saving ? "Saving..." : shop?.id ? "Save Changes" : "Create Shop"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            type="button"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}
