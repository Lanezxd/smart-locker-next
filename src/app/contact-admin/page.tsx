'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdminMessage {
  id: string;
  user_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const ContactAdminPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMessages();
      if (typeof window !== 'undefined') {
        localStorage.setItem(`admin_chat_read_${user.id}`, new Date().toISOString());
      }
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-admin-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_messages',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as AdminMessage]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`admin_chat_read_${user.id}`, new Date().toISOString());
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const { error } = await supabase.from('admin_messages').insert({
      user_id: user.id,
      sender_type: 'user',
      content: newMessage.trim()
    });
    if (error) { toast.error('ไม่สามารถส่งข้อความได้'); }
    else { setNewMessage(''); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/profile')} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold text-foreground">ติดต่อ Admin</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-2xl w-full mx-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">เริ่มพูดคุยกับ Admin ได้เลย</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Admin จะตอบกลับโดยเร็วที่สุด</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender_type === 'admin' && (
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                <Shield className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.sender_type === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground'
            }`}>
              {msg.content}
              <p className={`text-[10px] mt-1 ${msg.sender_type === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="sticky bottom-0 bg-card/80 backdrop-blur-xl border-t border-border">
        <form onSubmit={sendMessage} className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="พิมพ์ข้อความถึง Admin..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 gradient-primary rounded-xl text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactAdminPage;
