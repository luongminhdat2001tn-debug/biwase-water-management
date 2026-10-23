'use client'

import { Fragment, useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Archive, Factory, Building, ShoppingBag, FlaskConical, Search, Eye, X, ChevronDown, ChevronRight } from 'lucide-react'
import { type Product } from '@/lib/constants'
import { getAllProducts } from '@/lib/db'

const WAREHOUSES = [
  { id: 'kho-vat-tu', name: 'Kho Vật Tư Nhà Máy', icon: Factory, color: 'blue' },
  { id: 'kho-xay-dung', name: 'Kho Xây Dựng Cơ Bản', icon: Building, color: 'orange' },
  { id: 'kho-phong-thi-nghiem', name: 'Kho Phòng Thí Nghiệm', icon: FlaskConical, color: 'purple' },
  { id: 'kho-thuong-mai', name: 'Kho Thương Mại', icon: ShoppingBag, color: 'green' },
]

export default function InventoryPage() {
  const [user, setUser] = useState<any>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState('kho-vat-tu')
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<Record<string, Product[]>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  // Danh mục đang mở (accordion - chỉ 1 danh mục mở tại một thời điểm)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const loadAllProducts = async () => {
    const data = await getAllProducts()
    setAllProducts(data)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    loadAllProducts()
  }, [])

  const currentItems = allProducts[selectedWarehouse] || []
  const filteredItems = currentItems.filter(
    (item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const currentWarehouse = WAREHOUSES.find(w => w.id === selectedWarehouse)
  // Đang tìm kiếm -> tự mở tất cả danh mục có kết quả
  const isSearching = searchTerm.trim() !== ''
  // Gom sản phẩm theo danh mục; danh mục trống (dữ liệu cũ) -> "Chưa phân loại"
  const categoryGroups = (() => {
    const map = new Map<string, { name: string; total: number; items: Product[] }>()
    for (const item of filteredItems) {
      const key = (item.categoryName || '').trim() || 'Chưa phân loại'
      const group = map.get(key) || { name: key, total: 0, items: [] }
      group.total += item.quantity
      group.items.push(item)
      map.set(key, group)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  })()

  const handleViewDetail = (product: Product) => { setSelectedProduct(product); setIsDetailModalOpen(true) }

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Tồn Kho</h1></div>

          {/* Warehouse Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {WAREHOUSES.map((warehouse) => {
              const Icon = warehouse.icon
              const isSelected = selectedWarehouse === warehouse.id
              const colorClasses: Record<string, string> = {
                blue: isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400',
                orange: isSelected ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400',
                purple: isSelected ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400',
                green: isSelected ? 'bg-green-600 text-white border-green-700' : 'bg-white text-green-600 border-green-200 hover:border-green-400',
              }
              return (
                <button key={warehouse.id} onClick={() => { setSelectedWarehouse(warehouse.id); setOpenCategory(null) }} className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${colorClasses[warehouse.color]}`}>
                  <Icon className="w-8 h-8" />
                  <div className="text-left">
                    <p className="font-semibold">{warehouse.name}</p>
                    <p className={`text-sm ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{allProducts[warehouse.id]?.length || 0} sản phẩm</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Bảng nhóm theo danh mục: STT, Tên Danh Mục, Tổng Số Lượng.
              Bấm tên danh mục để mở/đóng bảng con (accordion - 1 danh mục mở). */}
          <Card className={`border-l-4 ${
            currentWarehouse?.color === 'blue' ? 'border-l-blue-600' :
            currentWarehouse?.color === 'orange' ? 'border-l-orange-500' :
            currentWarehouse?.color === 'purple' ? 'border-l-purple-600' : 'border-l-green-600'
          }`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${
                currentWarehouse?.color === 'blue' ? 'text-blue-600' :
                currentWarehouse?.color === 'orange' ? 'text-orange-500' :
                currentWarehouse?.color === 'purple' ? 'text-purple-600' : 'text-green-600'
              }`}>
                <Archive className="w-5 h-5" /> {currentWarehouse?.name} - Tồn Kho
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input placeholder="Tìm kiếm theo mã hàng hoặc tên hàng..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-2 border-gray-200" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 w-16">STT</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tên Danh Mục</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Tổng Số Lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryGroups.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-8 text-gray-500"><Archive className="w-16 h-16 mx-auto mb-2 text-gray-300" /><p>Không có sản phẩm tồn kho</p></td></tr>
                    ) : (
                      categoryGroups.map((group, index) => {
                        // Khi đang tìm kiếm, mọi danh mục có kết quả đều mở sẵn
                        const isOpen = isSearching || openCategory === group.name
                        return (
                          <Fragment key={group.name}>
                            <tr className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-center text-gray-600">{index + 1}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setOpenCategory(prev => prev === group.name ? null : group.name)}
                                  className="flex items-center gap-2 font-medium text-gray-800 hover:text-blue-600"
                                  title={isOpen ? 'Thu gọn' : 'Mở rộng'}
                                >
                                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  {group.name}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-gray-800">{group.total.toLocaleString()}</td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={3} className="p-0">
                                  <div className="bg-gray-50 p-4">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-gray-200">
                                          <th className="text-center py-2 px-4 font-semibold text-gray-700 w-16">STT</th>
                                          <th className="text-left py-2 px-4 font-semibold text-gray-700">Mã Hàng</th>
                                          <th className="text-left py-2 px-4 font-semibold text-gray-700">Tên Hàng</th>
                                          <th className="text-right py-2 px-4 font-semibold text-gray-700">Số Lượng</th>
                                          <th className="text-center py-2 px-4 font-semibold text-gray-700">Có Hình Ảnh</th>
                                          <th className="text-center py-2 px-4 font-semibold text-gray-700">Thông Tin</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.items.map((item, i) => (
                                          <tr key={item.id} className="border-b border-gray-200 hover:bg-white">
                                            <td className="py-3 px-4 text-center text-gray-600">{i + 1}</td>
                                            <td className="py-3 px-4"><span className="font-mono font-medium text-blue-600">{item.code}</span></td>
                                            <td className="py-3 px-4"><p className="font-medium text-gray-800">{item.name}</p></td>
                                            <td className="py-3 px-4 text-right font-medium text-gray-800">{item.quantity.toLocaleString()} {item.unit}</td>
                                            <td className="py-3 px-4 text-center">
                                              <Checkbox checked={!!item.productImage} disabled />
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              <Button variant="ghost" size="sm" onClick={() => handleViewDetail(item)} className="hover:bg-blue-100 text-blue-600"><Eye className="h-4 w-4 mr-1" /> Xem</Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detail Modal - Popup thông tin sản phẩm (mở rộng, bo tròn, có ảnh) */}
          {isDetailModalOpen && selectedProduct && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-sky-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Thông Tin Sản Phẩm</h2>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                {/* Tên + Mã sản phẩm */}
                <div className="mb-4 p-4 bg-sky-50 rounded-xl border border-sky-200">
                  <p className="text-lg font-bold text-gray-800">{selectedProduct.name}</p>
                  <p className="text-sm font-mono text-sky-600">{selectedProduct.code}</p>
                </div>
                {/* Ảnh sản phẩm */}
                {selectedProduct.productImage && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">📷 Hình ảnh sản phẩm</p>
                    <img src={selectedProduct.productImage} alt={selectedProduct.name} className="w-full h-64 object-cover rounded-xl border-2 border-blue-200" />
                  </div>
                )}
                {/* Ảnh vị trí */}
                {selectedProduct.locationImage && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">📍 Ảnh vị trí kho</p>
                    <img src={selectedProduct.locationImage} alt="Vị trí" className="w-full h-48 object-cover rounded-xl border-2 border-gray-200" />
                  </div>
                )}
                {/* Chi tiết */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">Đơn vị tính</p><p className="font-medium">{selectedProduct.unit}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">Số lượng tồn</p><p className="font-bold text-green-600">{selectedProduct.quantity.toLocaleString()} {selectedProduct.unit}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">Khối lượng</p><p className="font-medium">{selectedProduct.weight} - {selectedProduct.weightUnit}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">Vị trí</p><p className="font-medium">{selectedProduct.location}</p></div>
                  <div className="p-3 bg-gray-50 rounded-xl col-span-2"><p className="text-sm text-gray-500 mb-1">Ngày nhập liệu</p><p className="font-medium">{selectedProduct.importDate}</p></div>
                </div>
                <div className="flex gap-3 mt-6"><Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="flex-1">Đóng</Button></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
