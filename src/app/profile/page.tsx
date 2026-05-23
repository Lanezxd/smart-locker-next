'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Loader2, Camera, Save, History, LogOut, User, Shield, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';

const ProfilePage = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, updateProfile, refreshProfile } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user?.id);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('กรุณาเลือกไฟล์รูปภาพ'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)'); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, file, { upsert: true });
      if (uploadError) { toast.error('ไม่สามารถอัปโหลดรูปภาพได้'); return; }
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
      await updateProfile({ avatar_url: publicUrl });
      await refreshProfile?.();
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateProfile({ username: formData.username, full_name: formData.full_name, phone: formData.phone });
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">โปรไฟล์</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-card shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{profile?.full_name || profile?.username || 'ผู้ใช้'}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">ข้อมูลส่วนตัว</h3>
          {[
            { label: 'ชื่อผู้ใช้', field: 'username', placeholder: 'ชื่อผู้ใช้', type: 'text' },
            { label: 'ชื่อ-นามสกุล', field: 'full_name', placeholder: 'ชื่อ-นามสกุล', type: 'text' },
            { label: 'เบอร์โทรศัพท์', field: 'phone', placeholder: 'เบอร์โทรศัพท์', type: 'tel' },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
              <input
                type={type}
                value={formData[field as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder={placeholder}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" />บันทึกข้อมูล</>}
          </button>
        </form>

        <div className="space-y-3">
          <button onClick={() => router.push('/my-posts')} className="w-full flex items-center gap-3 px-4 py-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <p className="font-semibold text-foreground text-left">ประวัติการโพสต์</p>
            <ChevronLeft className="w-5 h-5 text-muted-foreground ml-auto rotate-180" />
          </button>

          {!adminLoading && !isAdmin && (
            <button onClick={() => router.push('/contact-admin')} className="w-full flex items-center gap-3 px-4 py-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <p className="font-semibold text-foreground text-left">ติดต่อ Admin</p>
              <ChevronLeft className="w-5 h-5 text-muted-foreground ml-auto rotate-180" />
            </button>
          )}

          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-4 bg-destructive/10 rounded-2xl border border-destructive/20 hover:bg-destructive/20 transition-colors">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <p className="font-semibold text-destructive">ออกจากระบบ</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
