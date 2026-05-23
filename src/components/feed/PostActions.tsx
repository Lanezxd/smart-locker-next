'use client';
import React, { useState } from 'react';
import { Edit2, Trash2, Flag, Ban, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostActionsProps {
  postId: string;
  postUserId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onBlock?: () => void;
}

export const PostActions = ({ 
  postId, 
  postUserId, 
  currentUserId,
  isAdmin = false,
  isOpen, 
  onClose,
  onEdit,
  onDelete,
  onBlock
}: PostActionsProps) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isOwner = currentUserId === postUserId;
  const canDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!confirm('คุณต้องการลบโพสต์นี้หรือไม่?')) return;
    
    setSubmitting(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast.error('ไม่สามารถลบโพสต์ได้');
    } else {
      toast.success('ลบโพสต์แล้ว');
      onDelete?.();
    }
    setSubmitting(false);
    onClose();
  };

  const handleReport = async () => {
    const finalReason = reportReason === 'อื่นๆ' ? customReason.trim() : reportReason;
    
    if (!finalReason) {
      toast.error('กรุณาระบุเหตุผล');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: currentUserId!,
        post_id: postId,
        reported_user_id: postUserId,
        reason: finalReason
      });

    if (error) {
      toast.error('ไม่สามารถรายงานได้');
    } else {
      toast.success('รายงานโพสต์แล้ว ขอบคุณที่แจ้งเรา');
      setShowReportModal(false);
      setReportReason('');
      setCustomReason('');
    }
    setSubmitting(false);
    onClose();
  };

  const handleBlock = async () => {
    if (!confirm('คุณต้องการบล็อกผู้ใช้นี้หรือไม่? คุณจะไม่เห็นโพสต์จากผู้ใช้นี้อีก')) return;
    
    setSubmitting(true);
    const { error } = await supabase
      .from('blocks')
      .insert({
        blocker_id: currentUserId!,
        blocked_user_id: postUserId
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('คุณบล็อกผู้ใช้นี้อยู่แล้ว');
      } else {
        toast.error('ไม่สามารถบล็อกได้');
      }
    } else {
      toast.success('บล็อกผู้ใช้แล้ว');
      onBlock?.(); // Call the callback to hide the post immediately
    }
    setSubmitting(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Menu */}
      <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px]">
        {isOwner ? (
          <>
            <button 
              onClick={onEdit}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              แก้ไขโพสต์
            </button>
            <button 
              onClick={handleDelete}
              disabled={submitting}
              className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              ลบโพสต์
            </button>
          </>
        ) : isAdmin ? (
          <>
            <button 
              onClick={handleDelete}
              disabled={submitting}
              className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              ลบโพสต์ (Admin)
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setShowReportModal(true)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              รายงาน
            </button>
            <button 
              onClick={handleBlock}
              disabled={submitting}
              className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              บล็อกผู้ใช้
            </button>
          </>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-md shadow-xl">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h3 className="text-lg font-bold text-foreground mb-4">รายงานโพสต์</h3>
            
            <div className="space-y-3 mb-4">
              {['เนื้อหาไม่เหมาะสม', 'สแปมหรือโฆษณา', 'ข้อมูลเท็จ', 'อื่นๆ'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-all ${
                    reportReason === reason 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {reportReason === 'อื่นๆ' && (
              <textarea
                placeholder="ระบุเหตุผล..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none mb-4"
                rows={3}
              />
            )}

            <button
              onClick={handleReport}
              disabled={!reportReason || (reportReason === 'อื่นๆ' && !customReason.trim()) || submitting}
              className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-5 h-5" />}
              ส่งรายงาน
            </button>
          </div>
        </div>
      )}
    </>
  );
};

