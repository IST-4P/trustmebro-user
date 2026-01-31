"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import Cookies from "js-cookie"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import type { Address, District, Province, User, Ward } from "@/lib/types"

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: "success" | "error" } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    avatar: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    birthday: "",
  })
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [existingAddress, setExistingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    provinceId: "",
    districtId: "",
    wardId: "",
    address: "",
  })
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [districtsLoading, setDistrictsLoading] = useState(false)
  const [wardsLoading, setWardsLoading] = useState(false)
  const [showShopModal, setShowShopModal] = useState(false)
  const [shopFormData, setShopFormData] = useState({
    name: "",
    description: "",
    logo: "",
    address: "",
    phone: "",
  })
  const [shopLoading, setShopLoading] = useState(false)
  const [shopError, setShopError] = useState<string | null>(null)
  const [hasShop, setHasShop] = useState(false)
  const [existingShop, setExistingShop] = useState<any | null>(null)
  const shopLogoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // Check authentication before loading user data
    // Since backend uses HttpOnly cookies, we check via API call
    const checkAndLoad = async () => {
      if (typeof window !== "undefined") {
        // First check client-side cookie (if exists)
        const clientToken = Cookies.get("accessToken")
        if (clientToken) {
          loadUser()
          return
        }
        
        // If no client-side cookie, check via API (works with HttpOnly cookies)
        // The loadUser() function will handle 401 and redirect if needed
        loadUser()
      }
    }
    
    checkAndLoad()
  }, [])

  const loadUser = async () => {
    setLoading(true)
    setError(null)
    const response = await api.user.get()
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      // Handle 401 - redirect to login if unauthorized
      if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
        // Check if we're already on login page to avoid redirect loop
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/buyer/login"
          return
        }
      }
      setError(errorMsg)
    } else if (response.data) {
      setUser(response.data)
      
      setFormData({
        email: response.data.email || "",
        firstName: response.data.firstName || "",
        lastName: response.data.lastName || "",
        phoneNumber: response.data.phoneNumber || response.data.phone || "",
        avatar: response.data.avatar || "",
        gender: response.data.gender || "",
        birthday: response.data.birthday || "",
      })
      loadAddress()
      checkShopStatus()
    }
    setLoading(false)
  }

  const checkShopStatus = async () => {
    const response = await api.shop.getMine()
    if (response.data) {
      setHasShop(true)
      setExistingShop(response.data)
    } else {
      setHasShop(false)
      setExistingShop(null)
    }
  }

  const handleShopLogoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setShopError(null)
    const presigned = await api.media.imagePresigned({ filename: file.name })
    if (presigned.error || !presigned.data?.presignedUrl || !presigned.data?.url) {
      setShopError(
        presigned.error ||
          "Không thể tạo URL upload. Vui lòng thử lại."
      )
      setUploading(false)
      event.target.value = ""
      return
    }

    const upload = await api.media.uploadToPresignedUrl(presigned.data.presignedUrl, file)
    if (upload.error) {
      setShopError(upload.error)
    } else {
      setShopFormData((prev) => ({
        ...prev,
        logo: presigned.data?.url || "",
      }))
    }
    setUploading(false)
    event.target.value = ""
  }

  const handleShopRegister = async () => {
    if (!shopFormData.name.trim()) {
      setShopError("Vui lòng nhập tên shop")
      return
    }
    if (!shopFormData.phone.trim()) {
      setShopError("Vui lòng nhập số điện thoại")
      return
    }

    setShopLoading(true)
    setShopError(null)

    const response = await api.shop.create({
      name: shopFormData.name.trim(),
      description: shopFormData.description.trim() || undefined,
      logo: shopFormData.logo || undefined,
      address: shopFormData.address.trim() || undefined,
      phone: shopFormData.phone.trim(),
    })

    if (response.error) {
      setShopError(typeof response.error === "string" ? response.error : String(response.error))
    } else if (response.data) {
      setHasShop(true)
      setExistingShop(response.data)
      setShowShopModal(false)
      setShopFormData({
        name: "",
        description: "",
        logo: "",
        address: "",
        phone: "",
      })
      setToast({ message: "Đăng ký shop thành công!", variant: "success" })
      window.setTimeout(() => setToast(null), 2500)
    }
    setShopLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const response = await api.user.update({
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      phoneNumber: formData.phoneNumber || undefined,
      avatar: formData.avatar || undefined,
      gender: formData.gender || undefined,
      birthday: formData.birthday || undefined,
    })
    if (response.error) {
      setError(typeof response.error === "string" ? response.error : String(response.error))
    } else if (response.data) {
      setUser(response.data)
      
      setFormData({
        email: response.data.email || "",
        firstName: response.data.firstName || "",
        lastName: response.data.lastName || "",
        phoneNumber: response.data.phoneNumber || response.data.phone || "",
        avatar: response.data.avatar || "",
        gender: response.data.gender || "",
        birthday: response.data.birthday || "",
      })
      setToast({ message: "Cập nhật hồ sơ thành công!", variant: "success" })
      window.setTimeout(() => setToast(null), 2500)
    }
    setSaving(false)
  }

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const presigned = await api.media.imagePresigned({ filename: file.name })
    if (presigned.error || !presigned.data?.presignedUrl || !presigned.data?.url) {
      setError(
        presigned.error ||
          "Không thể tạo URL upload. Vui lòng thử lại."
      )
      setUploading(false)
      event.target.value = ""
      return
    }

    const upload = await api.media.uploadToPresignedUrl(presigned.data.presignedUrl, file)
    if (upload.error) {
      setError(upload.error)
    } else {
      setFormData((prev) => ({
        ...prev,
        avatar: presigned.data?.url || "",
      }))
    }
    setUploading(false)
    event.target.value = ""
  }

  const loadProvinces = async () => {
    setProvincesLoading(true)
    setProvinces([])
    const response = await api.location.provinces()
    if (response.error) {
      setAddressError(typeof response.error === "string" ? response.error : String(response.error))
      setProvinces([])
    } else {
      setProvinces(response.data || [])
    }
    setProvincesLoading(false)
  }

  const loadDistricts = async (provinceId: string) => {
    if (!provinceId) return
    setDistrictsLoading(true)
    setDistricts([])
    const response = await api.location.districts(provinceId)
    if (response.error) {
      setAddressError(typeof response.error === "string" ? response.error : String(response.error))
      setDistricts([])
    } else {
      setDistricts(response.data || [])
    }
    setDistrictsLoading(false)
  }

  const loadWards = async (districtId: string) => {
    if (!districtId) return
    setWardsLoading(true)
    setWards([])
    const response = await api.location.wards(districtId)
    if (response.error) {
      setAddressError(typeof response.error === "string" ? response.error : String(response.error))
      setWards([])
    } else {
      setWards(response.data || [])
    }
    setWardsLoading(false)
  }

  const loadAddress = async () => {
    setAddressLoading(true)
    setAddressError(null)
    const response = await api.address.list({ page: 1, limit: 10 })
    if (response.error) {
      const errorMsg = typeof response.error === "string" ? response.error : String(response.error)
      const isNotFound = errorMsg.includes("AddressNotFound") || errorMsg.includes("404")
      if (isNotFound) {
        setExistingAddress(null)
        setAddressForm({
          provinceId: "",
          districtId: "",
          wardId: "",
          address: "",
        })
      } else {
        setAddressError(errorMsg)
      }
      setAddressLoading(false)
      return
    }

    const addresses = response.data || []
    if (addresses.length === 0) {
      setExistingAddress(null)
      setAddressForm({
        provinceId: "",
        districtId: "",
        wardId: "",
        address: "",
      })
    } else {
      const primary = addresses.find((item) => item.isDefault) || addresses[0]
      setExistingAddress(primary)
      setAddressForm({
        provinceId: "",
        districtId: "",
        wardId: "",
        address: primary.address || "",
      })
    }
    setAddressLoading(false)
  }

  const handleAddressSave = async () => {
    const province = provinces.find((item) => item.id === Number(addressForm.provinceId))
    const district = districts.find((item) => item.id === Number(addressForm.districtId))
    const ward = wards.find((item) => item.id === Number(addressForm.wardId))

    if (!province || !district || !ward || !addressForm.address.trim()) {
      setAddressError("Vui lòng điền đầy đủ thông tin địa chỉ.")
      return
    }

    setAddressSaving(true)
    setAddressError(null)

    const fullName =
      user?.fullName ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "Mặc định"

    const payload = {
      name: fullName,
      address: addressForm.address.trim(),
      ward: ward.name,
      district: district.name,
      province: province.name,
      isDefault: existingAddress?.isDefault ?? true,
    }

    const response = existingAddress?.id
      ? await api.address.update({ id: existingAddress.id, ...payload })
      : await api.address.create(payload)

    if (response.error) {
      setAddressError(typeof response.error === "string" ? response.error : String(response.error))
    } else if (response.data) {
      setExistingAddress(response.data)
      setToast({
        message: existingAddress ? "Cập nhật địa chỉ thành công!" : "Lưu địa chỉ thành công!",
        variant: "success",
      })
      window.setTimeout(() => setToast(null), 2500)
    }
    setAddressSaving(false)
  }

  useEffect(() => {
    loadProvinces()
  }, [])

  useEffect(() => {
    if (!addressForm.provinceId) {
      setDistricts([])
      setWards([])
      return
    }
    loadDistricts(addressForm.provinceId)
  }, [addressForm.provinceId])

  useEffect(() => {
    if (!addressForm.districtId) {
      setWards([])
      return
    }
    loadWards(addressForm.districtId)
  }, [addressForm.districtId])

  useEffect(() => {
    if (!existingAddress || addressForm.provinceId || provinces.length === 0) return
    const match = provinces.find((item) => item.name === existingAddress.province)
    if (match) {
      setAddressForm((prev) => ({ ...prev, provinceId: String(match.id) }))
    }
  }, [existingAddress, provinces, addressForm.provinceId])

  useEffect(() => {
    if (!existingAddress || addressForm.districtId || districts.length === 0) return
    const match = districts.find((item) => item.name === existingAddress.district)
    if (match) {
      setAddressForm((prev) => ({ ...prev, districtId: String(match.id) }))
    }
  }, [existingAddress, districts, addressForm.districtId])

  useEffect(() => {
    if (!existingAddress || addressForm.wardId || wards.length === 0) return
    const match = wards.find((item) => item.name === existingAddress.ward)
    if (match) {
      setAddressForm((prev) => ({ ...prev, wardId: String(match.id) }))
    }
  }, [existingAddress, wards, addressForm.wardId])

  const isAddressComplete =
    !!addressForm.provinceId &&
    !!addressForm.districtId &&
    !!addressForm.wardId &&
    !!addressForm.address.trim()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải hồ sơ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Hồ sơ của tôi</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="firstName">Họ</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Tên</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Số điện thoại</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email (chỉ đọc)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>
            <div>
              <Label>Tải ảnh đại diện</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Đang tải lên..." : "Chọn ảnh"}
                </Button>
                <span className="text-sm text-gray-500">
                  {formData.avatar ? "Đã tải lên" : "Chưa chọn tệp"}
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="gender">Giới tính</Label>
              <select
                id="gender"
                className="w-full h-10 px-3 border rounded-md bg-white"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as "" | "MALE" | "FEMALE" | "OTHER" })}
              >
                <option value="">Chọn giới tính</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div>
              <Label htmlFor="birthday">Ngày sinh</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday ? formData.birthday.slice(0, 10) : ""}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <Button variant="buyer" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </CardContent>
        </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Địa chỉ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addressError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  {addressError}
                </div>
              )}
              {addressLoading && (
                <p className="text-sm text-gray-600">Đang tải địa chỉ...</p>
              )}
              <div>
                <Label htmlFor="province">Tỉnh/Thành</Label>
                <select
                  id="province"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={addressForm.provinceId}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      provinceId: e.target.value,
                      districtId: "",
                      wardId: "",
                    }))
                  }
                  disabled={provincesLoading}
                >
                  <option value="">
                    {provincesLoading ? "Đang tải tỉnh/thành..." : "Chọn tỉnh/thành"}
                  </option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="district">Quận/Huyện</Label>
                <select
                  id="district"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={addressForm.districtId}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      districtId: e.target.value,
                      wardId: "",
                    }))
                  }
                  disabled={!addressForm.provinceId || districtsLoading}
                >
                  <option value="">
                    {!addressForm.provinceId
                      ? "Chọn tỉnh/thành trước"
                      : districtsLoading
                        ? "Đang tải quận/huyện..."
                        : "Chọn quận/huyện"}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ward">Phường/Xã</Label>
                <select
                  id="ward"
                  className="w-full h-10 px-3 border rounded-md bg-white"
                  value={addressForm.wardId}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      wardId: e.target.value,
                    }))
                  }
                  disabled={!addressForm.districtId || wardsLoading}
                >
                  <option value="">
                    {!addressForm.districtId
                      ? "Chọn quận/huyện trước"
                      : wardsLoading
                        ? "Đang tải phường/xã..."
                        : "Chọn phường/xã"}
                  </option>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="addressDetail">Địa chỉ</Label>
                <Input
                  id="addressDetail"
                  placeholder="Số nhà, đường, tòa nhà..."
                  value={addressForm.address}
                  onChange={(e) =>
                    setAddressForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                />
              </div>
              <Button
                variant="buyer"
                onClick={handleAddressSave}
                disabled={!isAddressComplete || addressSaving || addressLoading}
              >
                {addressSaving
                  ? "Đang lưu..."
                  : existingAddress
                    ? "Cập nhật địa chỉ"
                    : "Lưu địa chỉ"}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
            <CardTitle>Đổi mật khẩu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PasswordChangeForm userEmail={user?.email || ""} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-24 h-24 bg-buyer-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                {formData.avatar || user?.avatar ? (
                  <img 
                    src={formData.avatar || user?.avatar || ""} 
                    alt={user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}` || "Người dùng"} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <span className="text-white text-3xl font-bold">
                    {(
                      user?.fullName ||
                      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                      "U"
                    ).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {user?.fullName || 
                 (user?.firstName && user?.lastName 
                   ? `${user.firstName} ${user.lastName}` 
                   : user?.firstName || user?.lastName || "Người dùng")}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{user?.email || ""}</p>
              {hasShop ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Bạn đã đăng ký làm Shop
                  </p>
                  {existingShop && (
                    <p className="text-xs text-green-700 mt-1">
                      {existingShop.name}
                    </p>
                  )}
                </div>
              ) : (
                <Button 
                  variant="buyer" 
                  className="w-full"
                  onClick={() => setShowShopModal(true)}
                >
                  Đăng ký làm Shop
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Shop Registration Modal */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Đăng ký làm Shop</h2>
                <button
                  onClick={() => {
                    setShowShopModal(false)
                    setShopError(null)
                    setShopFormData({
                      name: "",
                      description: "",
                      logo: "",
                      address: "",
                      phone: "",
                    })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {shopError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  {shopError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="shopName">Tên Shop <span className="text-red-500">*</span></Label>
                  <Input
                    id="shopName"
                    placeholder="Nhập tên shop"
                    value={shopFormData.name}
                    onChange={(e) => setShopFormData({ ...shopFormData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="shopDescription">Mô tả Shop</Label>
                  <textarea
                    id="shopDescription"
                    placeholder="Mô tả về shop của bạn"
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                    value={shopFormData.description}
                    onChange={(e) => setShopFormData({ ...shopFormData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="shopPhone">Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input
                    id="shopPhone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={shopFormData.phone}
                    onChange={(e) => setShopFormData({ ...shopFormData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="shopAddress">Địa chỉ Shop</Label>
                  <Input
                    id="shopAddress"
                    placeholder="Nhập địa chỉ shop"
                    value={shopFormData.address}
                    onChange={(e) => setShopFormData({ ...shopFormData, address: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Logo Shop</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={shopLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleShopLogoSelect}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => shopLogoInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "Đang tải lên..." : "Chọn logo"}
                    </Button>
                    {shopFormData.logo && (
                      <div className="flex items-center gap-2">
                        <img 
                          src={shopFormData.logo} 
                          alt="Shop logo preview" 
                          className="w-10 h-10 rounded object-cover"
                        />
                        <span className="text-sm text-green-600">✓ Đã tải lên</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowShopModal(false)
                      setShopError(null)
                      setShopFormData({
                        name: "",
                        description: "",
                        logo: "",
                        address: "",
                        phone: "",
                      })
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="buyer"
                    className="flex-1"
                    onClick={handleShopRegister}
                    disabled={shopLoading}
                  >
                    {shopLoading ? "Đang đăng ký..." : "Đăng ký"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PasswordChangeForm({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState<"form" | "otp">("form")
  const [processId, setProcessId] = useState<string>("")
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
    code: "",
  })
  const [sendingOTP, setSendingOTP] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendOTP = async () => {
    if (!userEmail) {
      setError("Vui lòng nhập email")
      return
    }

    if (!passwords.newPassword) {
      setError("Vui lòng nhập mật khẩu mới")
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("Mật khẩu không khớp")
      return
    }

    if (passwords.newPassword.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự")
      return
    }

    setSendingOTP(true)
    setError(null)

    const response = await api.auth.sendOTP({
      email: userEmail,
      type: "CHANGE_PASSWORD",
    })

    if (response.error) {
      setError(typeof response.error === "string" ? response.error : String(response.error))
      setSendingOTP(false)
    } else if (response.data?.processId) {
      setProcessId(response.data.processId)
      setStep("otp")
      setSendingOTP(false)
    } else {
      setError("Gửi OTP thất bại. Vui lòng thử lại.")
      setSendingOTP(false)
    }
  }

  const handleSubmit = async () => {
    if (!passwords.code) {
      setError("Vui lòng nhập mã OTP")
      return
    }

    if (!processId) {
      setError("Yêu cầu không hợp lệ. Vui lòng thử lại từ đầu.")
      return
    }

    setSaving(true)
    setError(null)

    const response = await api.auth.changePassword({
      email: userEmail,
      password: passwords.newPassword,
      code: passwords.code,
      processId: processId,
    })

    if (response.error) {
      setError(typeof response.error === "string" ? response.error : String(response.error))
    } else {
      alert("Cập nhật mật khẩu thành công!")
      setPasswords({ newPassword: "", confirmPassword: "", code: "" })
      setStep("form")
      setProcessId("")
    }
    setSaving(false)
  }

  const handleResendOTP = async () => {
    await handleSendOTP()
  }

  return (
    <>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          {error}
        </div>
      )}

      {step === "form" ? (
        <>
          <div>
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            />
          </div>
          <Button 
            variant="buyer" 
            onClick={handleSendOTP} 
            disabled={sendingOTP || !passwords.newPassword || !passwords.confirmPassword}
            className="w-full"
          >
            {sendingOTP ? "Đang gửi OTP..." : "Gửi mã OTP"}
          </Button>
          {userEmail && (
            <p className="text-sm text-gray-600 text-center">
              Mã OTP sẽ được gửi tới: {userEmail}
            </p>
          )}
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="code">Mã OTP</Label>
            <Input
              id="code"
              type="text"
              placeholder="Nhập mã OTP"
              value={passwords.code}
              onChange={(e) => setPasswords({ ...passwords, code: e.target.value })}
              maxLength={6}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="buyer" 
              onClick={handleSubmit} 
              disabled={saving || !passwords.code}
              className="flex-1"
            >
              {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleResendOTP} 
              disabled={sendingOTP}
            >
              Gửi lại
            </Button>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => {
              setStep("form")
              setPasswords({ ...passwords, code: "" })
              setError(null)
            }}
            className="w-full"
          >
            Quay lại
          </Button>
        </>
      )}
    </>
  )
}
