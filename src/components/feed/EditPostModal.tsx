'use client';
import React, { useState, useRef } from 'react';
import { X, Save, Loader2, AlertCircle, Package, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    post_type: string;
    title: string;
    content: string;
    image_url: string | null;
  };
  onUpdate: () => void;
}

export const EditPostModal = ({ isOpen, onClose, post, onUpdate }: EditPostModalProps) => {
  const [postType, setPostType] = useState<'lost' | 'found'>(post.post_type as 'lost' | 'found');
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [imageUrl, setImageUrl] = useState<string | null>(post.image_url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }

    // Validate file size (max 5MB)
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

    const { error } = await supabase
      .from('posts')
      .update({
        post_type: postType,
        title: content.trim().substring(0, 50),
        content: content.trim(),
        image_url: imageUrl
      })
      .eq('id', post.id);

    if (error) {
      toast.error('ไม่สามารถอัปเดตโพสต์ได้');
    } else {
      toast.success('อัปเดตโพสต์สำเร็จ');
      onUpdate();
      onClose();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">แก้ไขโพสต์</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Post Type Toggle */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => setPostType('lost')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                postType === 'lost' 
                  ? 'bg-destructive/10 text-destructive' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              ของหาย
            </button>
            <button
              type="button"
              onClick={() => setPostType('found')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                postType === 'found' 
                  ? 'bg-success/10 text-success' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-4 h-4" />
              เจอของ
            </button>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              รายละเอียด <span className="text-destructive">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              รูปภาพ
            </label>
            
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-muted-foreground"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (
                  <ImagePlus className="w-8 h-8" />
                )}
                <span className="text-sm">{uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพ'}</span>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                บันทึกการแก้ไข
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

