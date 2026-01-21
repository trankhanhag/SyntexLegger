const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DBSOURCE = "db_v2.sqlite";
const DEFAULT_ADMIN_USER = process.env.DEFAULT_ADMIN_USER || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';

// ========================================
// HỆ THỐNG TÀI KHOẢN HÀNH CHÍNH SỰ NGHIỆP  
// Theo Thông tư 24/2024/TT-BTC (Hiệu lực từ 01/01/2025)
// ========================================
const { ALL_ACCOUNTS_TT24 } = require('./hcsn_tt24_accounts');

// Old DN Chart of Accounts (TT 200/2014) - COMMENTED OUT
/* const DEFAULT_ACCOUNTS = [
    // LOẠI 1: TÀI SẢN NGẮN HẠN
    { code: '111', name: 'Tiền mặt', category: 'TÀI SẢN' },
    { code: '1111', name: 'Tiền Việt Nam', category: 'TÀI SẢN' },
    { code: '1112', name: 'Ngoại tệ', category: 'TÀI SẢN' },
    { code: '1113', name: 'Vàng tiền tệ', category: 'TÀI SẢN' },
    { code: '112', name: 'Tiền gửi ngân hàng', category: 'TÀI SẢN' },
    { code: '1121', name: 'Tiền Việt Nam', category: 'TÀI SẢN' },
    { code: '1122', name: 'Ngoại tệ', category: 'TÀI SẢN' },
    { code: '1123', name: 'Vàng tiền tệ', category: 'TÀI SẢN' },
    { code: '113', name: 'Tiền đang chuyển', category: 'TÀI SẢN' },
    { code: '121', name: 'Chứng khoán kinh doanh', category: 'TÀI SẢN' },
    { code: '128', name: 'Đầu tư nắm giữ đến ngày đáo hạn', category: 'TÀI SẢN' },
    { code: '131', name: 'Phải thu của khách hàng', category: 'TÀI SẢN' },
    { code: '133', name: 'Thuế GTGT được khấu trừ', category: 'TÀI SẢN' },
    { code: '1331', name: 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', category: 'TÀI SẢN' },
    { code: '1332', name: 'Thuế GTGT được khấu trừ của tài sản cố định', category: 'TÀI SẢN' },
    { code: '136', name: 'Phải thu nội bộ', category: 'TÀI SẢN' },
    { code: '138', name: 'Phải thu khác', category: 'TÀI SẢN' },
    { code: '141', name: 'Tạm ứng', category: 'TÀI SẢN' },
    { code: '151', name: 'Hàng mua đang đi đường', category: 'TÀI SẢN' },
    { code: '152', name: 'Nguyên liệu, vật liệu', category: 'TÀI SẢN' },
    { code: '153', name: 'Công cụ, dụng cụ', category: 'TÀI SẢN' },
    { code: '154', name: 'Chi phí sản xuất, kinh doanh dở dang', category: 'TÀI SẢN' },
    { code: '155', name: 'Thành phẩm', category: 'TÀI SẢN' },
    { code: '156', name: 'Hàng hóa', category: 'TÀI SẢN' },
    { code: '1561', name: 'Giá mua hàng hóa', category: 'TÀI SẢN' },
    { code: '1562', name: 'Chi phí thu mua hàng hóa', category: 'TÀI SẢN' },
    { code: '1567', name: 'Hàng hóa bất động sản', category: 'TÀI SẢN' },
    { code: '157', name: 'Hàng gửi đi bán', category: 'TÀI SẢN' },
    { code: '158', name: 'Hàng hóa kho bảo thuế', category: 'TÀI SẢN' },

    // LOẠI 2: TÀI SẢN DÀI HẠN
    { code: '211', name: 'Tài sản cố định hữu hình', category: 'TÀI SẢN' },
    { code: '212', name: 'Tài sản cố định thuê tài chính', category: 'TÀI SẢN' },
    { code: '213', name: 'Tài sản cố định vô hình', category: 'TÀI SẢN' },
    { code: '214', name: 'Hao mòn tài sản cố định', category: 'TÀI SẢN' },
    { code: '217', name: 'Bất động sản đầu tư', category: 'TÀI SẢN' },
    { code: '221', name: 'Đầu tư vào công ty con', category: 'TÀI SẢN' },
    { code: '222', name: 'Đầu tư vào công ty liên doanh, liên kết', category: 'TÀI SẢN' },
    { code: '228', name: 'Đầu tư góp vốn vào đơn vị khác', category: 'TÀI SẢN' },
    { code: '229', name: 'Dự phòng tổn thất tài sản', category: 'TÀI SẢN' },
    { code: '241', name: 'Chi phí xây dựng cơ bản dở dang', category: 'TÀI SẢN' },
    { code: '242', name: 'Chi phí trả trước', category: 'TÀI SẢN' },
    { code: '243', name: 'Tài sản thuế thu nhập hoãn lại', category: 'TÀI SẢN' },
    { code: '244', name: 'Cầm cố, thế chấp, ký quỹ, ký cược', category: 'TÀI SẢN' },

    // LOẠI 3: NỢ PHẢI TRẢ
    { code: '331', name: 'Phải trả cho người bán', category: 'NỢ PHẢI TRẢ' },
    { code: '333', name: 'Thuế và các khoản phải nộp Nhà nước', category: 'NỢ PHẢI TRẢ' },
    { code: '3331', name: 'Thuế giá trị gia tăng phải nộp', category: 'NỢ PHẢI TRẢ' },
    { code: '33311', name: 'Thuế GTGT đầu ra', category: 'NỢ PHẢI TRẢ' },
    { code: '33312', name: 'Thuế GTGT hàng nhập khẩu', category: 'NỢ PHẢI TRẢ' },
    { code: '3332', name: 'Thuế tiêu thụ đặc biệt', category: 'NỢ PHẢI TRẢ' },
    { code: '3333', name: 'Thuế xuất, nhập khẩu', category: 'NỢ PHẢI TRẢ' },
    { code: '3334', name: 'Thuế thu nhập doanh nghiệp', category: 'NỢ PHẢI TRẢ' },
    { code: '3335', name: 'Thuế thu nhập cá nhân', category: 'NỢ PHẢI TRẢ' },
    { code: '3338', name: 'Các loại thuế khác', category: 'NỢ PHẢI TRẢ' },
    { code: '3339', name: 'Phí, lệ phí và các khoản phải nộp khác', category: 'NỢ PHẢI TRẢ' },
    { code: '334', name: 'Phải trả người lao động', category: 'NỢ PHẢI TRẢ' },
    { code: '335', name: 'Chi phí phải trả', category: 'NỢ PHẢI TRẢ' },
    { code: '336', name: 'Phải trả nội bộ', category: 'NỢ PHẢI TRẢ' },
    { code: '338', name: 'Phải trả, phải nộp khác', category: 'NỢ PHẢI TRẢ' },
    { code: '3381', name: 'Tài sản thừa chờ giải quyết', category: 'NỢ PHẢI TRẢ' },
    { code: '3382', name: 'Kinh phí công đoàn', category: 'NỢ PHẢI TRẢ' },
    { code: '3383', name: 'Bảo hiểm xã hội', category: 'NỢ PHẢI TRẢ' },
    { code: '3384', name: 'Bảo hiểm y tế', category: 'NỢ PHẢI TRẢ' },
    { code: '3386', name: 'Bảo hiểm thất nghiệp', category: 'NỢ PHẢI TRẢ' },
    { code: '341', name: 'Vay và nợ thuê tài chính', category: 'NỢ PHẢI TRẢ' },
    { code: '343', name: 'Trái phiếu phát hành', category: 'NỢ PHẢI TRẢ' },
    { code: '352', name: 'Dự phòng phải trả', category: 'NỢ PHẢI TRẢ' },
    { code: '353', name: 'Quỹ khen thưởng, phúc lợi', category: 'NỢ PHẢI TRẢ' },
    { code: '356', name: 'Quỹ phát triển khoa học và công nghệ', category: 'NỢ PHẢI TRẢ' },

    // LOẠI 4: VỐN CHỦ SỞ HỮU
    { code: '411', name: 'Vốn đầu tư của chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '412', name: 'Chênh lệch đánh giá lại tài sản', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '413', name: 'Chênh lệch tỷ giá hối đoái', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '414', name: 'Quỹ đầu tư phát triển', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '418', name: 'Các quỹ khác thuộc vốn chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '419', name: 'Cổ phiếu quỹ', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '421', name: 'Lợi nhuận sau thuế chưa phân phối', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '4211', name: 'Lợi nhuận sau thuế chưa phân phối năm trước', category: 'VỐN CHỦ SỞ HỮU' },
    { code: '4212', name: 'Lợi nhuận sau thuế chưa phân phối năm nay', category: 'VỐN CHỦ SỞ HỮU' },
    // LOẠI 4: VỐN CHỦ SỞ HỮU
    { code: '411', name: 'Vốn đầu tư của chủ sở hữu', category: 'VỐN CHỦ SỞ HỮU' },
    // ... (Old chart truncated for brevity in view, assuming we are appending after this or fixing table creation)

    // ===============================================
    // SYSTEM SETTINGS TABLE & SEEDING (HCSN Unit Info)
    // ===============================================
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`, (err) => {
        if (err) {
            console.error("Error creating system_settings table", err);
        } else {
            // Seed Default HCSN Unit Info if not exists
            const defaultSettings = [
                { key: 'unit_name', value: 'Đơn vị HCSN Mẫu' },
                { key: 'unit_address', value: 'Số 123, Đường Chính, TP. Hà Nội' },
                { key: 'unit_tax_code', value: '0101234567' },
                { key: 'unit_chapter', value: '018' }, // Mã chương
                { key: 'unit_budget_relation_code', value: '1122334' }, // Mã QHNS
                { key: 'unit_parent_agency', value: 'UBND Thành Phố' },
                { key: 'unit_head_name', value: 'Nguyễn Văn A' }, 
                { key: 'unit_chief_accountant', value: 'Trần Thị B' },
                { key: 'accounting_regime', value: 'CIRCULAR_24_2024' },
                { key: 'base_currency', value: 'VND' },
                { key: 'decimal_format', value: 'vi-VN' },
                { key: 'allow_negative_inventory', value: '0' },
                { key: 'locked_until_date', value: '1900-01-01' }
            ];

            const insertStmt = db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)");
            defaultSettings.forEach(setting => {
                insertStmt.run(setting.key, setting.value);
            });
            insertStmt.finalize();
        }
    });
    { code: '466', name: 'Nguồn kinh phí đã hình thành TSCĐ', category: 'VỐN CHỦ SỞ HỮU' },

    // LOẠI 5: DOANH THU
    { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', category: 'DOANH THU' },
    { code: '5111', name: 'Doanh thu bán hàng hóa', category: 'DOANH THU' },
    { code: '5112', name: 'Doanh thu bán các thành phẩm', category: 'DOANH THU' },
    { code: '5113', name: 'Doanh thu cung cấp dịch vụ', category: 'DOANH THU' },
    { code: '5115', name: 'Doanh thu trợ cấp, trợ giá', category: 'DOANH THU' },
    { code: '5118', name: 'Doanh thu khác', category: 'DOANH THU' },
    { code: '515', name: 'Doanh thu hoạt động tài chính', category: 'DOANH THU' },
    { code: '521', name: 'Các khoản giảm trừ doanh thu', category: 'DOANH THU' },

    // LOẠI 6: CHI PHÍ SẢN XUẤT, KINH DOANH
    { code: '611', name: 'Mua hàng', category: 'CHI PHÍ' },
    { code: '621', name: 'Chi phí nguyên liệu, vật liệu trực tiếp', category: 'CHI PHÍ' },
    { code: '622', name: 'Chi phí nhân công trực tiếp', category: 'CHI PHÍ' },
    { code: '623', name: 'Chi phí sử dụng máy thi công', category: 'CHI PHÍ' },
    { code: '627', name: 'Chi phí sản xuất chung', category: 'CHI PHÍ' },
    { code: '631', name: 'Giá thành sản xuất', category: 'CHI PHÍ' },
    { code: '632', name: 'Giá vốn hàng bán', category: 'CHI PHÍ' },
    { code: '635', name: 'Chi phí tài chính', category: 'CHI PHÍ' },
    { code: '641', name: 'Chi phí bán hàng', category: 'CHI PHÍ' },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', category: 'CHI PHÍ' },

    // LOẠI 7: THU NHẬP KHÁC
    { code: '711', name: 'Thu nhập khác', category: 'THU NHẬP KHÁC' },

    // LOẠI 8: CHI PHÍ KHÁC
    { code: '811', name: 'Chi phí khác', category: 'CHI PHÍ KHÁC' },
    { code: '821', name: 'Chi phí thuế thu nhập doanh nghiệp', category: 'CHI PHÍ KHÁC' },

    // LOẠI 9: XÁC ĐỊNH KẾT QUẢ KINH DOANH
    { code: '911', name: 'Xác định kết quả kinh doanh', category: 'XÁC ĐỊNH KQKD' }
]; */

//  Use HCSN TT24 Accounts
const DEFAULT_ACCOUNTS = ALL_ACCOUNTS_TT24;


let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');

        // 0. Table: Companies (Master Data)
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS companies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                tax_code TEXT,
                phone TEXT,
                email TEXT,
                website TEXT,
                logo TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            // Seed Default Company
            db.get("SELECT count(*) as count FROM companies", (err, row) => {
                if (!err && row && row.count === 0) {
                    db.run(`INSERT INTO companies (id, name, address, tax_code) VALUES (?, ?, ?, ?)`,
                        ['1', 'Đơn vị HCSN Mẫu', '123 Đường Mẫu, Hà Nội', '0101234567'], (err) => {
                            if (!err) console.log("Seeded default company.");
                        });
                }
            });
        });

        // 1. Table: Users
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                fullname TEXT,
                role TEXT,
                status TEXT DEFAULT 'Active',
                last_login TEXT,
                is_admin INTEGER DEFAULT 0,
                company_id TEXT DEFAULT '1'
            )`);

            // Ensure columns exist for existing databases
            db.all("PRAGMA table_info(users)", (err, columns) => {
                const addColumns = () => {
                    const adminPass = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
                    // Delete existing admin user first to ensure password is updated
                    db.run('DELETE FROM users WHERE username = ?', [DEFAULT_ADMIN_USER], (delErr) => {
                        db.run('INSERT INTO users (username, password, fullname, role, status, company_id) VALUES (?,?,?,?,?,?)',
                            [DEFAULT_ADMIN_USER, adminPass, "Administrator", "admin", "Active", "1"], (err) => {
                                if (err) {
                                    console.error('Failed to seed admin user:', err);
                                } else {
                                    console.log(`Seeded admin user: ${DEFAULT_ADMIN_USER}`);
                                }
                            });
                    });
                };

                if (!err && columns) {
                    const hasFullname = columns.some(c => c.name === 'fullname');
                    if (!hasFullname) {
                        db.serialize(() => {
                            db.run("ALTER TABLE users ADD COLUMN fullname TEXT");
                            db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Active'");
                            db.run("ALTER TABLE users ADD COLUMN last_login TEXT", () => {
                                console.log("Updated 'users' table schema (added fullname, status, last_login).");
                                addColumns();
                            });
                        });
                    } else {
                        addColumns();
                    }
                } else {
                    addColumns();
                }
            });

            // 2. Table: Chart of Accounts (NEW)
            db.run(`CREATE TABLE IF NOT EXISTS chart_of_accounts (
                account_code TEXT PRIMARY KEY,
                account_name TEXT,
                category TEXT
            )`, () => {
                // Check if already seeded to prevent duplicates
                db.get("SELECT COUNT(*) as count FROM chart_of_accounts", [], (err, row) => {
                    if (err || (row && row.count > 0)) {
                        // Already seeded, skip
                        return;
                    }
                    // Seed Default Data - use serialize to ensure sequential execution
                    db.serialize(() => {
                        const insert = 'INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, category) VALUES (?,?,?)';
                        DEFAULT_ACCOUNTS.forEach(acc => {
                            db.run(insert, [acc.code, acc.name, acc.category]);
                        });
                        console.log("Seeded Chart of Accounts.");
                    });
                });
            });

            // 3. Table: Partners (NEW)
            db.run(`CREATE TABLE IF NOT EXISTS partners (
                partner_code TEXT PRIMARY KEY,
                partner_name TEXT,
                tax_code TEXT,
                address TEXT
            )`, () => {
                const insert = 'INSERT OR IGNORE INTO partners (partner_code, partner_name, tax_code, address) VALUES (?,?,?,?)';
                const samplePartners = [
                    ['NCC001', 'Công ty Cổ phần Thép Việt', '0101234567', 'Số 1 Đào Duy Anh, Hà Nội'],
                    ['NCC002', 'Công ty TNHH Nam Anh', '0309876543', '123 Cách Mạng Tháng 8, TP HCM'],
                    ['NCC_RISK', 'DN Bỏ Trốn (Fake)', '999000111', 'Khu ổ chuột, Hà Nội'],
                    ['KH001', 'Đại lý Bán lẻ Toàn Cầu', '0102223334', 'Khu Công nghiệp Quế Võ, Bắc Ninh'],
                    ['KH002', 'Cửa hàng Nội thất Minh Quân', '0405556667', '32Lý Thường Kiệt, Đà Nẵng']
                ];
                samplePartners.forEach(p => db.run(insert, p));
                console.log("Seeded Partners.");
            });

            // 4. Table: General Ledger (NEW)
            db.run(`CREATE TABLE IF NOT EXISTS general_ledger (
                id TEXT PRIMARY KEY,
                trx_date TEXT,
                posted_at TEXT,
                doc_no TEXT,
                description TEXT,
                account_code TEXT,
                reciprocal_acc TEXT,
                debit_amount REAL,
                credit_amount REAL,
                origin_staging_id TEXT
            )`, () => {
                // Seed some initial balances for demo
                const insert = 'INSERT OR IGNORE INTO general_ledger (id, trx_date, posted_at, doc_no, description, account_code, reciprocal_acc, debit_amount, credit_amount, origin_staging_id) VALUES (?,?,?,?,?,?,?,?,?,?)';
                const now = new Date().toISOString();
                const sampleGL = [
                    ['seed_1', '2024-01-01', now, 'PK001', 'Số dư đầu kỳ 242', '242', '111', 120000000, 0, 'seed'],
                    ['seed_2', '2024-01-01', now, 'PK001', 'Số dư đầu kỳ 242', '111', '242', 0, 120000000, 'seed'],
                    ['seed_3', '2024-01-01', now, 'PK002', 'Số dư ngoại tệ USD', '1112', '111', 125000000, 0, 'seed'],
                    ['seed_4', '2024-01-01', now, 'PK002', 'Số dư ngoại tệ USD', '111', '1112', 0, 125000000, 'seed'],
                    ['seed_5', '2024-12-01', now, 'DT001', 'Doanh thu bán lẻ', '111', '511', 450000000, 0, 'seed'],
                    ['seed_6', '2024-12-01', now, 'DT001', 'Doanh thu bán lẻ', '511', '111', 0, 450000000, 'seed'],
                    ['seed_7', '2024-12-01', now, 'CP001', 'Chi phí quản lý', '642', '111', 280000000, 0, 'seed'],
                    ['seed_8', '2024-12-01', now, 'CP001', 'Chi phí quản lý', '111', '642', 0, 280000000, 'seed'],
                    ['seed_9', '2024-12-05', now, 'PC015', 'Chi tiếp khách quá mức', '6428', '111', 100000000, 0, 'seed'],
                    ['seed_10', '2024-12-05', now, 'PC015', 'Chi tiếp khách quá mức', '111', '6428', 0, 100000000, 'seed'],
                    ['seed_11', '2024-12-10', now, 'PC099', 'Mua hàng từ DN rủi ro', '156', '331', 50000000, 0, 'seed'],
                    ['seed_12', '2024-12-10', now, 'PC099', 'Mua hàng từ DN rủi ro', '331', '156', 0, 50000000, 'seed'],
                    ['seed_risk_p', '2024-12-10', now, 'PC099', 'Mua hàng từ DN rủi ro', 'NCC_RISK', '', 0, 0, 'seed']
                ];
                sampleGL.forEach(row => db.run(insert, row));
                console.log("Seeded General Ledger sample data.");

                // 4.1. Migration: Add partner_code to general_ledger
                db.all("PRAGMA table_info(general_ledger)", (err, columns) => {
                    if (!err && columns) {
                        const hasPartner = columns.some(c => c.name === 'partner_code');
                        if (!hasPartner) {
                            db.run("ALTER TABLE general_ledger ADD COLUMN partner_code TEXT");
                            console.log("Added 'partner_code' to 'general_ledger'.");
                        }
                    }
                });
            });
        });

        // 5. Table: Staging Transactions
        db.run(`CREATE TABLE IF NOT EXISTS staging_transactions (
            id TEXT PRIMARY KEY,
            batch_id TEXT,
            row_index INTEGER,
            trx_date TEXT,
            doc_no TEXT,
            description TEXT,
            debit_acc TEXT,
            credit_acc TEXT,
            amount REAL,
            partner_code TEXT,
            is_valid INTEGER DEFAULT 0,
            error_log TEXT,
            raw_data TEXT
        )`, () => {
            // Seed Sample Data if empty
            db.get("SELECT count(*) as count FROM staging_transactions", (err, row) => {
                if (err) return console.error(err.message);
                if (row.count === 0) {
                    console.log("Seeding sample transactions...");
                    const insert = `INSERT INTO staging_transactions (id, batch_id, row_index, trx_date, doc_no, description, debit_acc, credit_acc, amount, partner_code, is_valid) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

                    const samples = [
                        ['trx_001', 'batch_init', 1, '2024-03-20', 'PKT001', 'Kết chuyển thuế GTGT đầu kỳ', '3331', '1331', 15000000, '', 1],
                        ['trx_002', 'batch_init', 2, '2024-03-21', 'PKT002', 'Trích khấu hao TSCD tháng 3', '642', '214', 5000000, '', 1],
                        ['trx_003', 'batch_init', 3, '2024-03-22', 'PKT003', 'Phân bổ chi phí trả trước', '642', '242', 2000000, '', 1],
                        ['trx_004', 'batch_init', 4, '2024-03-23', 'PKT004', 'Bút toán điều chỉnh sai sót năm trước', '421', '331', 10000000, 'NCC_A', 1],
                        ['trx_005', 'batch_init', 5, '2024-03-25', 'PKT005', 'Tiền thưởng lễ cho nhân viên', '642', '334', 3500000, '', 1],
                    ];

                    samples.forEach(s => {
                        db.run(insert, s);
                    });
                }
            });
        });

        // 6. Table: Vouchers (Header) - NEW
        db.run(`CREATE TABLE IF NOT EXISTS vouchers (
            id TEXT PRIMARY KEY,
            doc_no TEXT UNIQUE,
            doc_date TEXT,
            post_date TEXT,
            description TEXT,
            type TEXT, -- 'GENERAL', 'CASH_IN', 'CASH_OUT', etc.
            ref_no TEXT,
            attachments INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'VND',
            fx_rate REAL DEFAULT 1,
            total_amount REAL DEFAULT 0,
            status TEXT DEFAULT 'POSTED', -- 'POSTED', 'DRAFT'
            created_at TEXT
        )`);

        // 7. Table: Voucher Items (Lines) - NEW
        db.run(`CREATE TABLE IF NOT EXISTS voucher_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_id TEXT,
            description TEXT,
            debit_acc TEXT,
            credit_acc TEXT,
            amount REAL,
            dim1 TEXT,
            dim2 TEXT,
            dim3 TEXT,
            dim4 TEXT,
            dim5 TEXT,
            project_code TEXT,
            contract_code TEXT,
            debt_note TEXT,
            partner_code TEXT,
            fund_source_id TEXT,
            budget_estimate_id TEXT,
            FOREIGN KEY (voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
        )`, () => {
            // Seed sample voucher if empty
            db.get("SELECT count(*) as count FROM vouchers", (err, row) => {
                if (err) return;
                if (row.count === 0) {
                    const vId = `v_${Date.now()}`;
                    db.run(`INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [vId, 'PK0001', '2024-03-20', '2024-03-20', 'Kết chuyển thuế đầu kỳ', 'GENERAL', 15000000, new Date().toISOString()]);

                    db.run(`INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, partner_code)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [vId, 'Thuế GTGT khấu trừ', '3331', '1331', 15000000, '', '', '']);
                }

                // 7.1. Migration: Add partner_code to voucher_items
                db.all("PRAGMA table_info(voucher_items)", (err, columns) => {
                    if (!err && columns) {
                        const hasPartner = columns.some(c => c.name === 'partner_code');
                        if (!hasPartner) {
                            db.run("ALTER TABLE voucher_items ADD COLUMN partner_code TEXT");
                            console.log("Added 'partner_code' to 'voucher_items'.");
                        }
                        const hasCost = columns.some(c => c.name === 'cost_price');
                        if (!hasCost) {
                            db.run("ALTER TABLE voucher_items ADD COLUMN cost_price REAL DEFAULT 0");
                            console.log("Added 'cost_price' to 'voucher_items'.");
                        }
                        const hasQty = columns.some(c => c.name === 'quantity');
                        if (!hasQty) {
                            db.run("ALTER TABLE voucher_items ADD COLUMN quantity REAL DEFAULT 0");
                            console.log("Added 'quantity' to 'voucher_items'.");
                        }
                        const hasInputUnit = columns.some(c => c.name === 'input_unit');
                        if (!hasInputUnit) {
                            db.run("ALTER TABLE voucher_items ADD COLUMN input_unit TEXT");
                            console.log("Added 'input_unit' to 'voucher_items'.");
                        }
                        const hasInputQty = columns.some(c => c.name === 'input_quantity');
                        if (!hasInputQty) {
                            db.run("ALTER TABLE voucher_items ADD COLUMN input_quantity REAL DEFAULT 0");
                            console.log("Added 'input_quantity' to 'voucher_items'.");
                        }
                        const colNames = columns.map(c => c.name);
                        const missingCols = [];
                        if (!colNames.includes('dim3')) missingCols.push("ADD COLUMN dim3 TEXT");
                        if (!colNames.includes('dim4')) missingCols.push("ADD COLUMN dim4 TEXT");
                        if (!colNames.includes('dim5')) missingCols.push("ADD COLUMN dim5 TEXT");
                        if (!colNames.includes('project_code')) missingCols.push("ADD COLUMN project_code TEXT");
                        if (!colNames.includes('contract_code')) missingCols.push("ADD COLUMN contract_code TEXT");
                        if (!colNames.includes('contract_code')) missingCols.push("ADD COLUMN contract_code TEXT");
                        if (!colNames.includes('debt_note')) missingCols.push("ADD COLUMN debt_note TEXT");
                        if (!colNames.includes('fund_source_id')) missingCols.push("ADD COLUMN fund_source_id TEXT");
                        if (!colNames.includes('budget_estimate_id')) missingCols.push("ADD COLUMN budget_estimate_id TEXT");

                        missingCols.forEach(col => {
                            db.run(`ALTER TABLE voucher_items ${col}`, (e) => {
                                if (!e) console.log(`Added column: ${col} to voucher_items`);
                            });
                        });
                    }
                });

                // --- SEED MISSING VOUCHERS FOR SALES/PURCHASE/CASH (Fix for User Issue) ---
                db.get("SELECT count(*) as count FROM vouchers WHERE id = 'v_sales_001'", (err, row) => {
                    if (err) return;
                    if (row.count === 0) {
                        const now = new Date().toISOString();
                        const insertVoucher = `INSERT INTO vouchers (id, doc_no, doc_date, post_date, description, type, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                        const insertItem = `INSERT INTO voucher_items (voucher_id, description, debit_acc, credit_acc, amount, dim1, dim2, partner_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                        // 1. Sales Invoice IV001
                        const v1 = `v_sales_001`;
                        db.run(insertVoucher, [v1, 'IV001', '2024-03-01', '2024-03-01', 'Bán hàng hóa đợt 1', 'SALES_INVOICE', 55000000, now]);
                        db.run(insertItem, [v1, 'Doanh thu bán hàng', '131', '5111', 50000000, '', '', 'KH001']);
                        db.run(insertItem, [v1, 'Thuế GTGT đầu ra', '131', '3331', 5000000, '', '', 'KH001']);

                        // 2. Sales Invoice IV002
                        const v2 = `v_sales_002`;
                        db.run(insertVoucher, [v2, 'IV002', '2024-03-05', '2024-03-05', 'Bán dịch vụ tư vấn', 'SALES_INVOICE', 13200000, now]);
                        db.run(insertItem, [v2, 'Doanh thu dịch vụ', '131', '5113', 12000000, '', '', 'KH002']);
                        db.run(insertItem, [v2, 'Thuế GTGT đầu ra', '131', '3331', 1200000, '', '', 'KH002']);

                        // 3. Purchase Invoice PNK-24-001
                        const v3 = `v_pur_001`;
                        db.run(insertVoucher, [v3, 'PNK-24-001', '2024-10-02', '2024-10-02', 'Nhập kho thép cuộn phi 6', 'PURCHASE_INVOICE', 220000000, now]);
                        db.run(insertItem, [v3, 'Giá vốn hàng nhập', '1561', '331', 200000000, '', '', 'NCC001']);
                        db.run(insertItem, [v3, 'Thuế GTGT đầu vào', '1331', '331', 20000000, '', '', 'NCC001']);

                        // 4. Cash Payment (Chi phí tiếp khách)
                        const v4 = `v_cash_001`;
                        db.run(insertVoucher, [v4, 'PC099', '2024-12-05', '2024-12-05', 'Chi tiếp khách quá mức', 'CASH_OUT', 100000000, now]);
                        db.run(insertItem, [v4, 'Chi phí QLDN', '6428', '1111', 100000000, '', '', '']);

                        console.log("Seeded missing Sales/Purchase/Cash vouchers.");
                    }
                });

                // 7.2. Migration: Add status to vouchers
                db.all("PRAGMA table_info(vouchers)", (err, columns) => {
                    if (!err && columns) {
                        const hasStatus = columns.some(c => c.name === 'status');
                        if (!hasStatus) {
                            db.run("ALTER TABLE vouchers ADD COLUMN status TEXT DEFAULT 'POSTED'");
                            console.log("Added 'status' to 'vouchers'.");
                        }
                        const colNames = columns.map(c => c.name);
                        const missingCols = [];
                        if (!colNames.includes('ref_no')) missingCols.push("ADD COLUMN ref_no TEXT");
                        if (!colNames.includes('attachments')) missingCols.push("ADD COLUMN attachments INTEGER DEFAULT 0");
                        if (!colNames.includes('currency')) missingCols.push("ADD COLUMN currency TEXT DEFAULT 'VND'");
                        if (!colNames.includes('fx_rate')) missingCols.push("ADD COLUMN fx_rate REAL DEFAULT 1");
                        missingCols.forEach(col => {
                            db.run(`ALTER TABLE vouchers ${col}`, (e) => {
                                if (!e) console.log(`Added column: ${col} to vouchers`);
                            });
                        });
                    }
                });
            });
            // 8. Table: Bank accounts (Connections) - NEW
            db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
            id TEXT PRIMARY KEY,
            bank_name TEXT,
            acc_no TEXT UNIQUE,
            api_key TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT
        )`, () => {
                const insert = 'INSERT OR IGNORE INTO bank_accounts (id, bank_name, acc_no, api_key, created_at) VALUES (?,?,?,?,?)';
                db.run(insert, ['bank_1', 'Vietcombank', '0011001234567', 'API-999-888', new Date().toISOString()]);
            });
            // 9. Table: Allocations (Matching Payments to Invoices)
            db.run(`CREATE TABLE IF NOT EXISTS allocations (
                id TEXT PRIMARY KEY,
                payment_voucher_id TEXT,
                invoice_voucher_id TEXT,
                amount REAL,
                allocated_at TEXT,
                FOREIGN KEY (payment_voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE,
                FOREIGN KEY (invoice_voucher_id) REFERENCES vouchers (id) ON DELETE CASCADE
            )`);
            // 10. Table: System Settings
            db.run(`CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, () => {
                db.run('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)', ['locked_until_date', '2024-10-31']);
                db.run('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)', ['company_name', 'CÔNG TY TNHH PHẦN MỀM SYNTEX']);
                db.run('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)', ['company_address', 'Tầng 12, Tòa nhà Viwaseen, 48 Tố Hữu, Nam Từ Liêm, Hà Nội']);
            });

            // 10.1. Table: Roles (RBAC)
            db.run(`CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT,
                permissions TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT
            )`, () => {
                const insert = 'INSERT OR IGNORE INTO roles (id, name, permissions, created_at) VALUES (?,?,?,?)';
                const now = new Date().toISOString();
                db.run(insert, ['admin', 'Administrator', JSON.stringify(['all']), now]);
                db.run(insert, ['accountant', 'Accountant', JSON.stringify(['read', 'write']), now]);
                db.run(insert, ['viewer', 'Viewer', JSON.stringify(['read']), now]);
            });


            // 11. Update Staging Transactions to support Bank Feeds
            db.run(`ALTER TABLE staging_transactions ADD COLUMN source TEXT DEFAULT 'manual'`, (err) => {
                if (err) { /* column might already exist */ }
            });
            db.run(`ALTER TABLE staging_transactions ADD COLUMN suggested_debit TEXT`, (err) => {
                if (err) { }
            });
            db.run(`ALTER TABLE staging_transactions ADD COLUMN suggested_credit TEXT`, (err) => {
                if (err) { }
                // 11. Table: Checklist Tasks (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS checklist_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    category TEXT,
                    status TEXT DEFAULT 'todo',
                    is_visible INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO checklist_tasks (id, title, category, status, is_visible) VALUES (?,?,?,?,?)';
                    const defaultTasks = [
                        [1, 'Kiểm tra hóa đơn đầu vào trên cổng Tổng cục Thuế', 'Hàng ngày', 'todo', 1],
                        [2, 'Đối chiếu số dư tài khoản ngân hàng', 'Hàng ngày', 'todo', 1],
                        [3, 'Nhập liệu chứng từ thu, chi tiền mặt', 'Hàng ngày', 'todo', 1],
                        [4, 'Kiểm tra tính hợp lệ của hóa đơn đầu ra', 'Hàng ngày', 'todo', 1],
                        [5, 'Đối chiếu công nợ phải thu khách hàng', 'Hàng ngày', 'todo', 1],
                        [6, 'Lập bảng kê thuế GTGT đầu vào, đầu ra', 'Hàng tháng', 'todo', 1],
                        [7, 'Tính lương và các khoản trích theo lương', 'Hàng tháng', 'todo', 1],
                        [8, 'Tính khấu hao tài sản cố định, phân bổ CCDC', 'Hàng tháng', 'todo', 1],
                        [9, 'Kiểm tra, đối chiếu kho hàng hóa', 'Hàng tháng', 'todo', 1],
                        [10, 'Thực hiện bút toán kết chuyển doanh thu, chi phí', 'Hàng tháng', 'todo', 1],
                        [11, 'Lập báo cáo thuế GTGT, TNCN tạm tính', 'Hàng quý', 'todo', 1],
                        [12, 'Lập báo cáo tình hình sử dụng hóa đơn', 'Hàng quý', 'todo', 1],
                        [13, 'Kiểm tra số dư các tài khoản trung gian', 'Hàng quý', 'todo', 1],
                        [14, 'Đối chiếu dữ liệu chi tiết và sổ cái', 'Hàng quý', 'todo', 1]
                    ];
                    defaultTasks.forEach(task => db.run(insert, task));
                    console.log("Seeded Checklist Tasks.");
                });

                // 12. Table: Fixed Assets (LEGACY - Disabled, replaced by HCSN TT 24/2024 schema below)
                /*
                db.run(`CREATE TABLE IF NOT EXISTS fixed_assets (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    start_date TEXT,
                    cost REAL,
                    life_years INTEGER,
                    accumulated REAL,
                    residual REAL,
                    dept TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO fixed_assets (id, code, name, start_date, cost, life_years, accumulated, residual, dept) VALUES (?,?,?,?,?,?,?,?,?)';
                    const sampleAssets = [
                        ['1', 'TS001', 'Máy tính xách tay Dell XPS 15', '2023-01-01', 45000000, 3, 15000000, 30000000, 'Phòng Kỹ thuật'],
                        ['2', 'TS002', 'Bàn họp gỗ tự nhiên 2.4m', '2022-01-01', 12000000, 5, 4800000, 7200000, 'Phòng Họp'],
                        ['3', 'TS003', 'Máy chiếu Sony 4K', '2023-06-01', 28000000, 4, 7000000, 21000000, 'Văn phòng']
                    ];
                    sampleAssets.forEach(a => db.run(insert, a));
                    console.log("Seeded Fixed Assets.");
                });
                */

                // 13. Table: CCDC Items (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS ccdc_items (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    start_date TEXT,
                    cost REAL,
                    life_months INTEGER,
                    allocated REAL,
                    remaining REAL
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO ccdc_items (id, code, name, start_date, cost, life_months, allocated, remaining) VALUES (?,?,?,?,?,?,?,?)';
                    const sampleCCDC = [
                        ['C1', 'CC001', 'Ghế xoay nhân viên', '2024-01-15', 1200000, 12, 600000, 600000],
                        ['C2', 'CC002', 'Bộ lưu điện UPS 1000VA', '2024-02-01', 2500000, 24, 200000, 2300000]
                    ];
                    sampleCCDC.forEach(c => db.run(insert, c));
                    console.log("Seeded CCDC Items.");
                });

                // 14. Table: Employees (Updated for HCSN)
                db.run(`CREATE TABLE IF NOT EXISTS employees (
                    id TEXT PRIMARY KEY,
                    code TEXT UNIQUE,
                    name TEXT,
                    position TEXT,           -- Chức vụ
                    department TEXT,         -- Phòng ban
                    
                    -- Thông tin Lương HCSN
                    salary_grade_id TEXT,    -- Mã ngạch lương (CV, CVC...)
                    salary_level INTEGER,    -- Bậc lương
                    salary_coefficient REAL, -- Hệ số lương
                    
                    contract_type TEXT,      -- 'OFFICIAL' (Viên chức), 'CONTRACT' (HĐ 68), 'PART_TIME'
                    start_date TEXT,
                    status TEXT DEFAULT 'ACTIVE',
                    
                    tax_code TEXT,
                    insurance_no TEXT,
                    dependents_count INTEGER DEFAULT 0,  -- Số người phụ thuộc
                    
                    email TEXT,
                    phone TEXT,
                    bank_account TEXT,
                    bank_name TEXT,
                    
                    created_at TEXT,
                    updated_at TEXT
                )`, () => {
                    // Seed data logic can be updated later if needed
                });

                // 15. Table: Ngạch/Bậc lương (Salary Grades) - HCSN
                db.run(`CREATE TABLE IF NOT EXISTS salary_grades (
                    id TEXT PRIMARY KEY,
                    code TEXT UNIQUE,        -- Mã ngạch (01.003 - Chuyên viên cao cấp)
                    name TEXT,               -- Tên ngạch
                    category TEXT,           -- 'A3.1', 'A2.1', ...
                    levels_count INTEGER,    -- Số bậc tối đa
                    start_coefficient REAL,  -- Hệ số bậc 1
                    coefficient_step REAL,   -- Chênh lệch hệ số giữa các bậc
                    description TEXT
                )`);

                // 16. Table: Phụ cấp nhân viên (Employee Allowances) - HCSN
                db.run(`CREATE TABLE IF NOT EXISTS employee_allowances (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT,
                    allowance_code TEXT,     -- Mã loại phụ cấp
                    value REAL,              -- Giá trị (Hệ số hoặc Số tiền)
                    effective_date TEXT,     -- Ngày hiệu lực
                    end_date TEXT,           -- Ngày hết hiệu lực
                    note TEXT,
                    
                    FOREIGN KEY (employee_id) REFERENCES employees(id)
                )`);

                // 14.1. Table: Payroll (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS payroll (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT,
                    period TEXT, -- YYYY-MM
                    gross_salary REAL,
                    allowance REAL,
                    insurance_deduction REAL,
                    income_tax REAL,
                    net_salary REAL,
                    created_at TEXT,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )`);

                // 14.2. Table: Timekeeping (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS timekeeping (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT,
                    period TEXT, -- YYYY-MM
                    standard_days INTEGER,
                    actual_days INTEGER,
                    overtime_hours INTEGER,
                    FOREIGN KEY (employee_id) REFERENCES employees (id)
                )`, () => {
                    // Seed initial timekeeping for current employees
                    const insert = 'INSERT OR IGNORE INTO timekeeping (employee_id, period, standard_days, actual_days, overtime_hours) VALUES (?,?,?,?,?)';
                    const now = new Date().toISOString().substring(0, 7);
                    db.run(insert, ['NV001', now, 22, 22, 4]);
                    db.run(insert, ['NV002', now, 22, 20, 0]);
                    db.run(insert, ['NV003', now, 22, 21, 8]);
                });

                // 15. Table: Sales Orders
                db.run(`CREATE TABLE IF NOT EXISTS sales_orders (
                    id TEXT PRIMARY KEY,
                    date TEXT,
                    doc_no TEXT,
                    customer TEXT,
                    description TEXT,
                    amount REAL,
                    status TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO sales_orders (id, date, doc_no, customer, description, amount, status) VALUES (?,?,?,?,?,?,?)';
                    db.run(insert, ['SO001', '2024-03-01', 'DH001', 'Công ty TNHH ABC', 'Đặt hàng tháng 3', 50000000, 'Đã duyệt']);
                });

                // 16. Table: Sales Invoices
                db.run(`CREATE TABLE IF NOT EXISTS sales_invoices (
                    id TEXT PRIMARY KEY,
                    date TEXT,
                    doc_no TEXT,
                    customer TEXT,
                    description TEXT,
                    amount REAL,
                    tax REAL,
                    total REAL,
                    contract_code TEXT,
                    project_code TEXT,
                    dim1 TEXT,
                    dim2 TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO sales_invoices (id, date, doc_no, customer, description, amount, tax, total, contract_code, project_code, dim1, dim2) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
                    db.run(insert, ['IV001', '2024-03-01', 'HD0001', 'Công ty TNHH ABC', 'Bán hàng hóa đợt 1', 50000000, 5000000, 55000000, 'HĐ-2024-001', 'DA001', '', '']);
                    db.run(insert, ['IV002', '2024-03-05', 'HD0002', 'Khách lẻ - Anh Nam', 'Bán dịch vụ tư vấn', 12000000, 1200000, 13200000, '', '', '', '']);
                });

                // 17. Table: Purchase Orders
                db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    docNo TEXT,
                    date TEXT,
                    supplier TEXT,
                    amount REAL,
                    status TEXT,
                    deliveryDate TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO purchase_orders (id, docNo, date, supplier, amount, status, deliveryDate) VALUES (?,?,?,?,?,?,?)';
                    db.run(insert, [1, 'PO-24-001', '2024-10-01', 'Công ty TNHH Thép Việt', 500000000, 'Đã duyệt', '2024-10-15']);
                    db.run(insert, [2, 'PO-24-002', '2024-10-05', 'Nhà máy Xi măng Nghi Sơn', 300000000, 'Chờ duyệt', '2024-10-20']);
                    db.run(insert, [3, 'PO-24-003', '2024-10-10', 'Hợp tác xã Gạch men Bình Dương', 150000000, 'Đang giao', '2024-10-12']);
                });

                // 17.1 Table: Purchase Invoices (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS purchase_invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT,
                    doc_no TEXT,
                    description TEXT,
                    warehouse TEXT,
                    supplier TEXT,
                    amount REAL,
                    tax REAL,
                    total REAL,
                    type TEXT -- 'INBOUND' or 'SERVICE'
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO purchase_invoices (id, date, doc_no, description, warehouse, supplier, amount, tax, total, type) VALUES (?,?,?,?,?,?,?,?,?,?)';
                    db.run(insert, [1, '2024-10-02', 'PNK-24-001', 'Nhập kho thép cuộn phi 6', 'Kho chính', 'Công ty TNHH Thép Việt', 200000000, 20000000, 220000000, 'INBOUND']);
                    db.run(insert, [2, '2024-10-06', 'PNK-24-002', 'Nhập kho xi măng bao PC40', 'Kho phu', 'Nhà máy Xi măng Nghi Sơn', 120000000, 12000000, 132000000, 'INBOUND']);
                    db.run(insert, [3, '2024-10-10', 'SVC-24-001', 'Cước tiền điện T10/2024', '', 'Điện lực Hà Nội', 15000000, 1500000, 16500000, 'SERVICE']);
                    db.run(insert, [4, '2024-10-11', 'SVC-24-002', 'Cước tiền nước T10/2024', '', 'Nước sạch Sông Đà', 2000000, 100000, 2100000, 'SERVICE']);
                });

                // 18. Table: Contracts
                db.run(`CREATE TABLE IF NOT EXISTS contracts (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    partner TEXT,
                    date TEXT,
                    value REAL,
                    received_or_paid REAL,
                    status TEXT,
                    type TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO contracts (id, code, name, partner, date, value, received_or_paid, status, type) VALUES (?,?,?,?,?,?,?,?,?)';
                    db.run(insert, ['S1', 'HĐB-2024-001', 'Cung cấp giải pháp ERP', 'Tập đoàn Vingroup', '2024-01-15', 1500000000, 500000000, 'Đang thực hiện', 'sales']);
                    db.run(insert, ['P1', 'HĐM-2024-001', 'Thuê văn phòng Landmark 81', 'Vinhomes Central Park', '2024-01-01', 1200000000, 600000000, 'Đang thực hiện', 'purchase']);
                });

                // 18.1. Table: Contract Appendices (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS contract_appendices (
                    id TEXT PRIMARY KEY,
                    contract_id TEXT,
                    code TEXT,
                    name TEXT,
                    date TEXT,
                    value REAL,
                    content TEXT,
                    FOREIGN KEY (contract_id) REFERENCES contracts (id)
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO contract_appendices (id, contract_id, code, name, date, value, content) VALUES (?,?,?,?,?,?,?)';
                    db.run(insert, ['A1', 'S1', 'PL01/HĐB-2024-001', 'Bổ sung module báo cáo BI', '2024-02-15', 200000000, 'Thêm các mẫu báo cáo quản trị nâng cao']);
                });

                // 19. Table: Projects
                db.run(`CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    customer TEXT,
                    budget REAL,
                    start TEXT,
                    end TEXT,
                    progress INTEGER,
                    status TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO projects (id, code, name, customer, budget, start, end, progress, status) VALUES (?,?,?,?,?,?,?,?,?)';
                    db.run(insert, ['DA001', 'PRJ-HCM-001', 'Triển khai ERP tại HCM', 'VietCorp', 2000000000, '2024-01-01', '2024-12-31', 45, 'Đang triển khai']);
                });

                // 19.1. Table: Project Tasks (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS project_tasks (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    task TEXT,
                    owner TEXT,
                    deadline TEXT,
                    progress INTEGER,
                    status TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO project_tasks (id, project_id, task, owner, deadline, progress, status) VALUES (?,?,?,?,?,?,?)';
                    db.run(insert, ['T1', 'DA001', 'Khảo sát quy trình nghiệp vụ', 'Nguyễn Văn A', '2024-02-15', 100, 'Hoàn thành']);
                    db.run(insert, ['T2', 'DA001', 'Thiết kế giải pháp tổng thể', 'Trần Thị B', '2024-04-30', 60, 'Đang thực hiện']);
                });

                // 19.2. Table: Project Budget Lines (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS project_budget_lines (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    category TEXT,
                    budget REAL,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO project_budget_lines (id, project_id, category, budget) VALUES (?,?,?,?)';
                    db.run(insert, ['B1', 'DA001', 'Chi phí nhân sự', 1200000000]);
                    db.run(insert, ['B2', 'DA001', 'Thiết bị & Bản quyền', 500000000]);
                    db.run(insert, ['B3', 'DA001', 'Chi phí triển khai/Đi lại', 300000000]);
                });

                // 20. Table: Loan Contracts
                db.run(`CREATE TABLE IF NOT EXISTS loan_contracts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    docNo TEXT,
                    partner TEXT,
                    limit_amount REAL,
                    collateral TEXT,
                    status TEXT,
                    date TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO loan_contracts (id, docNo, partner, limit_amount, collateral, status, date) VALUES (?,?,?,?,?,?,?)';
                    db.run(insert, [1, 'HDV-001-2024', 'Ngân hàng VCB - CN Hà Đông', 5000000000, 'Bất động sản số 21 Láng Hạ', 'Hợp lệ', '2024-01-15']);
                });

                // 20.1. Table: Debt Notes (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS debt_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    contract_id INTEGER,
                    doc_no TEXT UNIQUE,
                    amount REAL,
                    rate REAL,
                    start_date TEXT,
                    end_date TEXT,
                    purpose TEXT,
                    FOREIGN KEY (contract_id) REFERENCES loan_contracts (id)
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO debt_notes (id, contract_id, doc_no, amount, rate, start_date, end_date, purpose) VALUES (?,?,?,?,?,?,?,?)';
                    const sampleNotes = [
                        [101, 1, 'KU-VCB-01', 2000000000, 8.5, '2024-02-01', '2024-08-01', 'Bổ sung vốn lưu động'],
                        [102, 1, 'KU-VCB-02', 1500000000, 8.7, '2024-04-15', '2024-10-15', 'Mua nguyên vật liệu']
                    ];
                    sampleNotes.forEach(n => db.run(insert, n));
                    console.log("Seeded Debt Notes.");
                });

                // 21. Table: Dimensions
                db.run(`CREATE TABLE IF NOT EXISTS dimensions (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    type INTEGER, -- 1 to 5
                    description TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO dimensions (id, code, name, type, description) VALUES (?,?,?,?,?)';
                    db.run(insert, ['D1-001', 'M1-001', 'Đối tượng thống kê 1A', 1, 'Mô tả cho mã thống kê 1A']);
                });

                // 22. Table: Dimension Configs
                db.run(`CREATE TABLE IF NOT EXISTS dimension_configs (
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    label TEXT,
                    isActive INTEGER,
                    isMandatory INTEGER,
                    note TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO dimension_configs (id, name, label, isActive, isMandatory, note) VALUES (?,?,?,?,?,?)';
                    [1, 2, 3, 4, 5].forEach(i => {
                        db.run(insert, [i, `Dimension ${i}`, `Tên chiều ${i}`, 1, 0, `Ghi chú cho chiều ${i}`]);
                    });
                });

                // 22.1. Table: Dimension Groups (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS dimension_groups (
                    id TEXT PRIMARY KEY,
                    code TEXT,
                    name TEXT,
                    dim_type INTEGER,
                    description TEXT
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO dimension_groups (id, code, name, dim_type, description) VALUES (?,?,?,?,?)';
                    db.run(insert, ['G1', 'GRP-01', 'Nhóm thống kê Alpha', 1, 'Gom nhóm các đối tượng loại Alpha']);
                });

                // 22.2. Table: Dimension Group Members (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS dimension_group_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id TEXT,
                    dimension_id TEXT,
                    FOREIGN KEY (group_id) REFERENCES dimension_groups (id) ON DELETE CASCADE,
                    FOREIGN KEY (dimension_id) REFERENCES dimensions (id) ON DELETE CASCADE
                )`, () => {
                    const insert = 'INSERT OR IGNORE INTO dimension_group_members (group_id, dimension_id) VALUES (?,?)';
                    db.run(insert, ['G1', 'D1-001']);
                });

                // 23. Table: Budgets (Norms)
                db.serialize(() => {
                    db.run(`CREATE TABLE IF NOT EXISTS budgets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        period TEXT,
                        account_code TEXT,
                        budget_amount REAL,
                        notes TEXT,
                        created_at TEXT
                    )`);

                    db.all("PRAGMA table_info(budgets)", (err, columns) => {
                        const seedBudgets = () => {
                            db.get("SELECT count(*) as count FROM budgets", (err, row) => {
                                if (err) return;
                                if (row && row.count === 0) {
                                    const insert = 'INSERT INTO budgets (account_code, period, budget_amount, notes, created_at) VALUES (?,?,?,?,?)';
                                    db.run(insert, ['642', '2024-12', 50000000, 'Ngân sách chi phí quản lý T12', new Date().toISOString()]);
                                    db.run(insert, ['641', '2024-12', 30000000, 'Ngân sách chi phí bán hàng T12', new Date().toISOString()]);
                                    console.log("Seeded Budgets.");
                                }
                            });
                        };

                        if (!err && columns) {
                            const hasBudgetAmount = columns.some(c => c.name === 'budget_amount');
                            if (!hasBudgetAmount) {
                                const hasAmount = columns.some(c => c.name === 'amount');
                                if (hasAmount) {
                                    db.run("ALTER TABLE budgets RENAME COLUMN amount TO budget_amount", () => {
                                        console.log("Renamed 'amount' to 'budget_amount' in 'budgets' table.");
                                        seedBudgets();
                                    });
                                } else {
                                    db.run("ALTER TABLE budgets ADD COLUMN budget_amount REAL", () => {
                                        console.log("Added 'budget_amount' column to 'budgets' table.");
                                        seedBudgets();
                                    });
                                }
                            } else {
                                seedBudgets();
                            }
                        } else {
                            seedBudgets();
                        }
                    });
                });

                // 24. Table: Products (NEW)
                db.run(`CREATE TABLE IF NOT EXISTS products (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        code TEXT UNIQUE,
                        name TEXT,
                        unit TEXT,
                        price REAL,
                        tax REAL,
                        type TEXT,
                        conversion_units TEXT -- JSON string for unit matrix
                    )`, () => {
                    const insert = 'INSERT OR IGNORE INTO products (code, name, unit, price, tax, type) VALUES (?,?,?,?,?,?)';
                    db.run(insert, ['VT001', 'Thép cuộn phi 6', 'Kg', 20000, 10, 'Vật tư']);
                    db.run(insert, ['VT002', 'Xi măng PC40', 'Bao 50kg', 80000, 8, 'Vật tư']);
                    db.run(insert, ['DV001', 'Cước vận chuyển', 'Chuyến', 500000, 10, 'Dịch vụ']);
                    console.log("Seeded Products.");
                    console.log("Database schema initialized with all modules.");

                    // 25. Table: System Logs (NEW)
                    db.run(`CREATE TABLE IF NOT EXISTS system_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                        user TEXT,
                        action TEXT,
                        details TEXT,
                        target TEXT
                    )`, () => {
                        console.log("Initialized 'system_logs' table.");
                    });
                });
            });
        });

        // 26. Migration: Add conversion_units to products
        db.all("PRAGMA table_info(products)", (err, columns) => {
            if (!err && columns && columns.length > 0) {
                const hasConv = columns.some(c => c.name === 'conversion_units');
                if (!hasConv) {
                    db.run("ALTER TABLE products ADD COLUMN conversion_units TEXT", (alterErr) => {
                        if (!alterErr) {
                            console.log("Added 'conversion_units' to 'products'.");
                        }
                    });
                }
            }
        });
    }
});

// ========================================
// HCSN TABLES - Thêm mới theo TT 24/2024/TT-BTC
// ========================================

// Load hệ thống tài khoản HCSN (Already imported at top of file)
// const { ALL_ACCOUNTS_TT24 } = require('./hcsn_tt24_accounts');

// [REMOVED] Duplicate fund_sources table creation. Uses new schema defined later.

// [REMOVED] Duplicate budget_estimates table creation. Uses new schema defined later.

// Bảng: Tài sản Cố định HCSN (Fixed Assets) - TT 24/2024
db.run(`CREATE TABLE IF NOT EXISTS fixed_assets (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    asset_category TEXT DEFAULT 'TANGIBLE',
    account_code TEXT DEFAULT '211',
    original_value REAL NOT NULL DEFAULT 0,
    accumulated_depreciation REAL DEFAULT 0,
    net_value REAL DEFAULT 0,
    depreciation_method TEXT DEFAULT 'STRAIGHT_LINE',
    useful_life INTEGER,
    depreciation_rate REAL,
    residual_value REAL DEFAULT 0,
    purchase_date TEXT,
    usage_date TEXT,
    start_date TEXT,
    location TEXT,
    dept TEXT,
    manager TEXT,
    status TEXT DEFAULT 'ACTIVE',
    asset_condition TEXT DEFAULT 'GOOD',
    warranty_expiry TEXT,
    fund_source_id TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
)`, (err) => {
    if (err) return console.error("Error creating 'fixed_assets':", err);
    console.log("Initialized 'fixed_assets' table for HCSN (TT 24/2024).");

    // Seed sample data
    const assets = [
        {
            id: 'fa-001',
            code: 'TSCD-001',
            name: 'Máy tính Dell Latitude 7420',
            category: 'TANGIBLE',
            account_code: '211',
            original_value: 25000000,
            depreciation_method: 'STRAIGHT_LINE',
            useful_life: 3,
            depreciation_rate: 33.33,
            purchase_date: '2023-01-15',
            usage_date: '2023-01-20',
            dept: 'Phòng IT',
            status: 'ACTIVE',
            asset_condition: 'GOOD'
        },
        {
            id: 'fa-002',
            code: 'TSCD-002',
            name: 'Bàn làm việc gỗ cao cấp',
            category: 'TANGIBLE',
            account_code: '211',
            original_value: 8000000,
            depreciation_method: 'STRAIGHT_LINE',
            useful_life: 5,
            depreciation_rate: 20,
            purchase_date: '2022-06-01',
            usage_date: '2022-06-05',
            dept: 'Phòng Hành chính',
            status: 'ACTIVE',
            asset_condition: 'GOOD'
        }
    ];

    const insertSQL = `INSERT OR IGNORE INTO fixed_assets 
        (id, code, name, asset_category, account_code, original_value, accumulated_depreciation, net_value,
         depreciation_method, useful_life, depreciation_rate, purchase_date, usage_date, dept, status, asset_condition, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;

    assets.forEach(a => {
        db.run(insertSQL, [
            a.id, a.code, a.name, a.category, a.account_code,
            a.original_value, a.original_value,
            a.depreciation_method, a.useful_life, a.depreciation_rate,
            a.purchase_date, a.usage_date, a.dept, a.status, a.asset_condition
        ]);
    });

    console.log("Seeded sample fixed assets for HCSN.");


});

// Bảng: Tài sản kết cấu hạ tầng (Infrastructure Assets) - MỚI TT 24/2024
db.run(`CREATE TABLE IF NOT EXISTS infrastructure_assets (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    category TEXT,
    location TEXT,
    construction_year INTEGER,
    original_value REAL DEFAULT 0,
    accumulated_depreciation REAL DEFAULT 0,
    net_value REAL DEFAULT 0,
    condition TEXT DEFAULT 'GOOD',
    fund_source_id TEXT,
    managed_by TEXT,
    

    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    maintenance_cost REAL DEFAULT 0,
    

    condition_assessment_date TEXT,
    condition_note TEXT,
    
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
)`, (err) => {
    if (err) console.error("Error creating 'infrastructure_assets':", err);
    else console.log("Initialized 'infrastructure_assets' table for HCSN (TT 24/2024).");
});

// Bảng: Theo dõi tài khoản ngoài bảng (Off-Balance Tracking) - MỚI TT 24/2024
db.run(`CREATE TABLE IF NOT EXISTS off_balance_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_code TEXT,
    transaction_date TEXT,
    doc_no TEXT,
    description TEXT,
    increase_amount REAL DEFAULT 0,
    decrease_amount REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    created_at TEXT
)`, () => {
    console.log("Initialized 'off_balance_tracking' table for HCSN (TT 24/2024).");
});

// Bảng: Đầu tư dài hạn (Long-term Investments) - MỚI TT 24/2024
db.run(`CREATE TABLE IF NOT EXISTS long_term_investments (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,                      -- 'SUBSIDIARY', 'ASSOCIATE', 'OTHER'
    account_code TEXT DEFAULT '221',         -- TK: 221, 222, 228
    
    investee_name TEXT,                      -- Tên đơn vị nhận đầu tư
    investee_tax_code TEXT,                  -- MST đơn vị nhận đầu tư
    
    investment_amount REAL NOT NULL DEFAULT 0,
    ownership_percentage REAL,               -- Tỷ lệ sở hữu (%)
    investment_date TEXT,
    
    current_value REAL DEFAULT 0,
    income_received REAL DEFAULT 0,          -- Thu nhập đã nhận
    
    status TEXT DEFAULT 'ACTIVE',
    fund_source_id TEXT,
    
    created_at TEXT,
    updated_at TEXT,
    
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
)`, () => {
    console.log("Initialized 'long_term_investments' table for HCSN (TT 24/2024).");
});

// Bảng: Danh mục loại thu sự nghiệp (Revenue Categories) - HCSN
db.run(`CREATE TABLE IF NOT EXISTS revenue_categories (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    revenue_type TEXT,                       -- 'RECURRENT', 'NON_RECURRENT', 'PRODUCTION'
    account_code TEXT DEFAULT '511',         -- TK: 511.xx
    description TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TEXT
)`, () => {
    console.log("Initialized 'revenue_categories' table for HCSN revenue tracking.");

    // Seed initial revenue categories
    const categories = [
        { id: 'HP', code: 'HP', name: 'Học phí', revenue_type: 'RECURRENT', account_code: '511.01' },
        { id: 'VP', code: 'VP', name: 'Viện phí', revenue_type: 'RECURRENT', account_code: '511.02' },
        { id: 'PDV', code: 'PDV', name: 'Phí dịch vụ công', revenue_type: 'RECURRENT', account_code: '511.03' },
        { id: 'PLPTT', code: 'PLPTT', name: 'Phí lệ phí trước bạ', revenue_type: 'RECURRENT', account_code: '511.04' },
        { id: 'BTS', code: 'BTS', name: 'Bán thanh lý tài sản', revenue_type: 'NON_RECURRENT', account_code: '711' },
        { id: 'SXKD', code: 'SXKD', name: 'Hoạt động SXKD', revenue_type: 'PRODUCTION', account_code: '511.09' }
    ];

    db.serialize(() => {
        const stmt = db.prepare(`INSERT OR IGNORE INTO revenue_categories 
            (id, code, name, revenue_type, account_code, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)`);

        categories.forEach(cat => {
            stmt.run(cat.id, cat.code, cat.name, cat.revenue_type, cat.account_code, new Date().toISOString());
        });

        stmt.finalize(() => {
            console.log("Seeded revenue categories for HCSN.");
        });
    });
});

// Bảng: Biên lai thu tiền (Revenue Receipts) - HCSN
db.run(`CREATE TABLE IF NOT EXISTS revenue_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    receipt_date TEXT NOT NULL,
    fiscal_year INTEGER,
    
    -- Người nộp tiền
    payer_name TEXT NOT NULL,
    payer_id_card TEXT,
    payer_address TEXT,
    
    -- Phân loại thu
    revenue_type TEXT,                       -- 'RECURRENT', 'NON_RECURRENT', 'PRODUCTION'
    category_code TEXT,
    category_name TEXT,
    
    -- Số tiền
    amount REAL NOT NULL,
    
    -- Liên kết HCSN
    fund_source_id TEXT,
    budget_estimate_id TEXT,
    
    -- Kế toán
    payment_method TEXT DEFAULT 'CASH',      -- 'CASH', 'TRANSFER'
    bank_account TEXT,
    account_code TEXT DEFAULT '511',
    
    notes TEXT,
    voucher_id TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
    FOREIGN KEY (budget_estimate_id) REFERENCES budget_estimates(id),
    FOREIGN KEY (category_code) REFERENCES revenue_categories(code)
)`, () => {
    console.log("Initialized 'revenue_receipts' table for HCSN revenue tracking.");
});

// Bảng: Danh mục Khoản mục chi (Expense Categories) - HCSN
db.run(`CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    expense_type TEXT,
    account_code TEXT DEFAULT '611',
    description TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TEXT
)`, (err) => {
    if (err) {
        console.error("Error creating 'expense_categories':", err);
    } else {
        console.log("Initialized 'expense_categories' table for HCSN expense tracking.");

        // Seed initial expense categories
        const categories = [
            { id: 'LUONG', code: 'LUONG', name: 'Lương và phụ cấp', expense_type: 'RECURRENT', account_code: '627.01' },
            { id: 'BHXH', code: 'BHXH', name: 'BHXH, BHYT, BHTN', expense_type: 'RECURRENT', account_code: '627.02' },
            { id: 'VT', code: 'VT', name: 'Vật tư, văn phòng phẩm', expense_type: 'RECURRENT', account_code: '611.01' },
            { id: 'DIEN', code: 'DIEN', name: 'Điện, nước, internet', expense_type: 'RECURRENT', account_code: '627.03' },
            { id: 'SC', code: 'SC', name: 'Sửa chữa, bảo trì', expense_type: 'NON_RECURRENT', account_code: '627.04' },
            { id: 'DT', code: 'DT', name: 'Đầu tư TSCĐ', expense_type: 'CAPEX', account_code: '211' }
        ];

        db.serialize(() => {
            const stmt = db.prepare(`INSERT OR IGNORE INTO expense_categories 
                (id, code, name, expense_type, account_code, created_at) 
                VALUES (?, ?, ?, ?, ?, ?)`);

            categories.forEach(cat => {
                stmt.run(cat.id, cat.code, cat.name, cat.expense_type, cat.account_code, new Date().toISOString());
            });

            stmt.finalize(() => {
                console.log("Seeded expense categories for HCSN.");
            });
        });
    }
});

// Bảng: Phiếu chi / Chứng từ chi (Expense Vouchers) - HCSN
db.run(`CREATE TABLE IF NOT EXISTS expense_vouchers (
    id TEXT PRIMARY KEY,
    voucher_no TEXT UNIQUE NOT NULL,
    voucher_date TEXT NOT NULL,
    fiscal_year INTEGER,
    

    payee_name TEXT NOT NULL,
    payee_tax_code TEXT,
    payee_address TEXT,
    

    expense_type TEXT,
    category_code TEXT,
    category_name TEXT,
    

    amount REAL NOT NULL,
    

    fund_source_id TEXT,
    budget_estimate_id TEXT,
    

    payment_method TEXT DEFAULT 'CASH',
    bank_account TEXT,
    account_code TEXT DEFAULT '611',
    
    notes TEXT,
    ledger_voucher_id TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
    FOREIGN KEY (budget_estimate_id) REFERENCES budget_estimates(id),
    FOREIGN KEY (category_code) REFERENCES expense_categories(code)
)`, (err) => {
    if (err) console.error("Error creating 'expense_vouchers':", err);
    else console.log("Initialized 'expense_vouchers' table for HCSN expense tracking.");
});



// Bảng: Lịch sử khấu hao TSCĐ (Asset Depreciation Log) - MỚI TT 24/2024
db.run(`CREATE TABLE IF NOT EXISTS asset_depreciation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    period TEXT NOT NULL,
    depreciation_amount REAL NOT NULL DEFAULT 0,
    accumulated_depreciation REAL DEFAULT 0,
    net_value REAL DEFAULT 0,
    voucher_id TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
)`, (err) => {
    if (err) console.error("Error creating 'asset_depreciation_log':", err);
    else console.log("Initialized 'asset_depreciation_log' table for HCSN (TT 24/2024).");
});

// Bảng: Thẻ Tài sản (Asset Cards) - Mẫu S02a-H
db.run(`CREATE TABLE IF NOT EXISTS asset_cards (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    card_no TEXT UNIQUE,
    fiscal_year INTEGER,
    

    opening_value REAL DEFAULT 0,
    opening_depreciation REAL DEFAULT 0,
    

    increase_value REAL DEFAULT 0,
    decrease_value REAL DEFAULT 0,
    revaluation_value REAL DEFAULT 0,
    depreciation_current_year REAL DEFAULT 0,
    

    closing_value REAL DEFAULT 0,
    closing_depreciation REAL DEFAULT 0,
    closing_net_value REAL DEFAULT 0,
    
    created_at TEXT,
    updated_at TEXT,
    
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
)`, (err) => {
    if (err) console.error("Error creating 'asset_cards':", err);
    else console.log("Initialized 'asset_cards' table for HCSN Asset Cards (S02a-H).");
});

// Bảng: Phiếu Kiểm kê Tài sản
db.run(`CREATE TABLE IF NOT EXISTS asset_inventory (
    id TEXT PRIMARY KEY,
    inventory_no TEXT UNIQUE,
    inventory_date TEXT,
    fiscal_year INTEGER,
    inventory_type TEXT,
    department TEXT,
    
    status TEXT DEFAULT 'DRAFT',
    
    approved_by TEXT,
    approved_date TEXT,
    notes TEXT,
    
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
)`, (err) => {
    if (err) console.error("Error creating 'asset_inventory':", err);
    else console.log("Initialized 'asset_inventory' table for HCSN Asset Inventory.");
});

// Bảng: Chi tiết Kiểm kê
db.run(`CREATE TABLE IF NOT EXISTS asset_inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    

    book_quantity INTEGER DEFAULT 1,
    book_value REAL DEFAULT 0,
    

    actual_quantity INTEGER DEFAULT 1,
    actual_condition TEXT,
    actual_location TEXT,
    

    diff_quantity INTEGER,
    diff_value REAL,
    reason TEXT,
    
    checked_by TEXT,
    checked_date TEXT,
    notes TEXT,
    
    FOREIGN KEY (inventory_id) REFERENCES asset_inventory(id),
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
)`, (err) => {
    if (err) console.error("Error creating 'asset_inventory_items':", err);
    else console.log("Initialized 'asset_inventory_items' table for HCSN Asset Inventory Details.");
});

db.run(`CREATE TABLE IF NOT EXISTS asset_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    movement_date TEXT NOT NULL,
    
    from_department TEXT,
    to_department TEXT,
    from_location TEXT,
    to_location TEXT,
    
    value_change REAL DEFAULT 0,
    reason TEXT,
    approval_no TEXT,
    voucher_id TEXT,
    
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    
    FOREIGN KEY (asset_id) REFERENCES fixed_assets(id)
)`, (err) => {
    if (err) console.error("Error creating 'asset_movements':", err);
    else console.log("Initialized 'asset_movements' table for HCSN (TT 24/2024).");
});

// ==========================================
// HUMAN RESOURCES & SALARY (TT 24/2024 & ND 204)
// ==========================================

// Bảng: Ngạch lương (Salary Grades) - Nghị định 204
db.run(`CREATE TABLE IF NOT EXISTS salary_grades (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- 01.003
    name TEXT NOT NULL, -- Chuyên viên
    category TEXT -- A1, A2...
)`, (err) => {
    if (!err) {
        console.log("Initialized 'salary_grades' table.");
        // Seed simple data
        db.get("SELECT count(*) as count FROM salary_grades", (err, row) => {
            if (row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO salary_grades (id, code, name, category) VALUES (?, ?, ?, ?)");
                stmt.run('MN_01003', '01.003', 'Chuyên viên', 'A1');
                stmt.run('MN_01002', '01.002', 'Chuyên viên chính', 'A2.1');
                stmt.run('MN_06031', '06.031', 'Kế toán viên', 'A1');
                stmt.finalize();
                console.log("Seeded 'salary_grades' data.");
            }
        });
    }
});

// Bảng: Cán bộ nhân viên (Employees)
db.run(`CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    date_of_birth TEXT,
    department TEXT,
    position TEXT,
    
    -- Thông tin lương HCSN
    salary_grade_id TEXT,
    salary_level INTEGER DEFAULT 1,
    salary_coefficient REAL DEFAULT 2.34,
    
    start_date TEXT,
    contract_type TEXT, -- BIEN_CHE, HOP_DONG
    status TEXT DEFAULT 'ACTIVE',
    
    bank_account TEXT,
    bank_name TEXT,
    tax_code TEXT,
    insurance_number TEXT,
    
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (salary_grade_id) REFERENCES salary_grades(id)
)`, (err) => {
    if (err) console.error("Error creating 'employees':", err);
    else {
        console.log("Initialized 'employees' table.");
        // Seed Admin Employee if empty
        db.get("SELECT count(*) as count FROM employees", (err, row) => {
            if (row && row.count === 0) {
                console.log("Seeding sample employees...");
                const adminId = 'EMP_001';
                db.run(`INSERT INTO employees (id, code, name, department, position, salary_grade_id, salary_level, salary_coefficient, status) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [adminId, 'NV001', 'Nguyễn Văn Admin', 'Ban Giám đốc', 'Giám đốc', 'MN_01002', 1, 4.40, 'ACTIVE']);
            }
        });
    }
});

// Bảng: Danh mục Phụ cấp (Allowance Types) - HCSN
db.serialize(() => {
    db.run("DROP TABLE IF EXISTS allowance_types");
    db.run(`CREATE TABLE allowance_types (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        calculation_type TEXT,
        default_value REAL,
        is_taxable INTEGER DEFAULT 1,
        is_insurance INTEGER DEFAULT 1,
        description TEXT,
        created_at TEXT
    )`, (err) => {
        if (err) return console.error("Error creating 'allowance_types':", err);
        console.log("Initialized 'allowance_types' table for HCSN HR.");

        // Seed sample allowances
        const insert = 'INSERT OR IGNORE INTO allowance_types (id, code, name, calculation_type, default_value) VALUES (?,?,?,?,?)';
        const samples = [
            ['A1', 'PC_CV', 'Phụ cấp Chức vụ', 'COEFFICIENT', 0],
            ['A2', 'PC_TN', 'Phụ cấp Thâm niên', 'PERCENT_CURRENT', 0],
            ['A3', 'PC_KV', 'Phụ cấp Khu vực', 'COEFFICIENT', 0.7],
            ['A4', 'PC_DH', 'Phụ cấp Độc hại', 'COEFFICIENT', 0.2]
        ];
        samples.forEach(s => db.run(insert, s));
    });
});

// Bảng: Phụ cấp nhân viên (Employee Allowances)
db.serialize(() => {
    db.run("DROP TABLE IF EXISTS employee_allowances");
    db.run(`CREATE TABLE employee_allowances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT,
        allowance_type_id TEXT,
        value REAL DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        note TEXT,
        created_at TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (allowance_type_id) REFERENCES allowance_types(id)
    )`, (err) => {
        if (!err) console.log("Initialized 'employee_allowances' table.");
    });
});

// Bảng: Kỳ tính lương (Payroll Periods)
db.run(`CREATE TABLE IF NOT EXISTS payroll_periods (
    id TEXT PRIMARY KEY, -- YYYY-MM
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    standard_days INTEGER DEFAULT 22,
    base_salary REAL DEFAULT 2340000, -- Lương cơ sở từ 1/7/2024
    status TEXT DEFAULT 'DRAFT', -- DRAFT, LOCKED, POSTED
    created_at TEXT
)`, (err) => {
    if (!err) console.log("Initialized 'payroll_periods' table.");
});

// Bảng: Chi tiết lương (Payroll Details)
db.run(`CREATE TABLE IF NOT EXISTS payroll_details (
    id TEXT PRIMARY KEY,
    period_id TEXT,
    employee_id TEXT,
    
    -- Inputs
    salary_coefficient REAL,
    base_salary REAL,
    standard_days REAL,
    actual_days REAL,
    
    -- Calculated
    salary_amount REAL, -- (Hệ số * Lương CS) * (Ngày thực / Ngày chuẩn)
    allowance_amount REAL,
    
    gross_income REAL,
    
    -- Deductions
    insurance_deduction REAL, -- 10.5%
    union_dues REAL,
    tax_deduction REAL,
    
    net_income REAL,
    
    created_at TEXT,
    FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
)`, (err) => {
    if (!err) console.log("Initialized 'payroll_details' table.");
});

// Bảng: Hợp đồng & Quyết định (Employee Contracts)
db.run(`CREATE TABLE IF NOT EXISTS employee_contracts (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    contract_type TEXT, -- HOP_DONG_LAO_DONG, QUYET_DINH_BO_NHIEM, QUYET_DINH_DIEU_DONG
    contract_no TEXT UNIQUE NOT NULL,
    contract_date TEXT,
    effective_date TEXT,
    expiry_date TEXT,
    position TEXT,
    department TEXT,
    salary_grade_id TEXT,
    salary_level INTEGER,
    salary_coefficient REAL,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, TERMINATED
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (salary_grade_id) REFERENCES salary_grades(id)
)`, (err) => {
    if (!err) console.log("Initialized 'employee_contracts' table for HCSN.");
});

// Bảng: Quá trình Lương (Salary History)
db.run(`CREATE TABLE IF NOT EXISTS salary_history (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    effective_date TEXT NOT NULL,
    change_type TEXT, -- NANG_BAC, THANG_HANG, BOI_DUONG_DONG, KHAC
    old_grade_id TEXT,
    new_grade_id TEXT,
    old_level INTEGER,
    new_level INTEGER,
    old_coefficient REAL,
    new_coefficient REAL,
    decision_no TEXT,
    decision_date TEXT,
    notes TEXT,
    created_at TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (old_grade_id) REFERENCES salary_grades(id),
    FOREIGN KEY (new_grade_id) REFERENCES salary_grades(id)
)`, (err) => {
    if (!err) console.log("Initialized 'salary_history' table for HCSN.");
});

// BHXH Authority Data (for reconciliation)
db.run(`CREATE TABLE IF NOT EXISTS bhxh_authority_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    employee_name TEXT,
    insurance_salary REAL,
    bhxh_employee REAL,
    bhyt_employee REAL,
    bhtn_employee REAL,
    bhxh_company REAL,
    bhyt_company REAL,
    bhtn_company REAL,
    union_fee REAL,
    import_date TEXT DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'BHXH_AUTHORITY'
)`, (err) => {
    if (!err) console.log("Initialized 'bhxh_authority_data' table for HCSN.");
});

// Insurance Discrepancies (tracking variances)
db.run(`CREATE TABLE IF NOT EXISTS insurance_discrepancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    employee_id INTEGER,
    employee_code TEXT,
    employee_name TEXT,
    discrepancy_type TEXT NOT NULL,
    internal_value REAL,
    bhxh_value REAL,
    variance REAL,
    status TEXT DEFAULT 'PENDING',
    resolution TEXT,
    resolution_notes TEXT,
    resolved_by TEXT,
    resolved_date TEXT,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
)`, (err) => {
    if (!err) console.log("Initialized 'insurance_discrepancies' table for HCSN.");
});

// Migration: Thêm cột cho chart_of_accounts để hỗ trợ TT 24/2024
db.all("PRAGMA table_info(chart_of_accounts)", (err, columns) => {
    if (!err && columns && columns.length > 0) {
        const hasAccountType = columns.some(c => c.name === 'account_type');
        const hasBudgetCategory = columns.some(c => c.name === 'budget_category');
        const hasIsOffBalance = columns.some(c => c.name === 'is_off_balance');
        const hasTT24Class = columns.some(c => c.name === 'tt24_classification');

        db.serialize(() => {
            if (!hasAccountType) {
                db.run("ALTER TABLE chart_of_accounts ADD COLUMN account_type TEXT");
                console.log("Added 'account_type' to 'chart_of_accounts' for HCSN.");
            }
            if (!hasBudgetCategory) {
                db.run("ALTER TABLE chart_of_accounts ADD COLUMN budget_category TEXT");
                console.log("Added 'budget_category' to 'chart_of_accounts' for HCSN.");
            }
            if (!hasIsOffBalance) {
                db.run("ALTER TABLE chart_of_accounts ADD COLUMN is_off_balance INTEGER DEFAULT 0");
                console.log("Added 'is_off_balance' to 'chart_of_accounts' for HCSN.");
            }
            if (!hasTT24Class) {
                db.run("ALTER TABLE chart_of_accounts ADD COLUMN tt24_classification TEXT");
                console.log("Added 'tt24_classification' to 'chart_of_accounts' for HCSN (TT 24/2024).");
            }
        });
    }
});

// Migration: Thêm cột fund_source_id, budget_category, estimate_id vào voucher_items
db.all("PRAGMA table_info(voucher_items)", (err, columns) => {
    if (!err && columns && columns.length > 0) {
        const hasFundSource = columns.some(c => c.name === 'fund_source_id');
        const hasBudgetCat = columns.some(c => c.name === 'budget_category');
        const hasEstimateId = columns.some(c => c.name === 'estimate_id');

        db.serialize(() => {
            if (!hasFundSource) {
                db.run("ALTER TABLE voucher_items ADD COLUMN fund_source_id TEXT");
                console.log("Added 'fund_source_id' to 'voucher_items' for HCSN.");
            }
            if (!hasBudgetCat) {
                db.run("ALTER TABLE voucher_items ADD COLUMN budget_category TEXT");
                console.log("Added 'budget_category' to 'voucher_items' for HCSN.");
            }
            if (!hasEstimateId) {
                db.run("ALTER TABLE voucher_items ADD COLUMN estimate_id TEXT");
                console.log("Added 'estimate_id' to 'voucher_items' for HCSN.");
            }
        });
    }
});



// ========================================
// PHÂN HỆ KHO VẬT TƯ - HCSN (TT 24/2024)
// ========================================

// Bảng: Danh mục Vật tư (Materials)
db.run(`CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT,
    category TEXT,
    unit TEXT,
    account_code TEXT,
    unit_price REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    max_stock REAL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
)`, (err) => {
    if (err) return console.error("Error creating 'materials':", err);
    console.log("Initialized 'materials' table for HCSN Inventory.");

    // Seed sample materials
    const insert = 'INSERT OR IGNORE INTO materials (id, code, name, category, unit, account_code, unit_price, min_stock, max_stock, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)';
    const now = new Date().toISOString();
    const samples = [
        [`mat_${Date.now()}_1`, 'VL001', 'Giấy A4', 'MATERIAL', 'Ream', '151', 50000, 10, 100, 'ACTIVE', now],
        [`mat_${Date.now()}_2`, 'VL002', 'Bút bi', 'MATERIAL', 'Cái', '151', 3000, 50, 500, 'ACTIVE', now],
        [`mat_${Date.now()}_3`, 'CCDC001', 'Bàn làm việc', 'TOOLS', 'Cái', '152', 2000000, 0, 50, 'ACTIVE', now],
        [`mat_${Date.now()}_4`, 'CCDC002', 'Ghế xoay văn phòng', 'TOOLS', 'Cái', '152', 1500000, 0, 50, 'ACTIVE', now],
        [`mat_${Date.now()}_5`, 'HH001', 'Sách giáo khoa Toán 10', 'GOODS', 'Cuốn', '153', 45000, 100, 1000, 'ACTIVE', now]
    ];
    samples.forEach(s => db.run(insert, s));
    console.log("Seeded sample materials for HCSN.");
});

// Bảng: Phiếu nhập kho vật tư (Material Receipts)
db.run(`CREATE TABLE IF NOT EXISTS material_receipts (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE,
    receipt_date TEXT,
    fiscal_year INTEGER,
    fund_source_id TEXT,
    supplier TEXT,
    warehouse TEXT,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'POSTED',
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
)`, () => {
    console.log("Initialized 'material_receipts' table for HCSN Inventory.");
});

// Bảng: Chi tiết phiếu nhập kho (Material Receipt Items)
db.run(`CREATE TABLE IF NOT EXISTS material_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id TEXT,
    material_id TEXT,
    quantity REAL,
    unit_price REAL,
    amount REAL,
    account_code TEXT,
    notes TEXT,
    FOREIGN KEY (receipt_id) REFERENCES material_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id)
)`, () => {
    console.log("Initialized 'material_receipt_items' table for HCSN Inventory.");
});

// Bảng: Phiếu xuất kho vật tư (Material Issues)
db.run(`CREATE TABLE IF NOT EXISTS material_issues (
    id TEXT PRIMARY KEY,
    issue_no TEXT UNIQUE,
    issue_date TEXT,
    fiscal_year INTEGER,
    department TEXT,
    receiver_name TEXT,
    purpose TEXT,
    warehouse TEXT,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'POSTED',
    approved_by TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
)`, () => {
    console.log("Initialized 'material_issues' table for HCSN Inventory.");
});

// Bảng: Chi tiết phiếu xuất kho (Material Issue Items)
db.run(`CREATE TABLE IF NOT EXISTS material_issue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id TEXT,
    material_id TEXT,
    quantity REAL,
    unit_price REAL,
    amount REAL,
    expense_account_code TEXT,
    notes TEXT,
    FOREIGN KEY (issue_id) REFERENCES material_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id)
)`, () => {
    console.log("Initialized 'material_issue_items' table for HCSN Inventory.");
});

// Bảng: Phiếu điều chuyển kho (Material Transfers)
db.run(`CREATE TABLE IF NOT EXISTS material_transfers (
    id TEXT PRIMARY KEY,
    transfer_no TEXT UNIQUE,
    transfer_date TEXT,
    fiscal_year INTEGER,
    from_warehouse TEXT,
    to_warehouse TEXT,
    notes TEXT,
    status TEXT DEFAULT 'POSTED',
    approved_by TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
)`, () => {
    console.log("Initialized 'material_transfers' table for HCSN Inventory.");
});

// Bảng: Chi tiết phiếu điều chuyển (Material Transfer Items)
db.run(`CREATE TABLE IF NOT EXISTS material_transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id TEXT,
    material_id TEXT,
    quantity REAL,
    notes TEXT,
    FOREIGN KEY (transfer_id) REFERENCES material_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id)
)`, () => {
    console.log("Initialized 'material_transfer_items' table for HCSN Inventory.");
});

// Bảng: Thẻ kho theo nguồn kinh phí (Inventory Cards)
db.run(`CREATE TABLE IF NOT EXISTS inventory_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id TEXT,
    fund_source_id TEXT,
    fiscal_year INTEGER,
    warehouse TEXT,
    opening_qty REAL DEFAULT 0,
    opening_amount REAL DEFAULT 0,
    receipts_qty REAL DEFAULT 0,
    receipts_amount REAL DEFAULT 0,
    issues_qty REAL DEFAULT 0,
    issues_amount REAL DEFAULT 0,
    closing_qty REAL DEFAULT 0,
    closing_amount REAL DEFAULT 0,
    last_updated TEXT,
    FOREIGN KEY (material_id) REFERENCES materials(id),
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
    UNIQUE(material_id, fund_source_id, fiscal_year, warehouse)
)`, () => {
    console.log("Initialized 'inventory_cards' table for HCSN Inventory.");
});

// ========================================
// QUẢN LÝ CÔNG NỢ VÀ TẠM ỨNG - HCSN (TT 24/2024)
// ========================================

// Bảng: Tạm ứng (TK 141 - Advances to employees)
db.run(`CREATE TABLE IF NOT EXISTS temporary_advances (
    id TEXT PRIMARY KEY,
    doc_no TEXT UNIQUE NOT NULL,
    doc_date TEXT NOT NULL,
    fiscal_year INTEGER,
    employee_id TEXT,
    employee_name TEXT NOT NULL,
    employee_dept TEXT,
    purpose TEXT,
    amount REAL DEFAULT 0,
    settled_amount REAL DEFAULT 0,
    remaining REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING', -- PENDING, SETTLED, PARTIAL, OVERDUE
    settlement_date TEXT,
    settlement_doc_no TEXT,
    approval_no TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT
)`, () => {
    console.log("Initialized 'temporary_advances' table for HCSN.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_temp_adv_status ON temporary_advances(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_temp_adv_employee ON temporary_advances(employee_id)`);
});

// Bảng: Ứng trước Ngân sách Nhà nước (TK 161 - Budget advances)
db.run(`CREATE TABLE IF NOT EXISTS budget_advances (
    id TEXT PRIMARY KEY,
    doc_no TEXT UNIQUE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    advance_type TEXT, -- 'NEXT_YEAR', 'EMERGENCY', 'SUPPLEMENTARY'
    amount REAL NOT NULL,
    approval_doc TEXT,
    approval_date TEXT,
    disbursement_date TEXT,
    repayment_deadline TEXT,
    repaid_amount REAL DEFAULT 0,
    remaining REAL,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, REPAID, OVERDUE
    fund_source_id TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id)
)`, () => {
    console.log("Initialized 'budget_advances' table for HCSN.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_adv_year ON budget_advances(fiscal_year)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_adv_status ON budget_advances(status)`);
});

// Bảng: Công nợ phải thu (TK 136, 138 - Receivables)
db.run(`CREATE TABLE IF NOT EXISTS receivables (
    id TEXT PRIMARY KEY,
    doc_no TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    fiscal_year INTEGER,
    partner_code TEXT,
    partner_name TEXT,
    account_code TEXT DEFAULT '136', -- 136: Internal receivables, 138: Other receivables
    account_name TEXT,
    description TEXT,
    original_amount REAL NOT NULL,
    received_amount REAL DEFAULT 0,
    remaining REAL,
    due_date TEXT,
    overdue_days INTEGER DEFAULT 0,
    status TEXT DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID, OVERDUE
    revenue_category_id TEXT,
    payment_method TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (partner_code) REFERENCES partners(partner_code),
    FOREIGN KEY (revenue_category_id) REFERENCES revenue_categories(id)
)`, () => {
    console.log("Initialized 'receivables' table for HCSN.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_receivables_partner ON receivables(partner_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_receivables_account ON receivables(account_code)`);
});

// Bảng: Công nợ phải trả (TK 331, 336, 338 - Payables)
db.run(`CREATE TABLE IF NOT EXISTS payables (
    id TEXT PRIMARY KEY,
    doc_no TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    fiscal_year INTEGER,
    partner_code TEXT,
    partner_name TEXT,
    account_code TEXT DEFAULT '331', -- 331: Trade payables, 336: Internal payables, 338: Other payables
    account_name TEXT,
    description TEXT,
    original_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining REAL,
    due_date TEXT,
    overdue_days INTEGER DEFAULT 0,
    status TEXT DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID, OVERDUE
    expense_category_id TEXT,
    payment_method TEXT,
    fund_source_id TEXT,
    budget_estimate_id TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (partner_code) REFERENCES partners(partner_code),
    FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
    FOREIGN KEY (budget_estimate_id) REFERENCES budget_estimates(id)
)`, () => {
    console.log("Initialized 'payables' table for HCSN.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_payables_partner ON payables(partner_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_payables_account ON payables(account_code)`);
});

// Bảng: Lịch sử thanh toán công nợ phải thu (Receivable Payments)
db.run(`CREATE TABLE IF NOT EXISTS receivable_payments (
    id TEXT PRIMARY KEY,
    receivable_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,
    voucher_id TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE CASCADE
)`, () => {
    console.log("Initialized 'receivable_payments' table for HCSN.");
});

// Bảng: Lịch sử thanh toán công nợ phải trả (Payable Payments)
db.run(`CREATE TABLE IF NOT EXISTS payable_payments (
    id TEXT PRIMARY KEY,
    payable_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,
    voucher_id TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    FOREIGN KEY (payable_id) REFERENCES payables(id) ON DELETE CASCADE
)`, () => {
    console.log("Initialized 'payable_payments' table for HCSN.");
});


// ================================================================
// HCSN BUDGET MANAGEMENT SYSTEM (TT 24/2024)
// Hệ thống Quản lý Dự toán HCSN
// ================================================================

// Bảng: Nguồn kinh phí (Fund Sources)
db.run(`CREATE TABLE IF NOT EXISTS fund_sources (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BUDGET_REGULAR', 'BUDGET_NON_REGULAR', 'REVENUE_RETAINED', 'AID', 'OTHER'
    fiscal_year INTEGER NOT NULL,
    allocated_amount REAL DEFAULT 0,
    spent_amount REAL DEFAULT 0,
    remaining_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'CLOSED'
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, code, fiscal_year)
)`, () => {
    console.log("Initialized 'fund_sources' table for HCSN Budget Management.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_fund_sources_fiscal_year ON fund_sources(fiscal_year)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fund_sources_company ON fund_sources(company_id)`);
});

// Bảng: Dự toán Ngân sách (Budget Estimates)
db.run(`CREATE TABLE IF NOT EXISTS budget_estimates (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fund_source_id TEXT,
    
    -- Phân loại dự toán
    chapter_code TEXT,  -- Mã chương (018, 030, ...)
    item_code TEXT,     -- Mã tiểu mục (511, 521, 523, 611, ...)
    item_name TEXT,
    budget_type TEXT DEFAULT 'EXPENSE', -- 'REVENUE' or 'EXPENSE'
    estimate_type TEXT,                -- 'YEARLY', 'ADDITIONAL', 'ADJUSTMENT'
    
    -- Số liệu
    allocated_amount REAL DEFAULT 0,
    spent_amount REAL DEFAULT 0,
    remaining_amount REAL DEFAULT 0,
    
    -- Quản lý version (điều chỉnh dự toán)
    version INTEGER DEFAULT 1,  -- Dự toán gốc = 1, điều chỉnh lần 1 = 2...
    parent_id TEXT,  -- Link đến version trước đó
    adjustment_reason TEXT,
    adjustment_date TEXT,
    
    -- Theo dõi workflow
    status TEXT DEFAULT 'DRAFT',  -- 'DRAFT', 'APPROVED', 'EXECUTING', 'CLOSED'
    approved_by TEXT,
    approved_date TEXT,
    
    -- Metadata
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (fund_source_id) REFERENCES fund_sources(id),
    FOREIGN KEY (parent_id) REFERENCES budget_estimates(id)
)`, () => {
    console.log("Initialized 'budget_estimates' table for HCSN Budget Management.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_estimates_fiscal_year ON budget_estimates(fiscal_year)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_estimates_fund_source ON budget_estimates(fund_source_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_estimates_chapter ON budget_estimates(chapter_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_estimates_item ON budget_estimates(item_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_estimates_version ON budget_estimates(version)`);

    // Seed sample revenue budgets for testing
    const sampleBudgets = [
        { id: 'BE_HP_2026', company_id: '1', fiscal_year: 2026, item_code: 'HP', item_name: 'Học phí', allocated_amount: 5000000000, budget_type: 'REVENUE', estimate_type: 'YEARLY' },
        { id: 'BE_VP_2026', company_id: '1', fiscal_year: 2026, item_code: 'VP', item_name: 'Viện phí', allocated_amount: 8000000000, budget_type: 'REVENUE', estimate_type: 'YEARLY' },
        { id: 'BE_SXKD_2026', company_id: '1', fiscal_year: 2026, item_code: 'SXKD', item_name: 'Hoạt động SXKD', allocated_amount: 2000000000, budget_type: 'REVENUE', estimate_type: 'YEARLY' }
    ];

    db.serialize(() => {
        const stmt = db.prepare(`INSERT OR IGNORE INTO budget_estimates 
            (id, company_id, fiscal_year, item_code, item_name, allocated_amount, budget_type, estimate_type, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        sampleBudgets.forEach(b => {
            stmt.run(b.id, b.company_id, b.fiscal_year, b.item_code, b.item_name, b.allocated_amount, b.budget_type, b.estimate_type, new Date().toISOString());
        });
        stmt.finalize();
    });
});

// Bảng: Phân bổ Dự toán (Budget Allocations)
db.run(`CREATE TABLE IF NOT EXISTS budget_allocations (
    id TEXT PRIMARY KEY,
    budget_estimate_id TEXT NOT NULL,
    
    -- Phân bổ cho
    department_code TEXT,  -- Mã phòng ban/bộ phận
    department_name TEXT,
    project_code TEXT,     -- Hoặc dự án cụ thể
    
    -- Số liệu
    allocated_amount REAL NOT NULL,
    spent_amount REAL DEFAULT 0,
    remaining_amount REAL,
    
    -- Thời gian hiệu lực
    effective_from TEXT,
    effective_to TEXT,
    
    -- Metadata
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (budget_estimate_id) REFERENCES budget_estimates(id) ON DELETE CASCADE
)`, () => {
    console.log("Initialized 'budget_allocations' table for HCSN Budget Management.");
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_allocations_estimate ON budget_allocations(budget_estimate_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_allocations_department ON budget_allocations(department_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_budget_allocations_project ON budget_allocations(project_code)`);
});


module.exports = db;


