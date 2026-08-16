'use client';
import React, { useState } from 'react';
import { MessageSquare, Search, ShieldCheck, LogIn } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-white/45 backdrop-blur-2xl border-b border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.03)] relative overflow-hidden transition-colors">
      {/* Ambient warm-light glow overlay behind the navbar */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-500/[0.06] via-amber-500/[0.02] to-transparent pointer-events-none" />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-20 bg-amber-400/20 blur-2xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 w-full relative z-10">
        {/* Responsive Row: Logo + Search + User Actions */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 sm:gap-3 w-full">
          {/* Brand Logo - Minimal Luxury Editorial */}
          <div className="flex items-center shrink-0 pr-1">
            <span className="font-brand font-bold text-lg sm:text-xl tracking-tight text-zinc-950 uppercase select-none">
              LOSTRETURN
            </span>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 order-2 sm:order-3">
            {currentUser ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="p-2 hover:bg-white/50 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer text-amber-600 shadow-sm"
                    title="Admin Dashboard"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onChatClick}
                  className="relative p-2 hover:bg-white/50 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer text-zinc-600 hover:text-zinc-800 shadow-sm"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleProfileClick}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/70 border border-amber-300 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-amber-400 transition-all cursor-pointer ml-1 sm:ml-0 shadow-sm"
                >
                  {currentUser.profileImage ? (
                    <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-amber-700">{currentUser.name.charAt(0)}</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/50 text-zinc-900 hover:text-amber-500 text-xs sm:text-sm rounded-xl font-semibold transition-all duration-200 cursor-pointer group"
              >
                <LogIn className="w-4 h-4 stroke-[2.2] text-zinc-900 group-hover:text-amber-500 transition-colors" />
                <span className="text-zinc-900 group-hover:text-amber-500 transition-colors">Sign In</span>
              </button>
            )}
          </div>

          {/* Search Bar - Translucent Glass Input Pill */}
          <div className="relative w-full sm:w-auto sm:flex-1 min-w-[200px] order-3 sm:order-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 stroke-[2] pointer-events-none z-10" />
            <input
              type="text"
              placeholder="ค้นหา"
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md text-zinc-900 placeholder:text-zinc-400 font-normal focus:bg-white focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-sm shadow-sm transition-all"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
