'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Box, LayoutDashboard, History, LogIn, LogOut, Menu, X, User, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { path: "/", label: "หน้าแรก", icon: Box },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/history", label: "ประวัติ", icon: History },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin(user?.id);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'ผู้ใช้';
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-lg gradient-primary group-hover:shadow-glow transition-all duration-300">
            <Box className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">
            Lost<span className="text-primary">Return</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("relative gap-2", isActive && "bg-secondary")}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 gradient-primary rounded-full"
                    />
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Auth Section */}
        <div className="hidden md:block">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium max-w-[120px] truncate">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="w-4 h-4 mr-2" />
                  โปรไฟล์
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/my-posts')}>
                  <Box className="w-4 h-4 mr-2" />
                  โพสต์ของฉัน
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="text-primary">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบ
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </nav>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden border-b border-border/40"
      >
        <div className="container mx-auto px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          {user ? (
            <>
              <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <User className="w-4 h-4" />
                  โปรไฟล์
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive"
                onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
              >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ
              </Button>
            </>
          ) : (
            <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <LogIn className="w-4 h-4" />
                เข้าสู่ระบบ
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </header>
  );
}