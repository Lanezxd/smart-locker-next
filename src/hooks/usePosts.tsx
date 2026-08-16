'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Post {
  id: string;
  user_id: string;
  post_type: 'lost' | 'found' | 'locker';
  title: string;
  content: string;
  image_url: string | null;
  location: string | null;
  locker_number: number | null;
  contact_info: string | null;
  status: 'active' | 'resolved' | 'expired';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(prev => posts.length === 0 ? true : prev);
    }
    setError(null);
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (postsError) {
      setError('ไม่สามารถโหลดโพสต์ได้');
      setLoading(false);
      return;
    }
    const userIds = [...new Set((postsData || []).map(p => p.user_id))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);
      const profilesMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      setPosts((postsData || []).map(post => ({ ...post, profiles: profilesMap.get(post.user_id) || null })) as Post[]);
    } else {
      setPosts((postsData || []) as Post[]);
    }
    setLoading(false);
  }, [posts.length]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createPost = async (postData: { post_type: 'lost' | 'found' | 'locker'; title: string; content: string; image_url?: string; location?: string; locker_number?: number; contact_info?: string; }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('กรุณาเข้าสู่ระบบก่อนสร้างโพสต์'); return { error: new Error('Not authenticated') }; }
    const { data, error } = await supabase.from('posts').insert({ user_id: user.id, ...postData }).select('*').single();
    if (error) { toast.error('ไม่สามารถสร้างโพสต์ได้'); return { error }; }
    const { data: profileData } = await supabase.from('profiles').select('user_id, username, full_name, avatar_url').eq('user_id', user.id).maybeSingle();
    setPosts(prev => [{ ...data, profiles: profileData || null } as Post, ...prev]);
    toast.success('สร้างโพสต์สำเร็จ!');
    return { data, error: null };
  };

  const updatePost = async (postId: string, updates: Partial<Omit<Post, 'profiles'>>) => {
    const { data, error } = await supabase.from('posts').update(updates).eq('id', postId).select().single();
    if (error) { toast.error('ไม่สามารถอัปเดตโพสต์ได้'); return { error }; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...(data as Post) } : p));
    return { data, error: null };
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('ไม่สามารถลบโพสต์ได้'); return { error }; }
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('ลบโพสต์สำเร็จ');
    return { error: null };
  };

  return { posts, loading, error, fetchPosts, createPost, updatePost, deletePost };
};
