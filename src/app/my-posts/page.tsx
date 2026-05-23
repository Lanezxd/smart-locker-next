'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Trash2, Edit2, AlertCircle, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditPostModal } from '@/components/feed/EditPostModal';

interface Post {
  id: string;
  post_type: string;
  title: string;
  content: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

const MyPostsPage = () => {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const fetchMyPosts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบ');
      router.push('/');
      return;
    }
    const { data, error } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) {
      toast.error('ไม่สามารถโหลดโพสต์ได้');
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMyPosts(); }, []);

  const handleDelete = async (postId: string) => {
    if (!confirm('คุณต้องการลบโพสต์นี้หรือไม่?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('ไม่สามารถลบโพสต์ได้'); }
    else { toast.success('ลบโพสต์แล้ว'); setPosts(prev => prev.filter(p => p.id !== postId)); }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lost': return { text: 'ของหาย', color: 'bg-destructive/10 text-destructive', icon: AlertCircle };
      case 'found': return { text: 'เจอของ', color: 'bg-success/10 text-success', icon: Package };
      default: return { text: 'โพสต์', color: 'bg-primary/10 text-primary', icon: Package };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">โพสต์ของฉัน</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">คุณยังไม่มีโพสต์</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const typeInfo = getTypeLabel(post.post_type);
              const Icon = typeInfo.icon;
              return (
                <div key={post.id} className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          <Icon className="w-3 h-3" />{typeInfo.text}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${post.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {post.status === 'active' ? 'กำลังแสดง' : post.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(post.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                    <button onClick={() => setEditingPost(post)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors">
                      <Edit2 className="w-4 h-4" />แก้ไข
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium transition-colors">
                      <Trash2 className="w-4 h-4" />ลบ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingPost && (
        <EditPostModal
          isOpen={!!editingPost}
          onClose={() => setEditingPost(null)}
          post={editingPost}
          onUpdate={fetchMyPosts}
        />
      )}
    </div>
  );
};

export default MyPostsPage;
