'use client';
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { PostActions } from './PostActions';
import { CommentSection } from './CommentSection';
import { EditPostModal } from './EditPostModal';
import { useLikes } from '@/hooks/useLikes';

export interface FeedPostData {
  id: string;
  type: 'lost_item' | 'locker_deposit' | 'found_item';
  user: {
    id?: string;
    name: string;
    avatar: string | null;
    isSystem?: boolean;
  };
  title?: string; // kept for backward compat but not displayed
  content: string;
  image?: string;
  timestamp: Date;
  lockerId?: number;
  likes: number;
  comments: number;
  isLiked?: boolean;
}

interface FeedPostProps {
  post: FeedPostData;
  currentUserId?: string;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onLoginRequired?: () => void;
  onPostDeleted?: () => void;
  onUserBlocked?: (blockedUserId: string) => void;
}

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'เมื่อสักครู่';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

export const FeedPost = ({ 
  post, 
  currentUserId, 
  isLoggedIn = false,
  isAdmin = false,
  onLike, 
  onComment,
  onLoginRequired,
  onPostDeleted,
  onUserBlocked
}: FeedPostProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments);

  useEffect(() => {
    setCommentsCount(post.comments);
  }, [post.comments]);
  
  // Use real likes hook
  const { isLiked, likesCount, toggleLike, loading: likeLoading } = useLikes(post.id, currentUserId);

  const handleLike = async () => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    await toggleLike();
    onLike?.(post.id);
  };

  const handleCommentClick = () => {
    setShowComments(!showComments);
    onComment?.(post.id);
  };

  const getTypeLabel = () => {
    switch (post.type) {
      case 'lost_item':
        return { text: 'ตามหาของหาย', color: 'bg-destructive/10 text-destructive' };
      case 'locker_deposit':
        return { text: 'ฝากเข้าตู้', color: 'bg-success/10 text-success' };
      case 'found_item':
        return { text: 'เจอของ', color: 'bg-primary/10 text-primary' };
    }
  };

  const typeLabel = getTypeLabel();

  // Only show content once — no duplicate title
  const displayContent = post.content;

  return (
    <article className="bg-card border-b border-border px-3 sm:px-4 py-3 sm:py-4 hover:bg-secondary/30 transition-colors">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* Avatar */}
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
            post.user.isSystem 
              ? 'bg-gradient-to-br from-primary to-warning' 
              : 'bg-primary/10'
          }`}>
            {post.user.isSystem ? (
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            ) : post.user.avatar ? (
              <img src={post.user.avatar} alt={post.user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs sm:text-sm font-bold text-primary">{post.user.name.charAt(0)}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* User info & menu */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-semibold text-foreground text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{post.user.name}</span>
                <span className="text-muted-foreground text-xs sm:text-sm">·</span>
                <span className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">{getTimeAgo(post.timestamp)}</span>
              </div>
              
              {/* Menu - only show for logged in users */}
              {isLoggedIn && !post.user.isSystem && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 hover:bg-secondary rounded-full transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <PostActions
                    postId={post.id}
                    postUserId={post.user.id || ''}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                    onEdit={() => {
                      setShowMenu(false);
                      setShowEditModal(true);
                    }}
                    onDelete={onPostDeleted}
                    onBlock={() => {
                      if (post.user.id) {
                        onUserBlocked?.(post.user.id);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Type Badge */}
            <span className={`inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full mt-1 ${typeLabel.color}`}>
              {typeLabel.text}
            </span>

            {/* Post content */}
            {displayContent && (
              <p className="text-foreground text-sm sm:text-base mt-2 whitespace-pre-wrap break-words">{displayContent}</p>
            )}

            {/* Image */}
            {post.image && (
              <div className="mt-2 sm:mt-3 rounded-lg sm:rounded-xl overflow-hidden border border-border">
                <img 
                  src={post.image} 
                  alt="Post image"
                  className="w-full h-auto max-h-60 sm:max-h-80 object-cover"
                />
              </div>
            )}

            {/* Locker info */}
            {post.lockerId && (
              <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1 text-success">
                  <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ตู้ #{String(post.lockerId).padStart(2, '0')}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  isLiked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                } ${likeLoading ? 'opacity-50' : ''}`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-xs sm:text-sm">{likesCount > 0 ? likesCount : ''}</span>
              </button>

              <button
                onClick={handleCommentClick}
                className={`flex items-center gap-1 sm:gap-1.5 transition-colors ${
                  showComments ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${showComments ? 'fill-primary/20' : ''}`} />
                <span className="text-xs sm:text-sm">{commentsCount > 0 ? commentsCount : ''}</span>
                {showComments ? (
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>

            {/* Comments Section */}
            {showComments && (
              <CommentSection
                postId={post.id}
                isLoggedIn={isLoggedIn}
                currentUserId={currentUserId}
                onLoginRequired={onLoginRequired}
                onCommentsCountChange={setCommentsCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          post={{
            id: post.id,
            post_type: post.type === 'lost_item' ? 'lost' : post.type === 'found_item' ? 'found' : 'locker',
            title: post.title || '',
            content: displayContent || post.content,
            image_url: post.image || null
          }}
          onUpdate={() => {
            setShowEditModal(false);
            onPostDeleted?.(); // Refresh the list
          }}
        />
      )}
    </article>
  );
};

