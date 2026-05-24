'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [roomId: string]: number }>({});

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
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('sender_id', currentUserId)
        .or('is_read.eq.false,is_read.is.null');

      counts[room.id] = count || 0;
    }

    setUnreadCounts(counts);
  }, [currentUserId, rooms]);

  // Mark a room as read
  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!currentUserId || !roomId) {
      console.warn('markRoomAsRead aborted: Missing currentUserId or roomId', { currentUserId, roomId });
      return;
    }
    
    // Update local state immediately for snappy UI
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    
    console.log('Attempting to mark read with payload:', { roomId, currentUserId });

    // Update database
    const { data, error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', currentUserId)
      .or('is_read.eq.false,is_read.is.null')
      .select();
      
    if (error) {
      console.error('Error marking messages as read:', error);
    } else if (data && data.length === 0) {
      console.log('markRoomAsRead: 0 rows updated (messages were likely already read).');
    } else {
      console.log(`Successfully marked ${data?.length} messages as read.`);
    }
  }, [currentUserId]);

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

  // Send a message
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

    return data;
  };

  // Subscribe to realtime messages for active room
  useEffect(() => {
    if (!activeRoomId) return;

    fetchMessages(activeRoomId);
    // Mark as read when opening a room
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
        // Auto-mark as read since user is viewing this room
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
    if (!currentUserId) return;

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
        // If message is not from current user and not in the active room, increment unread
        if (msg.sender_id !== currentUserId) {
          if (msg.room_id === activeRoomId) {
            // Already viewing this room, mark as read
            markRoomAsRead(msg.room_id);
          } else {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.room_id]: (prev[msg.room_id] || 0) + 1
            }));
          }
        }
      }
    );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeRoomId, markRoomAsRead]);

  return {
    rooms,
    messages,
    activeRoomId,
    setActiveRoomId,
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
