import React from 'react';

export const Footer: React.FC = () => {
    return (
        <div className="h-7 bg-primary text-white text-xs flex items-center px-4 justify-between shrink-0 font-medium z-30 shadow-[0_-1px_2px_rgba(0,0,0,0.1)] select-none">
            {/* Left: System Status */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="opacity-90 font-semibold tracking-wide">Hệ thống sẵn sàng</span>
                </div>
                <div className="hidden md:flex items-center gap-2 opacity-70">
                    <span className="material-symbols-outlined text-[14px]">dns</span>
                    <span>Server: Online (14ms)</span>
                </div>
                <span className="hidden md:inline opacity-60">|</span>
                <span className="hidden md:inline opacity-70">Phiên làm việc: #8F22-KA (Admin)</span>
            </div>

            {/* Right: Version & Copyright */}
            <div className="flex items-center gap-6">
                <span className="opacity-60 hidden sm:inline">© 2025 SyntexHCSN Corp.</span>
                <span className="opacity-80">v2.5.0 (Build 20251230)</span>

                {/* Zoom Controls (Visual only for now, keeps the Excel feel) */}
                <div className="hidden sm:flex items-center gap-2 ml-4 border-l border-white/20 pl-4">
                    <span className="material-symbols-outlined text-[16px] opacity-80 cursor-pointer hover:text-white transition-colors">remove</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] min-w-[3em] text-center">100%</span>
                    <span className="material-symbols-outlined text-[16px] opacity-80 cursor-pointer hover:text-white transition-colors">add</span>
                </div>
            </div>
        </div>
    );
};
