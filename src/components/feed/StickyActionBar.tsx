'use client';
import React from 'react';

interface StickyActionBarProps {
  onFinderClick: () => void;
  onReceiverClick: () => void;
}

export const StickyActionBar = ({
  onFinderClick,
  onReceiverClick,
}: StickyActionBarProps) => {
  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-[80px] sm:h-[88px]" />
      
      {/* Fixed Action Bar */}
      <div className="fixed top-[88px] sm:top-[97px] left-0 right-0 z-40 bg-background/98 backdrop-blur-md border-y border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex gap-2 sm:gap-3 items-center justify-center">
            {/* Found Item (Deposit) */}
            <button
              onClick={onFinderClick}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 gradient-primary text-primary-foreground rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>เจอของ (ฝาก)</span>
            </button>

            {/* Lost Item (Receive) */}
            <button
              onClick={onReceiverClick}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 bg-card border-2 border-border text-foreground rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:border-primary hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>ของหาย (รับ)</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

