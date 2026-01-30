import React, { useState, useRef, useEffect } from 'react';

interface HeaderProps {
    onSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch }) => {
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const fileMenuRef = useRef<HTMLDivElement>(null);

    // --- Edit Menu Logic ---
    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
    const editMenuRef = useRef<HTMLDivElement>(null);

    // --- Help Menu Logic ---
    const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
    const helpMenuRef = useRef<HTMLDivElement>(null);

    // --- View Menu Logic ---
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // --- Notification Logic ---
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Kết chuyển cuối kỳ', message: 'Hệ thống đã hoàn tất kết chuyển lợi nhuận tháng 12.', time: '5 phút trước', type: 'success', isRead: false },
        { id: 2, title: 'Nhắc nhở hạch toán', message: 'Có 5 hóa đơn đầu vào chưa được hạch toán.', time: '1 giờ trước', type: 'warning', isRead: false },
        { id: 3, title: 'Sao lưu dữ liệu', message: 'Bản sao lưu hệ thống đã được tạo thành công.', time: '2 giờ trước', type: 'info', isRead: true },
        { id: 4, title: 'Cảnh báo tồn kho', message: 'Vật tư VT001 đã chạm mức tồn kho tối thiểu.', time: '1 ngày trước', type: 'error', isRead: false },
    ]);

    const unreadCount = notifications.filter(n => !n.isRead).length;



    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
                setIsFileMenuOpen(false);
            }
            if (editMenuRef.current && !editMenuRef.current.contains(event.target as Node)) {
                setIsEditMenuOpen(false);
            }
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
            if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
                setIsHelpMenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // --- Handlers ---
    const handleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                alert(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        setIsViewMenuOpen(false);
    };

    const handleThemeToggle = () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        setIsViewMenuOpen(false);
    };

    const updateZoom = (newZoom: number) => {
        setZoomLevel(newZoom);
        (document.body.style as any).zoom = newZoom;
    };

    const handleZoomIn = () => updateZoom(Math.min(zoomLevel + 0.1, 2));
    const handleZoomOut = () => updateZoom(Math.max(zoomLevel - 0.1, 0.5));
    const handleZoomReset = () => updateZoom(1);

    const handleLogout = () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        setIsFileMenuOpen(false);
    };

    const handleReload = () => {
        window.location.reload();
        setIsFileMenuOpen(false);
    };

    const handleExport = () => {
        alert("Tính năng 'Xuất dữ liệu' đang được phát triển. Vui lòng quay lại sau.");
        setIsFileMenuOpen(false);
    };

    const handleFeatureNotReady = (feature: string) => {
        alert(`Tính năng '${feature}' đang được phát triển.`);
        setIsEditMenuOpen(false);
        setIsHelpMenuOpen(false);
    };

    const handleFindFocus = () => {
        const searchInput = document.querySelector('input[placeholder="Tìm kiếm..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        setIsEditMenuOpen(false);
    };

    const handleAbout = () => {
        alert("SyntexLegger - Phần mềm Kế toán Doanh nghiệp\nPhiên bản: 1.0.0\nTheo TT 99/2025/TT-BTC");
        setIsHelpMenuOpen(false);
    };

    const handleMarkAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    const toggleNotification = (id: number) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-border-light bg-surface-light dark:bg-surface-dark dark:border-border-dark px-4 py-2 shrink-0 h-12 relative z-[100]">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                    <div className="size-8 bg-blue-600 rounded flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[20px]">table_view</span>
                    </div>
                    <h2 className="text-xl font-bold leading-tight tracking-[-0.015em]">SyntexLegger</h2>
                    <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter uppercase border border-green-200 dark:border-green-800 ml-1">
                        DOANH NGHIỆP
                    </div>
                </div>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className="flex gap-4 relative items-center">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 mr-2">
                        <span className="material-symbols-outlined text-[16px] text-green-600">verified_user</span>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">TT 99/2025/TT-BTC</span>
                    </div>
                    <div ref={fileMenuRef} className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            className={`text-sm font-medium transition-colors ${isFileMenuOpen ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'}`}
                        >
                            Tệp
                        </button>
                        {isFileMenuOpen && (
                            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                <button onClick={handleReload} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                                    Làm mới (Reload)
                                </button>
                                <button onClick={handleExport} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Xuất dữ liệu
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>
                                <button onClick={handleLogout} className="text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>

                    <div ref={editMenuRef} className="relative">
                        <button
                            onClick={() => setIsEditMenuOpen(!isEditMenuOpen)}
                            className={`text-sm font-medium transition-colors ${isEditMenuOpen ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'}`}
                        >
                            Chỉnh sửa
                        </button>
                        {isEditMenuOpen && (
                            <div className="absolute top-8 left-0 w-52 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                <button onClick={() => handleFeatureNotReady('Hoàn tác')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between group">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">undo</span>
                                        Hoàn tác
                                    </div>
                                    <span className="text-xs text-slate-400">Ctrl+Z</span>
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>
                                <button onClick={() => handleFeatureNotReady('Cắt')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">content_cut</span>
                                        Cắt
                                    </div>
                                    <span className="text-xs text-slate-400">Ctrl+X</span>
                                </button>
                                <button onClick={() => handleFeatureNotReady('Sao chép')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        Sao chép
                                    </div>
                                    <span className="text-xs text-slate-400">Ctrl+C</span>
                                </button>
                                <button onClick={() => handleFeatureNotReady('Dán')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">content_paste</span>
                                        Dán
                                    </div>
                                    <span className="text-xs text-slate-400">Ctrl+V</span>
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>
                                <button onClick={handleFindFocus} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">search</span>
                                        Tìm kiếm
                                    </div>
                                    <span className="text-xs text-slate-400">Ctrl+F</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div ref={viewMenuRef} className="relative">
                        <button
                            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                            className={`text-sm font-medium transition-colors ${isViewMenuOpen ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'}`}
                        >
                            Xem
                        </button>
                        {isViewMenuOpen && (
                            <div className="absolute top-8 left-0 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                <button onClick={handleFullScreen} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                                        Toàn màn hình
                                    </div>
                                    <span className="text-xs text-slate-400">F11</span>
                                </button>

                                <button onClick={handleThemeToggle} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                                    Chế độ Tối / Sáng
                                </button>

                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>

                                <div className="px-4 py-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                                        Thu phóng
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded p-0.5">
                                        <button onClick={handleZoomOut} className="size-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded shadow-sm transition-all" title="Thu nhỏ">
                                            <span className="material-symbols-outlined text-[14px]">remove</span>
                                        </button>
                                        <span className="text-xs w-8 text-center font-mono">{(zoomLevel * 100).toFixed(0)}%</span>
                                        <button onClick={handleZoomIn} className="size-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded shadow-sm transition-all" title="Phóng to">
                                            <span className="material-symbols-outlined text-[14px]">add</span>
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleZoomReset} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ml-6">
                                    <span className="text-xs text-slate-500">Đặt lại (100%)</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div ref={helpMenuRef} className="relative">
                        <button
                            onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
                            className={`text-sm font-medium transition-colors ${isHelpMenuOpen ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'}`}
                        >
                            Trợ giúp
                        </button>
                        {isHelpMenuOpen && (
                            <div className="absolute top-8 left-0 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                <button onClick={() => handleFeatureNotReady('Tài liệu hướng dẫn')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                    Tài liệu hướng dẫn
                                </button>
                                <button onClick={() => handleFeatureNotReady('Phím tắt')} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">keyboard</span>
                                    Phím tắt
                                </button>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2"></div>
                                <button onClick={handleAbout} className="text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                    Giới thiệu
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={onSearch}
                    className="flex items-center relative min-w-48 h-8 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                    title="Tìm kiếm chức năng (Ctrl+K)"
                >
                    <span className="absolute left-2.5 text-slate-400 material-symbols-outlined text-[18px]">search</span>
                    <span className="pl-9 pr-3 text-sm text-slate-400 group-hover:text-slate-500">Tìm kiếm...</span>
                    <kbd className="hidden sm:flex items-center gap-0.5 absolute right-2 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-200/70 dark:bg-slate-700 rounded">
                        <span className="text-[9px]">⌘</span>K
                    </kbd>
                </button>
                <div className="flex items-center gap-2">
                    {/* Dark Mode Toggle Button */}
                    <button
                        onClick={handleThemeToggle}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                        title={document.documentElement.classList.contains('dark') ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
                        aria-label="Chuyển đổi chế độ sáng/tối"
                    >
                        <span className="material-symbols-outlined text-[20px] dark:hidden">dark_mode</span>
                        <span className="material-symbols-outlined text-[20px] hidden dark:block text-yellow-400">light_mode</span>
                    </button>

                    <div ref={notificationRef} className="relative">
                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className={`size-8 flex items-center justify-center rounded-full transition-all relative ${isNotificationOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-bounce">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotificationOpen && (
                            <div className="absolute top-10 right-0 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Thông báo</h3>
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        Đánh dấu đã đọc
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-auto custom-scrollbar">
                                    {notifications.length > 0 ? (
                                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                            {notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => toggleNotification(n.id)}
                                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 size-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-green-100 text-green-600' :
                                                            n.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                                                n.type === 'error' ? 'bg-red-100 text-red-600' :
                                                                    'bg-blue-100 text-blue-600'
                                                            }`}>
                                                            <span className="material-symbols-outlined text-[18px]">
                                                                {n.type === 'success' ? 'check_circle' :
                                                                    n.type === 'warning' ? 'warning' :
                                                                        n.type === 'error' ? 'error' : 'info'}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <h4 className={`text-sm font-bold truncate ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {n.title}
                                                                </h4>
                                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{n.time}</span>
                                                            </div>
                                                            <p className={`text-xs line-clamp-2 ${!n.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>
                                                                {n.message}
                                                            </p>
                                                        </div>
                                                        {!n.isRead && (
                                                            <div className="size-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center">
                                            <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2">notifications_off</span>
                                            <p className="text-sm text-slate-500">Không có thông báo mới nào</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-800/30">
                                    <button className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                                        Xem tất cả thông báo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-8 border border-slate-200 cursor-pointer hover:ring-2 ring-blue-500/30 transition-all" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD3y6BY7lD3ZiyWwytj-YSSAch1sxkW7FIEnLeOS2ybqTc-F7Eh8kAaEJG9P5CI9ruzKBgUV_zLpYkWc8Y0D10R6MEMsICck33Fp-1lkldHuUslOYW_ElIFtynXWh1k3_JIcKpPLfBs9m47ZtlcoSLIZVOG0lybERD60l_ACrqMPKLBCP4-JKiNJe68L5y-OOSfdbpkPXdT5ndEvDkGhXKPrAlTCk092ABV1ikNEkHJzGaL7hXnt6veBmzF1aQahBrc2H1wV2bFx0fs")' }}></div>
                </div>
            </div>
        </header>
    );
};
