// ==========================================
// DATA ACCESS LAYER - Tầng truy cập dữ liệu
// ==========================================
// File này tập trung TẤT CẢ thao tác CRUD với Supabase.
// Các page component chỉ cần import và gọi hàm,
// KHÔNG trực tiếp gọi supabase.from() ở page.
//
// CÁC BẢNG:
//   - accounts: Tài khoản người dùng
//   - products: Sản phẩm trong kho
//   - history_log: Lịch sử thao tác kho
//   - employees: Hồ sơ nhân viên
//
// STORAGE:
//   - Bucket 'images': Lưu ảnh sản phẩm + ảnh vị trí
// ==========================================

import { supabase } from './supabase'
import type { Account, Product, HistoryEntry, Employee } from './constants'

// ==========================================
// ACCOUNTS - Tài khoản
// ==========================================

/** Lấy tất cả tài khoản */
export async function getAccountsFromDB(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('id', { ascending: true })
  if (error) { console.error('getAccounts error:', error); return [] }
  // Map snake_case từ DB sang camelCase cho frontend
  return (data || []).map(mapAccountFromDB)
}

/** Tìm tài khoản theo username + password (login) */
export async function getAccountByCredentials(username: string, password: string): Promise<Account | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('status', 'active')
    .single()
  if (error || !data) return null
  return mapAccountFromDB(data)
}

/** Tạo tài khoản mới */
export async function createAccount(account: Omit<Account, 'id'>): Promise<Account | null> {
  const { data, error } = await supabase
    .from('accounts')
    .insert(mapAccountToDB(account))
    .select()
    .single()
  if (error) { console.error('createAccount error:', error); return null }
  return mapAccountFromDB(data)
}

/** Cập nhật tài khoản */
export async function updateAccount(id: number, updates: Partial<Account>): Promise<boolean> {
  const dbUpdates: any = {}
  if (updates.username !== undefined) dbUpdates.username = updates.username
  if (updates.password !== undefined) dbUpdates.password = updates.password
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.chucVu !== undefined) dbUpdates.chuc_vu = updates.chucVu
  if (updates.chucNang !== undefined) dbUpdates.chuc_nang = updates.chucNang
  if (updates.status !== undefined) dbUpdates.status = updates.status

  const { error } = await supabase
    .from('accounts')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateAccount error:', error); return false }
  return true
}

/** Xóa tài khoản */
export async function deleteAccountFromDB(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteAccount error:', error); return false }
  return true
}

// ==========================================
// PRODUCTS - Sản phẩm trong kho
// ==========================================

/** Lấy sản phẩm theo kho (chỉ lấy chưa bị xóa) */
export async function getProductsByWarehouse(warehouseId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) { console.error('getProducts error:', error); return [] }
  return (data || []).map(mapProductFromDB)
}

/** Lấy tất cả sản phẩm (cho tồn kho) */
export async function getAllProducts(): Promise<Record<string, Product[]>> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
  if (error) { console.error('getAllProducts error:', error); return {} }

  // Gom theo warehouse_id
  const grouped: Record<string, Product[]> = {}
  for (const row of data || []) {
    const wid = row.warehouse_id
    if (!grouped[wid]) grouped[wid] = []
    grouped[wid].push(mapProductFromDB(row))
  }
  return grouped
}

/** Tạo sản phẩm mới (nhập liệu) */
export async function createProduct(product: Omit<Product, 'id'> & { warehouseId: string }): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      warehouse_id: product.warehouseId,
      code: product.code,
      name: product.name,
      unit: product.unit,
      quantity: product.quantity,
      price_in: product.priceIn,
      price_out: product.priceOut,
      weight: product.weight,
      weight_unit: product.weightUnit || 'kg',
      location: product.location,
      location_image_url: product.locationImage || null,
      product_image_url: product.productImage || null,
      import_date: product.importDate || null,
    })
    .select()
    .single()
  if (error) { console.error('createProduct error:', error); return null }
  return mapProductFromDB(data)
}

/** Cập nhật sản phẩm */
export async function updateProduct(id: number, updates: Partial<Product>): Promise<boolean> {
  const dbUpdates: any = {}
  if (updates.code !== undefined) dbUpdates.code = updates.code
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.unit !== undefined) dbUpdates.unit = updates.unit
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
  if (updates.priceIn !== undefined) dbUpdates.price_in = updates.priceIn
  if (updates.priceOut !== undefined) dbUpdates.price_out = updates.priceOut
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight
  if (updates.weightUnit !== undefined) dbUpdates.weight_unit = updates.weightUnit
  if (updates.location !== undefined) dbUpdates.location = updates.location
  if (updates.locationImage !== undefined) dbUpdates.location_image_url = updates.locationImage
  if (updates.productImage !== undefined) dbUpdates.product_image_url = updates.productImage
  if (updates.importDate !== undefined) dbUpdates.import_date = updates.importDate

  const { error } = await supabase
    .from('products')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateProduct error:', error); return false }
  return true
}

/** Xóa sản phẩm (soft delete) */
export async function deleteProduct(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({ is_deleted: true })
    .eq('id', id)
  if (error) { console.error('deleteProduct error:', error); return false }
  return true
}

// ==========================================
// HISTORY LOG - Lịch sử thao tác kho
// ==========================================

/** Lấy toàn bộ lịch sử */
export async function getHistoryLog(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('history_log')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('getHistoryLog error:', error); return [] }
  return (data || []).map(mapHistoryFromDB)
}

/** Thêm bản ghi lịch sử */
export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('history_log')
    .insert({
      date: entry.date,
      time: entry.time,
      warehouse: entry.warehouse,
      product_code: entry.productCode,
      product_name: entry.productName,
      user_name: entry.userName,
      action: entry.action,
      quantity: entry.quantity,
      details: entry.details,
    })
  if (error) { console.error('addHistoryEntry error:', error); return false }
  return true
}

// ==========================================
// EMPLOYEES - Nhân viên
// ==========================================

/** Lấy tất cả nhân viên */
export async function getEmployeesFromDB(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('id', { ascending: true })
  if (error) { console.error('getEmployees error:', error); return [] }
  return (data || []).map(mapEmployeeFromDB)
}

/** Tìm nhân viên theo username (cho dashboard) */
export async function getEmployeeByUsername(username: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('username', username)
    .single()
  if (error || !data) return null
  return mapEmployeeFromDB(data)
}

/** Tạo nhân viên mới */
export async function createEmployee(emp: Omit<Employee, 'id'>): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .insert(mapEmployeeToDB(emp))
    .select()
    .single()
  if (error) { console.error('createEmployee error:', error); return null }
  return mapEmployeeFromDB(data)
}

/** Cập nhật nhân viên */
export async function updateEmployee(id: number, emp: Partial<Employee>): Promise<boolean> {
  const dbUpdates: any = {}
  if (emp.hoTen !== undefined) dbUpdates.ho_ten = emp.hoTen
  if (emp.ngaySinh !== undefined) dbUpdates.ngay_sinh = emp.ngaySinh || null
  if (emp.gioiTinh !== undefined) dbUpdates.gioi_tinh = emp.gioiTinh || null
  if (emp.cccd !== undefined) dbUpdates.cccd = emp.cccd || null
  if (emp.ngayCapCCCD !== undefined) dbUpdates.ngay_cap_cccd = emp.ngayCapCCCD || null
  if (emp.noiCapCCCD !== undefined) dbUpdates.noi_cap_cccd = emp.noiCapCCCD || null
  if (emp.soDienThoai !== undefined) dbUpdates.so_dien_thoai = emp.soDienThoai || null
  if (emp.ngayThuViec !== undefined) dbUpdates.ngay_thu_viec = emp.ngayThuViec || null
  if (emp.ngayChinhThuc !== undefined) dbUpdates.ngay_chinh_thuc = emp.ngayChinhThuc || null
  if (emp.ngayHetHD !== undefined) dbUpdates.ngay_het_hd = emp.ngayHetHD || null
  if (emp.loaiHD !== undefined) dbUpdates.loai_hd = emp.loaiHD || null
  if (emp.trinhDo !== undefined) dbUpdates.trinh_do = emp.trinhDo
  if (emp.chuyenNganh !== undefined) dbUpdates.chuyen_nganh = emp.chuyenNganh
  if (emp.truongDaoTao !== undefined) dbUpdates.truong_dao_tao = emp.truongDaoTao
  if (emp.namTotNghiep !== undefined) dbUpdates.nam_tot_nghiep = emp.namTotNghiep
  if (emp.diaChi !== undefined) dbUpdates.dia_chi = emp.diaChi
  if (emp.username !== undefined) dbUpdates.username = emp.username
  if (emp.ghiChu !== undefined) dbUpdates.ghi_chu = emp.ghiChu

  const { error } = await supabase
    .from('employees')
    .update(dbUpdates)
    .eq('id', id)
  if (error) { console.error('updateEmployee error:', error); return false }
  return true
}

/** Xóa nhân viên */
export async function deleteEmployeeFromDB(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteEmployee error:', error); return false }
  return true
}

// ==========================================
// IMAGE UPLOAD - Upload ảnh lên Supabase Storage
// ==========================================

/** Upload file ảnh, trả về public URL */
export async function uploadImage(file: File, folder: string = 'products'): Promise<string | null> {
  // Tạo tên file unique bằng timestamp
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (error) { console.error('uploadImage error:', error); return null }

  // Lấy public URL
  const { data } = supabase.storage.from('images').getPublicUrl(fileName)
  return data.publicUrl
}

/** Xóa ảnh từ Storage (dựa trên URL) */
export async function deleteImage(url: string): Promise<void> {
  if (!url || !url.includes('/storage/v1/object/public/images/')) return
  const path = url.split('/storage/v1/object/public/images/')[1]
  if (path) {
    await supabase.storage.from('images').remove([path])
  }
}

// ==========================================
// MAPPERS - Chuyển đổi snake_case ↔ camelCase
// ==========================================
// Supabase PostgreSQL dùng snake_case (chuc_vu)
// Frontend React dùng camelCase (chucVu)
// Các hàm map dưới đây chuyển đổi 2 chiều
// ==========================================

function mapAccountFromDB(row: any): Account {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    chucVu: row.chuc_vu || '',
    chucNang: row.chuc_nang || ['xem-co-ban'],
    status: row.status || 'active',
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    isAdmin: row.is_admin || false,
  }
}

function mapAccountToDB(acc: any): any {
  return {
    username: acc.username,
    password: acc.password,
    name: acc.name,
    chuc_vu: acc.chucVu || '',
    chuc_nang: acc.chucNang || ['xem-co-ban'],
    status: acc.status || 'active',
    is_admin: acc.isAdmin || false,
  }
}

function mapProductFromDB(row: any): Product {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name || '',
    unit: row.unit || '',
    quantity: row.quantity || 0,
    priceIn: row.price_in || 0,
    priceOut: row.price_out || 0,
    weight: parseFloat(row.weight) || 0,
    weightUnit: row.weight_unit || 'kg',
    location: row.location || '',
    locationImage: row.location_image_url || '',
    productImage: row.product_image_url || '',
    importDate: row.import_date || '',
  }
}

function mapHistoryFromDB(row: any): HistoryEntry {
  return {
    date: row.date || '',
    time: row.time || '',
    warehouse: row.warehouse || '',
    productCode: row.product_code || '',
    productName: row.product_name || '',
    userName: row.user_name || '',
    action: row.action || '',
    quantity: row.quantity || 0,
    details: row.details || '',
  }
}

function mapEmployeeFromDB(row: any): Employee {
  return {
    id: row.id,
    hoTen: row.ho_ten || '',
    ngaySinh: row.ngay_sinh || '',
    gioiTinh: row.gioi_tinh || '',
    cccd: row.cccd || '',
    ngayCapCCCD: row.ngay_cap_cccd || '',
    noiCapCCCD: row.noi_cap_cccd || '',
    soDienThoai: row.so_dien_thoai || '',
    ngayThuViec: row.ngay_thu_viec || '',
    ngayChinhThuc: row.ngay_chinh_thuc || '',
    ngayHetHD: row.ngay_het_hd || '',
    loaiHD: row.loai_hd || '',
    trinhDo: row.trinh_do || '',
    chuyenNganh: row.chuyen_nganh || '',
    truongDaoTao: row.truong_dao_tao || '',
    namTotNghiep: row.nam_tot_nghiep || '',
    diaChi: row.dia_chi || '',
    username: row.username || '',
    ghiChu: row.ghi_chu || '',
  }
}

function mapEmployeeToDB(emp: any): any {
  return {
    ho_ten: emp.hoTen,
    ngay_sinh: emp.ngaySinh || null,
    gioi_tinh: emp.gioiTinh || null,
    cccd: emp.cccd || null,
    ngay_cap_cccd: emp.ngayCapCCCD || null,
    noi_cap_cccd: emp.noiCapCCCD || null,
    so_dien_thoai: emp.soDienThoai || null,
    ngay_thu_viec: emp.ngayThuViec || null,
    ngay_chinh_thuc: emp.ngayChinhThuc || null,
    ngay_het_hd: emp.ngayHetHD || null,
    loai_hd: emp.loaiHD || null,
    trinh_do: emp.trinhDo || null,
    chuyen_nganh: emp.chuyenNganh || null,
    truong_dao_tao: emp.truongDaoTao || null,
    nam_tot_nghiep: emp.namTotNghiep || null,
    dia_chi: emp.diaChi || null,
    username: emp.username || null,
    ghi_chu: emp.ghiChu || null,
  }
}
