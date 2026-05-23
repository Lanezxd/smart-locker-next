'use client';
import React, { useState } from 'react';
import { Send, Trash2, CornerDownRight, Loader2 } from 'lucide-react';
import { useComments, Comment } from '@/hooks/useComments';

interface CommentSectionProps {
  postId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  onLoginRequired?: () => void;
  onCommentsCountChange?: (count: number) => void;
}

const CommentItem = ({ 
  comment, 
  currentUserId, 
  onReply, 
  onDelete,
  isReply = false
}: { 
  comment: Comment; 
  currentUserId?: string;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isReply?: boolean;
}) => {
  const isOwner = currentUserId === comment.user_id;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(comment.id);
    setDeleting(false);
  };

  return (
    <div className={`flex gap-2 ${isReply ? 'ml-8 mt-2' : 'mt-3'}`}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
        {comment.profiles?.avatar_url ? (
          <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary">
            {(comment.profiles?.full_name || comment.profiles?.username || 'U').charAt(0)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-secondary rounded-xl px-3 py-2">
          <p className="text-sm font-semibold text-foreground">
            {comment.profiles?.full_name || comment.profiles?.username || 'ผู้ใช้'}
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-2">
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleString('th-TH', { 
              day: 'numeric', 
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {!isReply && (
            <button 
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              ตอบกลับ
            </button>
          )}
          {isOwner && (
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-muted-foreground hover:text-destructive font-medium transition-colors flex items-center gap-1"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommentSection = ({ postId, isLoggedIn, currentUserId, onLoginRequired, onCommentsCountChange }: CommentSectionProps) => {
  const { comments, loading, createComment, deleteComment } = useComments(postId);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Notify parent of total comment count (including replies)
  React.useEffect(() => {
    const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
    onCommentsCountChange?.(totalCount);
  }, [comments, onCommentsCountChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    setSubmitting(true);
    await createComment(newComment.trim(), replyingTo || undefined);
    setNewComment('');
    setReplyingTo(null);
    setSubmitting(false);
  };

  const handleReply = (commentId: string) => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    setReplyingTo(commentId);
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
  };

  return (
    <div className="border-t border-border pt-3 mt-3">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-1 mb-3">
              {comments.map(comment => (
                <div key={comment.id}>
                  <CommentItem 
                    comment={comment} 
                    currentUserId={currentUserId}
                    onReply={handleReply}
                    onDelete={handleDelete}
                  />
                  {/* Replies */}
                  {comment.replies && comment.replies.map(reply => (
                    <CommentItem 
                      key={reply.id}
                      comment={reply} 
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      onDelete={handleDelete}
                      isReply
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-t-xl text-sm text-muted-foreground">
              <CornerDownRight className="w-4 h-4" />
              <span>กำลังตอบกลับความคิดเห็น</span>
              <button 
                onClick={() => setReplyingTo(null)}
                className="ml-auto text-xs text-destructive hover:underline"
              >
                ยกเลิก
              </button>
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder={isLoggedIn ? "เขียนความคิดเห็น..." : "เข้าสู่ระบบเพื่อแสดงความคิดเห็น"}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!isLoggedIn || submitting}
              className="flex-1 px-4 py-2 rounded-full border border-border bg-card text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting || !isLoggedIn}
              className="w-10 h-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

