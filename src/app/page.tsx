'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { 
  Package, 
  Search, 
  Unlock, 
  MessageSquare, 
  Upload, 
  Camera,
  ArrowRight, 
  LogOut, 
  User, 
  CheckCircle, 
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Smartphone,
  GraduationCap,
  Users,
  Mail,
  Lock,
  Send,
  Shield,
  ChevronLeft,
  Loader2,
  Bell,
  Phone,
  Edit2,
  Sparkles,
  Box,
  KeyRound,
  Hash,
  CreditCard,
  ImageIcon,
  Copy,
  Check,
  Clock,
  MapPin,
  History
} from 'lucide-react';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StickyActionBar } from '@/components/feed/StickyActionBar';
import { SocialFeed } from '@/components/feed/SocialFeed';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useLockerTransactions } from '@/hooks/useLockerTransactions';
import { useChat, ChatRoom, ChatMessageDB } from '@/hooks/useChat';

// Types
interface LockerItem {
  name: string;
  image: string;
  date: string;
  finder: string;
  question: string;
  answer: string;
  otp?: number;
  transactionId?: string;
}

interface Locker {
  id: number;
  status: 'available' | 'occupied' | 'maintenance';
  item: LockerItem | null;
}

interface UserData {
  name: string;
  type: 'student' | 'general';
  email: string;
  phone: string;
  studentId: string;
  profileImage: string | null;
}

interface DepositFormData {
  name: string;
  image: string | null;
  question: string;
  answer: string;
}

type ViewType = 'home' | 'dashboard' | 'deposit' | 'verify' | 'chat' | 'otp' | 'otp_display' | 'profile' | 'chat_list';

// Initial Lockers - All empty, data will be synced from database
const initialLockers: Locker[] = [
  { id: 1, status: 'available', item: null },
  { id: 2, status: 'available', item: null },
  { id: 3, status: 'available', item: null },
  { id: 4, status: 'available', item: null },
];

// Legacy Header Component (keeping for other views)
const Header = ({ 
  view, 
  setView, 
  currentUser, 
  handleGoHome,
  unreadCount,
  onLoginClick
}: {
  view: ViewType;
  setView: (view: ViewType) => void;
  currentUser: UserData | null;
  handleGoHome: () => void;
  unreadCount: number;
  onLoginClick?: () => void;
}) => (
  <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div 
        onClick={() => currentUser ? handleGoHome() : null}
        className={`flex items-center gap-3 ${currentUser ? 'cursor-pointer' : ''}`}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-warning flex items-center justify-center shadow-lg">
          <Package className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">LostReturn System</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {currentUser ? (
          <>
            <button 
              onClick={() => setView('chat_list')}
              className="relative p-2.5 bg-secondary hover:bg-muted rounded-full transition-colors text-muted-foreground border border-border"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setView('profile')}
              className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-secondary hover:bg-primary/10 rounded-full border border-border hover:border-primary/30 cursor-pointer transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{currentUser.name.charAt(0)}</span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.type}</p>
              </div>
            </button>
          </>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-4 py-2 gradient-primary text-primary-foreground rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/30"
          >
            <User className="w-4 h-4" />
            <span>เข้าสู่ระบบ</span>
          </button>
        )}
      </div>
    </div>
  </header>
);

// Auth Form Component
const AuthForm = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [userType, setUserType] = useState<'student' | 'general'>('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    studentId: '',
    nationalId: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        // Sign up
        const metadata: Record<string, string> = {
          username: formData.name || formData.email.split('@')[0],
          full_name: formData.name,
          user_type: userType,
          phone: formData.phone,
        };
        if (userType === 'student') {
          metadata.student_id = formData.studentId;
        } else {
          metadata.national_id = formData.nationalId;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: metadata
          }
        });

        if (error) {
          toast.error(error.message === 'User already registered' 
            ? 'อีเมลนี้ถูกใช้งานแล้ว' 
            : error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          toast.success('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ');
          const mockUser: UserData = {
            name: formData.name || formData.email.split('@')[0],
            type: userType,
            email: formData.email,
            phone: formData.phone || '',
            studentId: formData.studentId || '',
            profileImage: null
          };
          onLogin(mockUser);
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) {
          toast.error(error.message === 'Invalid login credentials' 
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
            : error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          const mockUser: UserData = {
            name: profile?.full_name || profile?.username || data.user.email?.split('@')[0] || 'User',
            type: userType,
            email: data.user.email || '',
            phone: profile?.phone || '',
            studentId: '',
            profileImage: profile?.avatar_url || null
          };
          onLogin(mockUser);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-3xl p-6 shadow-xl border border-border">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl mb-6">
        <button
          onClick={() => setIsRegister(false)}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isRegister ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          เข้าสู่ระบบ
        </button>
        <button
          onClick={() => setIsRegister(true)}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isRegister ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          ลงทะเบียน
        </button>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">
        {isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับ'}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isRegister ? 'กรอกข้อมูลเพื่อเริ่มต้นใช้งาน' : 'กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                  userType === 'student' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                }`}
              >
                <GraduationCap className="w-6 h-6" />
                <span className="text-sm font-medium">นักศึกษา</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType('general')}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                  userType === 'general' 
                    ? 'border-accent bg-accent/10 text-accent' 
                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium">บุคคลทั่วไป</span>
              </button>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {userType === 'student' ? (
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="รหัสนักศึกษา"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={formData.studentId}
                  onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="รหัสบัตรประชาชน 13 หลัก"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                  required
                  maxLength={13}
                />
              </div>
            )}

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="เบอร์โทร"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
          </>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            placeholder="อีเมล"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="รหัสผ่าน"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

// Mode Selection Component
const ModeSelection = ({ handleModeSelect }: { handleModeSelect: (mode: 'finder' | 'receiver') => void }) => (
  <div className="w-full max-w-md mx-auto space-y-4">
    
    <p className="text-sm text-muted-foreground text-center mb-6">เลือกทำรายการตามสถานะของคุณ</p>
    
    <button
      onClick={() => handleModeSelect('finder')}
      className="w-full gradient-primary text-primary-foreground font-semibold py-5 rounded-2xl shadow-lg shadow-primary/30 flex flex-col items-start px-6 transition-all transform hover:scale-[1.02] group text-left"
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className="flex items-center gap-3">
          <Package className="w-6 h-6" />
          <span className="text-lg">เจอของ(ฝาก)</span>
        </span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-primary-foreground/80 ml-9">ฝากของที่เก็บได้ไว้ในตู้ล็อกเกอร์</p>
    </button>

    <button
      onClick={() => handleModeSelect('receiver')}
      className="w-full bg-card border-2 border-border hover:border-primary text-foreground font-semibold py-5 rounded-2xl flex flex-col items-start px-6 transition-all transform hover:scale-[1.02] group text-left"
    >
      <div className="flex items-center justify-between w-full mb-2">
        <span className="flex items-center gap-3">
          <Search className="w-6 h-6" />
          <span className="text-lg">ของหาย(รับ)</span>
        </span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-muted-foreground ml-9">ตรวจสอบและรับของคืนจากตู้ล็อกเกอร์</p>
    </button>
  </div>
);

// Home View Component - Now uses Social Feed layout
const HomeView = ({ 
  lockers, 
  handleModeSelect,
  currentUser,
  currentUserId,
  isAdmin,
  unreadCount,
  onLoginClick,
  setView,
  onLockerClick
}: {
  lockers: Locker[];
  handleModeSelect: (mode: 'finder' | 'receiver') => void;
  currentUser: UserData | null;
  currentUserId?: string;
  isAdmin?: boolean;
  unreadCount: number;
  onLoginClick: () => void;
  setView: (view: ViewType) => void;
  onLockerClick: (lockerId: number) => void;
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Search Bar */}
      <FeedHeader
        lockers={lockers}
        currentUser={currentUser}
        isAdmin={isAdmin}
        unreadCount={unreadCount}
        onLoginClick={onLoginClick}
        onProfileClick={() => setView('profile')}
        onChatClick={() => setView('chat_list')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Sticky Action Bar */}
      <StickyActionBar
        onFinderClick={() => handleModeSelect('finder')}
        onReceiverClick={() => handleModeSelect('receiver')}
      />

      {/* Social Feed with create post button */}
      <SocialFeed 
        isLoggedIn={!!currentUser}
        isAdmin={isAdmin}
        userName={currentUser?.name}
        currentUserId={currentUserId}
        onLoginRequired={onLoginClick}
        onLockerClick={onLockerClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
};

// Login Modal Component
const LoginModal = ({ 
  isOpen, 
  onClose, 
  onLogin 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onLogin: (user: UserData) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 w-8 h-8 bg-card rounded-full flex items-center justify-center shadow-lg border border-border hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <AuthForm onLogin={onLogin} />
      </div>
    </div>
  );
};

// Dashboard View Component
const DashboardView = ({ 
  lockers, 
  userRole, 
  setSelectedLocker, 
  setView, 
  handleGoHome,
  setLockers,
  currentUser,
  onLoginRequired,
  markAsCollected,
}: {
  lockers: Locker[];
  userRole: 'finder' | 'receiver';
  setSelectedLocker: (locker: Locker) => void;
  setView: (view: ViewType) => void;
  handleGoHome: () => void;
  setLockers: (lockers: Locker[]) => void;
  currentUser: UserData | null;
  onLoginRequired: () => void;
  markAsCollected: (transactionId: string) => Promise<boolean>;
}) => {
  const [otpInputs, setOtpInputs] = useState<{ [lockerId: number]: string }>({});
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ [lockerId: number]: string }>({});
  const [viewingImage, setViewingImage] = useState<{ src: string; name: string } | null>(null);

  const handleOtpChange = (lockerId: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setOtpInputs({ ...otpInputs, [lockerId]: value.slice(0, 6) });
    setErrors({ ...errors, [lockerId]: '' });
  };

  const handleUnlockLocker = async (locker: Locker) => {
    const enteredOtp = otpInputs[locker.id] || '';
    if (enteredOtp.length !== 6) {
      setErrors({ ...errors, [locker.id]: 'กรุณากรอกรหัส 6 หลัก' });
      return;
    }

    setUnlocking(locker.id);

    // Simulate unlock delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check OTP against local state first, then verify against database as fallback
    let otpMatch = locker.item?.otp && enteredOtp === String(locker.item.otp);
    let transactionId = locker.item?.transactionId;

    if (!otpMatch && transactionId) {
      // Verify OTP against database (for OTP received via chat)
      const { data: txn } = await supabase
        .from('locker_transactions')
        .select('otp')
        .eq('id', transactionId)
        .single();
      
      if (txn?.otp && enteredOtp === txn.otp) {
        otpMatch = true;
      }
    }

    // If no transactionId from local state, try to find it from database by locker_id
    if (!otpMatch && !transactionId) {
      const { data: txn } = await supabase
        .from('locker_transactions')
        .select('id, otp')
        .eq('locker_id', locker.id)
        .eq('status', 'deposited')
        .maybeSingle();
      
      if (txn?.otp && enteredOtp === txn.otp) {
        otpMatch = true;
        transactionId = txn.id;
      }
    }

    if (otpMatch) {
      if (!transactionId) {
        toast.error('ไม่พบรหัสรายการของตู้ กรุณารีเฟรชแล้วลองใหม่');
        setUnlocking(null);
        return;
      }

      const ok = await markAsCollected(transactionId);
      if (!ok) {
        setUnlocking(null);
        return;
      }

      // Success - unlock and clear locker
      setLockers(lockers.map(l => 
        l.id === locker.id 
          ? { ...l, status: 'available' as const, item: null } 
          : l
      ));
      toast.success(`ตู้ ${String(locker.id).padStart(2, '0')} ปลดล็อกแล้ว! กรุณาหยิบของ`);
      setOtpInputs({ ...otpInputs, [locker.id]: '' });
    } else {
      setErrors({ ...errors, [locker.id]: 'รหัส OTP ไม่ถูกต้อง' });
    }
    setUnlocking(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 animate-fade-in">
      <button
        onClick={handleGoHome}
        className="mb-6 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        เปลี่ยนโหมด / หน้าแรก
      </button>

      {/* Mode Banner */}
      <div className={`mb-4 p-3 rounded-2xl border-2 ${userRole === 'finder' ? 'bg-primary/5 border-primary/30' : 'bg-accent/5 border-accent/30'}`}>
        <div className="flex items-center gap-3">
          {userRole === 'finder' ? (
            <Package className="w-5 h-5 text-primary" />
          ) : (
            <Search className="w-5 h-5 text-accent" />
          )}
          <div>
            <p className="font-semibold text-foreground">
              {userRole === 'finder' ? 'โหมดผู้ฝากของ' : 'โหมดผู้รับของ'}
            </p>
            <p className="text-xs text-muted-foreground">
              {userRole === 'finder' 
                ? 'เลือกตู้ที่ว่างเพื่อฝากของที่เก็บได้' 
                : 'เลือกตู้ที่มีของเพื่อยืนยันตัวตนรับของ'}
            </p>
          </div>
        </div>
      </div>

      {/* Locker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {lockers.map((locker) => (
          <div
            key={locker.id}
            className={`relative p-4 rounded-3xl flex flex-col transition-all duration-300 overflow-hidden ${
              locker.status === 'available'
                ? 'bg-card border-2 border-success/30 hover:border-primary hover:shadow-xl group cursor-pointer'
                : locker.status === 'occupied'
                ? 'bg-foreground text-background'
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
            onClick={() => {
              if (locker.status === 'available' && userRole === 'finder') {
                if (!currentUser) {
                  toast.error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
                  onLoginRequired();
                  return;
                }
                setSelectedLocker(locker);
                setView('deposit');
              }
              if (locker.status === 'occupied' && userRole === 'receiver' && !locker.item?.otp) {
                if (!currentUser) {
                  toast.error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
                  onLoginRequired();
                  return;
                }
                setSelectedLocker(locker);
                setView('verify');
              }
            }}
          >
            {/* Header with locker number */}
            <div className="flex items-start justify-between mb-2">
              <span className={`text-2xl font-bold ${locker.status === 'occupied' ? 'text-background/60' : 'text-muted-foreground'}`}>
                {String(locker.id).padStart(2, '0')}
              </span>
              {locker.status === 'occupied' && <Package className="w-4 h-4 text-background/60" />}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
              {locker.status === 'available' && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <Unlock className="w-12 h-12 text-success/50 group-hover:text-primary group-hover:scale-110 transition-all" />
                </div>
              )}
              
              {locker.status === 'occupied' && locker.item && (
                <div className="flex-1 flex flex-col">
                  {/* Item Info */}
                  <div className="flex flex-col gap-2 mb-3">
                    {/* Image - Clickable to expand */}
                    <div 
                      className="w-full h-24 rounded-xl border-2 border-background/20 overflow-hidden bg-background/10 cursor-pointer group relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (locker.item?.image) {
                          setViewingImage({ src: locker.item.image, name: locker.item.name });
                        }
                      }}
                    >
                      {locker.item.image ? (
                        <>
                          <img 
                            src={locker.item.image} 
                            alt={locker.item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <Search className="w-3 h-3" />
                              ดูรูปขยาย
                            </span>
                          </div>
                        </>
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${locker.item.image ? 'hidden' : ''}`}>
                        <ImageIcon className="w-8 h-8 text-background/40" />
                      </div>
                    </div>
                    {/* Item name and OTP status */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-background truncate flex-1">{locker.item.name}</p>
                      {locker.item.otp && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full shrink-0">
                          <KeyRound className="w-2.5 h-2.5" />
                          รอ OTP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OTP Input Section - Only show if OTP is set AND in receiver mode */}
                  {locker.item.otp && userRole === 'receiver' && (
                    <div 
                      className="bg-background/10 rounded-lg p-2 space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 text-[9px] text-background/70 whitespace-nowrap">
                        <KeyRound className="w-2.5 h-2.5 shrink-0" />
                        <span>กรอกรหัส OTP เพื่อปลดล็อก</span>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="รหัส 6 หลัก"
                          value={otpInputs[locker.id] || ''}
                          onChange={(e) => handleOtpChange(locker.id, e.target.value)}
                          className={`flex-1 min-w-0 px-1.5 py-1 rounded-md text-center text-xs font-bold tracking-wider outline-none transition-all ${
                            errors[locker.id] 
                              ? 'bg-destructive/20 border border-destructive text-background placeholder:text-destructive/50' 
                              : 'bg-background/20 border border-background/30 text-background placeholder:text-background/40 focus:border-success focus:bg-background/30'
                          }`}
                        />
                        <button
                          onClick={() => handleUnlockLocker(locker)}
                          disabled={unlocking === locker.id || (otpInputs[locker.id] || '').length !== 6}
                          className="px-2 py-1 bg-success text-success-foreground rounded-md font-bold flex items-center justify-center hover:bg-success/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {unlocking === locker.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {errors[locker.id] && (
                        <p className="text-[10px] text-destructive flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {errors[locker.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Click to verify - Only show if no OTP */}
                  {!locker.item.otp && userRole === 'receiver' && (
                    <button className="w-full bg-success/90 hover:bg-success text-success-foreground rounded-lg py-2 px-3 text-xs font-semibold transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-success/30 flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      ตอบคำถามรับของ
                    </button>
                  )}
                </div>
              )}
              
              {locker.status === 'maintenance' && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Footer - Status */}
            <div className="mt-2">
              <span className={`text-sm font-medium ${locker.status === 'occupied' ? 'text-background' : 'text-foreground'}`}>
                {locker.status === 'available' ? 'ว่าง' : locker.status === 'occupied' ? 'มีของ' : 'ปิดปรับปรุง'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Image Lightbox Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-2xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-background/80 hover:bg-background rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
            <img 
              src={viewingImage.src} 
              alt={viewingImage.name}
              className="w-full max-h-[70vh] object-contain bg-black"
            />
            <div className="p-4 bg-card border-t border-border">
              <p className="font-semibold text-foreground text-center">{viewingImage.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Deposit View Component - Mobile optimized to fit in single screen
const DepositView = ({ 
  setView, 
  selectedLocker, 
  depositForm, 
  setDepositForm, 
  handleDeposit, 
  loading 
}: {
  setView: (view: ViewType) => void;
  selectedLocker: Locker | null;
  depositForm: DepositFormData;
  setDepositForm: (form: DepositFormData) => void;
  handleDeposit: () => void;
  loading: boolean;
}) => (
  <>
    {/* Mobile: Full screen single-page layout (no scroll, fill screen) */}
    <div className="lg:hidden min-h-[calc(100dvh-4.25rem)] bg-background">
      <div className="px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex flex-col min-h-[calc(100dvh-4.25rem)]">
        {/* Compact Back Button */}
        <button
          onClick={() => setView('dashboard')}
          className="shrink-0 flex items-center gap-1.5 py-1.5 text-sm text-primary font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          กลับไปหน้าหลัก
        </button>

        {/* Card fills remaining space */}
        <div className="mt-2 flex-1 bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h2 className="text-base font-bold text-foreground">ฝากของ</h2>
              <p className="text-xs text-muted-foreground">
                ตู้หมายเลข #{String(selectedLocker?.id).padStart(2, '0')}
              </p>
            </div>
            <div className="p-2 rounded-xl gradient-primary">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* 1. Image Upload - fixed height, not flex-grow to avoid big gap */}
            <div className="shrink-0">
              <label className="block text-xs font-medium text-foreground mb-1.5">1. อัปโหลดรูปสิ่งของ</label>
              <label className="h-24 border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center hover:border-primary/50 transition-all cursor-pointer bg-primary/5">
                {depositForm.image ? (
                  <div className="relative">
                    <img src={depositForm.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setDepositForm({ ...depositForm, image: null }); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-primary/60 mb-1" />
                    <span className="text-xs text-muted-foreground">แตะเพื่อเลือกรูป</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => { setDepositForm({ ...depositForm, image: reader.result as string }); };
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>

            {/* 2. Item Description */}
            <div className="shrink-0">
              <label className="block text-xs font-medium text-foreground mb-1.5">2. สิ่งที่พบ</label>
              <input
                type="text"
                placeholder="เช่น กุญแจรถ"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                value={depositForm.name}
                onChange={(e) => setDepositForm({ ...depositForm, name: e.target.value })}
              />
            </div>

            {/* 3. Security Questions - takes remaining space */}
            <div className="flex-1 bg-accent/5 border border-accent/20 rounded-xl p-3 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3 shrink-0">
                <div className="p-2 rounded-lg bg-accent/20">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">คำถามยืนยัน</p>
                  <p className="text-[10px] text-muted-foreground">ตั้งคำถามที่เจ้าของตัวจริงเท่านั้นที่รู้</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2.5">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground">คำถาม</label>
                  <input
                    type="text"
                    placeholder="เช่น รุ่นอะไร"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    value={depositForm.question}
                    onChange={(e) => setDepositForm({ ...depositForm, question: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground">คำตอบ</label>
                  <input
                    type="text"
                    placeholder="คำตอบที่ถูกต้อง"
                    className="w-full mt-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    value={depositForm.answer}
                    onChange={(e) => setDepositForm({ ...depositForm, answer: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-3 shrink-0">
            <button
              onClick={handleDeposit}
              disabled={loading || !depositForm.image || !depositForm.name || !depositForm.question || !depositForm.answer}
              className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? 'กำลังเชื่อมต่อตู้...' : 'เปิดตู้ล็อกเกอร์'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Desktop: Original layout */}
    <div className="hidden lg:block max-w-2xl mx-auto p-8 animate-fade-in">
      <button
        onClick={() => setView('dashboard')}
        className="mb-6 text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        กลับไปหน้าหลัก
      </button>

      <div className="bg-card rounded-3xl p-8 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">ฝากของ</h2>
            <p className="text-base text-muted-foreground">
              กรอกรายละเอียดสำหรับตู้หมายเลข #{String(selectedLocker?.id).padStart(2, '0')}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
            <Package className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Upload Photo */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">1. อัปโหลดรูปสิ่งของ</label>
            <label className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
              {depositForm.image ? (
                <div className="relative">
                  <img src={depositForm.image} alt="Preview" className="w-32 h-32 object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setDepositForm({ ...depositForm, image: null }); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary mb-3" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground text-center">แตะเพื่อเลือกรูปจากอุปกรณ์</span>
                  <span className="text-xs text-muted-foreground mt-1">รองรับ JPG, PNG</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => { setDepositForm({ ...depositForm, image: reader.result as string }); };
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
          </div>

          {/* Step 2: Details */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">2. สิ่งที่พบ</label>
            <input
              type="text"
              placeholder="เช่น กุญแจรถ"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={depositForm.name}
              onChange={(e) => setDepositForm({ ...depositForm, name: e.target.value })}
            />
          </div>

          {/* Step 3: Security */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">คำถามยืนยัน</h3>
                <p className="text-sm text-muted-foreground">ตั้งคำถามที่เจ้าของตัวจริงเท่านั้นที่รู้</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">คำถาม</label>
                <input
                  type="text"
                  placeholder="เช่น รุ่นอะไร"
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  value={depositForm.question}
                  onChange={(e) => setDepositForm({ ...depositForm, question: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">คำตอบเฉลย</label>
                <input
                  type="text"
                  placeholder="คำตอบที่ถูกต้อง"
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  value={depositForm.answer}
                  onChange={(e) => setDepositForm({ ...depositForm, answer: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Button */}
        <div className="mt-8">
          <button
            onClick={handleDeposit}
            disabled={loading || !depositForm.image || !depositForm.name || !depositForm.question || !depositForm.answer}
            className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเชื่อมต่อตู้...
              </>
            ) : (
              <>
                เปิดตู้ล็อกเกอร์
                <Unlock className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </>
);


// Verify View Component
const VerifyView = ({ 
  setView, 
  selectedLocker, 
  verifyAnswer, 
  setVerifyAnswer, 
  aiMessage, 
  aiThinking, 
  handleVerify,
  onStartChat,
  attempts,
  maxAttempts,
}: {
  setView: (view: ViewType) => void;
  selectedLocker: Locker | null;
  verifyAnswer: string;
  setVerifyAnswer: (answer: string) => void;
  aiMessage: { type: 'success' | 'error'; text: string } | null;
  aiThinking: boolean;
  handleVerify: () => void;
  onStartChat: () => void;
  attempts: number;
  maxAttempts: number;
}) => (
  <div className="max-w-2xl mx-auto p-4 lg:p-8 animate-fade-in">
    <button
      onClick={() => setView('dashboard')}
      className="mb-6 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      กลับไปหน้าหลัก
    </button>

    <div className="bg-card rounded-3xl p-6 lg:p-8 shadow-xl border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">ยืนยันตัวตน</h2>
          <p className="text-muted-foreground">ตอบคำถามเพื่อรับรหัสเปิดตู้ #{String(selectedLocker?.id).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Item Card */}
      <div className="bg-secondary rounded-2xl p-4 flex gap-4 mb-6">
        <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
          <img src={selectedLocker?.item?.image} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">Found Item</span>
          <h3 className="text-lg font-bold text-foreground mt-1 truncate">{selectedLocker?.item?.name}</h3>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>เจอเมื่อ: {selectedLocker?.item?.date}</span>
          </div>
        </div>
      </div>

      {/* AI Chat Interface */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">คำถามยืนยันความเป็นเจ้าของ</h4>
            <p className="text-foreground mt-1">"{selectedLocker?.item?.question}"</p>
          </div>
        </div>

        {aiMessage && (
          <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${aiMessage.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {aiMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {aiMessage.text}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            placeholder="พิมพ์คำตอบของคุณ..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
            value={verifyAnswer}
            onChange={(e) => setVerifyAnswer(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">
          โอกาสตอบคำถาม: {maxAttempts - attempts}/{maxAttempts} ครั้ง
        </p>
      </div>

      {/* Desktop Buttons */}
      <div className="hidden lg:block space-y-3">
        <button
          onClick={handleVerify}
          disabled={aiThinking || !verifyAnswer.trim() || attempts >= maxAttempts}
          className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {aiThinking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI กำลังวิเคราะห์...
            </>
          ) : (
            'ส่งคำตอบ'
          )}
        </button>
        <button
          onClick={onStartChat}
          className="w-full py-3 text-muted-foreground text-sm font-medium hover:text-foreground flex items-center justify-center gap-2 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          ติดต่อผู้ฝาก (Chat)
        </button>
      </div>
    </div>

    {/* Mobile Sticky Buttons */}
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border space-y-2">
      <button
        onClick={handleVerify}
        disabled={aiThinking || !verifyAnswer.trim() || attempts >= maxAttempts}
        className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {aiThinking ? 'AI กำลังวิเคราะห์...' : 'ส่งคำตอบ'}
      </button>
      <button
        onClick={onStartChat}
        className="w-full py-2 text-muted-foreground text-sm font-medium hover:text-foreground flex items-center justify-center gap-2"
      >
        <MessageSquare className="w-4 h-4" />
        ติดต่อผู้ฝาก (Chat)
      </button>
    </div>
  </div>
);

// Chat View Component - Real-time chat backed by database
const ChatView = ({ 
  setView, 
  selectedLocker, 
  setOtp,
  lockers,
  setLockers,
  chatRoom,
  chatMessages,
  sendMessage,
  currentUserId,
  isDepositor,
}: {
  setView: (view: ViewType) => void;
  selectedLocker: Locker | null;
  setOtp: (otp: number) => void;
  lockers: Locker[];
  setLockers: (lockers: Locker[]) => void;
  chatRoom: ChatRoom | null;
  chatMessages: ChatMessageDB[];
  sendMessage: (roomId: string, content: string, messageType?: string) => Promise<ChatMessageDB | null>;
  currentUserId: string | undefined;
  isDepositor: boolean;
}) => {
  const otherUserName = isDepositor 
    ? 'ผู้มารับของ' 
    : (selectedLocker?.item?.finder ? `${selectedLocker.item.finder} (ผู้ฝาก)` : 'ผู้ฝาก');
  const [inputText, setInputText] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatRoom) return;
    const text = inputText;
    setInputText('');
    await sendMessage(chatRoom.id, text, 'text');
  };

  // Depositor sends OTP via chat
  const handleSendOtp = async () => {
    if (!chatRoom || !selectedLocker?.item?.transactionId) return;
    setSendingOtp(true);

    try {
      // Get the OTP from the transaction
      const { data: transaction } = await supabase
        .from('locker_transactions')
        .select('otp')
        .eq('id', selectedLocker.item.transactionId)
        .single();

      if (transaction?.otp) {
        await sendMessage(chatRoom.id, `รหัส OTP สำหรับเปิดตู้: ${transaction.otp}`, 'otp_sent');
        toast.success('ส่งรหัส OTP ให้ผู้รับแล้ว!');
      } else {
        toast.error('ไม่พบรหัส OTP สำหรับตู้นี้');
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSendingOtp(false);
    }
  };

  // Claimer receives OTP from chat message
  const handleReceiveOtp = (otpString: string) => {
    const otpMatch = otpString.match(/\d{6}/);
    if (otpMatch) {
      const otpNum = parseInt(otpMatch[0]);
      setOtp(otpNum);
      if (selectedLocker) {
        setLockers(lockers.map(l => 
          l.id === selectedLocker.id 
            ? { ...l, item: { ...l.item!, otp: otpNum } }
            : l
        ));
      }
      toast.success('ได้รับ OTP แล้ว! ไปกรอกรหัสที่ตู้ล็อกเกอร์');
      setView('dashboard');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => setView('chat_list')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{otherUserName}</h3>
          <p className="text-xs text-muted-foreground">ตู้ #{String(chatRoom?.locker_id || selectedLocker?.id || 0).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Depositor: Send OTP button */}
      {isDepositor && (
        <div className="px-4 py-2 bg-accent/10 border-b border-accent/20">
          <button
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full py-2.5 bg-success text-success-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-success/90 transition-all disabled:opacity-50"
          >
            {sendingOtp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            ส่งรหัส OTP ให้ผู้รับ
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
        {chatMessages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            เริ่มพูดคุยกันได้เลย
          </div>
        )}
        {chatMessages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isOtpMsg = msg.message_type === 'otp_sent';
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {isOtpMsg ? (() => {
                const otpMatch = msg.content.match(/\d{6}/);
                const otpCode = otpMatch ? otpMatch[0] : '';
                const otpDigits = otpCode.split('');
                return (
                  <div className={`w-full max-w-[280px] ${isMe ? 'ml-auto' : ''}`}>
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 sm:p-4">
                      <p className="text-center text-xs sm:text-sm font-medium text-foreground mb-2 sm:mb-3">รหัส OTP ของคุณ</p>
                      <div className="flex justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        {otpDigits.map((digit, i) => (
                          <div key={i} className="w-8 h-10 sm:w-10 sm:h-12 border-2 border-primary/40 rounded-lg flex items-center justify-center bg-card">
                            <span className="text-lg sm:text-xl font-bold text-primary">{digit}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(otpCode);
                          toast.success('คัดลอกรหัส OTP แล้ว!');
                        }}
                        className="w-full py-2 sm:py-2.5 bg-primary/10 text-primary font-semibold rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-all border border-primary/20 text-xs sm:text-sm"
                      >
                        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        คัดลอกรหัส OTP
                      </button>
                      {!isDepositor && otpCode && (
                        <button
                          onClick={() => handleReceiveOtp(otpCode)}
                          className="w-full mt-2 py-2 sm:py-2.5 bg-success text-success-foreground font-semibold rounded-xl flex items-center justify-center gap-1.5 hover:bg-success/90 transition-all text-xs sm:text-sm"
                        >
                          <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          ใช้รหัสนี้เปิดตู้
                        </button>
                      )}
                      <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-2">รหัสจะหมดอายุใน 10 นาที</p>
                    </div>
                  </div>
                );
              })() : (
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  isMe 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-card border border-border rounded-bl-sm text-foreground'
                }`}>
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 p-4 border-t border-border bg-card">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="พิมพ์ข้อความ..."
            className="w-full px-4 py-2.5 rounded-full border border-border bg-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="p-2.5 gradient-primary text-primary-foreground rounded-full shadow-lg disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// OTP Display View Component - Shows OTP after successful verification
const OtpDisplayView = ({ 
  otp, 
  selectedLocker, 
  setView,
  handleGoHome
}: {
  otp: number;
  selectedLocker: Locker | null;
  setView: (view: ViewType) => void;
  handleGoHome: () => void;
}) => {
  const otpString = String(otp).padStart(6, '0');
  const [copied, setCopied] = useState(false);
  
  const handleCopyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otpString);
      setCopied(true);
      toast.success('คัดลอกรหัส OTP แล้ว!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('ไม่สามารถคัดลอกได้');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success/10 via-background to-background">
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl border border-border text-center animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">ยืนยันสำเร็จ!</h2>
        <p className="text-muted-foreground mb-6">
          นี่คือรหัส OTP สำหรับเปิดตู้ล็อกเกอร์หมายเลข {String(selectedLocker?.id).padStart(2, '0')}
        </p>

        {/* OTP Display */}
        <div className="bg-primary/10 border-2 border-primary/30 rounded-2xl p-6 mb-4">
          <p className="text-xs text-muted-foreground mb-3">รหัส OTP ของคุณ</p>
          <div className="flex justify-center gap-2 mb-4">
            {otpString.split('').map((digit, index) => (
              <div
                key={index}
                className="w-12 h-14 bg-card border-2 border-primary rounded-xl flex items-center justify-center text-2xl font-bold text-primary shadow-sm"
              >
                {digit}
              </div>
            ))}
          </div>
          
          {/* Copy Button */}
          <button
            onClick={handleCopyOtp}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              copied 
                ? 'bg-success text-success-foreground' 
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                คัดลอกแล้ว!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                คัดลอกรหัส OTP
              </>
            )}
          </button>
          
          <p className="text-xs text-muted-foreground mt-3">รหัสจะหมดอายุใน 10 นาที</p>
        </div>

        {/* Instructions */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Box className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm">ขั้นตอนถัดไป</h4>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>1. กลับไปหน้าตู้ล็อกเกอร์</li>
                <li>2. กรอกรหัส OTP ที่ช่องบนตู้ที่มีของ</li>
                <li>3. ตู้จะปลดล็อกอัตโนมัติ</li>
              </ol>
            </div>
          </div>
        </div>

        <button
          onClick={() => setView('dashboard')}
          className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          กลับหน้าตู้รับของ
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// OTP View Component
const OtpView = ({ 
  otp, 
  selectedLocker, 
  setLockers, 
  lockers, 
  setView, 
  resetState,
  markAsCollected,
}: {
  otp: number;
  selectedLocker: Locker | null;
  setLockers: (lockers: Locker[]) => void;
  lockers: Locker[];
  setView: (view: ViewType) => void;
  resetState: () => void;
  markAsCollected: (transactionId: string) => Promise<boolean>;
}) => {
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otpInput];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtpInput(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpInput];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpInput(newOtp);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleUnlock = async () => {
    const enteredOtp = otpInput.join('');
    if (enteredOtp.length !== 6) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setIsUnlocking(true);
    
    // Simulate unlock delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check against local state first, then database
    let otpMatch = enteredOtp === String(otp);

    if (!otpMatch && selectedLocker?.item?.transactionId) {
      const { data: txn } = await supabase
        .from('locker_transactions')
        .select('otp')
        .eq('id', selectedLocker.item.transactionId)
        .single();
      if (txn?.otp && enteredOtp === txn.otp) {
        otpMatch = true;
      }
    }

    if (otpMatch) {
      setUnlocked(true);
      toast.success('ปลดล็อกตู้สำเร็จ!');
    } else {
      setError('รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่');
      setOtpInput(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setIsUnlocking(false);
  };

  const handleComplete = async () => {
    const transactionId = selectedLocker?.item?.transactionId;

    if (transactionId) {
      const ok = await markAsCollected(transactionId);
      if (!ok) return;
    }

    // Update locker status to available
    setLockers(lockers.map(l => l.id === selectedLocker?.id ? { ...l, status: 'available' as const, item: null } : l));
    toast.success('รับของสำเร็จ!');
    resetState();
  };

  if (unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success/10 via-background to-background">
        <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl border border-border text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Unlock className="w-10 h-10 text-success" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">ตู้เปิดแล้ว!</h2>
          <p className="text-muted-foreground mb-8">
            ตู้ล็อกเกอร์หมายเลข {String(selectedLocker?.id).padStart(2, '0')} ปลดล็อกเรียบร้อย<br />
            กรุณาหยิบของและปิดตู้
          </p>

          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
              <p className="text-sm text-left text-foreground">ตู้จะล็อกอัตโนมัติหลังจากปิดประตู</p>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            เสร็จสิ้น รับของแล้ว
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="w-full max-w-md bg-card rounded-3xl p-8 shadow-xl border border-border text-center animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <KeyRound className="w-10 h-10 text-primary" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">กรอกรหัส OTP</h2>
        <p className="text-muted-foreground mb-8">
          กรอกรหัส 6 หลักเพื่อเปิดตู้ล็อกเกอร์หมายเลข {String(selectedLocker?.id).padStart(2, '0')}
        </p>

        {/* OTP Input */}
        <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
          {otpInput.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all ${
                error 
                  ? 'border-destructive bg-destructive/5' 
                  : digit 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-secondary'
              } focus:border-primary focus:ring-2 focus:ring-primary/20`}
            />
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm mb-4 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground mb-6">รหัสจะหมดอายุใน 10 นาที</p>

        <button
          onClick={handleUnlock}
          disabled={isUnlocking || otpInput.some(d => !d)}
          className="w-full gradient-primary text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUnlocking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังปลดล็อก...
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              ปลดล็อกตู้
            </>
          )}
        </button>

        <button
          onClick={() => setView('verify')}
          className="w-full mt-4 py-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
};

// Profile View Component
const ProfileView = ({ 
  currentUser, 
  setCurrentUser, 
  handleGoHome, 
  handleLogout 
}: {
  currentUser: UserData;
  setCurrentUser: (user: UserData) => void;
  handleGoHome: () => void;
  handleLogout: () => void;
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ ...currentUser });

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = formData.profileImage;

      // If profileImage is a data URL (newly uploaded), upload to storage
      if (formData.profileImage && formData.profileImage.startsWith('data:')) {
        const base64 = formData.profileImage.split(',')[1];
        const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const ext = formData.profileImage.includes('image/png') ? 'png' : 'jpg';
        const filePath = `avatars/${user.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, byteArray, { contentType: `image/${ext}`, upsert: true });

        if (uploadError) {
          toast.error('อัปโหลดรูปไม่สำเร็จ');
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      }

      await supabase
        .from('profiles')
        .update({
          full_name: formData.name,
          phone: formData.phone,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      setCurrentUser({ ...formData, profileImage: avatarUrl });
      setEditMode(false);
      toast.success('บันทึกข้อมูลสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 animate-fade-in">
      <button
        onClick={handleGoHome}
        className="mb-6 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        กลับไปหน้าหลัก
      </button>

      <div className="bg-card rounded-3xl overflow-hidden shadow-xl border border-border">
        {/* Cover with profile info overlay */}
        <div className="bg-gradient-to-r from-primary to-warning pb-20 pt-10">
          <div className="px-6 flex flex-col items-center text-center gap-3">
            {/* Avatar */}
            <div className="relative -mb-0">
              <div className="w-24 h-24 rounded-full bg-card border-4 border-card shadow-xl overflow-hidden flex items-center justify-center">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{formData.name.charAt(0)}</span>
                )}
              </div>
              {editMode && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-card rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Camera className="w-4 h-4 text-primary" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              {editMode ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-xl font-bold text-foreground border-b-2 border-card focus:outline-none bg-transparent w-full mb-1 text-center"
                />
              ) : (
                <h2 className="text-xl font-bold text-foreground">{formData.name}</h2>
              )}
              <div className="flex items-center justify-center gap-2 text-foreground/70 mt-0.5">
                {formData.type === 'student' ? <GraduationCap className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <span className="capitalize text-sm">{formData.type} Account</span>
              </div>
            </div>

            <button
              onClick={() => editMode ? handleSave() : setEditMode(true)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${editMode ? 'bg-success text-success-foreground hover:bg-success/90' : 'bg-card/80 backdrop-blur text-foreground border border-border hover:bg-card'}`}
            >
              {editMode ? 'บันทึกข้อมูล' : 'แก้ไขโปรไฟล์'}
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 pt-6">

          {/* Info Fields */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">อีเมล</p>
                <p className="font-medium text-foreground">{formData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">เบอร์โทรศัพท์</p>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-transparent focus:outline-none w-full font-medium text-foreground"
                  />
                ) : (
                  <p className="font-medium text-foreground">{formData.phone}</p>
                )}
              </div>
            </div>
            {formData.type === 'student' && (
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">รหัสนักศึกษา</p>
                  <p className="font-medium text-foreground">{formData.studentId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-6 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 py-3 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat List View Component - Real data from database
const ChatListView = ({ 
  setView, 
  setSelectedLocker,
  lockers,
  chatRooms,
  currentUserId,
  onOpenChat,
  adminUnreadCount,
  isAdmin,
}: {
  setView: (view: ViewType) => void;
  setSelectedLocker: (locker: Locker) => void;
  lockers: Locker[];
  chatRooms: ChatRoom[];
  currentUserId: string | undefined;
  onOpenChat: (room: ChatRoom) => void;
  adminUnreadCount: number;
  isAdmin?: boolean;
}) => {
  const router = useRouter();
  const [otherNames, setOtherNames] = useState<{ [roomId: string]: string }>({});
  const [lastAdminMessage, setLastAdminMessage] = useState<{ content: string; created_at: string } | null>(null);

  useEffect(() => {
    if (!currentUserId || chatRooms.length === 0) return;

    const fetchNames = async () => {
      const otherUserIds = chatRooms.map(room => 
        room.depositor_id === currentUserId ? room.claimer_id : room.depositor_id
      );
      const uniqueIds = [...new Set(otherUserIds)];

      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, username')
        .in('user_id', uniqueIds);

      if (data) {
        const nameMap: { [roomId: string]: string } = {};
        chatRooms.forEach(room => {
          const otherId = room.depositor_id === currentUserId ? room.claimer_id : room.depositor_id;
          const profile = data.find(p => p.user_id === otherId);
          nameMap[room.id] = profile?.full_name || profile?.username || 'ผู้ใช้';
        });
        setOtherNames(nameMap);
      }
    };

    fetchNames();
  }, [chatRooms, currentUserId]);

  // Fetch last admin message for preview
  useEffect(() => {
    if (!currentUserId || isAdmin) return;

    const fetchLastAdminMsg = async () => {
      const { data } = await supabase
        .from('admin_messages')
        .select('content, created_at')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) setLastAdminMessage(data);
    };

    fetchLastAdminMsg();
  }, [currentUserId, isAdmin]);

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-8 animate-fade-in">
      <button
        onClick={() => setView('home')}
        className="mb-6 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        กลับไปหน้าหลัก
      </button>

      <h2 className="text-2xl font-bold text-foreground mb-6">ข้อความของคุณ</h2>

      <div className="space-y-3">
        {/* Admin Chat Entry - only for non-admin users */}
        {!isAdmin && (
          <button
            onClick={() => router.push('/contact-admin?from=inbox')}
            className="w-full bg-card p-4 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-warning flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  Admin
                </h3>
                <div className="flex items-center gap-2">
                  {lastAdminMessage && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(lastAdminMessage.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {adminUnreadCount > 0 && (
                    <span className="w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {adminUnreadCount}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm truncate text-muted-foreground">
                {lastAdminMessage ? lastAdminMessage.content : 'ติดต่อผู้ดูแลระบบ'}
              </p>
            </div>
          </button>
        )}

        {chatRooms.map(room => {
          const locker = lockers.find(l => l.id === room.locker_id);
          const displayName = otherNames[room.id] || 'ผู้ใช้';

          return (
            <button
              key={room.id}
              onClick={() => {
                if (locker) setSelectedLocker(locker);
                onOpenChat(room);
              }}
              className="w-full bg-card p-4 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group text-left"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {displayName}
                  </h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(room.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm truncate text-muted-foreground">
                  ตู้ #{String(room.locker_id).padStart(2, '0')}
                </p>
              </div>
            </button>
          );
        })}

        {chatRooms.length === 0 && isAdmin && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">ยังไม่มีข้อความ</p>
          </div>
        )}
      </div>
    </div>
  );
};


// Main App Component Content
function SmartLockerContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin } = useAdmin(user?.id);
  const { createDeposit, markAsCollected } = useLockerTransactions();
  const { rooms: chatRooms, messages: chatMessages, activeRoomId, setActiveRoomId, getOrCreateRoom, sendMessage, totalUnread, markRoomAsRead } = useChat(user?.id);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [chatIsDepositor, setChatIsDepositor] = useState(false);
  const [view, setView] = useState<ViewType>(() => {
    if (searchParams?.get('view') === 'chat_list') return 'chat_list';
    return (pathname.includes('/contact-admin') || searchParams?.get('chat') === 'true') ? 'chat' : 'home';
  });
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<'finder' | 'receiver'>('finder');
  const [lockers, setLockers] = useState<Locker[]>(initialLockers);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [otp, setOtp] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verifyAnswer, setVerifyAnswer] = useState('');
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const MAX_VERIFY_ATTEMPTS = 3;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [depositForm, setDepositForm] = useState<DepositFormData>({
    name: '',
    image: null,
    question: '',
    answer: ''
  });

  // Sync lockers with database transactions
  useEffect(() => {
    const syncLockersWithDB = async () => {
      const { data: transactions } = await supabase
        .from('locker_transactions')
        .select('*')
        .eq('status', 'deposited')
        .order('created_at', { ascending: false });

      // Group by locker_id and get the latest transaction for each locker
      const latestByLocker: { [key: number]: any } = {};
      if (transactions) {
        for (const t of transactions) {
          if (!latestByLocker[t.locker_id]) {
            latestByLocker[t.locker_id] = t;
          }
        }
      }

      setLockers(prev => prev.map(locker => {
        const transaction = latestByLocker[locker.id];
        if (transaction) {
          return {
            ...locker,
            status: 'occupied' as const,
            item: {
              name: transaction.item_description,
              image: transaction.image_url || '',
              date: new Date(transaction.deposited_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
              finder: transaction.depositor_name,
              question: transaction.security_question || '',
              answer: transaction.security_answer || '',
              transactionId: transaction.id,
              // Don't set OTP here - receiver must answer security question first to get OTP
              otp: undefined
            }
          };
        }
        // Reset locker to available if no active transaction in DB
        if (locker.status === 'occupied') {
          return { ...locker, status: 'available' as const, item: null };
        }
        return locker;
      }));
    };

    syncLockersWithDB();

    // Set up realtime subscription
    const channel = supabase
      .channel('locker-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locker_transactions'
        },
        () => {
          syncLockersWithDB();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track admin message unread count for non-admin users
  const fetchAdminUnread = useCallback(async () => {
    if (!user?.id || isAdmin) return;
    const lastReadKey = `admin_chat_read_${user.id}`;
    const lastRead = localStorage.getItem(lastReadKey);
    
    let query = supabase
      .from('admin_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('sender_type', 'admin');
    
    if (lastRead) {
      query = query.gt('created_at', lastRead);
    }
    
    const { count } = await query;
    setAdminUnreadCount(count || 0);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchAdminUnread();
  }, [fetchAdminUnread]);

  // Realtime listener for admin messages
  useEffect(() => {
    if (!user?.id || isAdmin) return;

    const channel = supabase
      .channel('admin-msg-unread')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_messages',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as { sender_type: string };
        if (msg.sender_type === 'admin') {
          setAdminUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isAdmin]);


  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const updated: UserData = {
          name: profile?.full_name || profile?.username || user.email?.split('@')[0] || 'ผู้ใช้',
          type: 'general',
          email: user.email || '',
          phone: profile?.phone || '',
          studentId: '',
          profileImage: profile?.avatar_url || null,
        };
        setCurrentUser(updated);
      setShowLoginModal(false);
    } else {
      setCurrentUser(null);
    }
  }, [authLoading, user?.id, user?.email, profile?.full_name, profile?.username, profile?.avatar_url, profile?.phone]);

  const handleLogin = (user: UserData) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    toast.success(`ยินดีต้อนรับ, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('home');
    toast.success('ออกจากระบบสำเร็จ');
  };

  const handleGoHome = () => {
    setView('home');
    setSelectedLocker(null);
    setAiMessage(null);
    setVerifyAnswer('');
    setVerifyAttempts(0);
    setDepositForm({ name: '', image: null, question: '', answer: '' });
  };

  const handleModeSelect = (mode: 'finder' | 'receiver') => {
    setUserRole(mode);
    setView('dashboard');
  };

  const handleDeposit = async () => {
    setLoading(true);
    
    if (selectedLocker) {
      // Generate OTP for deposit
      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      
      // Save to database with image
      const result = await createDeposit({
        locker_id: selectedLocker.id,
        item_description: depositForm.name,
        depositor_name: currentUser?.name || 'Unknown',
        depositor_contact: currentUser?.email || currentUser?.phone || '',
        security_question: depositForm.question,
        security_answer: depositForm.answer,
        otp: String(generatedOtp),
        user_id: user?.id,
        image_base64: depositForm.image
      });

      if (result) {
        // Update local state with image from result
        setLockers(lockers.map(l => 
          l.id === selectedLocker.id 
            ? { 
                ...l, 
                status: 'occupied' as const, 
                item: { 
                  name: depositForm.name, 
                  image: result.image_url || depositForm.image || '',
                  date: 'ตอนนี้', 
                  finder: currentUser?.name || 'Unknown',
                  question: depositForm.question,
                  answer: depositForm.answer,
                  transactionId: result.id,
                  // Don't set OTP here - receiver must answer security question
                  otp: undefined
                } 
              } 
            : l
        ));
        toast.success('ฝากของสำเร็จ! ตู้จะเปิดอัตโนมัติ');
        setView('dashboard');
        setSelectedLocker(null);
        setDepositForm({ name: '', image: null, question: '', answer: '' });
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!selectedLocker?.item) return;
    
    if (verifyAttempts >= MAX_VERIFY_ATTEMPTS) {
      setAiMessage({ type: 'error', text: `คุณตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้งแล้ว กรุณาติดต่อผู้ฝากผ่านแชท` });
      return;
    }

    setAiThinking(true);
    setAiMessage(null);

    try {
      const response = await fetch('/api/verify-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: verifyAnswer.trim(),
          correctAnswer: selectedLocker.item.answer,
          question: selectedLocker.item.question
        })
      });

      if (!response.ok) throw new Error('Failed to verify answer');
      const data = await response.json();

      if (data.isMatch) {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000);
        setLockers(lockers.map(l => 
          l.id === selectedLocker.id && l.item
            ? { ...l, item: { ...l.item, otp: generatedOtp } }
            : l
        ));
        setOtp(generatedOtp);
        setAiMessage({ type: 'success', text: 'คำตอบถูกต้อง! นี่คือรหัส OTP ของคุณ' });
        setTimeout(() => {
          setView('otp_display');
        }, 1000);
      } else {
        const newAttempts = verifyAttempts + 1;
        setVerifyAttempts(newAttempts);
        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
          setAiMessage({ type: 'error', text: `ตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝากผ่านแชท` });
          toast.error(`ตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝาก`);
        } else {
          setAiMessage({ type: 'error', text: `คำตอบไม่ถูกต้อง (เหลือ ${MAX_VERIFY_ATTEMPTS - newAttempts} ครั้ง)` });
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setAiMessage({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setAiThinking(false);
    }
  };

  const resetState = () => {
    setView('home');
    setSelectedLocker(null);
    setOtp(0);
    setVerifyAnswer('');
    setVerifyAttempts(0);
    setAiMessage(null);
    setDepositForm({ name: '', image: null, question: '', answer: '' });
  };

  const unreadCount = totalUnread + (isAdmin ? 0 : adminUnreadCount);

  // Handler for clicking on locker from search results
  const handleLockerSearchClick = (lockerId: number) => {
    // Switch to receiver mode and go to dashboard
    setUserRole('receiver');
    setView('dashboard');
    
    // Find and select the locker
    const locker = lockers.find(l => l.id === lockerId);
    if (locker && locker.status === 'occupied') {
      setSelectedLocker(locker);
      // If locker has OTP, stay on dashboard; otherwise go to verify
      if (!locker.item?.otp) {
        setView('verify');
      }
    }
  };

  // Render based on view
  if (view === 'home') {
    return (
      <>
        <HomeView 
          lockers={lockers} 
          handleModeSelect={handleModeSelect}
          currentUser={currentUser}
          currentUserId={user?.id}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          onLoginClick={() => setShowLoginModal(true)}
          setView={setView}
          onLockerClick={handleLockerSearchClick}
        />
        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      </>
    );
  }

  if (view === 'chat') {
    const activeChatRoom = chatRooms.find(r => r.id === activeRoomId) || null;
    return (
      <ChatView 
        setView={setView} 
        selectedLocker={selectedLocker} 
        setOtp={setOtp} 
        lockers={lockers} 
        setLockers={setLockers}
        chatRoom={activeChatRoom}
        chatMessages={chatMessages}
        sendMessage={sendMessage}
        currentUserId={user?.id}
        isDepositor={chatIsDepositor}
      />
    );
  }

  if (view === 'otp_display') {
    return (
      <OtpDisplayView 
        otp={otp} 
        selectedLocker={selectedLocker} 
        setView={setView}
        handleGoHome={handleGoHome}
      />
    );
  }

  if (view === 'otp') {
    return (
      <OtpView 
        otp={otp} 
        selectedLocker={selectedLocker} 
        setLockers={setLockers} 
        lockers={lockers} 
        setView={setView} 
        resetState={resetState}
        markAsCollected={markAsCollected}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        view={view} 
        setView={setView} 
        currentUser={currentUser} 
        handleGoHome={handleGoHome}
        unreadCount={unreadCount}
        onLoginClick={() => setShowLoginModal(true)}
      />
      
      {view === 'dashboard' && (
        <DashboardView 
          lockers={lockers} 
          userRole={userRole} 
          setSelectedLocker={setSelectedLocker} 
          setView={setView} 
          handleGoHome={handleGoHome}
          setLockers={setLockers}
          currentUser={currentUser}
          onLoginRequired={() => setShowLoginModal(true)}
          markAsCollected={markAsCollected}
        />
      )}
      
      {view === 'deposit' && (
        <DepositView 
          setView={setView} 
          selectedLocker={selectedLocker} 
          depositForm={depositForm} 
          setDepositForm={setDepositForm} 
          handleDeposit={handleDeposit} 
          loading={loading}
        />
      )}
      
      {view === 'verify' && (
        <VerifyView 
          setView={setView} 
          selectedLocker={selectedLocker} 
          verifyAnswer={verifyAnswer} 
          setVerifyAnswer={setVerifyAnswer} 
          aiMessage={aiMessage} 
          aiThinking={aiThinking} 
          handleVerify={handleVerify}
          attempts={verifyAttempts}
          maxAttempts={MAX_VERIFY_ATTEMPTS}
          onStartChat={async () => {
            if (!selectedLocker?.item?.transactionId || !user?.id) {
              toast.error('กรุณาเข้าสู่ระบบก่อน');
              return;
            }
            // Get the depositor_id from the transaction
            const { data: transaction } = await supabase
              .from('locker_transactions')
              .select('user_id')
              .eq('id', selectedLocker.item.transactionId)
              .single();
            
            if (!transaction?.user_id) {
              toast.error('ไม่พบข้อมูลผู้ฝาก');
              return;
            }

            const room = await getOrCreateRoom(
              selectedLocker.item.transactionId,
              selectedLocker.id,
              transaction.user_id,
              user.id
            );

            if (room) {
              setChatIsDepositor(false);
              setActiveRoomId(room.id);
              setView('chat');
            }
          }}
        />
      )}
      
      {view === 'profile' && currentUser && (
        <ProfileView 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          handleGoHome={handleGoHome} 
          handleLogout={handleLogout}
        />
      )}
      
      {view === 'chat_list' && (
        <ChatListView 
          setView={setView} 
          setSelectedLocker={setSelectedLocker}
          lockers={lockers}
          chatRooms={chatRooms}
          currentUserId={user?.id}
          adminUnreadCount={adminUnreadCount}
          isAdmin={isAdmin}
          onOpenChat={(room) => {
            setChatIsDepositor(room.depositor_id === user?.id);
            setActiveRoomId(room.id);
            setView('chat');
          }}
        />
      )}


      {/* Login Modal - available on all views */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default function SmartLocker() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">กำลังโหลด...</div>}>
      <SmartLockerContent />
    </Suspense>
  );
}