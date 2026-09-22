'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Plus, Edit2, Trash2, Search, X, Save, Eye, Bell, AlertTriangle, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import { type Employee } from '@/lib/constants'
import { getEmployeesFromDB, createEmployee, updateEmployee, deleteEmployeeFromDB } from '@/lib/db'

const LOAI_HD_OPTIONS = ['Chính thức', 'Thử việc', 'Cộng tác viên', 'Thời vụ']
const GIOI_TINH_OPTIONS = ['Nam', 'Nữ']
const TRINH_DO_OPTIONS = ['Tiến sĩ', 'Thạc sĩ', 'Đại học', 'Cao đẳng', 'Trung cấp', 'Phổ thông']

const calcAge = (dob: string): number => {
  if (!dob) return 0
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)
}

const calcSeniority = (date: string): string => {
  if (!date) return '0'
  const years = Math.floor((Date.now() - new Date(date).getTime()) / 31557600000)
  const months = Math.floor(((Date.now() - new Date(date).getTime()) % 31557600000) / 2629800000)
  return years > 0 ? `${years} năm ${months} tháng` : `${months} tháng`
}

const isExpiringSoon = (date: string): boolean => {
  if (!date) return false
  const diff = new Date(date).getTime() - Date.now()
  return diff > 0 && diff <= 30 * 86400000
}

const isExpired = (date: string): boolean => {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

export default function HRPage() {
  const [user, setUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<Employee>({
    id: 0, hoTen: '', ngaySinh: '', gioiTinh: 'Nam', cccd: '', ngayCapCCCD: '', noiCapCCCD: '', soDienThoai: '',
    ngayThuViec: '', ngayChinhThuc: '', ngayHetHD: '', loaiHD: 'Chính thức', trinhDo: 'Đại học',
    chucVu: '', truongDaoTao: '', namTotNghiep: '', diaChi: '', username: '', ghiChu: '',
  })

  const loadEmployees = async () => {
    const data = await getEmployeesFromDB()
    setEmployees(data)
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    setUser(JSON.parse(userData))
    loadEmployees()
  }, [])

  const canManageHR = () => {
    if (!user) return false
    const perms = Array.isArray(user.chucNang) ? user.chucNang : [user.chucNang || '']
    return perms.includes('quan-ly-nhan-su') || perms.includes('them-tai-khoan') || user.isAdmin
  }

  const handleExportPDF = (emp: Employee) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    const canvas = document.createElement('canvas')
    const S = 2
    const CW = 794
    const CH = 1300
    canvas.width = CW * S
    canvas.height = CH * S
    const ctx = canvas.getContext('2d')!
    ctx.scale(S, S)

    const M = 24
    const innerW = CW - 2 * M
    const colors = {
      primary: '#0369a1',
      primaryLight: '#e0f2fe',
      primaryDark: '#075985',
      accent: '#0284c7',
      accentLight: '#f0f9ff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray700: '#374151',
      gray900: '#111827',
      white: '#ffffff',
    }

    const roundRect = (x: number, ry: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, ry)
      ctx.lineTo(x + w - r, ry)
      ctx.quadraticCurveTo(x + w, ry, x + w, ry + r)
      ctx.lineTo(x + w, ry + h - r)
      ctx.quadraticCurveTo(x + w, ry + h, x + w - r, ry + h)
      ctx.lineTo(x + r, ry + h)
      ctx.quadraticCurveTo(x, ry + h, x, ry + h - r)
      ctx.lineTo(x, ry + r)
      ctx.quadraticCurveTo(x, ry, x + r, ry)
      ctx.closePath()
    }

    const drawCard = (startY: number, title: string, icon: string, items: { label: string; value: string }[]): number => {
      let y = startY
      const cardX = M
      const cardW = innerW
      const padding = 16
      const rowH = 26
      const headerH = 36
      const totalH = headerH + items.length * rowH + padding * 2

      roundRect(cardX, y, cardW, totalH, 6)
      ctx.fillStyle = colors.white
      ctx.fill()
      ctx.strokeStyle = colors.gray200
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cardX + 6, y)
      ctx.lineTo(cardX + cardW - 6, y)
      ctx.quadraticCurveTo(cardX + cardW, y, cardX + cardW, y + 6)
      ctx.lineTo(cardX + cardW, y + headerH)
      ctx.lineTo(cardX, y + headerH)
      ctx.lineTo(cardX, y + 6)
      ctx.quadraticCurveTo(cardX, y, cardX + 6, y)
      ctx.closePath()
      ctx.fillStyle = colors.primaryLight
      ctx.fill()
      ctx.restore()

      ctx.font = 'bold 14px Arial, sans-serif'
      ctx.fillStyle = colors.primary
      ctx.textAlign = 'left'
      ctx.fillText(icon + '  ' + title, cardX + padding, y + 24)

      y += headerH + padding

      items.forEach((item, i) => {
        const rowY = y + i * rowH
        if (i % 2 === 0) {
          roundRect(cardX + 1, rowY - 12, cardW - 2, rowH, 3)
          ctx.fillStyle = colors.gray50
          ctx.fill()
        }

        ctx.font = 'bold 12px Arial, sans-serif'
        ctx.fillStyle = colors.gray500
        ctx.textAlign = 'left'
        ctx.fillText(item.label, cardX + padding + 2, rowY)

        ctx.font = '12px Arial, sans-serif'
        ctx.fillStyle = colors.gray900
        ctx.fillText(item.value || '---', cardX + padding + 130, rowY)
      })

      return y + items.length * rowH + padding
    }

    ctx.fillStyle = colors.white
    ctx.fillRect(0, 0, CW, CH)

    const headerH = 100
    ctx.fillStyle = colors.primary
    ctx.fillRect(0, 0, CW, headerH)

    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.arc(CW - 60, -20, 140, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(80, headerH + 30, 100, 0, Math.PI * 2)
    ctx.fill()

    ctx.textAlign = 'center'
    ctx.font = 'bold 26px Arial, sans-serif'
    ctx.fillStyle = colors.white
    ctx.fillText('HỒ SƠ NHÂN VIÊN', CW / 2, 36)
    ctx.font = '14px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText('CÔNG TY CP NƯỚC BIWASE - LONG AN', CW / 2, 56)

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(M + 40, 70)
    ctx.lineTo(CW - M - 40, 70)
    ctx.stroke()

    ctx.font = 'bold 18px Arial, sans-serif'
    ctx.fillStyle = colors.white
    ctx.fillText(emp.hoTen, CW / 2, 92)

    let y = headerH + 24

    ctx.textAlign = 'left'
    ctx.font = '13px Arial, sans-serif'
    ctx.fillStyle = colors.gray500
    ctx.fillText(`${emp.chucVu || 'Chưa cập nhật'}  •  ${emp.loaiHD}  •  ${calcAge(emp.ngaySinh)} tuổi`, M, y)

    y += 20

    y = drawCard(y, 'THÔNG TIN CÁ NHÂN', '📋', [
      { label: 'Họ và tên', value: emp.hoTen },
      { label: 'Ngày sinh', value: emp.ngaySinh ? new Date(emp.ngaySinh).toLocaleDateString('vi-VN') : '' },
      { label: 'Tuổi', value: `${calcAge(emp.ngaySinh)} tuổi` },
      { label: 'Giới tính', value: emp.gioiTinh },
      { label: 'Số điện thoại', value: emp.soDienThoai || '' },
      { label: 'CCCD / CMND', value: emp.cccd },
      { label: 'Ngày cấp', value: emp.ngayCapCCCD ? new Date(emp.ngayCapCCCD).toLocaleDateString('vi-VN') : '' },
      { label: 'Nơi cấp', value: emp.noiCapCCCD || '' },
    ])

    y += 10

    y = drawCard(y, 'THÔNG TIN CÔNG VIỆC', '💼', [
      { label: 'Ngày thử việc', value: emp.ngayThuViec ? new Date(emp.ngayThuViec).toLocaleDateString('vi-VN') : '' },
      { label: 'Ngày chính thức', value: emp.ngayChinhThuc ? new Date(emp.ngayChinhThuc).toLocaleDateString('vi-VN') : '' },
      { label: 'Ngày hết hạn HĐ', value: emp.ngayHetHD ? new Date(emp.ngayHetHD).toLocaleDateString('vi-VN') : '' },
      { label: 'Loại hợp đồng', value: emp.loaiHD },
      { label: 'Thâm niên', value: calcSeniority(emp.ngayChinhThuc || emp.ngayThuViec) },
    ])

    y += 10

    y = drawCard(y, 'HỌC VẤN & ĐÀO TẠO', '🎓', [
      { label: 'Trình độ', value: emp.trinhDo },
      { label: 'Chức vụ', value: emp.chucVu || '' },
      { label: 'Trường đào tạo', value: emp.truongDaoTao || '' },
      { label: 'Năm tốt nghiệp', value: emp.namTotNghiep || '' },
    ])

    y += 10

    y = drawCard(y, 'ĐỊA CHỈ LIÊN HỆ', '📍', [
      { label: 'Địa chỉ', value: emp.diaChi || '' },
    ])

    if (emp.ghiChu) {
      y += 10
      const noteX = M
      const noteW = innerW
      const noteLines = emp.ghiChu.split('\n')
      const noteH = 28 + noteLines.length * 14

      roundRect(noteX, y, noteW, noteH, 6)
      ctx.fillStyle = '#fffbeb'
      ctx.fill()
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.font = 'bold 13px Arial, sans-serif'
      ctx.fillStyle = '#92400e'
      ctx.textAlign = 'left'
      ctx.fillText('📝  GHI CHÚ', noteX + 14, y + 20)

      ctx.font = '12px Arial, sans-serif'
      ctx.fillStyle = colors.gray700
      noteLines.forEach((line, i) => {
        ctx.fillText(line, noteX + 14, y + 38 + i * 16)
      })

      y += noteH
    }

    const footerY = CH - 36
    ctx.strokeStyle = colors.gray200
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(M, footerY)
    ctx.lineTo(CW - M, footerY)
    ctx.stroke()

    ctx.font = '10px Arial, sans-serif'
    ctx.fillStyle = colors.gray400
    ctx.textAlign = 'left'
    ctx.fillText(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`, M, footerY + 14)
    ctx.textAlign = 'right'
    ctx.fillText('Hệ thống Quản lý Nhân sự BIWASE', CW - M, footerY + 14)

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    doc.save(`HoSo_${emp.hoTen.replace(/\s+/g, '_')}.pdf`)
  }

  const filteredEmployees = employees.filter(e => e.hoTen.toLowerCase().includes(searchTerm.toLowerCase()))
  const expiringContracts = employees.filter(e => isExpiringSoon(e.ngayHetHD))
  const expiredContracts = employees.filter(e => isExpired(e.ngayHetHD))
  const hasPermission = canManageHR()

  const handleAdd = () => {
    setEditingEmployee(null)
    setFormData({ id: 0, hoTen: '', ngaySinh: '', gioiTinh: 'Nam', cccd: '', ngayCapCCCD: '', noiCapCCCD: '', soDienThoai: '', ngayThuViec: '', ngayChinhThuc: '', ngayHetHD: '', loaiHD: 'Chính thức', trinhDo: 'Đại học', chucVu: '', truongDaoTao: '', namTotNghiep: '', diaChi: '', username: '', ghiChu: '' })
    setIsModalOpen(true)
  }

  const handleEdit = (emp: Employee) => { setEditingEmployee(emp); setFormData(emp); setIsModalOpen(true) }
  const handleView = (emp: Employee) => { setSelectedEmployee(emp); setIsDetailOpen(true) }

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      await deleteEmployeeFromDB(id)
      await loadEmployees()
    }
  }

  const handleSave = async () => {
    if (!formData.hoTen || !formData.chucVu) { alert('Vui lòng điền đầy đủ thông tin bắt buộc! (Họ tên, Chức vụ)'); return }
    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, formData)
    } else {
      await createEmployee(formData)
    }
    await loadEmployees()
    setIsModalOpen(false)
  }

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Quản Lý Nhân Sự</h1></div>

          {/* Cảnh báo hợp đồng sắp hết hạn */}
          {(expiringContracts.length > 0 || expiredContracts.length > 0) && (
            <div className="mb-6 space-y-3">
              {expiredContracts.map(emp => (
                <div key={`exp-${emp.id}`} className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                  <div><p className="font-semibold text-red-700">Hợp đồng đã hết hạn!</p><p className="text-sm text-red-600">{emp.hoTen} - Hết hạn: {new Date(emp.ngayHetHD).toLocaleDateString('vi-VN')}</p></div>
                </div>
              ))}
              {expiringContracts.map(emp => (
                <div key={`warn-${emp.id}`} className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <Bell className="w-6 h-6 text-amber-500 shrink-0" />
                  <div><p className="font-semibold text-amber-700">Hợp đồng sắp hết hạn!</p><p className="text-sm text-amber-600">{emp.hoTen} - Hết hạn: {new Date(emp.ngayHetHD).toLocaleDateString('vi-VN')} (còn {Math.ceil((new Date(emp.ngayHetHD).getTime() - Date.now()) / 86400000)} ngày)</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Tổng nhân viên</p><p className="text-2xl font-bold text-gray-800">{employees.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Chính thức</p><p className="text-2xl font-bold text-green-600">{employees.filter(e => e.loaiHD === 'Chính thức').length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Thử việc</p><p className="text-2xl font-bold text-amber-600">{employees.filter(e => e.loaiHD === 'Thử việc').length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Sắp hết HĐ</p><p className="text-2xl font-bold text-red-600">{expiringContracts.length + expiredContracts.length}</p></CardContent></Card>
          </div>

          {/* Employee List */}
          <Card className="border-l-4 border-l-indigo-600">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2 text-indigo-600"><Users className="w-5 h-5" /> Danh Sách Nhân Viên</CardTitle>
                {hasPermission && <Button onClick={handleAdd} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="h-4 w-4 mr-2" /> Thêm Nhân Viên</Button>}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input placeholder="Tìm kiếm theo họ và tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-2" /></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-center py-3 px-3 font-semibold text-gray-700 w-12">STT</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Họ và tên</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Chức vụ</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Loại HĐ</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Hết hạn HĐ</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Tuổi</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Thông tin</th>
                      {hasPermission && <th className="text-center py-3 px-3 font-semibold text-gray-700">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, index) => (
                      <tr key={emp.id} className={`border-b hover:bg-gray-50 ${isExpired(emp.ngayHetHD) ? 'bg-red-50' : isExpiringSoon(emp.ngayHetHD) ? 'bg-amber-50' : ''}`}>
                        <td className="py-3 px-3 text-center text-gray-600">{index + 1}</td>
                        <td className="py-3 px-3 font-medium text-gray-800">{emp.hoTen}</td>
                        <td className="py-3 px-3 text-gray-600">{emp.chucVu}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${emp.loaiHD === 'Chính thức' ? 'bg-green-100 text-green-700' : emp.loaiHD === 'Thử việc' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{emp.loaiHD}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {emp.ngayHetHD ? new Date(emp.ngayHetHD).toLocaleDateString('vi-VN') : '—'}
                          {isExpired(emp.ngayHetHD) && <span className="ml-1 text-xs text-red-600 font-bold">⚠ HẾT HẠN</span>}
                          {isExpiringSoon(emp.ngayHetHD) && <span className="ml-1 text-xs text-amber-600 font-bold">⏰ SẮP HẾT</span>}
                        </td>
                        <td className="py-3 px-3 text-center">{calcAge(emp.ngaySinh)}</td>
                        <td className="py-3 px-3 text-center">
                          {hasPermission && <Button variant="ghost" size="sm" onClick={() => handleView(emp)} className="hover:bg-blue-100 text-blue-600"><Eye className="w-4 h-4 mr-1" />Xem</Button>}
                        </td>
                        {hasPermission && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(emp)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(emp.id)} className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detail Modal */}
          {isDetailOpen && selectedEmployee && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-indigo-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Hồ Sơ Nhân Viên</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleExportPDF(selectedEmployee)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium cursor-pointer"><Download className="w-4 h-4" /> Xuất PDF</button>
                    <button onClick={() => setIsDetailOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                </div>
                <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                  <p className="text-lg font-bold text-gray-800">{selectedEmployee.hoTen}</p>
                  <p className="text-sm text-indigo-600">{selectedEmployee.chucVu} • {selectedEmployee.loaiHD}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['Ngày sinh', selectedEmployee.ngaySinh ? new Date(selectedEmployee.ngaySinh).toLocaleDateString('vi-VN') : '—'],
                    ['Tuổi', `${calcAge(selectedEmployee.ngaySinh)} tuổi`],
                    ['Giới tính', selectedEmployee.gioiTinh],
                    ['Số điện thoại', selectedEmployee.soDienThoai || '—'],
                    ['CCCD', selectedEmployee.cccd],
                    ['Ngày cấp CCCD', selectedEmployee.ngayCapCCCD ? new Date(selectedEmployee.ngayCapCCCD).toLocaleDateString('vi-VN') : '—'],
                    ['Nơi cấp CCCD', selectedEmployee.noiCapCCCD],
                    ['Ngày thử việc', selectedEmployee.ngayThuViec ? new Date(selectedEmployee.ngayThuViec).toLocaleDateString('vi-VN') : '—'],
                    ['Ngày chính thức', selectedEmployee.ngayChinhThuc ? new Date(selectedEmployee.ngayChinhThuc).toLocaleDateString('vi-VN') : '—'],
                    ['Ngày hết hạn HĐ', selectedEmployee.ngayHetHD ? new Date(selectedEmployee.ngayHetHD).toLocaleDateString('vi-VN') : '—'],
                    ['Loại HĐ', selectedEmployee.loaiHD],
                    ['Thâm niên', calcSeniority(selectedEmployee.ngayChinhThuc || selectedEmployee.ngayThuViec)],
                    ['Trình độ', selectedEmployee.trinhDo],
                    ['Chức vụ', selectedEmployee.chucVu],
                    ['Trường đào tạo', selectedEmployee.truongDaoTao],
                    ['Năm tốt nghiệp', selectedEmployee.namTotNghiep],
                    ['Địa chỉ', selectedEmployee.diaChi],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">{label}</p><p className="font-medium text-gray-800">{value || '—'}</p></div>
                  ))}
                </div>
                {selectedEmployee.ghiChu && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs text-amber-700 mb-1 font-semibold">Ghi chú</p>
                    <p className="font-medium text-gray-800 whitespace-pre-wrap">{selectedEmployee.ghiChu}</p>
                  </div>
                )}
                <div className="mt-6"><Button variant="outline" onClick={() => setIsDetailOpen(false)} className="w-full">Đóng</Button></div>
              </div>
            </div>
          )}

          {/* Add/Edit Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">{editingEmployee ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label><Input value={formData.hoTen} onChange={e => setFormData({...formData, hoTen: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label><Input type="date" value={formData.ngaySinh} onChange={e => setFormData({...formData, ngaySinh: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label><select value={formData.gioiTinh} onChange={e => setFormData({...formData, gioiTinh: e.target.value})} className="w-full p-2 border-2 rounded-lg">{GIOI_TINH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD</label><Input value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày cấp CCCD</label><Input type="date" value={formData.ngayCapCCCD} onChange={e => setFormData({...formData, ngayCapCCCD: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nơi cấp CCCD</label><Input value={formData.noiCapCCCD} onChange={e => setFormData({...formData, noiCapCCCD: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label><Input type="tel" value={formData.soDienThoai || ''} onChange={e => setFormData({...formData, soDienThoai: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày thử việc</label><Input type="date" value={formData.ngayThuViec} onChange={e => setFormData({...formData, ngayThuViec: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày chính thức</label><Input type="date" value={formData.ngayChinhThuc} onChange={e => setFormData({...formData, ngayChinhThuc: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn HĐ</label><Input type="date" value={formData.ngayHetHD} onChange={e => setFormData({...formData, ngayHetHD: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại HĐ</label><select value={formData.loaiHD} onChange={e => setFormData({...formData, loaiHD: e.target.value})} className="w-full p-2 border-2 rounded-lg">{LOAI_HD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Trình độ</label><select value={formData.trinhDo} onChange={e => setFormData({...formData, trinhDo: e.target.value})} className="w-full p-2 border-2 rounded-lg">{TRINH_DO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ *</label><Input value={formData.chucVu} onChange={e => setFormData({...formData, chucVu: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Trường đào tạo</label><Input value={formData.truongDaoTao} onChange={e => setFormData({...formData, truongDaoTao: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Năm tốt nghiệp</label><Input value={formData.namTotNghiep} onChange={e => setFormData({...formData, namTotNghiep: e.target.value})} className="border-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Liên kết TK</label><Input value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="username tài khoản..." className="border-2" /></div>
                  <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label><Input value={formData.diaChi} onChange={e => setFormData({...formData, diaChi: e.target.value})} className="border-2" /></div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea 
                      value={formData.ghiChu || ''} 
                      onChange={e => setFormData({...formData, ghiChu: e.target.value})} 
                      rows={3} 
                      placeholder="Nhập ghi chú về nhân viên này..." 
                      className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" 
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Hủy</Button>
                  <Button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700"><Save className="w-4 h-4 mr-2" />{editingEmployee ? 'Cập Nhật' : 'Tạo Mới'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
