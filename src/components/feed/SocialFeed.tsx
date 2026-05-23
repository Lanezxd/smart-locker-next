'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FeedPost, FeedPostData } from './FeedPost';
import { SearchBar } from './SearchBar';
import { LockerSearchResults } from './LockerSearchResults';
import { Loader2, PenSquare } from 'lucide-react';
import { usePosts, Post } from '@/hooks/usePosts';
import { CreatePostModal } from './CreatePostModal';
import { supabase } from '@/integrations/supabase/client';
import { useLockerTransactions } from '@/hooks/useLockerTransactions';


interface BlockedUser {
  blocked_user_id: string;
}

// Convert database post to feed post format
const convertToFeedPost = (post: Post): FeedPostData => {
  const typeMap: Record<string, FeedPostData['type']> = {
    'lost': 'lost_item',
    'found': 'found_item',
    'locker': 'locker_deposit'
  };
  // Remove duplicated title from content (legacy posts stored title+content concatenated)
  let cleanContent = post.content;
  if (post.title && cleanContent.startsWith(post.title)) {
    cleanContent = cleanContent.slice(post.title.length).replace(/^\n+/, '');
  }

  return {
    id: post.id,
    type: typeMap[post.post_type] || 'lost_item',
    user: {
      id: post.user_id,
      name: post.profiles?.full_name || post.profiles?.username || 'ผู้ใช้',
      avatar: post.profiles?.avatar_url || null,
      isSystem: post.post_type === 'locker'
    },
    content: cleanContent || post.content,
    image: post.image_url || undefined,
    timestamp: new Date(post.created_at),
    lockerId: post.locker_number || undefined,
    likes: post.likes_count,
    comments: post.comments_count
  };
};

interface SocialFeedProps {
  onPostClick?: (post: FeedPostData) => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userName?: string;
  currentUserId?: string;
  onLoginRequired?: () => void;
  onLockerClick?: (lockerId: number) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export const SocialFeed = ({ onPostClick, isLoggedIn, isAdmin, userName, currentUserId, onLoginRequired, onLockerClick, searchQuery: externalSearchQuery, onSearchChange }: SocialFeedProps) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery ?? internalSearchQuery;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(currentUserId);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [locallyBlockedPosts, setLocallyBlockedPosts] = useState<string[]>([]);
  const { posts: dbPosts, loading, createPost, fetchPosts } = usePosts();
  const { transactions, loading: lockerLoading } = useLockerTransactions();

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('blocks')
      .select('blocked_user_id')
      .eq('blocker_id', userId);
    
    if (data) {
      setBlockedUsers(data.map((b: BlockedUser) => b.blocked_user_id));
    }
  }, [userId]);

  // Sync userId when currentUserId prop changes
  useEffect(() => {
    if (currentUserId) {
      setUserId(currentUserId);
    } else if (isLoggedIn) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id);
      });
    }
  }, [currentUserId, isLoggedIn]);

  // Fetch blocked users when userId changes
  useEffect(() => {
    if (userId) {
      fetchBlockedUsers();
    }
  }, [userId, fetchBlockedUsers]);

  // Set up realtime subscription for posts
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  // Filter blocked users from database posts
  const allPosts = useMemo(() => {
    const convertedPosts = dbPosts.map(convertToFeedPost);
    
    return convertedPosts.filter(post => {
      if (post.user.id && blockedUsers.includes(post.user.id)) return false;
      if (locallyBlockedPosts.includes(post.id)) return false;
      return true;
    });
  }, [dbPosts, blockedUsers, locallyBlockedPosts]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return allPosts;
    const query = searchQuery.toLowerCase();
    return allPosts.filter(
      post =>
        post.content.toLowerCase().includes(query) ||
        post.user.name.toLowerCase().includes(query) ||
        (post.title && post.title.toLowerCase().includes(query))
    );
  }, [allPosts, searchQuery]);

  const handleLike = (id: string) => {
    console.log('Liked post:', id);
  };

  const handleComment = (id: string) => {
    console.log('Comment on post:', id);
  };

  const handleCreatePostClick = () => {
    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreatePost = async (data: {
    post_type: 'lost' | 'found';
    title: string;
    content: string;
    image_url?: string;
  }) => {
    return await createPost({
      ...data,
      image_url: data.image_url
    });
  };

  const handlePostDeleted = () => {
    fetchPosts();
  };

  // Handler for when a user is blocked - hide their posts immediately
  const handleUserBlocked = (blockedUserId: string, postId: string) => {
    setBlockedUsers(prev => [...prev, blockedUserId]);
    setLocallyBlockedPosts(prev => [...prev, postId]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Locker Search Results - Show when searching */}
      {onLockerClick && (
        <LockerSearchResults
          transactions={transactions}
          loading={lockerLoading}
          searchQuery={searchQuery}
          onLockerClick={onLockerClick}
        />
      )}

      {/* Feed */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">ไม่พบโพสต์ที่ตรงกับการค้นหา</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={userId}
              isLoggedIn={isLoggedIn}
              isAdmin={isAdmin}
              onLike={handleLike}
              onComment={handleComment}
              onLoginRequired={onLoginRequired}
              onPostDeleted={handlePostDeleted}
              onUserBlocked={(blockedUserId) => handleUserBlocked(blockedUserId, post.id)}
            />
          ))
        )}
      </div>

      {/* Floating Create Post Button */}
      <button
        onClick={handleCreatePostClick}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 gradient-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center hover:shadow-2xl hover:shadow-primary/40 hover:scale-110 transition-all z-40"
        aria-label="สร้างโพสต์ใหม่"
      >
        <PenSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
      </button>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
        userName={userName}
      />
    </div>
  );
};

