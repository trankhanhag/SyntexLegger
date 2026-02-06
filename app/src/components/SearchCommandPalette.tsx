import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface SearchableItem {
    id: string;
    label: string;
    icon: string;
    section?: string;
    category: string;
    keywords?: string[];
}

// Định nghĩa tất cả các item có thể tìm kiếm trong hệ thống
const ALL_SEARCHABLE_ITEMS: SearchableItem[] = [
    // === DASHBOARD ===
    { id: 'dashboard', label: 'Bàn làm việc', icon: 'dashboard', category: 'Dashboard', keywords: ['trang chủ', 'home', 'main'] },
    { id: 'overdue_inv', label: 'Hóa đơn quá hạn', icon: 'priority_high', category: 'Dashboard', keywords: ['hóa đơn', 'quá hạn', 'cảnh báo'] },
    { id: 'incomplete_docs', label: 'Chứng từ lỗi', icon: 'error_outline', category: 'Dashboard', keywords: ['lỗi', 'chứng từ'] },

    // === QUẢN LÝ DOANH NGHIỆP ===
    { id: 'departments', label: 'Bộ phận / Chi nhánh', icon: 'apartment', section: 'QUẢN LÝ DOANH NGHIỆP', category: 'Tổng hợp', keywords: ['bộ phận', 'chi nhánh', 'phòng ban'] },
    { id: 'revenue', label: 'Doanh thu', icon: 'trending_up', section: 'QUẢN LÝ DOANH NGHIỆP', category: 'Tổng hợp', keywords: ['doanh thu', 'bán hàng', 'thu nhập'] },
    { id: 'expense', label: 'Chi phí', icon: 'receipt_long', section: 'QUẢN LÝ DOANH NGHIỆP', category: 'Tổng hợp', keywords: ['chi phí', 'mua hàng', 'thanh toán'] },
    { id: 'contract', label: 'Hợp đồng', icon: 'handshake', section: 'QUẢN LÝ DOANH NGHIỆP', category: 'Tổng hợp', keywords: ['hợp đồng', 'thỏa thuận', 'ký kết'] },
    { id: 'project', label: 'Dự án', icon: 'business_center', section: 'QUẢN LÝ DOANH NGHIỆP', category: 'Tổng hợp', keywords: ['dự án', 'công trình', 'đầu tư'] },

    // === CHỨNG TỪ TỔNG HỢP ===
    { id: 'voucher_list', label: 'Danh sách chứng từ', icon: 'format_list_bulleted', section: 'CHỨNG TỪ TỔNG HỢP', category: 'Tổng hợp', keywords: ['chứng từ', 'danh sách', 'bút toán'] },

    // === QUY TRÌNH CUỐI KỲ ===
    { id: 'allocation', label: 'Phân bổ chi phí', icon: 'percent', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['phân bổ', 'chi phí', 'cuối kỳ'] },
    { id: 'revaluation', label: 'Đánh giá lại Đ/G', icon: 'currency_exchange', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['đánh giá', 'tỷ giá', 'ngoại tệ'] },
    { id: 'check', label: 'Kiểm tra đối chiếu', icon: 'fact_check', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['kiểm tra', 'đối chiếu', 'cuối kỳ'] },
    { id: 'closing', label: 'Kết chuyển cuối kỳ', icon: 'published_with_changes', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['kết chuyển', 'cuối kỳ', 'đóng sổ'] },
    { id: 'locking', label: 'Khóa sổ kế toán', icon: 'lock', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['khóa sổ', 'kế toán', 'cuối kỳ'] },
    { id: 'closing_macro', label: 'Quy trình cuối tháng', icon: 'rocket_launch', section: 'QUY TRÌNH CUỐI KỲ', category: 'Tổng hợp', keywords: ['cuối tháng', 'macro', 'tự động'] },

    // === DANH MỤC & THIẾT LẬP ===
    { id: 'account_list', label: 'Hệ thống Tài khoản', icon: 'account_tree', section: 'DANH MỤC', category: 'Tổng hợp', keywords: ['tài khoản', 'hệ thống', 'danh mục'] },
    { id: 'opening_balance', label: 'Số dư đầu kỳ', icon: 'account_balance_wallet', section: 'DANH MỤC', category: 'Tổng hợp', keywords: ['số dư', 'đầu kỳ', 'mở sổ'] },
    { id: 'cost_item', label: 'Khoản mục Chi phí', icon: 'category', section: 'DANH MỤC', category: 'Tổng hợp', keywords: ['khoản mục', 'chi phí'] },
    { id: 'cost_revenue', label: 'Khoản mục Thu', icon: 'trending_up', section: 'DANH MỤC', category: 'Tổng hợp', keywords: ['khoản mục', 'thu'] },

    // === BÁO CÁO TÀI CHÍNH DN (TT 99/2025) ===
    { id: 'balance_sheet_dn', label: 'Bảng Cân đối Kế toán (B01-DN)', icon: 'analytics', section: 'BÁO CÁO TÀI CHÍNH', category: 'Báo cáo', keywords: ['cân đối', 'tài sản', 'nguồn vốn', 'báo cáo'] },
    { id: 'profit_loss', label: 'Báo cáo Kết quả Kinh doanh (B02-DN)', icon: 'summarize', section: 'BÁO CÁO TÀI CHÍNH', category: 'Báo cáo', keywords: ['kết quả', 'kinh doanh', 'lợi nhuận', 'báo cáo'] },
    { id: 'cash_flow_dn', label: 'Báo cáo Lưu chuyển Tiền tệ (B03-DN)', icon: 'account_balance_wallet', section: 'BÁO CÁO TÀI CHÍNH', category: 'Báo cáo', keywords: ['lưu chuyển', 'tiền tệ', 'dòng tiền', 'báo cáo'] },
    { id: 'notes_fs', label: 'Thuyết minh BCTC (B09-DN)', icon: 'description', section: 'BÁO CÁO TÀI CHÍNH', category: 'Báo cáo', keywords: ['thuyết minh', 'bctc', 'báo cáo'] },

    // === BÁO CÁO QUẢN TRỊ ===
    { id: 'trial_balance', label: 'Bảng Cân đối Tài khoản', icon: 'receipt_long', section: 'BÁO CÁO QUẢN TRỊ', category: 'Báo cáo', keywords: ['cân đối', 'tài khoản', 'thử'] },
    { id: 'general_ledger', label: 'Sổ Cái', icon: 'menu_book', section: 'BÁO CÁO QUẢN TRỊ', category: 'Báo cáo', keywords: ['sổ cái', 'ledger'] },
    { id: 'ledger', label: 'Sổ Nhật ký chung', icon: 'timeline', section: 'BÁO CÁO QUẢN TRỊ', category: 'Báo cáo', keywords: ['nhật ký', 'journal', 'sổ'] },

    // === SỔ KẾ TOÁN ===
    { id: 'trial_balance', label: 'Bảng Cân đối Tài khoản', icon: 'balance', section: 'SỔ KẾ TOÁN', category: 'Báo cáo', keywords: ['cân đối', 'phát sinh'] },
    { id: 'ledger', label: 'Sổ Nhật ký chung', icon: 'history_edu', section: 'SỔ KẾ TOÁN', category: 'Báo cáo', keywords: ['nhật ký', 'chung', 'sổ'] },
    { id: 'general_ledger', label: 'Sổ Cái', icon: 'menu_book', section: 'SỔ KẾ TOÁN', category: 'Báo cáo', keywords: ['sổ cái', 'tài khoản'] },
    { id: 'cash_book', label: 'Sổ Quỹ Tiền mặt', icon: 'account_balance_wallet', section: 'SỔ KẾ TOÁN', category: 'Báo cáo', keywords: ['sổ quỹ', 'tiền mặt'] },
    { id: 'bank_book', label: 'Sổ Tiền gửi Ngân hàng', icon: 'account_balance', section: 'SỔ KẾ TOÁN', category: 'Báo cáo', keywords: ['ngân hàng', 'tiền gửi'] },
    { id: 'custom_report', label: 'Báo cáo Tùy biến', icon: 'dashboard_customize', section: 'BÁO CÁO KHÁC', category: 'Báo cáo', keywords: ['tùy biến', 'tạo báo cáo'] },

    // === NGÂN QUỸ ===
    { id: 'cash_receipt', label: 'Phiếu thu', icon: 'payments', section: 'NGHIỆP VỤ THU CHI', category: 'Ngân quỹ', keywords: ['phiếu thu', 'tiền mặt'] },
    { id: 'cash_payment', label: 'Phiếu chi', icon: 'output', section: 'NGHIỆP VỤ THU CHI', category: 'Ngân quỹ', keywords: ['phiếu chi', 'tiền mặt'] },
    { id: 'cash_bank_in', label: 'Giấy báo có', icon: 'account_balance', section: 'NGÂN HÀNG', category: 'Ngân quỹ', keywords: ['giấy báo có', 'ngân hàng', 'nộp tiền'] },
    { id: 'cash_bank_out', label: 'Giấy báo nợ', icon: 'money_off', section: 'NGÂN HÀNG', category: 'Ngân quỹ', keywords: ['giấy báo nợ', 'ngân hàng', 'rút tiền'] },
    { id: 'cash_bank_sync', label: 'Đối soát Ngân hàng', icon: 'sync_alt', section: 'NGÂN HÀNG', category: 'Ngân quỹ', keywords: ['đối soát', 'ngân hàng'] },

    // === DOANH THU ===
    { id: 'revenue_receipt', label: 'Hóa đơn Bán hàng', icon: 'receipt', section: 'CHỨNG TỪ', category: 'Doanh thu', keywords: ['hóa đơn', 'bán hàng', 'thu tiền'] },
    { id: 'revenue_payment', label: 'Phiếu Thu tiền', icon: 'payments', section: 'CHỨNG TỪ', category: 'Doanh thu', keywords: ['phiếu thu', 'thu tiền'] },
    { id: 'revenue_categories', label: 'Danh mục Loại doanh thu', icon: 'category', section: 'DANH MỤC', category: 'Doanh thu', keywords: ['loại doanh thu', 'danh mục'] },

    // === CHI PHÍ ===
    { id: 'expense_voucher', label: 'Phiếu chi', icon: 'receipt_long', section: 'PHIẾU CHI', category: 'Chi phí', keywords: ['phiếu chi', 'chi phí'] },
    { id: 'expense_payment', label: 'Ủy nhiệm chi', icon: 'payments', section: 'PHIẾU CHI', category: 'Chi phí', keywords: ['ủy nhiệm chi', 'chuyển khoản'] },
    { id: 'expense_categories', label: 'Danh mục Khoản mục chi phí', icon: 'category', section: 'DANH MỤC', category: 'Chi phí', keywords: ['khoản mục chi phí', 'danh mục'] },

    // === KHO ===
    { id: 'inventory_receipt', label: 'Nhập kho', icon: 'inventory_2', category: 'Kho', keywords: ['nhập kho', 'phiếu nhập'] },
    { id: 'inventory_issue', label: 'Xuất kho', icon: 'output', category: 'Kho', keywords: ['xuất kho', 'phiếu xuất'] },
    { id: 'inventory_transfer', label: 'Điều chuyển kho', icon: 'sync_alt', category: 'Kho', keywords: ['điều chuyển', 'chuyển kho'] },
    { id: 'inventory_items', label: 'Danh mục Vật tư', icon: 'category', category: 'Kho', keywords: ['vật tư', 'danh mục', 'hàng hóa'] },
    { id: 'inventory_status', label: 'Tổng hợp Tồn kho', icon: 'inventory', category: 'Kho', keywords: ['tồn kho', 'báo cáo'] },

    // === TÀI SẢN CỐ ĐỊNH ===
    { id: 'asset_fixed_list', label: 'Danh mục TSCĐ', icon: 'list_alt', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['tài sản', 'cố định', 'danh mục'] },
    { id: 'asset_fixed_increase', label: 'Ghi tăng TSCĐ', icon: 'add_business', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['ghi tăng', 'tài sản'] },
    { id: 'asset_fixed_decrease', label: 'Ghi giảm TSCĐ', icon: 'domain_disabled', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['ghi giảm', 'tài sản', 'thanh lý'] },
    { id: 'asset_depreciation', label: 'Tính khấu hao TSCĐ', icon: 'trending_down', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['khấu hao', 'tài sản'] },
    { id: 'asset_transfer', label: 'Điều chuyển TSCĐ', icon: 'swap_horiz', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['điều chuyển', 'tài sản'] },
    { id: 'asset_inventory', label: 'Kiểm kê TSCĐ', icon: 'fact_check', section: 'TÀI SẢN CỐ ĐỊNH', category: 'Tài sản', keywords: ['kiểm kê', 'tài sản'] },

    // === CÔNG NỢ & TẠM ỨNG ===
    { id: 'loan_temp_advances', label: 'Tạm ứng (TK 141)', icon: 'account_balance_wallet', category: 'Công nợ', keywords: ['tạm ứng', '141'] },
    { id: 'loan_receivables', label: 'Công nợ phải thu', icon: 'payments', category: 'Công nợ', keywords: ['phải thu', 'công nợ'] },
    { id: 'loan_payables', label: 'Công nợ phải trả', icon: 'receipt_long', category: 'Công nợ', keywords: ['phải trả', 'công nợ'] },

    // === NHÂN SỰ ===
    { id: 'hr_employees', label: 'Cán bộ - Viên chức', icon: 'person_add', section: 'HỒ SƠ CÁN BỘ', category: 'Nhân sự', keywords: ['cán bộ', 'viên chức', 'nhân viên'] },
    { id: 'hr_contracts', label: 'Hợp đồng & Quyết định', icon: 'history_edu', section: 'HỒ SƠ CÁN BỘ', category: 'Nhân sự', keywords: ['hợp đồng', 'quyết định'] },
    { id: 'hr_payroll', label: 'Tính Lương & Phụ cấp', icon: 'payments', section: 'LƯƠNG & THU NHẬP', category: 'Nhân sự', keywords: ['lương', 'phụ cấp', 'tính lương'] },
    { id: 'hr_timesheet', label: 'Bảng chấm công', icon: 'event_available', section: 'LƯƠNG & THU NHẬP', category: 'Nhân sự', keywords: ['chấm công', 'bảng công'] },
    { id: 'hr_insurance', label: 'Bảo hiểm & Khấu trừ', icon: 'health_and_safety', section: 'LƯƠNG & THU NHẬP', category: 'Nhân sự', keywords: ['bảo hiểm', 'bhxh', 'khấu trừ'] },

    // === HỢP ĐỒNG ===
    { id: 'contract_sales', label: 'Hợp đồng Bán ra', icon: 'contract', section: 'HỢP ĐỒNG', category: 'Hợp đồng', keywords: ['hợp đồng', 'bán'] },
    { id: 'contract_purchase', label: 'Hợp đồng Mua vào', icon: 'assignment', section: 'HỢP ĐỒNG', category: 'Hợp đồng', keywords: ['hợp đồng', 'mua'] },
    { id: 'contract_tracking', label: 'Theo dõi Thanh toán', icon: 'pending_actions', section: 'QUẢN LÝ', category: 'Hợp đồng', keywords: ['thanh toán', 'theo dõi'] },

    // === DỰ ÁN ===
    { id: 'project_list', label: 'Danh sách Dự án', icon: 'list_alt', section: 'DỰ ÁN', category: 'Dự án', keywords: ['dự án', 'danh sách'] },
    { id: 'project_tracking', label: 'Tiến độ Thực hiện', icon: 'analytics', section: 'THEO DÕI', category: 'Dự án', keywords: ['tiến độ', 'thực hiện'] },
    { id: 'project_budget', label: 'Ngân sách & Chi phí', icon: 'attach_money', section: 'THEO DÕI', category: 'Dự án', keywords: ['ngân sách', 'chi phí', 'dự án'] },

    // === HỆ THỐNG ===
    { id: 'sys_params', label: 'Tham số hệ thống', icon: 'settings', section: 'QUẢN TRỊ', category: 'Hệ thống', keywords: ['tham số', 'cài đặt'] },
    { id: 'sys_users', label: 'Quản lý người dùng', icon: 'manage_accounts', section: 'QUẢN TRỊ', category: 'Hệ thống', keywords: ['người dùng', 'user'] },
    { id: 'sys_perms', label: 'Phân quyền', icon: 'security', section: 'QUẢN TRỊ', category: 'Hệ thống', keywords: ['phân quyền', 'permission'] },
    { id: 'sys_backup', label: 'Sao lưu dữ liệu', icon: 'backup', section: 'QUẢN TRỊ', category: 'Hệ thống', keywords: ['sao lưu', 'backup'] },
    { id: 'sys_audit_trail', label: 'Nhật ký Kiểm toán', icon: 'history_edu', section: 'KIỂM SOÁT', category: 'Hệ thống', keywords: ['kiểm toán', 'audit', 'nhật ký'] },
    { id: 'audit', label: 'Kiểm tra Sức khỏe Hệ thống', icon: 'health_and_safety', category: 'Hệ thống', keywords: ['kiểm tra', 'sức khỏe', 'audit'] },
];

// Remove diacritics for Vietnamese text search
const removeDiacritics = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

// Fuzzy search function
const fuzzyMatch = (query: string, text: string): boolean => {
    const normalizedQuery = removeDiacritics(query);
    const normalizedText = removeDiacritics(text);

    // Check if query is substring
    if (normalizedText.includes(normalizedQuery)) return true;

    // Simple fuzzy: check if all characters in query appear in order in text
    let queryIndex = 0;
    for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
        if (normalizedText[i] === normalizedQuery[queryIndex]) {
            queryIndex++;
        }
    }
    return queryIndex === normalizedQuery.length;
};

interface SearchCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (viewId: string, data?: any) => void;
}

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Search results
    const results = useMemo(() => {
        if (!query.trim()) {
            // Show recent/popular items when no query
            return ALL_SEARCHABLE_ITEMS.slice(0, 8);
        }

        const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

        return ALL_SEARCHABLE_ITEMS
            .map(item => {
                let score = 0;
                const searchableText = [
                    item.label,
                    item.section || '',
                    item.category,
                    ...(item.keywords || [])
                ].join(' ');

                for (const term of searchTerms) {
                    // Exact label match gets highest score
                    if (removeDiacritics(item.label).includes(removeDiacritics(term))) {
                        score += 10;
                    }
                    // Section match
                    if (item.section && removeDiacritics(item.section).includes(removeDiacritics(term))) {
                        score += 5;
                    }
                    // Keyword match
                    if (item.keywords?.some(kw => removeDiacritics(kw).includes(removeDiacritics(term)))) {
                        score += 7;
                    }
                    // Fuzzy match
                    if (fuzzyMatch(term, searchableText)) {
                        score += 3;
                    }
                }

                return { item, score };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12)
            .map(({ item }) => item);
    }, [query]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && results.length > 0) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, results]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [results, selectedIndex, onClose]);

    const handleSelect = (item: SearchableItem) => {
        onNavigate(item.id);
        onClose();
    };

    if (!isOpen) return null;

    // Group results by category
    const groupedResults = results.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<string, SearchableItem[]>);

    let flatIndex = 0;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 slide-in-from-top-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tìm kiếm chức năng..."
                        className="flex-1 bg-transparent text-lg outline-none placeholder-slate-400 text-slate-800 dark:text-white"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
                    {results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                            <p className="text-sm">Không tìm thấy kết quả cho "{query}"</p>
                        </div>
                    ) : (
                        Object.entries(groupedResults).map(([category, items]) => (
                            <div key={category} className="mb-2">
                                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {category}
                                </div>
                                {items.map(item => {
                                    const currentIndex = flatIndex++;
                                    const isSelected = currentIndex === selectedIndex;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                                isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                isSelected
                                                    ? 'bg-blue-100 dark:bg-blue-800/50'
                                                    : 'bg-slate-100 dark:bg-slate-700'
                                            }`}>
                                                <span className={`material-symbols-outlined ${
                                                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
                                                }`}>
                                                    {item.icon}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{item.label}</div>
                                                {item.section && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {item.section}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">keyboard_return</span>
                                                    Enter
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium">↓</kbd>
                            <span className="ml-1">Di chuyển</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-medium">↵</kbd>
                            <span className="ml-1">Chọn</span>
                        </span>
                    </div>
                    <span className="text-xs text-slate-400">{results.length} kết quả</span>
                </div>
            </div>
        </div>
    );
};

// Hook to manage search state with keyboard shortcut
export const useSearchCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K or Cmd+K to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            // Also support / key when not in input
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev)
    };
};

export default SearchCommandPalette;
