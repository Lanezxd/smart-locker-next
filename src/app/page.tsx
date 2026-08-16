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
  GraduationCap,
  Users,
  Mail,
  Lock,
  Send,
  Shield,
  ChevronLeft,
  Loader2,
  Phone,
  Sparkles,
  Box,
  KeyRound,
  ImageIcon,
  Copy,
  Check,
  MailCheck,
  RotateCw,
  LogIn,
  Trash2
} from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StickyActionBar } from '@/components/feed/StickyActionBar';
import { SocialFeed } from '@/components/feed/SocialFeed';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useLockerTransactions } from '@/hooks/useLockerTransactions';
import { ChatRoom, ChatMessageDB } from '@/hooks/useChat';
import { useChatContext } from '@/contexts/ChatContext';

// Types
interface LockerItem {
  name: string;
  image: string;
  date: string;
  depositedAt?: string;
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
  id?: string;
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

const getVerifyAttemptsKey = (locker: Locker | null) => {
  if (!locker) return null;
  const txnId = locker.item?.transactionId;
  return txnId ? `smart_locker_attempts_txn_${txnId}` : `smart_locker_attempts_locker_${locker.id}`;
};

// Header Component (used for dashboard, deposit, verify, profile, chat_list views)
const Header = ({ 
  currentUser, 
  handleGoHome,
  unreadCount,
  onLoginClick,
  setView
}: {
  view: ViewType;
  setView: (view: ViewType) => void;
  currentUser: UserData | null;
  handleGoHome: () => void;
  unreadCount: number;
  onLoginClick?: () => void;
}) => (
  <header className="sticky top-0 z-50 bg-white/45 backdrop-blur-2xl border-b border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.03)] relative overflow-hidden transition-colors">
    {/* Ambient warm-light glow overlay behind the navbar */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-500/[0.06] via-amber-500/[0.02] to-transparent pointer-events-none" />
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-20 bg-amber-400/20 blur-2xl rounded-full pointer-events-none -z-10" />

    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between relative z-10">
      <div 
        onClick={() => currentUser ? handleGoHome() : null}
        className={`flex items-center ${currentUser ? 'cursor-pointer' : ''}`}
      >
        <span className="font-brand font-bold text-base sm:text-lg tracking-tight text-zinc-950 uppercase select-none">
          LOSTRETURN
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {currentUser ? (
          <>
            <button 
              onClick={() => setView('chat_list')}
              className="relative p-2.5 bg-white/60 hover:bg-white/90 rounded-full transition-colors text-zinc-700 hover:text-zinc-950 border border-white/80 cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[11px] rounded-full flex items-center justify-center font-bold shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setView('profile')}
              className="flex items-center gap-2 pl-1.5 pr-3.5 py-1 bg-white/70 hover:bg-white rounded-full border border-white/80 hover:border-amber-400 cursor-pointer transition-all shadow-sm group"
            >
              <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center overflow-hidden">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-700">{currentUser.name.charAt(0)}</span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-zinc-800 leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-zinc-500">{currentUser.type}</p>
              </div>
            </button>
          </>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-transparent hover:bg-white/50 text-zinc-900 hover:text-amber-500 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer group"
          >
            <LogIn className="w-4 h-4 stroke-[2.5] text-zinc-900 group-hover:text-amber-500 transition-colors" />
            <span className="text-zinc-900 group-hover:text-amber-500 transition-colors">Sign In</span>
          </button>
        )}
      </div>
    </div>
  </header>
);

// Auth Form Component (Luxury Light Mode)
const AuthForm = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'forgot_password'>('form');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: ''
  });

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [signInError, setSignInError] = useState<{
    type: 'user_not_found' | 'wrong_password' | 'other';
    message: string;
  } | null>(null);

  const [touched, setTouched] = useState<{
    name?: boolean;
    phone?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  // Auto-format Thai phone number: 099-020-9962
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const validateField = (field: string, value: string, allData = formData) => {
    let error = '';
    if (field === 'name') {
      const trimmed = value.trim();
      if (!trimmed) {
        error = 'กรุณากรอกชื่อและนามสกุล';
      } else {
        const words = trimmed.split(/\s+/).filter(Boolean);
        if (words.length < 2) {
          error = 'กรุณากรอกชื่อและนามสกุล';
        }
      }
    } else if (field === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (!digits) {
        error = 'กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง';
      } else if (digits.length !== 10 || !/^0\d{9}$/.test(digits)) {
        error = 'กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง';
      }
    } else if (field === 'email') {
      const trimmed = value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmed) {
        error = 'กรุณากรอกอีเมลให้ถูกต้อง';
      } else if (!emailRegex.test(trimmed)) {
        error = 'กรุณากรอกอีเมลให้ถูกต้อง';
      }
    } else if (field === 'password') {
      if (!value) {
        error = 'กรุณากรอกรหัสผ่าน';
      } else if (value.length < 8) {
        error = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      }
    } else if (field === 'confirmPassword' && isRegister) {
      if (!value) {
        error = 'กรุณายืนยันรหัสผ่าน';
      } else if (value !== allData.password) {
        error = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      }
    }
    return error;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field as keyof typeof formData]);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, value: string) => {
    // Clear sign in error immediately when user begins re-typing
    if (signInError) {
      setSignInError(null);
    }

    let nextValue = value;
    if (field === 'phone') {
      nextValue = formatPhoneNumber(value);
    }
    const nextFormData = { ...formData, [field]: nextValue };
    setFormData(nextFormData);

    if (touched[field as keyof typeof touched]) {
      const error = validateField(field, nextValue, nextFormData);
      setFormErrors(prev => {
        const updated = { ...prev, [field]: error };
        if (field === 'password' && isRegister && touched.confirmPassword) {
          updated.confirmPassword = validateField('confirmPassword', nextFormData.confirmPassword, nextFormData);
        }
        return updated;
      });
    }
  };

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister) {
      // Full validation on submit
      const nameErr = validateField('name', formData.name);
      const phoneErr = validateField('phone', formData.phone);
      const emailErr = validateField('email', formData.email);
      const passErr = validateField('password', formData.password);
      const confirmPassErr = validateField('confirmPassword', formData.confirmPassword);

      setTouched({
        name: true,
        phone: true,
        email: true,
        password: true,
        confirmPassword: true
      });

      const errors = {
        name: nameErr,
        phone: phoneErr,
        email: emailErr,
        password: passErr,
        confirmPassword: confirmPassErr
      };
      setFormErrors(errors);

      if (nameErr || phoneErr || emailErr || passErr || confirmPassErr) {
        return;
      }

      setLoading(true);

      try {
        const cleanPhone = formData.phone.replace(/\D/g, '');
        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.name.trim(),
              phone_number: cleanPhone
            }
          }
        });

        if (error) {
          toast.error(error.message.includes('already registered') || error.message === 'User already registered' 
            ? 'อีเมลนี้ถูกใช้งานแล้ว' 
            : error.message);
          setLoading(false);
          return;
        }

        // Check if user already exists (Supabase Email Enumeration Protection)
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          toast.error('อีเมลนี้ถูกใช้งานแล้ว');
          setLoading(false);
          return;
        }

        setStep('otp');
        setOtpCode('');
        setOtpError('');
        setResendCooldown(60);
        toast.success(`ส่งรหัส OTP 6 หลักไปที่ ${formData.email} แล้ว`);
      } catch (err) {
        console.error('Auth error:', err);
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign in validation
      const emailErr = validateField('email', formData.email);
      const passErr = validateField('password', formData.password);

      setTouched(prev => ({ ...prev, email: true, password: true }));
      setFormErrors({ email: emailErr, password: passErr });
      setSignInError(null);

      if (emailErr || passErr) return;

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password
        });

        if (error) {
          let isUserMissing = false;
          try {
            const checkRes = await fetch('/api/check-email-exists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email.trim() })
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.exists === false) {
                isUserMissing = true;
              }
            }
          } catch (checkErr) {
            console.warn('Check email exists failed:', checkErr);
          }

          if (isUserMissing) {
            setSignInError({
              type: 'user_not_found',
              message: 'ไม่พบบัญชีผู้ใช้'
            });
          } else {
            setSignInError({
              type: 'wrong_password',
              message: 'รหัสผ่านไม่ถูกต้อง'
            });
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          const mockUser: UserData = {
            id: data.user.id,
            name: profile?.username || profile?.full_name || data.user.email?.split('@')[0] || 'User',
            type: 'general',
            email: data.user.email || '',
            phone: profile?.phone || '',
            studentId: '',
            profileImage: profile?.avatar_url || null
          };
          onLogin(mockUser);
        }
      } catch (err) {
        console.error('Auth error:', err);
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setOtpError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email.trim(),
        token: otpCode.trim(),
        type: 'signup'
      });

      if (error) {
        setOtpError('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
        setOtpLoading(false);
        return;
      }

      const authUser = data.user || data.session?.user;
      if (authUser) {
        const cleanPhone = formData.phone.replace(/\D/g, '');
        const profileData = {
          user_id: authUser.id,
          username: formData.name.trim() || formData.email.split('@')[0],
          full_name: formData.name.trim(),
          phone: cleanPhone || null,
          updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'user_id' });

        if (profileError) {
          console.warn('Profile upsert note:', profileError);
        }

        toast.success('ยืนยันอีเมลและสมัครสมาชิกสำเร็จ! ยินดีต้อนรับ');

        const mockUser: UserData = {
          id: authUser.id,
          name: formData.name.trim() || formData.email.split('@')[0],
          type: 'general',
          email: formData.email.trim(),
          phone: cleanPhone || '',
          studentId: '',
          profileImage: null
        };
        onLogin(mockUser);
      }
    } catch {
      setOtpError('เกิดข้อผิดพลาดในการยืนยัน OTP กรุณาลองใหม่อีกครั้ง');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim()
      });

      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password
        });
        if (signUpError) {
          toast.error(signUpError.message);
          setResending(false);
          return;
        }
      }

      toast.success(`ส่งรหัส OTP ใหม่ไปยัง ${formData.email} แล้ว`);
      setResendCooldown(60);
    } catch (err) {
      console.error('Resend OTP error:', err);
      toast.error('ไม่สามารถส่งรหัส OTP ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setResending(false);
    }
  };

  const handleSendForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('กรุณากรอกอีเมลของคุณ');
      return;
    }

    setForgotLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo
      });

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('over_email_send_rate_limit')) {
          toast.error('คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่');
        } else {
          toast.error(error.message);
        }
        return;
      }

      setForgotSent(true);
      toast.success(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${forgotEmail} แล้ว`);
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      toast.error('เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ตรหัสผ่าน');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setOtpCode('');
    setOtpError('');
  };

  return (
    <div className="w-full max-w-md mx-auto backdrop-blur-2xl bg-white/90 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200">
      {/* Forgot Password View */}
      {step === 'forgot_password' ? (
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600 shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">รีเซ็ตรหัสผ่าน</h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 px-2 font-normal leading-relaxed">
              กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
            </p>
          </div>

          {forgotSent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800">
                  ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว!
                </p>
                <p className="text-xs text-zinc-600 font-normal">
                  เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยัง <span className="font-semibold text-amber-700 break-all">{forgotEmail}</span> แล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSendForgotPassword}
                  disabled={forgotLoading}
                  className="w-full bg-white hover:bg-zinc-50 text-zinc-800 font-medium py-3 rounded-xl border border-zinc-200 flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <RotateCw className="w-4 h-4" />}
                  <span>Resend Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setForgotSent(false);
                  }}
                  className="w-full text-center text-xs sm:text-sm text-amber-600 font-semibold hover:underline py-2 cursor-pointer flex items-center justify-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  placeholder="อีเมลของคุณ"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-xs sm:text-sm shadow-sm transition-all"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail.trim()}
                className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer active:scale-[0.98]"
              >
                {forgotLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 font-medium hover:underline cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      ) : step === 'otp' ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600 shadow-sm">
              <MailCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">ยืนยันอีเมลของคุณ</h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 px-2 font-normal leading-relaxed">
              ส่งรหัส OTP 6 หลักไปที่{' '}
              <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md break-all">
                {formData.email}
              </span>{' '}
              แล้ว
            </p>
          </div>

          {/* OTP Verification Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-center my-2">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  setOtpError('');
                }}
                pattern={REGEXP_ONLY_DIGITS}
                autoFocus
              >
                <InputOTPGroup className="gap-2 sm:gap-2.5">
                  <InputOTPSlot index={0} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                  <InputOTPSlot index={1} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                  <InputOTPSlot index={2} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                  <InputOTPSlot index={3} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                  <InputOTPSlot index={4} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                  <InputOTPSlot index={5} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-semibold rounded-xl border-zinc-300 bg-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {otpError && (
              <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs sm:text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>{otpError}</span>
              </div>
            )}

            {/* Primary Button */}
            <button
              type="submit"
              disabled={otpLoading || otpCode.length !== 6}
              className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer active:scale-[0.98]"
            >
              {otpLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
              ) : (
                <>
                  <span>Verify OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Secondary Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={handleBackToForm}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 transition-colors font-medium cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="flex items-center gap-1.5 text-amber-600 hover:underline font-semibold disabled:text-zinc-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {resending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                ) : (
                  <RotateCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'animate-none'}`} />
                )}
                <span>
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Login / Register Form View */
        <>
          {/* Segmented Pill Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              disabled={!isRegister}
              onClick={() => {
                setIsRegister(false);
                setStep('form');
                setFormErrors({});
                setTouched({});
                setSignInError(null);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm rounded-2xl transition-all ${
                !isRegister 
                  ? 'bg-white border border-zinc-900 text-amber-500 font-semibold shadow-sm cursor-default' 
                  : 'bg-transparent text-zinc-900 hover:text-amber-500 font-medium cursor-pointer'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={isRegister}
              onClick={() => {
                setIsRegister(true);
                setStep('form');
                setFormErrors({});
                setTouched({});
                setSignInError(null);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm rounded-2xl transition-all ${
                isRegister 
                  ? 'bg-white border border-zinc-900 text-amber-500 font-semibold shadow-sm cursor-default' 
                  : 'bg-transparent text-zinc-900 hover:text-amber-500 font-medium cursor-pointer'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-xl font-bold text-zinc-900 mb-1">
            {isRegister ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับ'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-5 font-normal leading-relaxed">
            {isRegister ? 'กรอกข้อมูลเพื่อเริ่มต้นใช้งาน' : 'กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ'}
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {isRegister && (
              <>
                {/* Name field */}
                <div className="space-y-1">
                  <div className="relative">
                    <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                      formErrors.name ? 'text-rose-400' : 'text-zinc-400'
                    }`} />
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-zinc-900 font-normal placeholder:text-zinc-400 outline-none text-xs sm:text-sm shadow-sm transition-all ${
                        formErrors.name 
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-0 focus:shadow-none' 
                          : 'border-zinc-300 hover:border-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
                      }`}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                    />
                  </div>
                  {formErrors.name && (
                    <p className="text-xs text-rose-500 mt-1 pl-1 flex items-center gap-1 font-normal animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* Phone field */}
                <div className="space-y-1">
                  <div className="relative">
                    <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                      formErrors.phone ? 'text-rose-400' : 'text-zinc-400'
                    }`} />
                    <input
                      type="tel"
                      placeholder="เบอร์โทร"
                      maxLength={12}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-zinc-900 font-normal placeholder:text-zinc-400 outline-none text-xs sm:text-sm shadow-sm transition-all ${
                        formErrors.phone 
                          ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-0 focus:shadow-none' 
                          : 'border-zinc-300 hover:border-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
                      }`}
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-xs text-rose-500 mt-1 pl-1 flex items-center gap-1 font-normal animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.phone}</span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email field */}
            <div className="space-y-1">
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  (formErrors.email || signInError?.type === 'user_not_found') ? 'text-rose-400' : 'text-zinc-400'
                }`} />
                <input
                  type="email"
                  placeholder="อีเมล"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-zinc-900 font-normal placeholder:text-zinc-400 outline-none text-xs sm:text-sm shadow-sm transition-all ${
                    (formErrors.email || signInError?.type === 'user_not_found')
                      ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-0 focus:shadow-none' 
                      : 'border-zinc-300 hover:border-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
                  }`}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
              </div>
              {(formErrors.email || (!isRegister && signInError?.type === 'user_not_found')) && (
                <p className="text-xs text-rose-500 mt-1 pl-1 flex items-center gap-1 font-normal animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{(!isRegister && signInError?.type === 'user_not_found') ? 'ไม่พบบัญชีผู้ใช้' : formErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  (formErrors.password || signInError?.type === 'wrong_password') ? 'text-rose-400' : 'text-zinc-400'
                }`} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่าน"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white text-zinc-900 font-normal placeholder:text-zinc-400 outline-none text-xs sm:text-sm shadow-sm transition-all ${
                    (formErrors.password || signInError?.type === 'wrong_password') 
                      ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-0 focus:shadow-none' 
                      : 'border-zinc-300 hover:border-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
                  }`}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {(formErrors.password || (!isRegister && signInError?.type === 'wrong_password')) && (
                <p className="text-xs text-rose-500 mt-1 pl-1 flex items-center gap-1 font-normal animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{(!isRegister && signInError?.type === 'wrong_password') ? 'รหัสผ่านไม่ถูกต้อง' : formErrors.password}</span>
                </p>
              )}

              {!isRegister && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(formData.email);
                      setForgotSent(false);
                      setStep('forgot_password');
                    }}
                    className="text-xs font-semibold text-amber-600 hover:underline transition-all cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password field (Sign Up only) */}
            {isRegister && (
              <div className="space-y-1">
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    formErrors.confirmPassword ? 'text-rose-400' : 'text-zinc-400'
                  }`} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="ยืนยันรหัสผ่าน"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl border bg-white text-zinc-900 font-normal placeholder:text-zinc-400 outline-none text-xs sm:text-sm shadow-sm transition-all ${
                      formErrors.confirmPassword 
                        ? 'border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-0 focus:shadow-none' 
                        : 'border-zinc-300 hover:border-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
                    }`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1 pl-1 flex items-center gap-1 font-normal animate-fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.confirmPassword}</span>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer text-xs sm:text-sm mt-2 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
                  <span>{isRegister ? 'กำลังสร้างบัญชี...' : 'กำลังเข้าสู่ระบบ...'}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Sign Up' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

// Mode Selection Component (Luxury Light Mode)
const ModeSelection = ({ handleModeSelect }: { handleModeSelect: (mode: 'finder' | 'receiver') => void }) => (
  <div className="w-full max-w-md mx-auto space-y-4">
    <p className="text-xs sm:text-sm text-zinc-500 text-center mb-6 font-normal">เลือกทำรายการตามสถานะของคุณ</p>
    
    <button
      onClick={() => handleModeSelect('finder')}
      className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-5 rounded-2xl shadow-lg shadow-amber-500/20 flex flex-col items-start px-6 transition-all transform hover:scale-[1.02] active:scale-[0.98] group text-left cursor-pointer"
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className="flex items-center gap-3">
          <Package className="w-6 h-6 stroke-[2.2]" />
          <span className="text-base sm:text-lg font-bold text-zinc-900">ฝากของที่พบ</span>
        </span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.2]" />
      </div>
      <p className="text-xs text-zinc-800/80 ml-9 font-normal">ฝากของที่เก็บได้ไว้ในตู้ล็อกเกอร์</p>
    </button>

    <button
      onClick={() => handleModeSelect('receiver')}
      className="w-full backdrop-blur-2xl bg-white border border-zinc-200 hover:border-zinc-900 focus:border-zinc-900 active:border-zinc-900 text-zinc-800 font-semibold py-5 rounded-2xl flex flex-col items-start px-6 transition-all transform hover:scale-[1.02] active:scale-[0.98] group text-left shadow-sm cursor-pointer outline-none"
    >
      <div className="flex items-center justify-between w-full mb-1">
        <span className="flex items-center gap-3">
          <Search className="w-6 h-6 text-zinc-800 stroke-[2.2]" />
          <span className="text-base sm:text-lg font-bold text-zinc-900">ตามหาของหาย</span>
        </span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-zinc-400 stroke-[2.2]" />
      </div>
      <p className="text-xs text-zinc-500 ml-9 font-normal">ตรวจสอบและรับของคืนจากตู้ล็อกเกอร์</p>
    </button>
  </div>
);

// Home View Component - Uses Social Feed layout
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
    <div className="min-h-screen bg-zinc-50">
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

// Login Modal Component (Luxury Light Mode)
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-100 transition-colors text-zinc-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <AuthForm onLogin={onLogin} />
      </div>
    </div>
  );
};

// Dashboard View Component (Luxury Light Mode)
const DashboardView = ({ 
  lockers, 
  userRole, 
  setSelectedLocker, 
  setView, 
  handleGoHome, 
  setLockers,
  currentUser,
  currentUserId,
  onLoginRequired,
  markAsCollected,
  mqttPublish,
  otpGeneratedAt,
  otpTimeLeft,
  setOtp,
  setOtpGeneratedAt,
  setOtpTimeLeft,
  selectedLocker,
}: {
  lockers: Locker[];
  userRole: 'finder' | 'receiver';
  setSelectedLocker: (locker: Locker) => void;
  setView: (view: ViewType) => void;
  handleGoHome: () => void;
  setLockers: (lockers: Locker[]) => void;
  currentUser: UserData | null;
  currentUserId?: string;
  onLoginRequired: () => void;
  markAsCollected: (transactionId: string) => Promise<boolean>;
  mqttPublish?: (topic: string, payload: string) => void;
  otpGeneratedAt: Date | null;
  otpTimeLeft: number;
  setOtp: (otp: number) => void;
  setOtpGeneratedAt: (date: Date | null) => void;
  setOtpTimeLeft?: (time: number) => void;
  selectedLocker: Locker | null;
}) => {
  const [otpInputs, setOtpInputs] = useState<{ [lockerId: number]: string }>({});
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ [lockerId: number]: string }>({});
  const [viewingImage, setViewingImage] = useState<{ src: string; name: string } | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

    if (otpGeneratedAt) {
      const elapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
      if (elapsed >= 600) {
        setErrors({ ...errors, [locker.id]: 'รหัส OTP หมดอายุแล้ว' });
        return;
      }
    }

    setUnlocking(locker.id);

    // Simulate unlock delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check OTP against local state first, then verify against database as fallback
    let otpMatch = locker.item?.otp && enteredOtp === String(locker.item.otp);
    let transactionId = locker.item?.transactionId;

    if (!otpMatch && transactionId) {
      const { data: txn } = await supabase
        .from('locker_transactions')
        .select('otp')
        .eq('id', transactionId)
        .single();
      
      if (txn?.otp && enteredOtp === txn.otp) {
        otpMatch = true;
      }
    }

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

      const collectorUserId = currentUserId || currentUser?.id || null;
      const collectorName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : null);
      const collectorContact = currentUser?.phone || currentUser?.email || null;

      const { error: updateError } = await supabase
        .from('locker_transactions')
        .update({
          otp: enteredOtp,
          otp_generated_at: otpGeneratedAt ? otpGeneratedAt.toISOString() : new Date().toISOString(),
          status: 'collected',
          collected_at: new Date().toISOString(),
          collector_user_id: collectorUserId,
          collector_name: collectorName,
          collector_contact: collectorContact
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating OTP in Supabase:', updateError);
      }

      const ok = await markAsCollected(transactionId);
      if (!ok) {
        setUnlocking(null);
        return;
      }

      const lockerIdNum = Number(locker.id);
      if (!isNaN(lockerIdNum)) {
        mqttPublish?.(`lostreturn/locker/${lockerIdNum}/command`, 'OPEN');
      }

      setLockers(lockers.map(l => 
        l.id === locker.id 
          ? { ...l, status: 'available' as const, item: null } 
          : l
      ));
      toast.success(`ตู้ ${String(locker.id).padStart(2, '0')} ปลดล็อกแล้ว! กรุณาหยิบของ`);
      setOtpInputs({ ...otpInputs, [locker.id]: '' });

      try {
        localStorage.removeItem('smart_locker_verified_session');
        const key = getVerifyAttemptsKey(locker);
        if (key) localStorage.removeItem(key);
      } catch {}
      setOtp(0);
      setOtpGeneratedAt(null);
      setOtpTimeLeft?.(0);
    } else {
      setErrors({ ...errors, [locker.id]: 'รหัส OTP ไม่ถูกต้อง' });
    }
    setUnlocking(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      <button
        onClick={handleGoHome}
        className="mb-4 text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      {/* Mode Banner */}
      <div className={`mb-6 p-4 rounded-2xl backdrop-blur-xl border ${
        userRole === 'finder' 
          ? 'bg-amber-50 border-amber-200/80 shadow-sm' 
          : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            userRole === 'finder' 
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-zinc-900 shadow-md shadow-amber-500/20' 
              : 'bg-zinc-100 text-amber-600'
          }`}>
            {userRole === 'finder' ? (
              <Package className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-sm sm:text-base leading-snug">
              {userRole === 'finder' ? 'หน้าฝากของ' : 'หน้ารับของ'}
            </p>
            <p className="text-xs text-zinc-500 font-normal mt-0.5">
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
            className={`relative p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 backdrop-blur-xl ${
              locker.status === 'available' && userRole === 'finder'
                ? 'bg-white border border-zinc-200 hover:border-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.12)] shadow-sm group cursor-pointer'
                : locker.status === 'occupied'
                ? 'bg-white border border-amber-300/80 hover:border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.08)]'
                : locker.status === 'available'
                ? 'bg-white border border-zinc-200 shadow-sm'
                : 'bg-zinc-100 border border-zinc-200 cursor-not-allowed opacity-50'
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
              <span className="text-2xl font-semibold text-zinc-800 tracking-tight">
                {String(locker.id).padStart(2, '0')}
              </span>
              {locker.status === 'occupied' ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900">
                  มีของ
                </span>
              ) : locker.status === 'available' ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-800">
                  ว่าง
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                  ปิดปรับปรุง
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between">
              {locker.status === 'available' && (
                <div className="flex-1 flex flex-col items-center justify-center py-7">
                  <div className={`p-3.5 rounded-2xl ${
                    userRole === 'finder' 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 group-hover:scale-110' 
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-400'
                  } transition-transform`}>
                    <Unlock className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <p className="text-xs text-zinc-400 mt-4 text-center font-normal">
                    {userRole === 'finder' ? 'แตะเพื่อฝากของ' : 'ไม่มีของ'}
                  </p>
                </div>
              )}
              
              {locker.status === 'occupied' && locker.item && (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Item Info */}
                  <div className="flex flex-col gap-2 mb-3">
                    {/* Image - Clickable to expand */}
                    <div 
                      className="w-full h-24 rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-100 cursor-pointer group relative"
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
                              <Search className="w-3.5 h-3.5" />
                              ดูรูปขยาย
                            </span>
                          </div>
                        </>
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center ${locker.item.image ? 'hidden' : ''}`}>
                        <ImageIcon className="w-8 h-8 text-zinc-400" />
                      </div>
                    </div>
                    {/* Item name */}
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 truncate leading-snug">{locker.item.name}</p>
                    </div>
                  </div>

                  {/* OTP Input Section - Only show if OTP is set AND in receiver mode */}
                  {locker.item.otp && userRole === 'receiver' && (
                    <div 
                      className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 space-y-2 mt-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-amber-800 whitespace-nowrap font-medium">
                        <KeyRound className="w-3 h-3 shrink-0 text-amber-600" />
                        <span>กรอกรหัส OTP {otpTimeLeft > 0 ? `(เหลือ ${formatTime(otpTimeLeft)})` : ''}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={otpInputs[locker.id] || ''}
                          onChange={(e) => handleOtpChange(locker.id, e.target.value)}
                          className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg text-center text-xs font-semibold tracking-widest outline-none transition-all ${
                            errors[locker.id] 
                              ? 'bg-rose-50 border border-rose-400 text-rose-700 placeholder:text-rose-400/50' 
                              : 'bg-white border border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-900'
                          }`}
                        />
                        <button
                          onClick={() => handleUnlockLocker(locker)}
                          disabled={unlocking === locker.id || (otpInputs[locker.id] || '').length !== 6}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 rounded-lg font-semibold flex items-center justify-center hover:shadow-md hover:shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 text-xs cursor-pointer"
                        >
                          {unlocking === locker.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 stroke-[2.2]" />
                          )}
                        </button>
                      </div>
                      {errors[locker.id] && (
                        <p className="text-[10px] text-rose-600 flex items-center gap-1 font-normal">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {errors[locker.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Click to verify - Only show if no OTP */}
                  {!locker.item.otp && userRole === 'receiver' && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          toast.error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
                          onLoginRequired();
                          return;
                        }
                        setSelectedLocker(locker);
                        setView('verify');
                      }}
                      className="w-full mt-auto bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 rounded-xl py-2 px-3 text-xs font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-400/35 hover:scale-[1.02] hover:brightness-105 active:scale-[0.97] active:brightness-95 transition-all duration-200 flex items-center justify-center cursor-pointer select-none"
                    >
                      <span>Verify</span>
                    </button>
                  )}
                </div>
              )}
              
              {locker.status === 'maintenance' && (
                <div className="flex-1 flex items-center justify-center py-8">
                  <AlertCircle className="w-10 h-10 text-zinc-300" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Lightbox Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 hover:bg-black rounded-full flex items-center justify-center transition-colors text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={viewingImage.src} 
              alt={viewingImage.name}
              className="w-full max-h-[70vh] object-contain bg-zinc-950"
            />
            <div className="p-4 bg-white border-t border-zinc-200">
              <p className="font-semibold text-sm text-zinc-800 text-center">{viewingImage.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Deposit View Component (Luxury Light Mode)
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
  <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
    <button
      onClick={() => setView('dashboard')}
      className="mb-4 text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
    >
      <ChevronLeft className="w-4 h-4" />
      <span>Back to Dashboard</span>
    </button>

    <div className="backdrop-blur-2xl bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">ฝากของ</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-normal leading-relaxed">
            กรอกรายละเอียดสำหรับตู้หมายเลข <span className="font-semibold text-zinc-700">#{String(selectedLocker?.id || 0).padStart(2, '0')}</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-zinc-900 flex items-center justify-center shadow-md shadow-amber-500/20">
          <Package className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: Upload Photo */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-semibold text-zinc-900">1. อัปโหลดรูปสิ่งของ</label>
          {depositForm.image ? (
            <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900/[0.03] shadow-sm flex items-center justify-center">
              <img src={depositForm.image} alt="Preview" className="w-full max-h-72 sm:max-h-80 object-contain rounded-2xl" />
              <button
                type="button"
                onClick={() => setDepositForm({ ...depositForm, image: null })}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="w-full border-2 border-dashed border-zinc-300 hover:border-zinc-900 bg-zinc-50/80 rounded-2xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer group">
              <Upload className="w-8 h-8 text-zinc-400 group-hover:text-zinc-900 mb-2 transition-colors stroke-[1.8]" />
              <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-950 text-center transition-colors">เลือกรูปจากอุปกรณ์</span>
              <span className="text-xs text-zinc-400 mt-1 font-normal">รองรับ JPG, PNG</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => { setDepositForm({ ...depositForm, image: reader.result as string }); };
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
          )}
        </div>

        {/* Step 2: Details */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-semibold text-zinc-900">2. สิ่งที่พบ</label>
          <input
            type="text"
            placeholder="เช่น กุญแจรถ, กระเป๋าสตางค์"
            className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-sm shadow-sm transition-all"
            value={depositForm.name}
            onChange={(e) => setDepositForm({ ...depositForm, name: e.target.value })}
          />
        </div>

        {/* Step 3: Security */}
        <div className="bg-zinc-50/90 border border-zinc-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-200/80 flex items-center justify-center text-zinc-700 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-zinc-900 leading-snug">
              ตั้งคำถามที่เจ้าของตัวจริงเท่านั้นที่รู้
            </h3>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-zinc-800">คำถาม</label>
              <input
                type="text"
                placeholder="เช่น รุ่นอะไร หรือมีตำหนิตรงไหน"
                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-sm shadow-sm transition-all"
                value={depositForm.question}
                onChange={(e) => setDepositForm({ ...depositForm, question: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-zinc-800">คำตอบเฉลย</label>
              <input
                type="text"
                placeholder="คำตอบที่ถูกต้อง"
                className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-sm shadow-sm transition-all"
                value={depositForm.answer}
                onChange={(e) => setDepositForm({ ...depositForm, answer: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8">
        <button
          onClick={handleDeposit}
          disabled={loading || !depositForm.image || !depositForm.name || !depositForm.question || !depositForm.answer}
          className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 sm:py-4 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
              <span>กำลังเชื่อมต่อตู้...</span>
            </>
          ) : (
            <>
              <span>Unlock</span>
              <Unlock className="w-4 h-4 stroke-[2.2]" />
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

// Helper to format full Thai deposit date and time (e.g. 16 ส.ค. 2569 เวลา 18:28 น.)
const formatThaiDepositDateTime = (item?: LockerItem | null) => {
  if (!item) return '';
  if (item.depositedAt) {
    const d = new Date(item.depositedAt);
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
    }
  }
  if (item.date && item.date !== 'ตอนนี้') {
    if (item.date.includes('เวลา') || item.date.includes('ม.ค.') || item.date.includes('ก.พ.') || item.date.includes('มี.ค.') || item.date.includes('เม.ย.') || item.date.includes('พ.ค.') || item.date.includes('มิ.ย.') || item.date.includes('ก.ค.') || item.date.includes('ส.ค.') || item.date.includes('ก.ย.') || item.date.includes('ต.ค.') || item.date.includes('พ.ย.') || item.date.includes('ธ.ค.')) {
      return item.date;
    }
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
    }
    return item.date;
  }
  const now = new Date();
  return `${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
};

// Verify View Component (Luxury Light Mode)
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
}) => {
  const remaining = Math.max(0, maxAttempts - attempts);
  const isInputValid = verifyAnswer.trim().length > 0;
  const isButtonDisabled = aiThinking || !isInputValid || attempts >= maxAttempts;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      <button
        onClick={() => setView('dashboard')}
        className="mb-4 text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      <div className="backdrop-blur-2xl bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">ยืนยันความเป็นเจ้าของ</h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-normal leading-relaxed">
              ตอบคำถามให้ถูกต้องเพื่อปลดล็อกตู้ <span className="font-semibold text-zinc-700">#{String(selectedLocker?.id || 0).padStart(2, '0')}</span>
            </p>
          </div>
        </div>

        {/* Item Card */}
        <div className="backdrop-blur-md bg-zinc-50/80 border border-zinc-200/80 rounded-2xl p-4 flex items-center gap-3.5 mb-5">
          <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-zinc-200/80 shadow-xs flex items-center justify-center">
            {selectedLocker?.item?.image ? (
              <img src={selectedLocker.item.image} alt={selectedLocker?.item?.name || 'Item'} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <Package className="w-7 h-7 text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 truncate leading-snug">
              {selectedLocker?.item?.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 font-normal flex items-center gap-1.5 truncate">
              <span>ฝากเมื่อ:</span>
              <span className="text-zinc-700 font-medium">{formatThaiDepositDateTime(selectedLocker?.item)}</span>
            </p>
          </div>
        </div>

        {/* Question & Answer Box (Clean Minimal) */}
        <div className="bg-zinc-50/90 border border-zinc-200/90 rounded-2xl p-4 sm:p-5 mb-6">
          <label className="block text-sm sm:text-base font-semibold text-zinc-900 mb-2.5 leading-snug">
            {selectedLocker?.item?.question || 'ระบุข้อมูลลักษณะของสิ่งของ'}
          </label>

          <div className="relative">
            <input
              type="text"
              placeholder="ระบุคำตอบหรือรายละเอียดลักษณะเฉพาะ..."
              className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-sm shadow-sm transition-all"
              value={verifyAnswer}
              onChange={(e) => setVerifyAnswer(e.target.value)}
              autoFocus
              disabled={attempts >= maxAttempts}
            />
          </div>
          {attempts >= maxAttempts || remaining === 0 ? (
            <p className="text-xs text-rose-600 mt-2.5 text-left font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>ตอบคำถามครบกำหนด กรุณาแชทกับผู้ฝาก</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500 mt-2.5 text-left font-normal">
              เหลือโอกาสตอบอีก <span className="font-semibold text-zinc-700">{remaining}</span> ครั้ง
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleVerify}
            disabled={isButtonDisabled}
            className={`w-full py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base font-semibold select-none ${
              isButtonDisabled
                ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-400/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
            }`}
          >
            {aiThinking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>AI กำลังวิเคราะห์...</span>
              </>
            ) : (
              <span>ยืนยันคำตอบ</span>
            )}
          </button>
          
          <button
            onClick={onStartChat}
            className="w-full py-3 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-zinc-500 stroke-[2]" />
            <span>แชทกับผู้ฝาก</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Chat View Component (Luxury Light Mode)
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
  setOtpGeneratedAt,
  mqttPublish,
  markRoomAsRead,
  setUserRole,
}: {
  setView: (view: ViewType) => void;
  selectedLocker: Locker | null;
  setOtp: (otp: number) => void;
  lockers: Locker[];
  setLockers: React.Dispatch<React.SetStateAction<Locker[]>>;
  chatRoom: ChatRoom | null;
  chatMessages: ChatMessageDB[];
  sendMessage: (roomId: string, content: string, messageType?: string) => Promise<ChatMessageDB | null>;
  currentUserId: string | undefined;
  isDepositor: boolean;
  clearActiveRoom: () => void;
  setOtpGeneratedAt: (date: Date | null) => void;
  mqttPublish?: (topic: string, payload: string) => void;
  markRoomAsRead?: (roomId: string) => Promise<void>;
  setUserRole?: (role: 'finder' | 'receiver') => void;
}) => {
  const otherUserName = isDepositor 
    ? 'ผู้มารับของ' 
    : (selectedLocker?.item?.finder ? `${selectedLocker.item.finder} (ผู้ฝาก)` : 'ผู้ฝาก');
  const [inputText, setInputText] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (chatRoom?.id) {
      markRoomAsRead?.(chatRoom.id);
    }
  }, [chatRoom?.id, markRoomAsRead]);

  // Sync OTP cooldown from latest OTP message in chat
  useEffect(() => {
    const latestOtpMsg = [...chatMessages].reverse().find(m => m.message_type === 'otp_sent');
    if (latestOtpMsg) {
      const elapsed = Math.floor((Date.now() - new Date(latestOtpMsg.created_at).getTime()) / 1000);
      if (elapsed >= 0 && elapsed < 600) {
        setOtpCooldown(600 - elapsed);
      } else {
        setOtpCooldown(0);
      }
    }
  }, [chatMessages]);

  // Countdown timer effect
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatRoom) return;
    const text = inputText;
    setInputText('');
    await sendMessage(chatRoom.id, text, 'text');
  };

  // Depositor sends OTP via chat (with 10-minute cooldown)
  const handleSendOtp = async () => {
    if (!chatRoom || !selectedLocker?.item?.transactionId) return;
    if (otpCooldown > 0) {
      toast.error(`กรุณารอ ${formatTime(otpCooldown)} ก่อนส่ง OTP อีกครั้ง`);
      return;
    }
    setSendingOtp(true);

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000);
      const otpToSend = String(generatedOtp);
      const generatedAt = new Date();

      const lockerId = chatRoom?.locker_id || selectedLocker?.id;
      if (lockerId) {
        mqttPublish?.(`lostreturn/locker/${lockerId}/command`, JSON.stringify({ otp: otpToSend }));
      }

      await supabase
        .from('locker_transactions')
        .update({
          otp: otpToSend,
          otp_generated_at: generatedAt.toISOString()
        })
        .eq('id', selectedLocker.item.transactionId);

      await sendMessage(chatRoom.id, `รหัส OTP สำหรับเปิดตู้: ${otpToSend}`, 'otp_sent');
      setOtpCooldown(600);
      toast.success('ส่งรหัส OTP ให้ผู้รับแล้ว!');
    } catch (err) {
      console.error('Error sending OTP:', err);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSendingOtp(false);
    }
  };

  // Receiver: Automatically sync OTP from chat messages as soon as received without requiring "Unlock Locker" click
  useEffect(() => {
    if (isDepositor) return;
    const latestOtpMsg = [...chatMessages].reverse().find(m => m.message_type === 'otp_sent');
    if (latestOtpMsg) {
      const otpMatch = latestOtpMsg.content.match(/\d{6}/);
      if (otpMatch) {
        const otpNum = parseInt(otpMatch[0]);
        const sentAt = new Date(latestOtpMsg.created_at);
        const elapsed = Math.floor((Date.now() - sentAt.getTime()) / 1000);
        if (elapsed >= 0 && elapsed < 600) {
          setOtp(otpNum);
          setOtpGeneratedAt(sentAt);
          const targetLockerId = selectedLocker?.id || chatRoom?.locker_id;
          if (targetLockerId) {
            try {
              localStorage.setItem('smart_locker_verified_session', JSON.stringify({
                lockerId: targetLockerId,
                otp: otpNum,
                otpGeneratedAt: sentAt.toISOString(),
                userRole: 'receiver',
                view: 'dashboard'
              }));
            } catch {}
            setLockers(prev => prev.map(l => 
              l.id === targetLockerId && l.item
                ? { ...l, item: { ...l.item, otp: otpNum } }
                : l
            ));
          }
        }
      }
    }
  }, [chatMessages, isDepositor, selectedLocker?.id, chatRoom?.locker_id, setOtp, setOtpGeneratedAt, setLockers]);

  const handleReceiveOtp = (otpString: string) => {
    const latestOtpMsg = [...chatMessages].reverse().find(m => m.message_type === 'otp_sent');
    const sentAt = latestOtpMsg ? new Date(latestOtpMsg.created_at) : new Date();
    const otpMatch = otpString.match(/\d{6}/);
    if (otpMatch) {
      const otpNum = parseInt(otpMatch[0]);
      setOtp(otpNum);
      setOtpGeneratedAt(sentAt);
      const targetLockerId = selectedLocker?.id || chatRoom?.locker_id;
      if (targetLockerId) {
        try {
          localStorage.setItem('smart_locker_verified_session', JSON.stringify({
            lockerId: targetLockerId,
            otp: otpNum,
            otpGeneratedAt: sentAt.toISOString(),
            userRole: 'receiver',
            view: 'dashboard'
          }));
        } catch {}
        setLockers(prev => prev.map(l => 
          l.id === targetLockerId && l.item
            ? { ...l, item: { ...l.item, otp: otpNum } }
            : l
        ));
      }
      toast.success('ได้รับ OTP แล้ว! ไปกรอกรหัสที่ตู้ล็อกเกอร์');
      setUserRole?.('receiver');
      setView('dashboard');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 bg-white/85 backdrop-blur-2xl">
        <button onClick={() => setView('chat_list')} className="text-zinc-600 hover:text-zinc-800 p-1 rounded-full cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-zinc-800">{otherUserName}</h3>
          <p className="text-[10px] text-zinc-500 font-normal">ตู้ #{String(chatRoom?.locker_id || selectedLocker?.id || 0).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Depositor: Send OTP button with 10-min countdown */}
      {isDepositor && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 backdrop-blur-md">
          <button
            onClick={handleSendOtp}
            disabled={sendingOtp || otpCooldown > 0}
            className={`w-full py-2.5 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs sm:text-sm active:scale-[0.98] ${
              otpCooldown > 0
                ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed shadow-none border border-zinc-300'
                : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 shadow-amber-500/20 hover:shadow-amber-400/30 cursor-pointer disabled:opacity-40'
            }`}
          >
            {sendingOtp ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
            ) : (
              <KeyRound className="w-4 h-4 stroke-[2.2]" />
            )}
            <span>
              {otpCooldown > 0 
                ? `Send OTP to Receiver (เหลือ ${formatTime(otpCooldown)})` 
                : 'Send OTP to Receiver'}
            </span>
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
        {chatMessages.length === 0 && (
          <div className="text-center py-16 text-zinc-400 text-xs sm:text-sm space-y-2 font-normal">
            <MessageSquare className="w-8 h-8 mx-auto text-zinc-300" />
            <p>เริ่มพูดคุยกันได้เลย</p>
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
                  <div className={`w-full max-w-[290px] ${isMe ? 'ml-auto' : ''}`}>
                    <div className="backdrop-blur-2xl bg-white border border-amber-300 rounded-3xl p-4 shadow-sm">
                      <p className="text-center text-xs font-semibold text-amber-800 mb-2.5">รหัส OTP ของคุณ</p>
                      <div className="flex justify-center gap-1.5 mb-3">
                        {otpDigits.map((digit, i) => (
                          <div key={i} className="w-9 h-11 border border-amber-300 rounded-xl flex items-center justify-center bg-amber-50 shadow-inner">
                            <span className="text-lg font-semibold text-amber-800">{digit}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(otpCode);
                          toast.success('คัดลอกรหัส OTP แล้ว!');
                        }}
                        className="w-full py-2 bg-amber-50 border border-amber-200 text-amber-800 font-medium rounded-xl flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all text-xs cursor-pointer shadow-sm"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy OTP</span>
                      </button>
                      {!isDepositor && otpCode && (
                        <button
                          onClick={() => handleReceiveOtp(otpCode)}
                          className="w-full mt-2 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:shadow-amber-400/30 transition-all text-xs cursor-pointer active:scale-[0.98]"
                        >
                          <Unlock className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Unlock Locker</span>
                        </button>
                      )}
                      <p className="text-center text-[10px] text-zinc-400 mt-2 font-normal">รหัสจะหมดอายุใน 10 นาที</p>
                    </div>
                  </div>
                );
              })() : (
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-amber-100/90 border border-amber-200 text-zinc-900 font-medium rounded-tr-sm' 
                    : 'backdrop-blur-md bg-white border border-zinc-200 text-zinc-800 font-normal rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-zinc-200 bg-white/85 backdrop-blur-2xl">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 px-4 py-2.5 rounded-full border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900 text-xs sm:text-sm font-normal transition-all shadow-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 flex items-center justify-center shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <Send className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
};

// OTP Display View Component (Luxury Light Mode)
const OtpDisplayView = ({ 
  otp, 
  selectedLocker, 
  setView,
  otpTimeLeft
}: {
  otp: number;
  selectedLocker: Locker | null;
  setView: (view: ViewType) => void;
  handleGoHome: () => void;
  otpTimeLeft: number;
}) => {
  const otpString = String(otp).padStart(6, '0');
  const [copied, setCopied] = useState(false);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const handleCopyOtp = async () => {
    try {
      await navigator.clipboard.writeText(otpString);
      setCopied(true);
      toast.success('คัดลอกรหัส OTP แล้ว!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('ไม่สามารถคัดลอกได้');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md backdrop-blur-2xl bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200 text-center animate-scale-in relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle className="w-8 h-8 text-amber-600" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mb-1">ยืนยันสำเร็จ!</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mb-6 font-normal leading-relaxed">
          OTP สำหรับเปิดตู้หมายเลข <span className="font-semibold text-zinc-700">{String(selectedLocker?.id).padStart(2, '0')}</span>
        </p>

        {/* OTP Display */}
        <div className="backdrop-blur-md bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 mb-5">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-3">รหัส OTP ของคุณ</p>
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-4">
            {otpString.split('').map((digit, index) => (
              <div
                key={index}
                className="w-11 h-13 sm:w-12 sm:h-14 bg-white border border-amber-300 rounded-xl flex items-center justify-center text-2xl font-semibold text-amber-800 shadow-sm"
              >
                {digit}
              </div>
            ))}
          </div>
          
          {/* Copy Button */}
          <button
            onClick={handleCopyOtp}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer shadow-sm ${
              copied 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' 
                : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-600" />
                <span>Copy OTP</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-rose-600 font-medium mt-3">รหัสจะหมดอายุใน {formatTime(otpTimeLeft)} นาที</p>
        </div>

        {/* Instructions */}
        <div className="backdrop-blur-md bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-6 text-left">
          <h4 className="font-semibold text-zinc-900 text-xs sm:text-sm">ขั้นตอนถัดไป</h4>
          <ol className="text-xs text-zinc-600 mt-1.5 space-y-1.5 font-normal leading-relaxed">
            <li>1. กลับไปที่หน้ารับของ</li>
            <li>2. กรอกรหัส OTP ที่ช่องบนตู้ที่มีของ</li>
            <li>3. ตู้จะปลดล็อกอัตโนมัติ</li>
          </ol>
        </div>

        <button
          onClick={() => {
            setView('dashboard');
            try {
              const raw = localStorage.getItem('smart_locker_verified_session');
              if (raw) {
                const parsed = JSON.parse(raw);
                localStorage.setItem('smart_locker_verified_session', JSON.stringify({ ...parsed, view: 'dashboard' }));
              }
            } catch {}
          }}
          className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.98]"
        >
          <span>Back to Pickup</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// OTP View Component (Luxury Light Mode)
const OtpView = ({ 
  otp, 
  selectedLocker, 
  setLockers, 
  lockers, 
  setView, 
  resetState,
  markAsCollected,
  otpTimeLeft,
  otpGeneratedAt,
  mqttPublish,
  currentUser,
  currentUserId,
}: {
  otp: number;
  selectedLocker: Locker | null;
  setLockers: (lockers: Locker[]) => void;
  lockers: Locker[];
  setView: (view: ViewType) => void;
  resetState: () => void;
  markAsCollected: (transactionId: string) => Promise<boolean>;
  otpTimeLeft: number;
  otpGeneratedAt: Date | null;
  mqttPublish?: (topic: string, payload: string) => void;
  currentUser: UserData | null;
  currentUserId?: string;
}) => {
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otpInput];
    newOtp[index] = value.slice(-1);
    setOtpInput(newOtp);
    setError('');

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

    if (otpGeneratedAt) {
      const elapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
      if (elapsed >= 600) {
        setError('รหัส OTP หมดอายุแล้ว');
        return;
      }
    }

    setIsUnlocking(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    let otpMatch = enteredOtp === String(otp);
    let transactionId = selectedLocker?.item?.transactionId;

    if (!otpMatch && transactionId) {
      const { data: txn } = await supabase
        .from('locker_transactions')
        .select('otp')
        .eq('id', transactionId)
        .single();
      if (txn?.otp && enteredOtp === txn.otp) {
        otpMatch = true;
      }
    }

    if (otpMatch) {
      if (transactionId) {
        const collectorUserId = currentUserId || currentUser?.id || null;
        const collectorName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : null);
        const collectorContact = currentUser?.phone || currentUser?.email || null;

        const { error: updateError } = await supabase
          .from('locker_transactions')
          .update({
            otp: enteredOtp,
            otp_generated_at: otpGeneratedAt ? otpGeneratedAt.toISOString() : new Date().toISOString(),
            status: 'collected',
            collected_at: new Date().toISOString(),
            collector_user_id: collectorUserId,
            collector_name: collectorName,
            collector_contact: collectorContact
          })
          .eq('id', transactionId);
        if (updateError) console.error('Error updating OTP:', updateError);
      }

      if (selectedLocker) {
        const lockerIdNum = Number(selectedLocker.id);
        if (!isNaN(lockerIdNum)) {
          mqttPublish?.(`lostreturn/locker/${lockerIdNum}/command`, 'OPEN');
        }
      }

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

    setLockers(lockers.map(l => l.id === selectedLocker?.id ? { ...l, status: 'available' as const, item: null } : l));
    toast.success('รับของสำเร็จ!');
    resetState();
  };

  if (unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 relative overflow-hidden">
        <div className="w-full max-w-md backdrop-blur-2xl bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200 text-center animate-scale-in relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
            <Unlock className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-800 mb-1">ตู้เปิดแล้ว!</h2>
          <p className="text-xs sm:text-sm text-zinc-500 mb-6 font-normal">
            ตู้ล็อกเกอร์หมายเลข {String(selectedLocker?.id).padStart(2, '0')} ปลดล็อกเรียบร้อย<br />
            กรุณาหยิบของและปิดตู้
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-6">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-left text-emerald-800 font-medium">ตู้จะล็อกอัตโนมัติหลังจากปิดประตู</p>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.98]"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 relative overflow-hidden">
      <div className="w-full max-w-md backdrop-blur-2xl bg-white/95 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200 text-center animate-scale-in relative z-10">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-sm">
          <KeyRound className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mb-1">กรอกรหัส OTP</h2>
        <p className="text-xs sm:text-sm text-zinc-500 mb-6 font-normal leading-relaxed">
          กรอกรหัส 6 หลักเพื่อเปิดตู้ล็อกเกอร์หมายเลข <span className="font-semibold text-zinc-700">#{String(selectedLocker?.id).padStart(2, '0')}</span>
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
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl border transition-all ${
                error 
                  ? 'border-rose-400 bg-rose-50 text-rose-700 focus:outline-none focus:ring-0 focus:shadow-none focus:border-rose-500' 
                  : digit 
                  ? 'border-zinc-900 bg-zinc-50 text-zinc-900 shadow-sm focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900' 
                  : 'border-zinc-300 bg-white text-zinc-800 focus:outline-none focus:ring-0 focus:shadow-none focus:border-zinc-900'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-rose-600 text-xs mb-4 flex items-center justify-center gap-1.5 font-normal">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}

        <p className="text-xs text-rose-600 font-medium mb-5">รหัสจะหมดอายุใน {formatTime(otpTimeLeft)} นาที</p>

        <button
          onClick={handleUnlock}
          disabled={isUnlocking || otpInput.some(d => !d)}
          className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-900 font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm cursor-pointer active:scale-[0.98]"
        >
          {isUnlocking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
              <span>กำลังปลดล็อก...</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4 stroke-[2.2]" />
              <span>Unlock Locker</span>
            </>
          )}
        </button>

        <button
          onClick={() => setView('verify')}
          className="w-full mt-3 py-2 text-zinc-500 text-xs hover:text-zinc-800 transition-colors cursor-pointer font-normal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// Profile View Component (Luxury Light Mode)
const ProfileView = ({ 
  currentUser, 
  setCurrentUser, 
  handleGoHome, 
  handleLogout,
  refreshProfile 
}: {
  currentUser: UserData | null;
  setCurrentUser: (user: UserData) => void;
  handleGoHome: () => void;
  handleLogout: () => void;
  refreshProfile?: () => Promise<void> | void;
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    type: currentUser?.type || 'general',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    studentId: currentUser?.studentId || '',
    profileImage: currentUser?.profileImage || null
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        type: currentUser.type || 'general',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        studentId: currentUser.studentId || '',
        profileImage: currentUser.profileImage || null
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let avatarUrl = formData.profileImage;

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
          username: formData.name,
          phone: formData.phone,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      await refreshProfile?.();
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
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      <button
        onClick={handleGoHome}
        className="mb-4 text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <div className="backdrop-blur-2xl bg-white/95 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-zinc-200">
        {/* Cover with profile info */}
        <div className="bg-gradient-to-br from-amber-100/40 via-yellow-50 to-transparent border-b border-zinc-200 pb-8 pt-8 px-6">
          <div className="flex flex-col items-center text-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white border-2 border-amber-300 shadow-md overflow-hidden flex items-center justify-center">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-semibold text-amber-700">{formData.name.charAt(0)}</span>
                )}
              </div>
              {editMode && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg text-zinc-900">
                  <Camera className="w-4 h-4" />
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
                  className="text-lg font-semibold text-zinc-800 border-b border-amber-500 focus:outline-none bg-transparent w-full mb-1 text-center"
                />
              ) : (
                <h2 className="text-lg sm:text-xl font-semibold text-zinc-800">{formData.name}</h2>
              )}
              <div className="flex items-center justify-center gap-1.5 text-zinc-500 mt-0.5 text-xs font-normal">
                {formData.type === 'student' ? <GraduationCap className="w-3.5 h-3.5 text-amber-600" /> : <Users className="w-3.5 h-3.5 text-amber-600" />}
                <span className="capitalize">{formData.type} Account</span>
              </div>
            </div>

            <button
              onClick={() => editMode ? handleSave() : setEditMode(true)}
              className={`px-5 py-1.5 rounded-full font-medium text-xs transition-all shadow-sm cursor-pointer mt-1 ${
                editMode 
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200'
              }`}
            >
              {editMode ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          {/* Info Fields */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
              <Mail className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-[10px] text-zinc-400 font-normal">อีเมล</p>
                <p className="font-medium text-xs sm:text-sm text-zinc-800">{formData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
              <Phone className="w-4 h-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-[10px] text-zinc-400 font-normal">เบอร์โทรศัพท์</p>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-transparent focus:outline-none w-full font-medium text-xs sm:text-sm text-zinc-800 border-b border-amber-400"
                  />
                ) : (
                  <p className="font-medium text-xs sm:text-sm text-zinc-800">{formData.phone || '-'}</p>
                )}
              </div>
            </div>
            {formData.type === 'student' && (
              <div className="flex items-center gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-[10px] text-zinc-400 font-normal">รหัสนักศึกษา</p>
                  <p className="font-medium text-xs sm:text-sm text-zinc-800">{formData.studentId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-4 border-t border-zinc-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-rose-700 hover:bg-rose-100 py-3 rounded-xl font-medium text-xs sm:text-sm border border-rose-200 bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat List View Component (Luxury Light Mode)
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
          nameMap[room.id] = profile?.username || profile?.full_name || 'ผู้ใช้';
        });
        setOtherNames(nameMap);
      }
    };

    fetchNames();
  }, [chatRooms, currentUserId]);

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
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      <button
        onClick={() => setView('home')}
        className="mb-4 text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-800 mb-6">ข้อความของคุณ</h2>

      <div className="space-y-3">
        {/* Admin Chat Entry - only for non-admin users */}
        {!isAdmin && (
          <button
            onClick={() => router.push('/contact-admin?from=inbox')}
            className="w-full backdrop-blur-xl bg-white p-4 rounded-2xl shadow-sm border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex gap-3.5 items-center group text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-zinc-900 shadow-md shadow-amber-500/20 shrink-0">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-zinc-800 truncate">
                  Admin
                </h3>
                <div className="flex items-center gap-2">
                  {lastAdminMessage && (
                    <span className="text-[10px] text-zinc-400 flex-shrink-0 font-normal">
                      {new Date(lastAdminMessage.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {adminUnreadCount > 0 && (
                    <span className="w-5 h-5 bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 text-[10px] rounded-full flex items-center justify-center font-semibold flex-shrink-0 shadow-sm">
                      {adminUnreadCount}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs truncate text-zinc-500 mt-0.5 font-normal">
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
              className="w-full backdrop-blur-xl bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 hover:border-amber-400/60 hover:shadow-md transition-all cursor-pointer flex gap-3.5 items-center group text-left"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-semibold shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-zinc-800 truncate">
                    {displayName}
                  </h3>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0 font-normal">
                    {new Date(room.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs truncate text-zinc-500 mt-0.5 font-normal">
                  ตู้ #{String(room.locker_id).padStart(2, '0')}
                </p>
              </div>
            </button>
          );
        })}

        {chatRooms.length === 0 && isAdmin && (
          <div className="text-center py-16 space-y-2">
            <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="text-zinc-400 text-xs font-normal">ยังไม่มีข้อความ</p>
          </div>
        )}
      </div>
    </div>
  );
};


interface VerifiedLockerSession {
  lockerId: number;
  otp: number;
  otpGeneratedAt: string;
  userRole: 'receiver';
  view: ViewType;
  remaining: number;
}

const getActiveVerifiedSession = (): VerifiedLockerSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('smart_locker_verified_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.otp || !session.otpGeneratedAt || !session.lockerId) return null;
    const elapsed = Math.floor((Date.now() - new Date(session.otpGeneratedAt).getTime()) / 1000);
    if (elapsed < 600) {
      return { ...session, remaining: 600 - elapsed };
    } else {
      localStorage.removeItem('smart_locker_verified_session');
      return null;
    }
  } catch {
    return null;
  }
};

// Main App Component Content
function SmartLockerContent() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { isAdmin } = useAdmin(user?.id);
  const { createDeposit, markAsCollected } = useLockerTransactions();
  const { rooms: chatRooms, messages: chatMessages, activeRoomId, setActiveRoomId, clearActiveRoom, getOrCreateRoom, sendMessage, totalUnread, markRoomAsRead } = useChatContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [chatIsDepositor, setChatIsDepositor] = useState(false);
  const [view, setView] = useState<ViewType>(() => {
    const tab = searchParams?.get('tab');
    const mode = searchParams?.get('mode');
    const viewParam = searchParams?.get('view');
    if (tab === 'deposit' || mode === 'deposit' || viewParam === 'deposit') return 'dashboard';
    if (tab === 'claim' || tab === 'receive' || mode === 'claim' || mode === 'receiver' || viewParam === 'claim') return 'dashboard';
    if (viewParam === 'chat_list') return 'chat_list';
    if (viewParam === 'profile') return 'profile';
    return (pathname.includes('/contact-admin') || searchParams?.get('chat') === 'true') ? 'chat' : 'home';
  });
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<'finder' | 'receiver'>(() => {
    const tab = searchParams?.get('tab');
    const mode = searchParams?.get('mode');
    const role = searchParams?.get('role');
    if (tab === 'claim' || tab === 'receive' || mode === 'claim' || mode === 'receiver' || role === 'receiver') return 'receiver';
    return 'finder';
  });
  const [lockers, setLockers] = useState<Locker[]>(initialLockers);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [otp, setOtp] = useState<number>(0);
  const [otpGeneratedAt, setOtpGeneratedAt] = useState<Date | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState<number>(0);

  // Restore active view & OTP session on client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    // 1. Priority 1: Active verified OTP session (< 10 mins)
    const activeSession = getActiveVerifiedSession();
    if (activeSession) {
      setUserRole('receiver');
      setView(activeSession.view === 'otp_display' ? 'otp_display' : 'dashboard');
      setOtp(activeSession.otp);
      setOtpGeneratedAt(new Date(activeSession.otpGeneratedAt));
      setOtpTimeLeft(activeSession.remaining);
      setLockers(prev => prev.map(l => {
        if (l.id === activeSession.lockerId && l.item) {
          const updated = { ...l, item: { ...l.item, otp: activeSession.otp } };
          setSelectedLocker(updated);
          return updated;
        }
        return l;
      }));
      return;
    }

    // 2. Priority 2: URL Search Params
    const tab = searchParams?.get('tab');
    const mode = searchParams?.get('mode');
    const role = searchParams?.get('role');
    const viewParam = searchParams?.get('view');
    if (tab || mode || role || viewParam) {
      if (tab === 'deposit' || mode === 'deposit' || viewParam === 'deposit') {
        setUserRole('finder');
        setView('dashboard');
        return;
      }
      if (tab === 'claim' || tab === 'receive' || mode === 'claim' || mode === 'receiver' || role === 'receiver' || viewParam === 'claim') {
        setUserRole('receiver');
        setView('dashboard');
        return;
      }
      if (viewParam === 'chat_list') {
        setView('chat_list');
        return;
      }
      if (viewParam === 'profile') {
        setView('profile');
        return;
      }
    }

    // 3. Priority 3: Persisted Navigation State across page refresh
    try {
      const raw = sessionStorage.getItem('smart_locker_nav_state');
      if (raw) {
        const nav = JSON.parse(raw);
        if (nav && nav.view && nav.view !== 'home') {
          setUserRole(nav.userRole || 'finder');
          setView(nav.view);
          if (nav.selectedLockerId) {
            setLockers(prev => {
              const target = prev.find(l => l.id === nav.selectedLockerId);
              if (target) setSelectedLocker(target);
              return prev;
            });
          }
          if (nav.activeRoomId) {
            setActiveRoomId(nav.activeRoomId);
          }
        }
      }
    } catch {}
  }, []);

  // Save current view and role to sessionStorage on navigation change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (view === 'home') {
        sessionStorage.removeItem('smart_locker_nav_state');
      } else {
        sessionStorage.setItem('smart_locker_nav_state', JSON.stringify({
          view,
          userRole,
          selectedLockerId: selectedLocker?.id || null,
          activeRoomId: activeRoomId || null,
        }));
      }
    } catch {}
  }, [view, userRole, selectedLocker?.id, activeRoomId]);

  // Sync view and role from searchParams
  useEffect(() => {
    const tab = searchParams?.get('tab');
    const mode = searchParams?.get('mode');
    const role = searchParams?.get('role');
    const viewParam = searchParams?.get('view');
    if (tab === 'deposit' || mode === 'deposit' || viewParam === 'deposit') {
      setUserRole('finder');
      setView('dashboard');
    } else if (tab === 'claim' || tab === 'receive' || mode === 'claim' || mode === 'receiver' || role === 'receiver' || viewParam === 'claim') {
      setUserRole('receiver');
      setView('dashboard');
    }
  }, [searchParams]);
  
  // Timer useEffect for Pickup OTP timeout
  useEffect(() => {
    if (!otpGeneratedAt) return;

    const initialElapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
    const initialRemaining = Math.max(0, 600 - initialElapsed);
    setOtpTimeLeft(initialRemaining);

    if (initialRemaining <= 0) {
      setOtpTimeLeft(0);
      setOtp(0);
      setOtpGeneratedAt(null);
      try {
        localStorage.removeItem('smart_locker_verified_session');
      } catch {}
      setLockers(prev => prev.map(l => l.item ? { ...l, item: { ...l.item, otp: undefined } } : l));
      toast.error('รหัส OTP หมดอายุแล้ว กรุณาตอบคำถามยืนยันสิทธิ์อีกครั้ง');
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
      const remaining = 600 - elapsed;
      if (remaining <= 0) {
        setOtpTimeLeft(0);
        clearInterval(interval);
        setOtp(0);
        setOtpGeneratedAt(null);
        try {
          localStorage.removeItem('smart_locker_verified_session');
        } catch {}
        setLockers(prev => prev.map(l => l.item ? { ...l, item: { ...l.item, otp: undefined } } : l));
        toast.error('รหัส OTP หมดอายุแล้ว กรุณาตอบคำถามยืนยันสิทธิ์อีกครั้ง');
        setVerifyAttempts(0);
        setVerifyAnswer('');
      } else {
        setOtpTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [otpGeneratedAt]);

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

  const mqttRef = useRef<import('mqtt').MqttClient | null>(null);

  // Sync verifyAttempts when selectedLocker changes or on mount
  useEffect(() => {
    if (!selectedLocker) {
      setVerifyAttempts(0);
      setAiMessage(null);
      return;
    }
    const key = getVerifyAttemptsKey(selectedLocker);
    if (!key) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setVerifyAttempts(parsed);
          if (parsed >= MAX_VERIFY_ATTEMPTS) {
            setAiMessage({ type: 'error', text: `ตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝากผ่านแชท` });
          } else {
            setAiMessage({ type: 'error', text: `คำตอบไม่ถูกต้อง (เหลือ ${MAX_VERIFY_ATTEMPTS - parsed} ครั้ง)` });
          }
          return;
        }
      }
    } catch {}
  }, [selectedLocker?.id, selectedLocker?.item?.transactionId, view]);

  // Keep selectedLocker in sync with latest lockers data from database
  useEffect(() => {
    if (!selectedLocker) return;
    const fresh = lockers.find(l => l.id === selectedLocker.id);
    if (fresh && fresh.item) {
      if (
        !selectedLocker.item ||
        selectedLocker.item.name !== fresh.item.name ||
        selectedLocker.item.image !== fresh.item.image ||
        selectedLocker.item.question !== fresh.item.question ||
        selectedLocker.item.answer !== fresh.item.answer ||
        selectedLocker.item.transactionId !== fresh.item.transactionId ||
        selectedLocker.item.otp !== fresh.item.otp
      ) {
        setSelectedLocker(fresh);
      }
    }
  }, [lockers, selectedLocker?.id]);

  useEffect(() => {
    if (view !== 'chat') {
      clearActiveRoom();
    }
  }, [view, clearActiveRoom]);

  // Sync lockers with database transactions
  useEffect(() => {
    const syncLockersWithDB = async () => {
      const { data: transactions } = await supabase
        .from('locker_transactions')
        .select('*')
        .eq('status', 'deposited')
        .order('created_at', { ascending: false });

      const latestByLocker: { [key: number]: any } = {};
      if (transactions) {
        for (const t of transactions) {
          if (!latestByLocker[t.locker_id]) {
            latestByLocker[t.locker_id] = t;
          }
        }
      }

      const activeSession = getActiveVerifiedSession();

      let savedLockerId: number | null = null;
      try {
        const raw = sessionStorage.getItem('smart_locker_nav_state');
        if (raw) {
          const nav = JSON.parse(raw);
          if (nav?.selectedLockerId) savedLockerId = nav.selectedLockerId;
        }
      } catch {}

      setLockers(prev => prev.map(locker => {
        const transaction = latestByLocker[locker.id];
        if (transaction) {
          const activeOtp = (activeSession && activeSession.lockerId === locker.id)
            ? activeSession.otp
            : undefined;

          const depDate = new Date(transaction.deposited_at);
          const formattedThaiDate = !isNaN(depDate.getTime())
            ? `${depDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${depDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
            : transaction.deposited_at;

          const updatedLocker = {
            ...locker,
            status: 'occupied' as const,
            item: {
              name: transaction.item_description,
              image: transaction.image_url || '',
              date: formattedThaiDate,
              depositedAt: transaction.deposited_at,
              finder: transaction.depositor_name,
              question: transaction.security_question || '',
              answer: transaction.security_answer || '',
              transactionId: transaction.id,
              otp: activeOtp
            }
          };

          if (
            (activeSession && activeSession.lockerId === locker.id) ||
            (savedLockerId && savedLockerId === locker.id)
          ) {
            setSelectedLocker(updatedLocker);
          }

          return updatedLocker;
        }
        if (locker.status === 'occupied') {
          return { ...locker, status: 'available' as const, item: null };
        }
        return locker;
      }));
    };

    syncLockersWithDB();

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

  const mqttPublish = useCallback((topic: string, payload: string) => {
    if (mqttRef.current?.connected) {
      mqttRef.current.publish(topic, payload, { qos: 1 });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
    if (!brokerUrl) {
      console.warn('[MQTT] NEXT_PUBLIC_MQTT_BROKER_URL is not set — skipping connection.');
      return;
    }

    let client: import('mqtt').MqttClient | null = null;
    let isUnmounted = false;

    import('mqtt').then((mqttModule) => {
      if (isUnmounted) return;

      const connectFn = mqttModule.connect || (mqttModule.default && mqttModule.default.connect);
      if (!connectFn) {
        console.error('[MQTT] Could not find connect function in module', mqttModule);
        return;
      }
      client = connectFn(brokerUrl, {
        clientId: `lostreturn-web-${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
      });

      if (isUnmounted) {
        client.end(true);
        return;
      }

      mqttRef.current = client;

      client.on('connect', () => {
        if (isUnmounted || !client || !client.connected) return;
        console.log('[MQTT] Connected to', brokerUrl);

        client.subscribe('lostreturn/locker/+/status', { qos: 1 }, (err) => {
          if (err) {
            const errMsg = (err.message || String(err)).toLowerCase();
            if (isUnmounted || !client || !client.connected || errMsg.includes('closed') || errMsg.includes('closing')) {
              return;
            }
            console.error('[MQTT] Subscribe error:', err);
          }
        });
      });

      client.on('message', (topic, message) => {
        if (isUnmounted) return;

        const parts = topic.split('/');
        const lockerId = Number(parts[2]);
        const payload = message.toString().trim().toUpperCase();

        if (!lockerId || isNaN(lockerId)) return;

        console.log(`[MQTT] ${topic} → ${payload}`);

        setLockers(prev => prev.map(l => {
          if (l.id !== lockerId) return l;
          if (payload === 'ITEM_DEPOSITED') {
            if (l.status === 'available') {
              return { ...l, status: 'occupied' as const };
            }
          } else if (payload === 'EMPTY') {
            return { ...l, status: 'available' as const, item: null };
          }
          return l;
        }));
      });

      client.on('error', (err: any) => {
        if (isUnmounted) return;
        const errMsg = (err?.message || String(err)).toLowerCase();
        if (errMsg.includes('closed') || errMsg.includes('closing')) return;
        console.error('[MQTT] Error:', err);
      });

      client.on('reconnect', () => {
        if (isUnmounted) return;
        console.log('[MQTT] Reconnecting...');
      });
    }).catch((err) => {
      if (!isUnmounted) {
        console.error('[MQTT] Import failed:', err);
      }
    });

    return () => {
      isUnmounted = true;
      if (client) {
        client.end(true);
        client = null;
      }
      if (mqttRef.current) {
        mqttRef.current.end(true);
        mqttRef.current = null;
      }
    };
  }, []);

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
        id: user.id,
        name: profile?.username || profile?.full_name || user.email?.split('@')[0] || 'ผู้ใช้',
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
    try {
      sessionStorage.removeItem('smart_locker_nav_state');
    } catch {}
    setCurrentUser(null);
    setView('home');
    toast.success('ออกจากระบบสำเร็จ');
  };

  const handleGoHome = () => {
    try {
      sessionStorage.removeItem('smart_locker_nav_state');
    } catch {}
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
      const result = await createDeposit({
        locker_id: selectedLocker.id,
        item_description: depositForm.name,
        depositor_name: currentUser?.name || 'Unknown',
        depositor_contact: profile?.phone || currentUser?.phone || user?.email || '',
        security_question: depositForm.question,
        security_answer: depositForm.answer,
        user_id: user?.id,
        image_base64: depositForm.image
      });

      if (result) {
        const now = new Date();
        const formattedNow = `${now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

        setLockers(lockers.map(l => 
          l.id === selectedLocker.id 
            ? { 
                ...l, 
                status: 'occupied' as const, 
                item: { 
                  name: depositForm.name, 
                  image: result.image_url || depositForm.image || '',
                  date: formattedNow, 
                  depositedAt: now.toISOString(),
                  finder: currentUser?.name || 'Unknown',
                  question: depositForm.question,
                  answer: depositForm.answer,
                  transactionId: result.id,
                  otp: undefined
                } 
              } 
            : l
        ));
        const lockerIdNum = Number(selectedLocker.id);
        if (!isNaN(lockerIdNum)) {
          mqttPublish(`lostreturn/locker/${lockerIdNum}/command`, 'OPEN');
        }
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

      if (!data.isMatch && data.reason) {
        setVerifyAnswer('');
        const newAttempts = verifyAttempts + 1;
        setVerifyAttempts(newAttempts);
        const key = getVerifyAttemptsKey(selectedLocker);
        if (key) {
          try {
            localStorage.setItem(key, String(newAttempts));
          } catch {}
        }
        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
          setAiMessage({ type: 'error', text: `ตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝากผ่านแชท` });
          toast.error(`ตอบผิดครบ ${MAX_VERIFY_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝาก`);
        } else {
          setAiMessage({ type: 'error', text: data.reason || `คำตอบไม่ถูกต้อง (เหลือ ${MAX_VERIFY_ATTEMPTS - newAttempts} ครั้ง)` });
        }
        return;
      }

      if (data.isMatch) {
        const key = getVerifyAttemptsKey(selectedLocker);
        if (key) {
          try {
            localStorage.removeItem(key);
          } catch {}
        }
        const generatedOtp = Math.floor(100000 + Math.random() * 900000);
        const now = new Date();
        if (selectedLocker) {
          mqttPublish(`lostreturn/locker/${selectedLocker.id}/command`, JSON.stringify({ otp: String(generatedOtp) }));
          try {
            localStorage.setItem('smart_locker_verified_session', JSON.stringify({
              lockerId: selectedLocker.id,
              otp: generatedOtp,
              otpGeneratedAt: now.toISOString(),
              userRole: 'receiver',
              view: 'otp_display'
            }));
          } catch {}
        }
        setLockers(lockers.map(l => 
          l.id === selectedLocker.id && l.item
            ? { ...l, item: { ...l.item, otp: generatedOtp } }
            : l
        ));
        setOtp(generatedOtp);
        setOtpGeneratedAt(now);
        setOtpTimeLeft(600);
        toast.success('คำตอบถูกต้อง! กำลังนำไปยังรหัสเปิดตู้...');
        setTimeout(() => {
          setView('otp_display');
        }, 800);
      } else {
        setVerifyAnswer('');
        const newAttempts = verifyAttempts + 1;
        setVerifyAttempts(newAttempts);
        const key = getVerifyAttemptsKey(selectedLocker);
        if (key) {
          try {
            localStorage.setItem(key, String(newAttempts));
          } catch {}
        }
        if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
          toast.error('ตอบคำถามครบกำหนด กรุณาแชทกับผู้ฝาก');
        } else {
          toast.error(`คำตอบไม่ถูกต้อง (เหลือโอกาสตอบอีก ${MAX_VERIFY_ATTEMPTS - newAttempts} ครั้ง)`);
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
    try {
      localStorage.removeItem('smart_locker_verified_session');
      sessionStorage.removeItem('smart_locker_nav_state');
      const key = getVerifyAttemptsKey(selectedLocker);
      if (key) localStorage.removeItem(key);
    } catch {}
    setView('home');
    setSelectedLocker(null);
    setOtp(0);
    setOtpGeneratedAt(null);
    setOtpTimeLeft(0);
    setVerifyAnswer('');
    setVerifyAttempts(0);
    setAiMessage(null);
    setDepositForm({ name: '', image: null, question: '', answer: '' });
  };

  const unreadCount = totalUnread + (isAdmin ? 0 : adminUnreadCount);

  const handleLockerSearchClick = (lockerId: number) => {
    setUserRole('receiver');
    setView('dashboard');
    
    const locker = lockers.find(l => l.id === lockerId);
    if (locker && locker.status === 'occupied') {
      setSelectedLocker(locker);
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
        setUserRole={setUserRole}
        selectedLocker={selectedLocker} 
        setOtp={setOtp} 
        lockers={lockers} 
        setLockers={setLockers}
        chatRoom={activeChatRoom}
        chatMessages={chatMessages}
        sendMessage={sendMessage}
        currentUserId={user?.id}
        isDepositor={chatIsDepositor}
        clearActiveRoom={clearActiveRoom}
        setOtpGeneratedAt={setOtpGeneratedAt}
        mqttPublish={mqttPublish}
        markRoomAsRead={markRoomAsRead}
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
        otpTimeLeft={otpTimeLeft}
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
        otpTimeLeft={otpTimeLeft}
        otpGeneratedAt={otpGeneratedAt}
        mqttPublish={mqttPublish}
        currentUser={currentUser}
        currentUserId={user?.id}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
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
          currentUserId={user?.id}
          onLoginRequired={() => setShowLoginModal(true)}
          markAsCollected={markAsCollected}
          mqttPublish={mqttPublish}
          otpGeneratedAt={otpGeneratedAt}
          otpTimeLeft={otpTimeLeft}
          setOtp={setOtp}
          setOtpGeneratedAt={setOtpGeneratedAt}
          setOtpTimeLeft={setOtpTimeLeft}
          selectedLocker={selectedLocker}
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
      
      {view === 'profile' && (
        <ProfileView 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          handleGoHome={handleGoHome} 
          handleLogout={handleLogout}
          refreshProfile={refreshProfile}
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-zinc-50 text-amber-600 font-medium">กำลังโหลด...</div>}>
      <SmartLockerContent />
    </Suspense>
  );
}