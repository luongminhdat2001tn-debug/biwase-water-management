-- 1. Thêm cột ghi_chu vào bảng employees (chỉ định rõ schema public)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ghi_chu TEXT;

-- 2. Xóa cột ghi_chu ở bảng accounts (bỏ qua nếu không có)
ALTER TABLE public.accounts DROP COLUMN IF EXISTS ghi_chu;

-- 3. Bắt buộc Supabase làm mới lại cache schema
NOTIFY pgrst, 'reload schema';
