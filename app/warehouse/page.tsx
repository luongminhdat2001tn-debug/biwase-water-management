'use client'

import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Package, Plus, Edit2, Trash2, Search, X, Save, Warehouse, Factory, ShoppingBag, Building, Upload, LogIn, LogOut, FlaskConical, RefreshCw } from 'lucide-react'
import { type Product } from '@/lib/constants'
import { getProductsByWarehouse, createProduct, updateProduct, deleteProduct, addHistoryEntry, uploadImage, findProductByCode, normalizeProductCode, findProductByNameInWarehouse } from '@/lib/db'

const WAREHOUSES = [
  { id: 'kho-vat-tu', name: 'Kho Vật Tư Nhà Máy', icon: Factory, color: 'blue' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng Cơ Bản', icon: Building, color: 'orange' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', icon: FlaskConical, color: 'purple' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', icon: ShoppingBag, color: 'green' },
]

export default function WarehousePage() {
  const [user, setUser] = useState<any>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState('kho-vat-tu')
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // modalType: 'import' = nhập liệu mới, 'export' = xuất kho, 'addmore' = nhập kho số lượng
  const [modalType, setModalType] = useState<'import' | 'export' | 'addmore'>('import')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [exportCodeInput, setExportCodeInput] = useState('')
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [exportQuantity, setExportQuantity] = useState(0)
  // Lý do xuất kho (bắt buộc) + lỗi đỏ inline cho số lượng / lý do
  const [exportReason, setExportReason] = useState('')
  const [exportQuantityError, setExportQuantityError] = useState('')
  const [exportReasonError, setExportReasonError] = useState('')
  // isSaving: chặn bấm nút nhiều lần
  const [isSaving, setIsSaving] = useState(false)

  // Trạng thái form nhập liệu mới
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: '',
    quantity: '' as any,
    weight: '' as any,
    weightUnit: 'kg',
    location: '',
    locationImage: '',
    productImage: '',
    importDate: new Date().toISOString().split('T')[0],
  })

  // Lỗi đỏ cho các trường bắt buộc trong form Nhập liệu
  // (hiện sau khi bấm Lưu, tự xóa từng ô khi user sửa lại)
  const [formErrors, setFormErrors] = useState<{
    code?: string; name?: string; unit?: string; quantity?: string
    weight?: string; location?: string; importDate?: string
  }>({})

  // Xóa lỗi đỏ của 1 ô khi user bắt đầu sửa
  const clearFieldError = (field: keyof typeof formErrors) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Kiểm tra 7 trường bắt buộc, trả về object lỗi (rỗng = hợp lệ)
  const validateForm = () => {
    const errors: typeof formErrors = {}
    if (!String(formData.code || '').trim()) errors.code = 'Vui lòng nhập mã hàng'
    if (!String(formData.name || '').trim()) errors.name = 'Vui lòng nhập tên hàng'
    if (!String(formData.unit || '').trim()) errors.unit = 'Vui lòng nhập đơn vị tính'
    if (formData.quantity === '' || formData.quantity === null || formData.quantity === undefined || Number(formData.quantity) <= 0) errors.quantity = 'Vui lòng nhập số lượng lớn hơn 0'
    if (formData.weight === '' || formData.weight === null || formData.weight === undefined || Number(formData.weight) <= 0) errors.weight = 'Vui lòng nhập khối lượng lớn hơn 0'
    if (!String(formData.location || '').trim()) errors.location = 'Vui lòng nhập vị trí'
    if (!String(formData.importDate || '').trim()) errors.importDate = 'Vui lòng chọn ngày nhập liệu'
    return errors
  }

  // Trạng thái nhập kho số lượng
  const [addMoreCodeInput, setAddMoreCodeInput] = useState('')
  const [addMoreProduct, setAddMoreProduct] = useState<Product | null>(null)
  const [addMoreQuantity, setAddMoreQuantity] = useState(0)

  // File refs cho upload ảnh
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [locationImageFile, setLocationImageFile] = useState<File | null>(null)

  // ------------------------------------------
  // Trạng thái trùng mã toàn hệ thống (check qua DB cả 4 kho,
  // không chỉ kho đang chọn). Chỉ dùng khi THÊM MỚI, không khi sửa.
  // ------------------------------------------
  const [duplicateInfo, setDuplicateInfo] = useState<{ warehouseId: string; warehouseName: string } | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)
  // Giữ mã mới nhất để bỏ kết quả cũ khi user gõ nhanh (tránh race)
  const latestCodeRef = useRef('')

  // Map warehouseId -> tên kho hiển thị (dùng bảng WAREHOUSES của trang này)
  const warehouseNameById = (id: string) => WAREHOUSES.find(w => w.id === id)?.name || id

  // Query DB kiểm tra mã đã tồn tại ở kho nào chưa
  const checkDuplicateGlobally = async (code: string) => {
    const normalized = normalizeProductCode(code)
    if (!normalized) { setDuplicateInfo(null); return null }
    latestCodeRef.current = normalized
    setCheckingCode(true)
    try {
      const found = await findProductByCode(normalized)
      // Chỉ nhận kết quả nếu user chưa gõ mã khác trong lúc chờ
      if (latestCodeRef.current !== normalized) return duplicateInfo
      const info = found ? { warehouseId: found.warehouseId, warehouseName: warehouseNameById(found.warehouseId) } : null
      setDuplicateInfo(info)
      return info
    } finally {
      setCheckingCode(false)
    }
  }

  // Live-check khi user gõ mã hàng (debounce 400ms để đỡ spam DB)
  useEffect(() => {
    if (!isModalOpen || modalType !== 'import' || editingProduct) return
    const code = formData.code
    if (!normalizeProductCode(code)) { setDuplicateInfo(null); return }
    const t = setTimeout(() => { checkDuplicateGlobally(code) }, 400)
    return () => clearTimeout(t)
  }, [formData.code, isModalOpen, modalType, editingProduct])

  // ------------------------------------------
  // Trạng thái trùng tên trong kho HIỆN TẠI
  // (Tên hàng chỉ cần duy nhất trong cùng kho,
  // khác kho được phép trùng tên)
  // ------------------------------------------
  const [duplicateName, setDuplicateName] = useState(false)
  const [checkingName, setCheckingName] = useState(false)
  // Giữ tên mới nhất để bỏ kết quả cũ khi user gõ nhanh (tránh race)
  const latestNameRef = useRef('')

  // Query DB kiểm tra tên đã tồn tại trong kho hiện tại chưa
  // Khi sửa: bỏ qua chính sản phẩm đang sửa (giữ nguyên tên vẫn OK)
  const checkDuplicateName = async (name: string) => {
    const normalized = (name || '').trim()
    if (!normalized) { setDuplicateName(false); return false }
    const requestKey = `${selectedWarehouse}||${normalized.toLowerCase()}`
    latestNameRef.current = requestKey
    setCheckingName(true)
    try {
      const found = await findProductByNameInWarehouse(normalized, selectedWarehouse)
      // Chỉ nhận kết quả nếu user chưa gõ tên/kho khác trong lúc chờ
      if (latestNameRef.current !== requestKey) return duplicateName
      const isDup = !!found && (!editingProduct || found.id !== editingProduct.id)
      setDuplicateName(isDup)
      return isDup
    } finally {
      setCheckingName(false)
    }
  }

  // Live-check khi user gõ tên hàng (debounce 400ms để đỡ spam DB)
  useEffect(() => {
    if (!isModalOpen || modalType !== 'import') return
    const name = formData.name
    if (!(name || '').trim()) { setDuplicateName(false); return }
    const t = setTimeout(() => { checkDuplicateName(name) }, 400)
    return () => clearTimeout(t)
  }, [formData.name, selectedWarehouse, isModalOpen, modalType, editingProduct])

  // Load products từ Supabase khi chọn kho
  const loadProducts = async (warehouseId: string) => {
    setLoading(true)
    const data = await getProductsByWarehouse(warehouseId)
    setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    loadProducts('kho-vat-tu')
  }, [])

  // Reload khi đổi kho
  useEffect(() => {
    if (user) loadProducts(selectedWarehouse)
  }, [selectedWarehouse])

  const filteredItems = products.filter(
    (item: Product) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouse)

  // ------------------------------------------
  // Mở modal Nhập liệu mới
  // ------------------------------------------
  const handleImport = () => {
    setEditingProduct(null)
    setModalType('import')
    setDuplicateInfo(null)
    setDuplicateName(false)
    setFormErrors({})
    setFormData({ code: '', name: '', unit: '', quantity: '', weight: '', weightUnit: 'kg', location: '', locationImage: '', productImage: '', importDate: new Date().toISOString().split('T')[0] })
    setProductImageFile(null)
    setLocationImageFile(null)
    setIsModalOpen(true)
  }

  // ------------------------------------------
  // Mở modal Xuất kho
  // ------------------------------------------
  const handleExport = () => {
    setModalType('export')
    setExportCodeInput('')
    setFoundProduct(null)
    setExportQuantity(0)
    setExportReason('')
    setExportQuantityError('')
    setExportReasonError('')
    setIsModalOpen(true)
  }

  // ------------------------------------------
  // Mở modal Nhập Kho (cộng dồn số lượng cho SP đã có)
  // ------------------------------------------
  const handleAddMore = () => {
    setModalType('addmore')
    setAddMoreCodeInput('')
    setAddMoreProduct(null)
    setAddMoreQuantity(0)
    setIsModalOpen(true)
  }

  // Tìm sản phẩm khi nhập mã xuất kho
  const handleSearchExportCode = (code: string) => {
    const upperCode = code.toUpperCase()
    setExportCodeInput(upperCode)
    const product = products.find(p => p.code === upperCode)
    if (product) {
      setFoundProduct(product)
      setExportQuantity(0)
    } else {
      setFoundProduct(null)
      setExportQuantity(0)
    }
    // Đổi mã hàng = reset lý do + lỗi đỏ (tránh giữ lỗi của SP cũ)
    setExportReason('')
    setExportQuantityError('')
    setExportReasonError('')
  }

  // Tìm sản phẩm khi nhập mã để nhập kho
  const handleSearchAddMoreCode = (code: string) => {
    const upperCode = code.toUpperCase()
    setAddMoreCodeInput(upperCode)
    const product = products.find(p => p.code === upperCode)
    if (product) {
      setAddMoreProduct(product)
      setAddMoreQuantity(0)
    } else {
      setAddMoreProduct(null)
      setAddMoreQuantity(0)
    }
  }

  // Xác nhận xuất kho
  const handleConfirmExport = async () => {
    if (!foundProduct) { alert('Không tìm thấy sản phẩm!'); return }
    // Số lượng xuất: bắt buộc, > 0, không vượt tồn (lỗi đỏ inline, không alert)
    if (!exportQuantity || exportQuantity <= 0) { setExportQuantityError('Vui lòng nhập số lượng xuất lớn hơn 0!'); return }
    if (exportQuantity > foundProduct.quantity) {
      setExportQuantityError(`Số lượng tồn kho không đủ! Hiện có: ${foundProduct.quantity} ${foundProduct.unit}`)
      return
    }
    // Lý do xuất kho: bắt buộc (trống hoặc chỉ trắng = lỗi đỏ inline)
    if (!exportReason.trim()) { setExportReasonError('Vui lòng nhập lý do xuất kho!'); return }
    setIsSaving(true)
    await updateProduct(foundProduct.id, { quantity: foundProduct.quantity - exportQuantity })
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: foundProduct.code,
      productName: foundProduct.name,
      userName: user?.name || user?.username || '',
      action: 'Xuất kho',
      quantity: exportQuantity,
      details: `Xuất ${exportQuantity} ${foundProduct.unit} — Lý do: ${exportReason.trim()}`,
    })
    alert(`Đã xuất ${exportQuantity} ${foundProduct.unit} ${foundProduct.name}`)
    setIsModalOpen(false)
    setIsSaving(false)
    await loadProducts(selectedWarehouse)
  }

  // Xác nhận nhập kho số lượng
  const handleConfirmAddMore = async () => {
    if (!addMoreProduct) { alert('Không tìm thấy sản phẩm!'); return }
    if (addMoreQuantity <= 0) { alert('Số lượng nhập kho phải lớn hơn 0!'); return }
    setIsSaving(true)
    const newQty = addMoreProduct.quantity + addMoreQuantity
    await updateProduct(addMoreProduct.id, { quantity: newQty })
    await addHistoryEntry({
      date: new Date().toLocaleDateString('vi-VN'),
      time: new Date().toLocaleTimeString('vi-VN'),
      warehouse: currentWarehouse?.name || '',
      productCode: addMoreProduct.code,
      productName: addMoreProduct.name,
      userName: user?.name || user?.username || '',
      action: 'Nhập liệu',
      quantity: addMoreQuantity,
      details: `Nhập kho ${addMoreQuantity} ${addMoreProduct.unit} (tồn trước: ${addMoreProduct.quantity}, tồn sau: ${newQty})`,
    })
    alert(`Đã nhập kho ${addMoreQuantity} ${addMoreProduct.unit} vào ${addMoreProduct.name}. Tồn kho mới: ${newQty}`)
    setIsModalOpen(false)
    setIsSaving(false)
    await loadProducts(selectedWarehouse)
  }

  // Sửa sản phẩm
  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setModalType('import')
    setDuplicateName(false)
    setFormErrors({})
    setFormData({
      code: product.code,
      name: product.name,
      unit: product.unit,
      quantity: product.quantity,
      weight: product.weight,
      weightUnit: product.weightUnit || 'kg',
      location: product.location,
      locationImage: product.locationImage,
      productImage: product.productImage || '',
      importDate: product.importDate,
    })
    setProductImageFile(null)
    setLocationImageFile(null)
    setIsModalOpen(true)
  }

  // Xóa sản phẩm (soft delete)
  const handleDelete = async (productId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      await deleteProduct(productId)
      await loadProducts(selectedWarehouse)
    }
  }

  // Lưu sản phẩm (thêm mới hoặc cập nhật)
  const handleSave = async () => {
    // Kiểm tra 7 trường bắt buộc -> hiện cảnh báo đỏ từng ô, chặn lưu
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    // Chặn trùng mã trên TOÀN hệ thống (chỉ khi thêm mới;
    // khi sửa thì ô mã bị khóa nên bỏ qua, tránh tự chặn chính mình)
    if (!editingProduct) {
      const dup = await checkDuplicateGlobally(formData.code)
      if (dup) {
        alert('Mã hàng này đã tồn tại. Vui lòng kiểm tra lại')
        return
      }
    }
    // Chặn trùng tên trong cùng kho (thêm mới, hoặc sửa đổi sang tên SP khác)
    const nameDup = await checkDuplicateName(formData.name)
    if (nameDup) {
      alert('Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!')
      return
    }

    setIsSaving(true)

    // Upload ảnh nếu có file mới
    let productImageUrl = formData.productImage
    let locationImageUrl = formData.locationImage

    if (productImageFile) {
      const url = await uploadImage(productImageFile, 'products')
      if (url) productImageUrl = url
    }
    if (locationImageFile) {
      const url = await uploadImage(locationImageFile, 'locations')
      if (url) locationImageUrl = url
    }

    if (editingProduct) {
      // Cập nhật sản phẩm
      await updateProduct(editingProduct.id, {
        ...formData,
        productImage: productImageUrl,
        locationImage: locationImageUrl,
      })
    } else {
      // Thêm sản phẩm mới
      await createProduct({
        ...formData,
        productImage: productImageUrl,
        locationImage: locationImageUrl,
        warehouseId: selectedWarehouse,
      })

      // Log lịch sử nhập liệu
      await addHistoryEntry({
        date: new Date().toLocaleDateString('vi-VN'),
        time: new Date().toLocaleTimeString('vi-VN'),
        warehouse: currentWarehouse?.name || '',
        productCode: formData.code,
        productName: formData.name,
        userName: user?.name || user?.username || '',
        action: 'Nhập liệu',
        quantity: Number(formData.quantity) || 0,
        details: `Nhập ${formData.quantity} ${formData.unit}`,
      })
    }
    setIsSaving(false)
    setIsModalOpen(false)
    await loadProducts(selectedWarehouse)
  }

  // Xử lý upload ảnh vị trí
  const handleLocationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocationImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => { setFormData({ ...formData, locationImage: reader.result as string }) }
      reader.readAsDataURL(file)
    }
  }

  // Xử lý upload ảnh sản phẩm
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => { setFormData({ ...formData, productImage: reader.result as string }) }
      reader.readAsDataURL(file)
    }
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  const canImport = user?.isAdmin || (Array.isArray(user?.chucNang) ? user.chucNang : []).includes('nhap-kho')
  const canExport = user?.isAdmin || (Array.isArray(user?.chucNang) ? user.chucNang : []).includes('xuat-kho')

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Kho</h1>
          </div>

          {/* Warehouse Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {WAREHOUSES.map((warehouse) => {
              const Icon = warehouse.icon
              const isSelected = selectedWarehouse === warehouse.id
              const colorClasses = {
                blue: isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400',
                orange: isSelected ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400',
                purple: isSelected ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400',
                green: isSelected ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-600 border-green-200 hover:border-green-400',
              }
              return (
                <button
                  key={warehouse.id}
                  onClick={() => setSelectedWarehouse(warehouse.id)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${colorClasses[warehouse.color as keyof typeof colorClasses]}`}
                >
                  <Icon className="w-8 h-8" />
                  <div className="text-left">
                    <p className="font-semibold">{warehouse.name}</p>
                    <p className={`text-sm ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                      {warehouse.id === selectedWarehouse ? products.length : '—'} sản phẩm
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Product Table */}
          <Card className={`border-l-4 ${
              currentWarehouse?.color === 'blue' ? 'border-l-blue-600' :
              currentWarehouse?.color === 'orange' ? 'border-l-orange-500' :
              currentWarehouse?.color === 'purple' ? 'border-l-purple-600' : 'border-l-green-600'
            }`}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className={`flex items-center gap-2 ${
                  currentWarehouse?.color === 'blue' ? 'text-blue-600' :
                  currentWarehouse?.color === 'orange' ? 'text-orange-500' :
                  currentWarehouse?.color === 'purple' ? 'text-purple-600' : 'text-green-600'
                }`}>
                  {currentWarehouse && <currentWarehouse.icon className="w-5 h-5" />}
                  {currentWarehouse?.name}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {canImport && (
                    <Button onClick={handleImport} className="bg-green-600 text-white hover:bg-green-700">
                      <LogIn className="h-4 w-4 mr-2" />
                      Nhập Liệu
                    </Button>
                  )}
                  {canImport && (
                    <Button onClick={handleAddMore} className="bg-blue-600 text-white hover:bg-blue-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Nhập Kho
                    </Button>
                  )}
                  {canExport && (
                    <Button onClick={handleExport} className="bg-orange-500 text-white hover:bg-orange-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Xuất Kho
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo mã hàng hoặc tên hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-gray-200"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Mã Hàng</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên Hàng</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ĐVT</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Số Lượng</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Khối Lượng</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Vị Trí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                          Không có sản phẩm nào
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-mono font-medium text-blue-600">{item.code}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-800">{item.name}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-800">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {item.weight} {item.weightUnit || 'kg'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{item.location}</span>
                              {item.locationImage && (
                                <img src={item.locationImage} alt="Vị trí" className="w-8 h-8 object-cover rounded" />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ============================================================ */}
          {/* MODAL - Nhập Liệu Mới / Sửa Sản Phẩm                          */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'import' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingProduct ? 'Sửa Sản Phẩm' : 'Nhập Liệu'}
                  </h2>
                  <button onClick={() => { setIsModalOpen(false); setFormErrors({}) }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Mã hàng - có cảnh báo trùng + cảnh báo đỏ thiếu bắt buộc */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã hàng *</label>
                    <Input
                      value={formData.code}
                      onChange={(e) => { setFormData({ ...formData, code: e.target.value.toUpperCase() }); clearFieldError('code') }}
                      className={`border-2 ${duplicateInfo || formErrors.code ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                      disabled={!!editingProduct}
                    />
                    {formErrors.code && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.code}</p>
                    )}
                    {checkingCode && !duplicateInfo && (
                      <p className="text-gray-500 text-xs mt-1">Đang kiểm tra mã hàng...</p>
                    )}
                    {duplicateInfo && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ Mã hàng này đã tồn tại (tại {duplicateInfo.warehouseName}). Vui lòng kiểm tra lại</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError('name') }}
                      className={`border-2 ${duplicateName || formErrors.name ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.name && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.name}</p>
                    )}
                    {checkingName && !duplicateName && (
                      <p className="text-gray-500 text-xs mt-1">Đang kiểm tra tên hàng...</p>
                    )}
                    {duplicateName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ Tên hàng này đã tồn tại. Vui lòng kiểm tra lại!</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính *</label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => { setFormData({ ...formData, unit: e.target.value }); clearFieldError('unit') }}
                      className={`border-2 ${formErrors.unit ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.unit && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.unit}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.quantity || ''}
                      onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormData({ ...formData, quantity: v ? parseInt(v) : '' as any }); clearFieldError('quantity') }}
                      className={`border-2 ${formErrors.quantity ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.quantity && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.quantity}</p>
                    )}
                  </div>

                  {/* Khối lượng + Đơn vị - 2 ô cạnh nhau */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng *</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.weight || ''}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setFormData({ ...formData, weight: v ? parseFloat(v) : '' as any }); clearFieldError('weight') }}
                        className={`border-2 flex-1 ${formErrors.weight ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                        placeholder="Nhập số lượng"
                      />
                      <Input
                        type="text"
                        value={formData.weightUnit}
                        onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                        className="border-2 w-28"
                        placeholder="Đơn vị"
                      />
                    </div>
                    {formErrors.weight && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.weight}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">VD: kg, g, lít, ml, chai, lon, bao...</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí *</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => { setFormData({ ...formData, location: e.target.value }); clearFieldError('location') }}
                      className={`border-2 ${formErrors.location ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.location && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhập liệu *</label>
                    <Input
                      type="date"
                      value={formData.importDate}
                      onChange={(e) => { setFormData({ ...formData, importDate: e.target.value }); clearFieldError('importDate') }}
                      className={`border-2 ${formErrors.importDate ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                    />
                    {formErrors.importDate && (
                      <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {formErrors.importDate}</p>
                    )}
                  </div>

                  {/* Ảnh sản phẩm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📷 Ảnh sản phẩm</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                          <Upload className="w-5 h-5 text-blue-500" />
                          <span className="text-sm text-blue-600">Upload ảnh sản phẩm</span>
                          <input type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
                        </label>
                      </div>
                      {formData.productImage && (
                        <div className="relative">
                          <img src={formData.productImage} alt="Ảnh sản phẩm" className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200" />
                          <button
                            onClick={() => setFormData({ ...formData, productImage: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ảnh vị trí kho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📍 Ảnh vị trí</label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                          <Upload className="w-5 h-5 text-gray-500" />
                          <span className="text-sm text-gray-600">Upload ảnh vị trí</span>
                          <input type="file" accept="image/*" onChange={handleLocationImageUpload} className="hidden" />
                        </label>
                      </div>
                      {formData.locationImage && (
                        <div className="relative">
                          <img src={formData.locationImage} alt="Ảnh vị trí" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                          <button
                            onClick={() => setFormData({ ...formData, locationImage: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => { setIsModalOpen(false); setFormErrors({}) }} className="flex-1">
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isSaving || checkingCode || !!duplicateInfo || checkingName || duplicateName}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Đang lưu...' : (editingProduct ? 'Cập Nhật' : 'Nhập Liệu')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL - Xuất Kho                                              */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'export' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Xuất Kho</h2>
                  <button onClick={() => { setIsModalOpen(false); setExportQuantityError(''); setExportReasonError('') }} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhập mã hàng cần xuất</label>
                    <Input
                      value={exportCodeInput}
                      onChange={(e) => handleSearchExportCode(e.target.value)}
                      placeholder="Nhập mã hàng (VD: VT001)"
                      className="border-2 text-xl font-bold tracking-wider"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </div>

                  {exportCodeInput && !foundProduct && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <p className="text-red-600 font-medium">❌ Không tìm thấy sản phẩm có mã "{exportCodeInput}"</p>
                    </div>
                  )}

                  {foundProduct && (
                    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                      <p className="text-green-600 font-medium mb-4">✓ Tìm thấy sản phẩm</p>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4 border-2">
                          <h3 className="font-bold text-blue-600 mb-3 text-lg border-b pb-2">THÔNG TIN SẢN PHẨM</h3>
                          <div className="space-y-2 text-sm">
                            {[
                              ['Mã hàng', foundProduct.code],
                              ['Tên hàng', foundProduct.name],
                              ['Đơn vị tính', foundProduct.unit],
                              ['Tồn kho', `${foundProduct.quantity.toLocaleString()} ${foundProduct.unit}`],
                              ['Khối lượng', `${foundProduct.weight} ${foundProduct.weightUnit || 'kg'}`],
                              ['Vị trí', foundProduct.location],
                            ].map(([l, v]) => (
                              <div key={l} className="flex justify-between">
                                <span className="text-gray-500">{l}:</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                          <h3 className="font-bold text-orange-600 mb-3 text-lg border-b pb-2">THÔNG TIN XUẤT KHO</h3>
                          {foundProduct.locationImage && (
                            <div className="mb-4">
                              <img src={foundProduct.locationImage} alt={foundProduct.name} className="w-full h-48 object-cover rounded-lg border-2" />
                            </div>
                          )}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Số lượng xuất * (Tồn: {foundProduct.quantity} {foundProduct.unit})
                              </label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={exportQuantity || ''}
                                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setExportQuantity(v ? parseInt(v) : 0); if (exportQuantityError) setExportQuantityError('') }}
                                className={`border-2 text-lg ${exportQuantityError ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                              />
                              {exportQuantityError && (
                                <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {exportQuantityError}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lý do *
                              </label>
                              <Textarea
                                value={exportReason}
                                onChange={(e) => { setExportReason(e.target.value); if (exportReasonError) setExportReasonError('') }}
                                placeholder="Nhập lý do xuất kho..."
                                className={`border-2 ${exportReasonError ? 'border-red-500 bg-red-50 focus:ring-red-400' : ''}`}
                              />
                              {exportReasonError && (
                                <p className="text-red-600 text-xs mt-1 font-medium">⚠️ {exportReasonError}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <Button variant="outline" onClick={() => { setIsModalOpen(false); setExportQuantityError(''); setExportReasonError('') }} className="flex-1">Hủy</Button>
                        <Button onClick={handleConfirmExport} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={isSaving}>
                          <LogOut className="w-4 h-4 mr-2" />
                          {isSaving ? 'Đang xử lý...' : 'Xác Nhận Xuất Kho'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODAL - Nhập Kho Số Lượng (cho SP đã có sẵn trong kho)      */}
          {/* ============================================================ */}
          {isModalOpen && modalType === 'addmore' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Nhập Kho Số Lượng</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tìm sản phẩm theo mã hàng</label>
                    <Input
                      value={addMoreCodeInput}
                      onChange={(e) => handleSearchAddMoreCode(e.target.value)}
                      placeholder="Nhập mã hàng đã có trong kho"
                      className="border-2 text-lg font-bold tracking-wider"
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </div>

                  {addMoreCodeInput && !addMoreProduct && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                      <p className="text-red-600 font-medium">❌ Không tìm thấy sản phẩm có mã "{addMoreCodeInput}" trong kho này</p>
                    </div>
                  )}

                  {addMoreProduct && (
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <p className="text-blue-600 font-medium mb-3">✓ Tìm thấy: <span className="font-bold">{addMoreProduct.name}</span></p>
                      <div className="bg-white rounded-lg p-3 mb-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mã hàng:</span>
                          <span className="font-mono font-bold text-blue-600">{addMoreProduct.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Đơn vị tính:</span>
                          <span>{addMoreProduct.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tồn kho hiện tại:</span>
                          <span className="font-bold text-green-600">{addMoreProduct.quantity.toLocaleString()} {addMoreProduct.unit}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng nhập kho *
                        </label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={addMoreQuantity || ''}
                          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setAddMoreQuantity(v ? parseInt(v) : 0) }}
                          className="border-2 text-lg"
                        />
                      </div>

                      {addMoreQuantity > 0 && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Tồn kho sau khi nhập:</span>
                            <span className="text-xl font-bold text-green-600">
                              {(addMoreProduct.quantity + addMoreQuantity).toLocaleString()} {addMoreProduct.unit}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                        <Button onClick={handleConfirmAddMore} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {isSaving ? 'Đang xử lý...' : 'Xác Nhận Nhập Kho'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
