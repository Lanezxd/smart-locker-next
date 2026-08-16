'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatRoom {
  id: string;
  transaction_id: string;
  locker_id: number;
  depositor_id: string;
  claimer_id: string;
  created_at: string;
}

export interface ChatMessageDB {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string; // 'text' | 'otp_sent'
  created_at: string;
  is_read?: boolean;
}

export const useChat = (currentUserId: string | undefined) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessageDB[]>([]);
  const [activeRoomIdState, setActiveRoomIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [roomId: string]: number }>({});
  
  const activeRoomIdRef = useRef<string | null>(null);

  // Mark a room as read via the server-side API
  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!roomId) {
      return;
    }
    
    // Update local state immediately for snappy UI
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    
    try {
      const { data: authData } = await supabase.auth.getSession();
      const session = authData?.session;
      const effectiveUserId = currentUserId || session?.user?.id;

      if (!effectiveUserId) {
        console.warn('markRoomAsRead aborted: No currentUserId or session user id');
        return;
      }

      await fetch('/api/mark-chat-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          roomId,
          currentUserId: effectiveUserId,
        }),
      });
    } catch (err) {
      console.warn('Error calling /api/mark-chat-read:', err);
    }
  }, [currentUserId]);

  const setActiveRoomId = useCallback((roomId: string | null) => {
    activeRoomIdRef.current = roomId;
    setActiveRoomIdState(roomId);
    if (roomId) {
      markRoomAsRead(roomId);
    }
  }, [markRoomAsRead]);

  const clearActiveRoom = useCallback(() => {
    activeRoomIdRef.current = null;
    setActiveRoomIdState(null);
  }, []);

  const activeRoomId = activeRoomIdState;

  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  // Fetch unread counts for all rooms
  const fetchUnreadCounts = useCallback(async () => {
    if (!currentUserId || rooms.length === 0) {
      setUnreadCounts({});
      return;
    }

    const counts: { [roomId: string]: number } = {};

    for (const room of rooms) {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('sender_id', currentUserId)
        .or('is_read.eq.false,is_read.is.null');

      if (error) {
        console.error('Error fetching unread counts:', error);
      }

      counts[room.id] = count || 0;
    }

    setUnreadCounts(counts);
  }, [currentUserId, rooms]);

  // Fetch all chat rooms for the current user
  const fetchRooms = useCallback(async () => {
    if (!currentUserId) return;
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRooms(data);
    }
  }, [currentUserId]);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }, []);

  // Create or get existing chat room
  const getOrCreateRoom = async (transactionId: string, lockerId: number, depositorId: string, claimerId: string): Promise<ChatRoom | null> => {
    // Check if room already exists
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('claimer_id', claimerId)
      .maybeSingle();

    if (existing) return existing;

    // Create new room
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        transaction_id: transactionId,
        locker_id: lockerId,
        depositor_id: depositorId,
        claimer_id: claimerId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat room:', error);
      toast.error('ไม่สามารถสร้างห้องแชทได้');
      return null;
    }

    return data;
  };

  // Send a message & trigger email notification ONCE inside the form submission
  const sendMessage = async (roomId: string, content: string, messageType: string = 'text') => {
    if (!currentUserId) return null;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: currentUserId,
        content,
        message_type: messageType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('ไม่สามารถส่งข้อความได้');
      return null;
    }

    // Trigger notification email ONCE during active submission
    try {
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData?.session?.access_token;
      if (accessToken) {
        fetch('/api/send-chat-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            roomId,
            content,
            messageId: data.id,
            type: 'locker',
          }),
        }).catch((err) => {
          console.warn('Background notification error:', err);
        });
      }
    } catch (notifErr) {
      console.warn('Failed to initiate send-chat-notification:', notifErr);
    }

    return data;
  };

  // Subscribe to realtime messages for active room
  useEffect(() => {
    if (!activeRoomId) return;

    fetchMessages(activeRoomId);
    // Mark as read immediately upon opening a room
    markRoomAsRead(activeRoomId);

    const channel = supabase.channel(`chat-messages-${activeRoomId}-${Date.now()}-${Math.random()}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${activeRoomId}`,
      },
      (payload) => {
        const newMsg = payload.new as ChatMessageDB;
        setMessages((prev) => [...prev, newMsg]);
        // Auto-mark as read via server API since user is actively viewing this room
        if (currentUserId && newMsg.sender_id !== currentUserId) {
          markRoomAsRead(activeRoomId);
        }
      }
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, fetchMessages, markRoomAsRead, currentUserId]);

  // Subscribe to new rooms
  useEffect(() => {
    if (!currentUserId) return;

    fetchRooms();

    const channel = supabase.channel(`chat-rooms-realtime-${Date.now()}-${Math.random()}`);
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_rooms',
      },
      () => {
        fetchRooms();
      }
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchRooms]);

  // Fetch unread counts when rooms change
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Listen for new messages across all rooms to update unread counts
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channel = supabase.channel(`chat-unread-global-${Date.now()}-${Math.random()}`);
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        const msg = payload.new as ChatMessageDB;
        const isNotSender = msg.sender_id !== currentUserId;
        
        // If message is not from current user and in the active room, mark as read
        if (isNotSender) {
          if (msg.room_id === activeRoomIdRef.current) {
            markRoomAsRead(msg.room_id);
          } else {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.room_id]: (prev[msg.room_id] || 0) + 1,
            }));
          }
        }
      }
    );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, markRoomAsRead]);

  return {
    rooms,
    messages,
    activeRoomId,
    setActiveRoomId,
    clearActiveRoom,
    loading,
    getOrCreateRoom,
    sendMessage,
    fetchRooms,
    fetchMessages,
    totalUnread,
    unreadCounts,
    markRoomAsRead,
  };
};
