Đây là bản tổng hợp chi tiết toàn bộ dự án (Product Design Specification). Bản tài liệu này đóng vai trò là "xương sống" để đội ngũ kỹ thuật (Dev Team) và thiết kế (Product Team) có thể bắt tay vào xây dựng sản phẩm.

HỒ SƠ THIẾT KẾ SẢN PHẨM: FINEXCEL PRO (Tên dự kiến)
Mô hình: Hybrid Spreadsheet Accounting System (Kế toán lai bảng tính)

1. Triết lý sản phẩm & Giá trị cốt lõi
Tầm nhìn: Xóa bỏ ranh giới giữa sự linh hoạt của Excel và sự chặt chẽ của phần mềm kế toán.

Đối tượng mục tiêu: Kế toán dịch vụ (Service Accountants) – Những người cần xử lý khối lượng dữ liệu lớn cho nhiều công ty với tốc độ cao nhất.

Nguyên tắc thiết kế (Design Principles):

Excel-First Interface: Giao diện lưới (Grid) là trung tâm. Không dùng form nhập liệu pop-up truyền thống.

Zero-Entry (Không nhập tay): Ưu tiên Import và Auto-mapping. Bàn phím chỉ dùng để sửa lỗi (Review), không dùng để gõ từ đầu.

Flexible but Strict: Cho phép nhập liệu tự do ở vùng đệm (Staging), nhưng kiểm soát chặt chẽ khi ghi sổ (Posting).

2. Luồng hoạt động (Operational Workflow)
Hệ thống hoạt động theo cơ chế "Phễu lọc 3 bước":

Bước 1: Ingest (Nạp dữ liệu thô)
Hành động: User kéo thả file XML (Hóa đơn), Excel (Sao kê ngân hàng), CSV vào hệ thống.

Hệ thống: Đọc file, giữ nguyên dữ liệu gốc, đẩy vào bảng tạm (Staging). Chưa kiểm tra đúng sai kế toán.

Bước 2: Refine (Tinh chỉnh trên Grid) - Giai đoạn quan trọng nhất
Giao diện: Hiển thị dữ liệu lên lưới Excel.

Tự động hóa: Hệ thống chạy thuật toán "Smart Mapping" để điền sẵn TK Nợ/Có, Mã đối tượng.

Tương tác người dùng:

Các dòng Xanh (Valid): Bỏ qua.

Các dòng Đỏ (Error): User lọc ra, dùng thao tác "Kéo công thức" (Drag-fill) hoặc "Find & Replace" để sửa hàng loạt.

Ví dụ: Lọc toàn bộ nội dung "Phí chuyển tiền", điền 6425 vào ô đầu, click đúp để điền cho 100 dòng dưới.

Bước 3: Post (Ghi sổ cái)
Hành động: User nhấn nút "GHI SỔ".

Hệ thống:

Validate lần cuối (Cân bằng Nợ/Có, Mã tồn tại).

Chuyển dữ liệu từ Staging sang General Ledger.

Khóa dòng dữ liệu (không cho sửa tùy tiện nữa).

Cập nhật số dư các tài khoản ngay lập tức.

3. Kiến trúc Cơ sở dữ liệu (Database Schema)
Sử dụng PostgreSQL để đảm bảo hiệu năng và tính linh hoạt (JSONB).

A. Bảng Vùng đệm (Staging Table)
Nơi chứa dữ liệu đang thao tác trên lưới Excel.

SQL

CREATE TABLE staging_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,             -- Mã lô nhập liệu (để quản lý theo đợt)
    row_index INT,                      -- Thứ tự dòng hiển thị trên Grid
    
    -- Dữ liệu hiển thị trên Grid (Cho phép Null để user điền sau)
    trx_date DATE,
    doc_no VARCHAR(50),                 -- Số chứng từ (PC001,...)
    description TEXT,
    debit_acc VARCHAR(20),              -- TK Nợ
    credit_acc VARCHAR(20),             -- TK Có
    amount DECIMAL(15, 2),
    partner_code VARCHAR(50),           -- Mã đối tượng
    
    -- Trạng thái & Logic
    is_valid BOOLEAN DEFAULT FALSE,     -- True = Hiện màu xanh, False = Hiện màu đỏ
    error_log TEXT,                     -- Lý do lỗi (để hiện tooltip)
    
    -- Dữ liệu gốc (Dùng JSONB để lưu mọi cột thừa từ Excel/XML gốc)
    raw_data JSONB                      
);

-- Index để load Grid nhanh
CREATE INDEX idx_staging_batch ON staging_transactions(batch_id, row_index);
B. Bảng Sổ cái (General Ledger - Core)
Nơi chứa dữ liệu kế toán chính thức ("Source of Truth").

SQL

CREATE TABLE general_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trx_date DATE NOT NULL,
    posted_at TIMESTAMP DEFAULT NOW(),
    
    doc_no VARCHAR(50),
    description TEXT,
    
    -- Định khoản (Bắt buộc có dữ liệu)
    account_code VARCHAR(20) NOT NULL,  -- Tài khoản chính (để lên Sổ cái, CĐPS)
    reciprocal_acc VARCHAR(20),         -- Tài khoản đối ứng (để làm Sổ chi tiết)
    
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    
    partner_code VARCHAR(50),
    
    -- Truy vết
    origin_staging_id UUID              -- Link ngược về dòng Staging gốc
);

CREATE INDEX idx_gl_date ON general_ledger(trx_date);
CREATE INDEX idx_gl_account ON general_ledger(account_code);
C. Bảng Quy tắc Tự động (Automation Rules)
SQL

CREATE TABLE mapping_rules (
    id UUID PRIMARY KEY,
    keyword VARCHAR(100),               -- VD: "phí duy trì", "xăng dầu"
    
    -- Hành động gán tự động
    target_debit VARCHAR(20),           -- Tự điền Nợ 642
    target_credit VARCHAR(20),          -- Tự điền Có 112
    target_partner VARCHAR(50),         -- Tự điền Mã NCC
    
    priority INT DEFAULT 1              -- Độ ưu tiên
);
4. Logic Xử lý & Giao diện (Frontend Logic)
Giao diện Grid (UI Specifications)
Thư viện đề xuất: AG Grid Enterprise hoặc Handsontable.

Các cột bắt buộc:

Status (Icon): 🔴 (Lỗi), 🟡 (Cảnh báo), 🟢 (Sẵn sàng).

Ngày CT, Số CT: Format chuẩn Date/String.

TK Nợ / TK Có: Dropdown có tính năng Search (gõ "tiền" ra 111, 112).

Số tiền: Format phân cách hàng nghìn, căn phải.

Tính năng Excel bắt buộc:

Drag-handle: Kéo góc ô để copy dữ liệu xuống dưới.

Keyboard Navigation: Di chuyển bằng phím mũi tên.

Paste Special: Paste dữ liệu từ Excel ngoài vào, tự động map cột.

Logic "Smart Mapping" (Backend Job)
Khi file được upload, server chạy luồng sau:

Normalization: Chuẩn hóa chuỗi (viết thường, bỏ dấu tiếng Việt để so sánh).

Lookup:

Quét mapping_rules: Nếu description chứa keyword -> Gán target_debit/credit.

Quét partners: Nếu tax_code (trong XML) khớp -> Gán partner_code.

Validation:

Kiểm tra account_code có trong chart_of_accounts không?

Kiểm tra debit = credit (nếu tách dòng)?

Nếu sai -> Update is_valid = false, error_log = "Mã TK không tồn tại".