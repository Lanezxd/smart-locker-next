'use client';
import React, { useState, useRef } from 'react';
import { X, Send, AlertCircle, Package, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    post_type: 'lost' | 'found';
    title: string;
    content: string;
    image_url?: string;
  }) => Promise<{ error: Error | null }>;
  userName?: string;
}

export const CreatePostModal = ({ isOpen, onClose, onSubmit, userName }: CreatePostModalProps) => {
  const [postType, setPostType] = useState<'lost' | 'found'>('lost');
  
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('กรุณาเข้าสู่ระบบ');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('ไม่สามารถอัปโหลดรูปภาพได้');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success('อัปโหลดรูปภาพสำเร็จ');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    
    const result = await onSubmit({
      post_type: postType,
      title: content.trim().substring(0, 50),
      content: content.trim(),
      image_url: imageUrl || undefined
    });

    setIsSubmitting(false);

    if (!result.error) {
      // reset
      setContent('');
      setImageUrl(null);
      setPostType('lost');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative z-10 w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
          <h2 className="text-base sm:text-lg font-bold text-foreground">สร้างโพสต์ใหม่</h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="flex gap-2 p-1 bg-secondary rounded-lg sm:rounded-xl">
            <button
              type="button"
              onClick={() => setPostType('lost')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                postType === 'lost' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ของหาย
            </button>
            <button
              type="button"
              onClick={() => setPostType('found')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                postType === 'found' ? 'bg-success/10 text-success' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              เจอของ
            </button>
          </div>


          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-1.5">
              รายละเอียด <span className="text-destructive">*</span>
            </label>
            <textarea
              placeholder={postType === 'lost' ? 'อธิบายลักษณะของที่หาย...' : 'อธิบายลักษณะของที่เจอ...'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-1.5">รูปภาพ</label>
            {imageUrl ? (
              <div className="relative rounded-lg sm:rounded-xl overflow-hidden border border-border">
                <img src={imageUrl} alt="Preview" className="w-full h-32 sm:h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 sm:p-2 bg-destructive text-destructive-foreground rounded-full"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-4 sm:py-6 border-2 border-dashed border-border rounded-lg sm:rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-1.5 sm:gap-2 text-muted-foreground"
              >
                {uploading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" /> : <ImagePlus className="w-5 h-5 sm:w-6 sm:h-6" />}
                <span className="text-xs sm:text-sm">{uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปภาพ'}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
        </form>

        <div className="p-3 sm:p-4 border-t border-border">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="w-full gradient-primary text-primary-foreground font-bold py-2.5 sm:py-3 rounded-lg sm:rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
            {isSubmitting ? 'กำลังโพสต์...' : 'โพสต์'}
          </button>
        </div>
      </div>
    </div>
  );
};

