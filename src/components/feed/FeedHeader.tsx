'use client';
import React, { useState } from 'react';
import { Package, User, MessageSquare, Search, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Locker {
  id: number;
  status: 'available' | 'occupied' | 'maintenance' | 'temp_storage';
}

interface UserData {
  name: string;
  type: 'student' | 'general';
  profileImage: string | null;
}

interface FeedHeaderProps {
  lockers: Locker[];
  currentUser: UserData | null;
  isAdmin?: boolean;
  unreadCount: number;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onChatClick: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export const FeedHeader = ({
  lockers,
  currentUser,
  isAdmin = false,
  unreadCount,
  onLoginClick,
  onProfileClick,
  onChatClick,
  searchQuery = '',
  onSearchChange
}: FeedHeaderProps) => {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 w-full">
        {/* Responsive Row: Logo + Search + User Actions */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 sm:gap-3 w-full">
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-warning flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-base sm:text-lg">LostReturn</span>
          </div>

          {/* User Actions - Ordered 2nd on mobile to stay on top row next to logo, 3rd on desktop */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 order-2 sm:order-3">
            {currentUser ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2 hover:bg-primary/10 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Admin Dashboard"
                  >
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </button>
                )}
                <button
                  onClick={onChatClick}
                  className="relative p-2 hover:bg-secondary rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleProfileClick}
                  className="w-10 h-10 min-w-[40px] min-h-[44px] sm:min-h-[40px] rounded-full bg-primary/10 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all ml-1 sm:ml-0"
                >
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary">{currentUser.name.charAt(0)}</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 min-h-[44px] gradient-primary text-primary-foreground rounded-full text-xs sm:text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <User className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>

          {/* Search Bar - Full width on mobile (drops to next row), Auto width on desktop */}
          <div className="relative w-full sm:flex-1 sm:max-w-xs order-3 sm:order-2 mt-1 sm:mt-0">
            <Search className="absolute left-3 sm:left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหา"
              className="w-full min-h-[44px] sm:min-h-0 pl-9 sm:pl-8 pr-3 py-2 sm:py-1.5 bg-secondary/50 border border-border rounded-xl sm:rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Locker Status Bar - Below Header */}
      <div className="border-t border-border/50 bg-secondary/20">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">สถานะตู้</span>
            <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide flex-1">
              {lockers.map((locker) => (
                <div
                  key={locker.id}
                  className={`flex items-center gap-1 px-2 py-1 min-h-[28px] rounded-full text-[10px] sm:text-xs font-medium shrink-0 ${
                    locker.status === 'available'
                      ? 'bg-success/15 text-success'
                      : locker.status === 'temp_storage'
                      ? 'bg-storage/15 text-storage'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                  title={`ตู้ ${locker.id}: ${locker.status === 'available' ? 'ว่าง' : locker.status === 'temp_storage' ? 'ฝากชั่วคราว' : 'ไม่ว่าง'}`}
                >
                  <div
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      locker.status === 'available'
                        ? 'bg-success'
                        : locker.status === 'temp_storage'
                        ? 'bg-storage'
                        : 'bg-destructive'
                    }`}
                  />
                  <span>{locker.id}</span>
                </div>
              ))}
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5 sm:ml-1 whitespace-nowrap shrink-0">
                ({lockers.filter(l => l.status === 'available').length} ว่าง)
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

