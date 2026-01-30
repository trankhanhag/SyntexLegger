import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { reminderService } from '../api';
import { MENU_MAP, TAB_TITLES, TAB_ICONS, SECTION_CONFIG, searchMenuItems, type MenuItem } from '../config/sidebarConfig';

interface SidebarProps {
    activeTab: string;
    activeView?: string; // Current active view ID
    onNavigate?: (view: string) => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

// Favorites stored in localStorage
const FAVORITES_KEY = 'syntex_sidebar_favorites';

const getFavorites = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveFavorites = (favorites: string[]) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    activeView,
    onNavigate,
    isMobileOpen = false,
    onMobileClose
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [cashBalance, setCashBalance] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<string[]>(getFavorites);

    // Fetch cash balance
    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await reminderService.getStats();
                setCashBalance(res.data.cash || 0);
            } catch (err) {
                console.error("Failed to fetch sidebar balance", err);
            }
        };
        fetchBalance();
    }, []);

    // Reset search when tab changes
    useEffect(() => {
        setSearchQuery('');
    }, [activeTab]);

    // Toggle section expansion
    const toggleSection = useCallback((section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Toggle favorite
    const toggleFavorite = useCallback((itemId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFavorites(prev => {
            const newFavorites = prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId];
            saveFavorites(newFavorites);
            return newFavorites;
        });
    }, []);

    // Get menu items for current tab
    const menuItems = useMemo(() => {
        return MENU_MAP[activeTab] || MENU_MAP['general'] || [];
    }, [activeTab]);

    // Filter items by search query
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItems;
        return searchMenuItems(searchQuery, activeTab);
    }, [menuItems, searchQuery, activeTab]);

    // Group items by section
    const groupedItems = useMemo(() => {
        const groups: Record<string, MenuItem[]> = {};
        filteredItems.forEach(item => {
            const section = item.section || '';
            if (!groups[section]) groups[section] = [];
            groups[section].push(item);
        });
        return groups;
    }, [filteredItems]);

    // Get favorite items for current tab
    const favoriteItems = useMemo(() => {
        return menuItems.filter(item => favorites.includes(item.id));
    }, [menuItems, favorites]);

    // Get title and icon
    const title = TAB_TITLES[activeTab] || 'Truy cập nhanh';
    const tabIcon = TAB_ICONS[activeTab] || 'folder';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    // Check if section is expanded (default to true for first 2 sections)
    const isSectionExpanded = (section: string, index: number) => {
        if (section in expandedSections) return expandedSections[section];
        return index < 2; // First 2 sections expanded by default
    };

    // Render menu item
    const renderMenuItem = (item: MenuItem, showFavoriteBtn = true) => {
        const isActive = activeView === item.id;
        const isFavorite = favorites.includes(item.id);

        return (
            <a
                key={item.id}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    if (onNavigate) onNavigate(item.id);
                    if (isMobileOpen && onMobileClose) onMobileClose();
                }}
                className={`group/item flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap overflow-hidden transition-all duration-150
                    ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                `}
                title={item.label}
            >
                <span className={`material-symbols-outlined text-[20px] shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {item.icon}
                </span>
                {!isCollapsed && (
                    <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {showFavoriteBtn && (
                            <button
                                onClick={(e) => toggleFavorite(item.id, e)}
                                className={`shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 ${isFavorite ? '!opacity-100' : ''}`}
                                title={isFavorite ? 'Bỏ ghim' : 'Ghim menu'}
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isFavorite ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {isFavorite ? 'star' : 'star_outline'}
                                </span>
                            </button>
                        )}
                    </>
                )}
            </a>
        );
    };

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
                    onClick={onMobileClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div
                className={`
                    ${isCollapsed ? 'w-16' : 'w-64'}
                    transition-all duration-300
                    bg-white dark:bg-slate-800
                    border-r border-slate-200 dark:border-slate-700
                    flex flex-col shrink-0 relative group/sidebar z-50
                    no-print sidebar

                    /* Desktop: Always visible */
                    lg:flex

                    /* Mobile: Fixed position with slide animation */
                    fixed lg:relative
                    inset-y-0 left-0
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                data-no-print
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-0.5 text-slate-500 hover:text-blue-600 shadow-sm opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-10"
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <span className="material-symbols-outlined text-[16px] block">
                        {isCollapsed ? 'chevron_right' : 'chevron_left'}
                    </span>
                </button>

                {/* Header */}
                <div className={`p-3 border-b border-slate-100 dark:border-slate-700 ${isCollapsed ? 'px-2' : ''}`}>
                    {/* Title with Icon */}
                    <div className={`flex items-center gap-2 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
                        <span className="material-symbols-outlined text-[20px] text-blue-600 dark:text-blue-400">
                            {tabIcon}
                        </span>
                        {!isCollapsed && (
                            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide truncate">
                                {title}
                            </h2>
                        )}
                    </div>

                    {/* Search Bar */}
                    {!isCollapsed && (
                        <div className="relative">
                            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Collapsed Search Toggle */}
                    {isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="w-full flex justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Tìm kiếm"
                        >
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </button>
                    )}
                </div>

                {/* Main Navigation */}
                <div className="flex-1 p-2 overflow-y-auto">
                    {/* Favorites Section */}
                    {favoriteItems.length > 0 && !searchQuery && !isCollapsed && (
                        <div className="mb-3">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                <span className="material-symbols-outlined text-[14px]">star</span>
                                <span>Đã ghim</span>
                            </div>
                            <div className="space-y-0.5">
                                {favoriteItems.map(item => renderMenuItem(item, true))}
                            </div>
                            <div className="border-b border-slate-100 dark:border-slate-700 mt-3 mb-2"></div>
                        </div>
                    )}

                    {/* Search Results */}
                    {searchQuery && (
                        <div className="mb-2">
                            <p className="px-2 py-1 text-[10px] font-medium text-slate-400">
                                {filteredItems.length} kết quả cho "{searchQuery}"
                            </p>
                        </div>
                    )}

                    {/* Menu Sections */}
                    <nav className="space-y-1">
                        {Object.entries(groupedItems).map(([section, items], sectionIndex) => {
                            const sectionConfig = SECTION_CONFIG[section];
                            const isExpanded = isSectionExpanded(section, sectionIndex);

                            return (
                                <div key={section || 'no-section'} className="mb-1">
                                    {/* Section Header */}
                                    {section && !isCollapsed && (
                                        <button
                                            onClick={() => toggleSection(section)}
                                            className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-2 mb-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                        >
                                            {sectionConfig && (
                                                <span className={`material-symbols-outlined text-[14px] text-${sectionConfig.color}-500`}>
                                                    {sectionConfig.icon}
                                                </span>
                                            )}
                                            <span className="flex-1 text-left truncate">{section}</span>
                                            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}>
                                                expand_more
                                            </span>
                                        </button>
                                    )}

                                    {/* Section Items */}
                                    <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${isExpanded || !section ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        {items.map(item => renderMenuItem(item))}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    {/* Empty State */}
                    {filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <span className="material-symbols-outlined text-[32px] mb-2">search_off</span>
                            <p className="text-sm">Không tìm thấy menu</p>
                        </div>
                    )}
                </div>

                {/* Footer Widget - Contextual */}
                <div className={`mt-auto p-3 border-t border-slate-100 dark:border-slate-700 ${isCollapsed ? 'px-2' : ''}`}>
                    {/* Cash Balance - Show only for relevant tabs */}
                    {['cash', 'general', 'dashboard'].includes(activeTab) ? (
                        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50 transition-all ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}>
                            {!isCollapsed ? (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="material-symbols-outlined text-[16px] text-blue-600">account_balance_wallet</span>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase">Số dư tiền mặt</p>
                                    </div>
                                    <p className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                                        {formatCurrency(cashBalance)} <span className="text-sm text-slate-400">₫</span>
                                    </p>
                                </div>
                            ) : (
                                <span
                                    className="material-symbols-outlined text-[24px] text-blue-600"
                                    title={`Số dư tiền mặt: ${formatCurrency(cashBalance)} ₫`}
                                >
                                    paid
                                </span>
                            )}
                        </div>
                    ) : (
                        /* Quick Stats for other tabs */
                        <div className={`text-center ${isCollapsed ? '' : 'py-1'}`}>
                            {!isCollapsed && (
                                <p className="text-[10px] text-slate-400">
                                    <span className="font-medium">{menuItems.length}</span> menu trong phân hệ
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
