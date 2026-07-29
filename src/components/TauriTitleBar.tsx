import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Tv, Maximize2, Minimize2, Cpu } from 'lucide-react';
import { isTauri, minimizeWindow, toggleMaximizeWindow, closeWindow } from '../utils/tauri';

interface TitleBarProps {
  appName?: string;
}

export const TauriTitleBar: React.FC<TitleBarProps> = ({ appName = 'شاشتي TV' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNativeTauri, setIsNativeTauri] = useState(false);

  useEffect(() => {
    setIsNativeTauri(isTauri());

    const handleResize = () => {
      setIsMaximized(!!document.fullscreenElement || document.body.classList.contains('app-maximized-viewport'));
    };

    const handleCustomMax = (e: any) => {
      if (e.detail?.isMaximized !== undefined) {
        setIsMaximized(e.detail.isMaximized);
      } else {
        setIsMaximized(document.body.classList.contains('app-maximized-viewport'));
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    window.addEventListener('app-maximize-toggled', handleCustomMax);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      window.removeEventListener('app-maximize-toggled', handleCustomMax);
    };
  }, []);

  const handleMaximize = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await toggleMaximizeWindow();
  };

  return (
    <header 
      data-tauri-drag-region
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-10 bg-zinc-950/90 border-b border-white/10 backdrop-blur-xl flex items-center justify-between px-3 select-none z-50 shrink-0 w-full dir-rtl"
    >
      {/* Right Side (App Logo & Title in Arabic) */}
      <div 
        className="flex items-center gap-2.5" 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-black font-black text-xs shadow-md">
          <Tv className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wide text-white drop-shadow">
            {appName}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <Cpu className="w-2.5 h-2.5" />
            <span>Tauri Desktop</span>
          </span>
        </div>
      </div>

      {/* Center Drag Area Indicator */}
      <div 
        data-tauri-drag-region 
        className="flex-1 text-center text-[10px] text-white/30 truncate px-4 pointer-events-none font-mono"
      >
        {isNativeTauri ? 'تطبيق سطح المكتب • Tauri Runtime' : 'شاشتي TV • Desktop System'}
      </div>

      {/* Left Side Window Controls (Close, Maximize, Minimize in Windows/Linux style + macOS compatible) */}
      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={minimizeWindow}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          title="تصغير الشباك"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleMaximize}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          title={isMaximized ? 'استعادة الحجم' : 'تكبير الشباك'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={closeWindow}
          className="w-7 h-7 rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center text-white/70 transition-colors cursor-pointer mr-1"
          title="إغلاق التطبيق"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
