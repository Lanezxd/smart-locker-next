'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Box, Phone, MailCheck, ChevronLeft, RotateCw, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthPage = () => {
  const router = useRouter();
  const { user, signIn, signUp, verifyOtp, resendOtp, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!authLoading && user && step !== 'otp') {
      router.push("/");
    }
  }, [user, authLoading, router, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("เข้าสู่ระบบสำเร็จ!");
          router.push("/");
        }
      } else {
        if (!formData.fullName.trim()) {
          toast.error("กรุณากรอกชื่อ-นามสกุล");
          setLoading(false);
          return;
        }
        if (!formData.phone.trim()) {
          toast.error("กรุณากรอกเบอร์โทร");
          setLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("อีเมลนี้ถูกใช้งานแล้ว");
          } else {
            toast.error(error.message);
          }
        } else {
          setStep('otp');
          setOtpCode('');
          setOtpError('');
          setResendCooldown(60);
          toast.success(`ส่งรหัส OTP 6 หลักไปที่ ${formData.email} แล้ว`);
        }
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
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
      const { data, error } = await verifyOtp(formData.email, otpCode.trim(), 'signup');

      if (error) {
        setOtpError('รหัส OTP ไม่ถูกต้องหรือหมดอายุ');
        setOtpLoading(false);
        return;
      }

      const authUser = data?.user || data?.session?.user;
      if (authUser) {
        const profileData = {
          user_id: authUser.id,
          username: formData.fullName || formData.email.split('@')[0],
          full_name: formData.fullName,
          phone: formData.phone || null,
          updated_at: new Date().toISOString()
        };

        await supabase.from('profiles').upsert(profileData, { onConflict: 'user_id' });

        toast.success('ยืนยันอีเมลและสมัครสมาชิกสำเร็จ! ยินดีต้อนรับ');
        router.push('/');
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
      const { error } = await resendOtp(formData.email, 'signup');
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
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

  const handleBackToForm = () => {
    setStep('form');
    setOtpCode('');
    setOtpError('');
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl gradient-primary shadow-glow">
              <Box className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Lost<span className="text-primary">Return</span>
          </h1>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {step === 'otp' ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary shadow-inner">
                  <MailCheck className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-foreground">ยืนยันอีเมลของคุณ</h2>
                <p className="text-sm text-muted-foreground mt-1.5 px-2">
                  ส่งรหัส OTP 6 หลักไปที่{' '}
                  <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-md break-all">
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
                      <InputOTPSlot index={0} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                      <InputOTPSlot index={1} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                      <InputOTPSlot index={2} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                      <InputOTPSlot index={3} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                      <InputOTPSlot index={4} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                      <InputOTPSlot index={5} className="w-11 h-13 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-border bg-secondary/40 focus:border-primary data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-1.5 text-destructive text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>{otpError}</span>
                  </div>
                )}

                {/* Primary Button */}
                <Button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  {otpLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>ยืนยันรหัส OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {/* Secondary Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>ย้อนกลับไปแก้ไขข้อมูล</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending}
                    className="flex items-center gap-1.5 text-primary hover:underline font-semibold disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'animate-none'}`} />
                    )}
                    <span>
                      {resendCooldown > 0 ? `ส่งรหัสอีกครั้ง (${resendCooldown}s)` : 'ส่งรหัสอีกครั้ง'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-muted rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setStep('form');
                  }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    isLogin
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setStep('form');
                  }}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    !isLogin
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ลงทะเบียน
                </button>
              </div>

              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <p className="text-muted-foreground text-sm mb-5">
                      เข้าสู่ระบบเพื่อใช้งาน
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormField icon={<Mail className="w-5 h-5" />} label="อีเมล">
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => update("email", e.target.value)}
                          className="pl-10"
                          required
                        />
                      </FormField>
                      <FormField icon={<Lock className="w-5 h-5" />} label="รหัสผ่าน">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => update("password", e.target.value)}
                          className="pl-10 pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </FormField>
                      <SubmitButton loading={loading} text="เข้าสู่ระบบ" />
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h2 className="text-lg font-bold text-foreground mb-1">สร้างบัญชีใหม่</h2>
                    <p className="text-muted-foreground text-sm mb-5">กรอกข้อมูลเพื่อเริ่มต้นใช้งาน</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormField icon={<User className="w-5 h-5" />} label="ชื่อ-นามสกุล">
                        <Input
                          type="text"
                          placeholder="ชื่อ นามสกุล"
                          value={formData.fullName}
                          onChange={(e) => update("fullName", e.target.value)}
                          className="pl-10"
                          required
                        />
                      </FormField>


                      <FormField icon={<Phone className="w-5 h-5" />} label="เบอร์โทร">
                        <Input
                          type="tel"
                          placeholder="0xx-xxx-xxxx"
                          value={formData.phone}
                          onChange={(e) => update("phone", e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="pl-10"
                          required
                        />
                      </FormField>

                      <FormField icon={<Mail className="w-5 h-5" />} label="อีเมล">
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) => update("email", e.target.value)}
                          className="pl-10"
                          required
                        />
                      </FormField>

                      <FormField icon={<Lock className="w-5 h-5" />} label="รหัสผ่าน">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => update("password", e.target.value)}
                          className="pl-10 pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </FormField>

                      <SubmitButton loading={loading} text="สมัครสมาชิก →" />
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => router.push("/")} className="text-muted-foreground">
            กลับหน้าแรก
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

/* ---------- small helper components ---------- */

const FormField = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
    </div>
  </div>
);

const SubmitButton = ({ loading, text }: { loading: boolean; text: string }) => (
  <Button
    type="submit"
    disabled={loading}
    className="w-full gradient-primary text-primary-foreground font-semibold py-3 mt-2"
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : text}
  </Button>
);

export default AuthPage;
