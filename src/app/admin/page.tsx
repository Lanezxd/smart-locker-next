'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Shield, Trash2, Unlock, MessageSquare, Flag, 
  Loader2, Package, Send, X, Ban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { toast } from 'sonner';

type TabType = 'lockers' | 'reports' | 'chats';

interface Report {
  id: string;
  post_id: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  post?: { id: string; title: string; content: string; user_id: string; image_url: string | null } | null;
}

interface Transaction {
  id: string;
  locker_id: number;
  item_description: string;
  depositor_name: string;
  status: string;
  deposited_at: string;
  image_url: string | null;
}

interface ChatUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

interface AdminMessage {
  id: string;
  user_id: string;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const AdminDashboardPage = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin(user?.id);
  const [activeTab, setActiveTab] = useState<TabType>('lockers');
  const [reports, setReports] = useState<Report[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AdminMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) { router.push('/'); return; }
      fetchData();
    }
  }, [user, isAdmin, authLoading, adminLoading]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel('admin-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages' }, (payload) => {
        const msg = payload.new as AdminMessage;
        if (selectedChatUser && msg.user_id === selectedChatUser) {
          setChatMessages(prev => [...prev, msg]);
        }
        fetchChatUsers();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, selectedChatUser]);

  const fetchData = () => { fetchReports(); fetchTransactions(); fetchChatUsers(); };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('*, post:posts(id, title, content, user_id, image_url)')
      .order('created_at', { ascending: false });
    
    if (!error && data) setReports(data as Report[]);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from('locker_transactions').select('*').eq('status', 'deposited').order('deposited_at', { ascending: false });
    if (data) setTransactions(data as Transaction[]);
  };

  const fetchChatUsers = async () => {
    const { data: messages } = await supabase.from('admin_messages').select('user_id, content, created_at, is_read, sender_type').order('created_at', { ascending: false });
    if (!messages) return;
    const userMap = new Map<string, { last_message: string; last_message_at: string; unread_count: number }>();
    messages.forEach(msg => {
      if (!userMap.has(msg.user_id)) {
        userMap.set(msg.user_id, { last_message: msg.content, last_message_at: msg.created_at, unread_count: 0 });
      }
      if (msg.sender_type === 'user' && !msg.is_read) { userMap.get(msg.user_id)!.unread_count++; }
    });
    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) { setChatUsers([]); return; }
    const { data: profiles } = await supabase.from('profiles').select('user_id, username, full_name, avatar_url').in('user_id', userIds);
    const users: ChatUser[] = userIds.map(uid => {
      const profile = profiles?.find(p => p.user_id === uid);
      const meta = userMap.get(uid)!;
      return { user_id: uid, username: profile?.username || null, full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null, ...meta };
    });
    users.sort((a, b) => new Date(b.last_message_at!).getTime() - new Date(a.last_message_at!).getTime());
    setChatUsers(users);
  };

  const handleUnlockLocker = async (transactionId: string) => {
    setActionLoading(transactionId);
    const adminName = profile?.full_name 
      ? `${profile.full_name} (Admin Override)` 
      : profile?.username 
      ? `${profile.username} (Admin Override)` 
      : 'Admin (Admin Override)';
    const adminContact = profile?.phone || user?.email || 'Admin Support';

    const { error } = await supabase
      .from('locker_transactions')
      .update({
        status: 'collected',
        collected_at: new Date().toISOString(),
        collector_user_id: user?.id || null,
        collector_name: adminName,
        collector_contact: adminContact
      })
      .eq('id', transactionId);

    if (error) { 
      toast.error('ไม่สามารถปลดล็อกตู้ได้'); 
    } else { 
      toast.success('ปลดล็อกตู้สำเร็จ!'); 
      fetchTransactions(); 
    }
    setActionLoading(null);
  };

  const handleAdminDirectUnlock = async (transactionId: string, lockerId: number) => {
    setActionLoading(transactionId);
    try {
      const adminName = profile?.full_name 
        ? `${profile.full_name} (Admin Override)` 
        : profile?.username 
        ? `${profile.username} (Admin Override)` 
        : 'Admin (Admin Override)';
      const adminContact = profile?.phone || user?.email || 'Admin Support';

      const { error: dbError } = await supabase
        .from('locker_transactions')
        .update({
          status: 'collected',
          collected_at: new Date().toISOString(),
          collector_user_id: user?.id || null,
          collector_name: adminName,
          collector_contact: adminContact
        })
        .eq('id', transactionId);

      if (dbError) {
        toast.error('ไม่สามารถปลดล็อกตู้ได้');
        setActionLoading(null);
        return;
      }

      const mqttModule = await import('mqtt');
      const connectFn = mqttModule.connect || (mqttModule.default && mqttModule.default.connect);
      if (!connectFn) {
        throw new Error('MQTT connection function not found');
      }

      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
      if (!brokerUrl) {
        throw new Error('MQTT broker URL is not set');
      }

      const client = connectFn(brokerUrl, {
        clientId: `lostreturn-admin-${Math.random().toString(16).slice(2, 8)}`,
        connectTimeout: 8000,
        username: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end(true);
          reject(new Error('MQTT connection timeout'));
        }, 5000);

        client.on('connect', () => {
          clearTimeout(timeout);
          const topic = `lostreturn/locker/${lockerId}/command`;
          const payload = 'OPEN';
          client.publish(topic, payload, { qos: 1 }, (err) => {
            client.end(true);
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        client.on('error', (err) => {
          clearTimeout(timeout);
          client.end(true);
          reject(err);
        });
      });

      toast.success('ปลดล็อกตู้และส่งคำสั่งเปิดตู้สำเร็จ!');
    } catch (mqttError) {
      console.error('MQTT direct unlock error:', mqttError);
      toast.warning('ปลดล็อกตู้สำเร็จในระบบ แต่เกิดข้อผิดพลาดในการส่งคำสั่งเปิดตู้ผ่าน MQTT');
    } finally {
      fetchTransactions();
      setActionLoading(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('ลบโพสต์นี้?')) return;
    setActionLoading(postId);
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast.error('ไม่สามารถลบโพสต์ได้'); } else { toast.success('ลบโพสต์แล้ว'); fetchReports(); }
    setActionLoading(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ลบผู้ใช้คนนี้ถาวร?')) return;
    setActionLoading(userId);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (error || data?.error) { toast.error(data?.error || 'ไม่สามารถลบผู้ใช้ได้'); } else { toast.success('ลบผู้ใช้แล้ว'); fetchReports(); }
    setActionLoading(null);
  };

  const handleDismissReport = async (reportId: string) => {
    setActionLoading(reportId);
    const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    if (error) { toast.error('ไม่สามารถปิดรายงานได้'); } else { toast.success('ปิดรายงานแล้ว'); fetchReports(); }
    setActionLoading(null);
  };

  const selectChatUser = async (userId: string) => {
    setSelectedChatUser(userId);
    const { data } = await supabase.from('admin_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (data) setChatMessages(data);
    await supabase.from('admin_messages').update({ is_read: true }).eq('user_id', userId).eq('sender_type', 'user').eq('is_read', false);
    fetchChatUsers();
  };

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatUser) return;
    const { error } = await supabase.from('admin_messages').insert({ user_id: selectedChatUser, sender_type: 'admin', content: newMessage.trim() });
    if (error) { toast.error('ไม่สามารถส่งข้อความได้'); } else { setNewMessage(''); }
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (!user || !isAdmin) return null;

  const tabs = [
    { id: 'lockers' as TabType, label: 'ตู้ฝากของ', icon: Package, count: transactions.length },
    { id: 'reports' as TabType, label: 'รายงาน', icon: Flag, count: reports.filter(r => r.status === 'pending').length },
    { id: 'chats' as TabType, label: 'แชท', icon: MessageSquare, count: chatUsers.reduce((sum, u) => sum + (u.unread_count || 0), 0) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-secondary rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className="w-5 h-5 text-xs rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {activeTab === 'lockers' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground mb-4">ตู้ที่มีของอยู่ ({transactions.length})</h2>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>ไม่มีตู้ที่มีของอยู่</p></div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-primary">ตู้ #{String(tx.locker_id).padStart(2, '0')}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">มีของ</span>
                      </div>
                      <p className="text-sm text-foreground font-medium">{tx.item_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">ผู้ฝาก: {tx.depositor_name}</p>
                      <p className="text-xs text-muted-foreground">ฝากเมื่อ: {new Date(tx.deposited_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {tx.image_url && <img src={tx.image_url} alt="" className="w-16 h-16 rounded-lg object-cover ml-3" />}
                  </div>
                  <button
                    onClick={() => handleAdminDirectUnlock(tx.id, tx.locker_id)}
                    disabled={actionLoading === tx.id}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/10 text-success font-semibold hover:bg-success/20 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    ปลดล็อกตู้ทันที
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground mb-4">รายงานที่รอดำเนินการ ({reports.filter(r => r.status === 'pending').length})</h2>
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Flag className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>ไม่มีรายงาน</p></div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${report.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                        {report.status === 'pending' ? 'รอดำเนินการ' : report.status === 'dismissed' ? 'ปิดแล้ว' : report.status}
                      </span>
                      <p className="text-sm text-foreground font-medium mt-2">เหตุผล: {report.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(report.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {report.post && (
                    <div className="mb-3 p-3 bg-secondary/50 rounded-xl border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">เนื้อหาโพสต์:</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{report.post.content}</p>
                      {report.post.image_url && <img src={report.post.image_url} alt="" className="mt-2 w-full max-h-40 object-cover rounded-lg" />}
                    </div>
                  )}
                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      {report.post_id && (
                        <button onClick={() => handleDeletePost(report.post_id!)} disabled={actionLoading === report.post_id} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50">
                          {actionLoading === report.post_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}ลบโพสต์
                        </button>
                      )}
                      {report.reported_user_id && (
                        <button onClick={() => handleDeleteUser(report.reported_user_id!)} disabled={actionLoading === report.reported_user_id} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50">
                          {actionLoading === report.reported_user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}ลบผู้ใช้
                        </button>
                      )}
                      <button onClick={() => handleDismissReport(report.id)} disabled={actionLoading === report.id} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/80 transition-colors disabled:opacity-50">
                        {actionLoading === report.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}ปิดรายงาน
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {!selectedChatUser ? (
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground mb-4">ข้อความจากผู้ใช้</h2>
                {chatUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>ไม่มีข้อความ</p></div>
                ) : (
                  chatUsers.map(cu => (
                    <button key={cu.user_id} onClick={() => selectChatUser(cu.user_id)} className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors text-left">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {cu.avatar_url ? <img src={cu.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary">{(cu.full_name || cu.username || '?').charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{cu.full_name || cu.username || 'ผู้ใช้'}</p>
                        <p className="text-xs text-muted-foreground truncate">{cu.last_message}</p>
                      </div>
                      {(cu.unread_count || 0) > 0 && <span className="w-5 h-5 text-xs rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0">{cu.unread_count}</span>}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
                  <button onClick={() => setSelectedChatUser(null)} className="p-1.5 hover:bg-secondary rounded-full">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="font-semibold text-foreground">{chatUsers.find(u => u.user_id === selectedChatUser)?.full_name || 'ผู้ใช้'}</p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pb-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                        {msg.content}
                        <p className={`text-[10px] mt-1 ${msg.sender_type === 'admin' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendAdminMessage} className="flex gap-2 pt-3 border-t border-border">
                  <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="พิมพ์ข้อความ..." className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
                  <button type="submit" disabled={!newMessage.trim()} className="p-2.5 gradient-primary rounded-xl text-primary-foreground disabled:opacity-50">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
