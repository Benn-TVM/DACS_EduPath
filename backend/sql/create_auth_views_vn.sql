IF OBJECT_ID(N'dbo.NguoiDungHeThong', N'V') IS NOT NULL
    DROP VIEW dbo.NguoiDungHeThong;
GO

CREATE VIEW dbo.NguoiDungHeThong AS
SELECT
    id AS MaNguoiDung,
    username AS TenDangNhap,
    password AS MatKhau,
    first_name AS Ho,
    last_name AS Ten,
    email AS Email,
    is_superuser AS LaQuanTriToiCao,
    is_staff AS LaNhanVienHeThong,
    is_active AS DangHoatDong,
    last_login AS LanDangNhapCuoi,
    date_joined AS NgayThamGia
FROM dbo.auth_user;
GO

IF OBJECT_ID(N'dbo.NhomNguoiDung', N'V') IS NOT NULL
    DROP VIEW dbo.NhomNguoiDung;
GO

CREATE VIEW dbo.NhomNguoiDung AS
SELECT
    id AS MaNhom,
    name AS TenNhom
FROM dbo.auth_group;
GO

IF OBJECT_ID(N'dbo.QuyenHeThong', N'V') IS NOT NULL
    DROP VIEW dbo.QuyenHeThong;
GO

CREATE VIEW dbo.QuyenHeThong AS
SELECT
    p.id AS MaQuyen,
    p.name AS TenQuyen,
    p.codename AS MaDinhDanhQuyen,
    p.content_type_id AS MaLoaiNoiDung
FROM dbo.auth_permission AS p;
GO

IF OBJECT_ID(N'dbo.NguoiDung_ThuocNhom', N'V') IS NOT NULL
    DROP VIEW dbo.NguoiDung_ThuocNhom;
GO

CREATE VIEW dbo.NguoiDung_ThuocNhom AS
SELECT
    ug.id AS MaLienKet,
    ug.user_id AS MaNguoiDung,
    ug.group_id AS MaNhom
FROM dbo.auth_user_groups AS ug;
GO

IF OBJECT_ID(N'dbo.NguoiDung_Quyen', N'V') IS NOT NULL
    DROP VIEW dbo.NguoiDung_Quyen;
GO

CREATE VIEW dbo.NguoiDung_Quyen AS
SELECT
    up.id AS MaLienKet,
    up.user_id AS MaNguoiDung,
    up.permission_id AS MaQuyen
FROM dbo.auth_user_user_permissions AS up;
GO

IF OBJECT_ID(N'dbo.Nhom_Quyen', N'V') IS NOT NULL
    DROP VIEW dbo.Nhom_Quyen;
GO

CREATE VIEW dbo.Nhom_Quyen AS
SELECT
    gp.id AS MaLienKet,
    gp.group_id AS MaNhom,
    gp.permission_id AS MaQuyen
FROM dbo.auth_group_permissions AS gp;
GO
