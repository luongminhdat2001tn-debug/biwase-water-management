'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Briefcase, GraduationCap, Calendar, MapPin, CreditCard, Clock, Phone, FileText } from 'lucide-react'
import { type Employee } from '@/lib/constants'
import { getEmployeeByUsername } from '@/lib/db'

const calcAge = (dob: string): number => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : 0

const calcSeniority = (date: string): string => {
  if (!date) return '0 tháng'
  const y = Math.floor((Date.now() - new Date(date).getTime()) / 31557600000)
  const m = Math.floor(((Date.now() - new Date(date).getTime()) % 31557600000) / 2629800000)
  return y > 0 ? `${y} năm ${m} tháng` : `${m} tháng`
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { window.location.href = '/'; return }
    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)

    // Tìm nhân viên theo username đang đăng nhập (từ Supabase)
    getEmployeeByUsername(parsedUser.username).then(emp => {
      if (emp) setEmployee(emp)
    })
  }, [])

  if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const displayName = employee?.hoTen || user.name || user.username

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="mb-8"><h1 className="text-3xl font-bold text-gray-800">Thông Tin Nhân Viên</h1></div>

          {/* Profile Header */}
          <Card className="mb-6 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-sky-500 to-blue-600 relative">
              <div className="absolute -bottom-12 left-8">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                  <User className="w-12 h-12 text-sky-600" />
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-6 px-8">
              <h2 className="text-2xl font-bold text-gray-800">{displayName}</h2>
              <p className="text-sky-600 font-medium">{employee?.chucVu || user.chucVu || 'Nhân viên'}</p>
              {employee && <p className="text-sm text-gray-500 mt-1">{employee.loaiHD} • {employee.trinhDo}</p>}
            </CardContent>
          </Card>

          {employee ? (
            /* Hiển thị đầy đủ thông tin nếu có data nhân sự */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Thông tin cá nhân */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-sky-600"><User className="w-5 h-5" /> Thông Tin Cá Nhân</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ['Họ và tên', employee.hoTen],
                    ['Ngày sinh', employee.ngaySinh ? `${new Date(employee.ngaySinh).toLocaleDateString('vi-VN')} (${calcAge(employee.ngaySinh)} tuổi)` : '—'],
                    ['Giới tính', employee.gioiTinh],
                    ['Số điện thoại', employee.soDienThoai || '—'],
                    ['CCCD', employee.cccd],
                    ['Ngày cấp', employee.ngayCapCCCD ? new Date(employee.ngayCapCCCD).toLocaleDateString('vi-VN') : '—'],
                    ['Nơi cấp', employee.noiCapCCCD],
                    ['Địa chỉ', employee.diaChi],
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-start border-b border-gray-100 pb-2"><span className="text-sm text-gray-500 w-28 shrink-0">{l}</span><span className="text-sm font-medium text-gray-800">{v || '—'}</span></div>
                  ))}
                </CardContent>
              </Card>

              {/* Thông tin công việc */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><Briefcase className="w-5 h-5" /> Thông Tin Công Việc</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ['Ngày thử việc', employee.ngayThuViec ? new Date(employee.ngayThuViec).toLocaleDateString('vi-VN') : '—'],
                    ['Ngày chính thức', employee.ngayChinhThuc ? new Date(employee.ngayChinhThuc).toLocaleDateString('vi-VN') : '—'],
                    ['Hết hạn HĐ', employee.ngayHetHD ? new Date(employee.ngayHetHD).toLocaleDateString('vi-VN') : '—'],
                    ['Loại HĐ', employee.loaiHD],
                    ['Thâm niên', calcSeniority(employee.ngayChinhThuc || employee.ngayThuViec)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex items-start border-b border-gray-100 pb-2"><span className="text-sm text-gray-500 w-28 shrink-0">{l}</span><span className="text-sm font-medium text-gray-800">{v || '—'}</span></div>
                  ))}
                </CardContent>
              </Card>

              {/* Thông tin học vấn */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2 text-indigo-600"><GraduationCap className="w-5 h-5" /> Trình Độ Học Vấn</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['Trình độ', employee.trinhDo],
                      ['Chức vụ', employee.chucVu],
                      ['Trường đào tạo', employee.truongDaoTao],
                      ['Năm tốt nghiệp', employee.namTotNghiep],
                    ].map(([l, v]) => (
                      <div key={l} className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500 mb-1">{l}</p><p className="font-medium text-gray-800">{v || '—'}</p></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Fallback nếu chưa có data nhân sự */
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Chưa có hồ sơ nhân sự</p>
                <p className="text-sm">Liên hệ bộ phận Quản lý nhân sự để cập nhật thông tin cá nhân.</p>
              </CardContent>
            </Card>
          )}

          {/* ===== Card Ghi Chú từ nhân sự ===== */}
          {employee?.ghiChu && (
            <Card className="mt-6 border-l-4 border-l-amber-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <FileText className="w-5 h-5" /> Ghi Chú
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 min-h-[80px]">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{employee.ghiChu}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
