import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ProcessingRingProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
  className?: string;
  fixedTop?: boolean;
}

export const ProcessingRing: React.FC<ProcessingRingProps> = ({
  isVisible,
  message = 'جاري معالجة واستخراج البيانات...',
  subMessage,
  className = '',
  fixedTop = true,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`${
            fixedTop
              ? 'fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none'
              : 'relative'
          } flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-zinc-900/95 border border-amber-400/40 text-white shadow-[0_12px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl ${className}`}
        >
          {/* Subtle Animated Progress Ring */}
          <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                className="text-white/10"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="14"
                className="text-amber-400"
                strokeWidth="3.5"
                strokeDasharray="88"
                strokeDashoffset="30"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: 'center' }}
              />
            </svg>
            <div className="absolute w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" />
          </div>

          {/* Text Labels */}
          <div className="flex flex-col select-none dir-rtl">
            <span className="text-sm font-bold text-amber-200 leading-tight">
              {message}
            </span>
            {subMessage && (
              <span className="text-xs text-white/60 mt-0.5 font-medium">
                {subMessage}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
