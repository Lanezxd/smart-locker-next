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
      {/* Spacer precisely matches the height of the fixed Action Bar so the feed starts right below it */}
      <div className="h-[75px] sm:h-[88px] w-full" />
      
      {/* Fixed Action Bar - perfectly positioned to attach below FeedHeader without overlap */}
      <div className="fixed top-[169px] sm:top-[117px] left-0 right-0 z-40 bg-background/98 backdrop-blur-md border-b border-border shadow-sm transition-all flex w-full">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-5 w-full">
          <div className="flex flex-row gap-2 sm:gap-3 items-center justify-center w-full">
            {/* Found Item (Deposit) */}
            <button
              onClick={onFinderClick}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px] sm:min-h-[48px] gradient-primary text-primary-foreground rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="whitespace-nowrap">เจอของ (ฝาก)</span>
            </button>

            {/* Lost Item (Receive) */}
            <button
              onClick={onReceiverClick}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 min-h-[44px] sm:min-h-[48px] bg-card border-2 border-border text-foreground rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all hover:border-primary hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="whitespace-nowrap">ของหาย (รับ)</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

