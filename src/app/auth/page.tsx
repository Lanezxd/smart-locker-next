'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Box, GraduationCap, Users, Phone, CreditCard, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type UserType = "student" | "general";

const AuthPage = () => {
  const router = useRouter();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>("student");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    studentId: "",
    nationalId: "",
    phone: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

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
        if (userType === "student" && !formData.studentId.trim()) {
          toast.error("กรุณากรอกรหัสนักศึกษา");
          setLoading(false);
          return;
        }
        if (userType === "general" && !formData.nationalId.trim()) {
          toast.error("กรุณากรอกรหัสบัตรประชาชน");
          setLoading(false);
          return;
        }

        const metadata: Record<string, string> = {
          full_name: formData.fullName,
          user_type: userType,
          phone: formData.phone,
        };
        if (userType === "student") {
          metadata.student_id = formData.studentId;
        } else {
          metadata.national_id = formData.nationalId;
        }

        const { error } = await signUp(formData.email, formData.password, metadata);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("อีเมลนี้ถูกใช้งานแล้ว");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("สมัครสมาชิกสำเร็จ!");
          router.push("/");
        }
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
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
          {/* Tab Switcher */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
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
              onClick={() => setIsLogin(false)}
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

                {/* User Type Selector */}
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setUserType("student")}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                      userType === "student"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <GraduationCap className="w-6 h-6" />
                    <span className="text-sm font-semibold">นักศึกษา</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("general")}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                      userType === "general"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="text-sm font-semibold">บุคคลทั่วไป</span>
                  </button>
                </div>

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

                  <AnimatePresence mode="wait">
                    {userType === "student" ? (
                      <motion.div
                        key="student-id"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <FormField icon={<Hash className="w-5 h-5" />} label="รหัสนักศึกษา">
                          <Input
                            type="text"
                            placeholder="รหัสนักศึกษา"
                            value={formData.studentId}
                            onChange={(e) => update("studentId", e.target.value)}
                            className="pl-10"
                            required
                          />
                        </FormField>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="national-id"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <FormField icon={<CreditCard className="w-5 h-5" />} label="รหัสบัตรประชาชน">
                          <Input
                            type="text"
                            placeholder="รหัสบัตรประชาชน 13 หลัก"
                            value={formData.nationalId}
                            onChange={(e) => update("nationalId", e.target.value)}
                            className="pl-10"
                            required
                            maxLength={13}
                          />
                        </FormField>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <FormField icon={<Phone className="w-5 h-5" />} label="เบอร์โทร">
                    <Input
                      type="tel"
                      placeholder="0xx-xxx-xxxx"
                      value={formData.phone}
                      onChange={(e) => update("phone", e.target.value)}
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
