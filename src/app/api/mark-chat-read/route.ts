import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface MarkChatReadBody {
  // Locker chat fields
  roomId?: string;
  room_id?: string;
  currentUserId?: string;
  current_user_id?: string;

  // Admin chat fields
  targetUserId?: string;
  target_user_id?: string;
  userId?: string;
  user_id?: string;
  viewerRole?: 'user' | 'admin' | string;
  viewer_role?: 'user' | 'admin' | string;
  role?: 'user' | 'admin' | string;

  // Chat type selector
  type?: 'locker' | 'admin';
}

export async function POST(req: Request) {
  try {
    const body: MarkChatReadBody = await req.json().catch(() => ({}));

    // Optional: Extract authenticated user from Authorization header if available
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const { data: authData } = await supabaseAdmin.auth.getUser(token);
        if (authData?.user) {
          authenticatedUserId = authData.user.id;
        }
      }
    }

    const roomId = body.roomId || body.room_id;
    const currentUserId = body.currentUserId || body.current_user_id || authenticatedUserId;
    const targetUserId = body.targetUserId || body.target_user_id || body.userId || body.user_id || authenticatedUserId;
    const viewerRole = (body.viewerRole || body.viewer_role || body.role || '').toLowerCase();

    // -----------------------------------------------------------------------
    // 1. LOCKER CHAT UPDATES (chat_messages)
    // -----------------------------------------------------------------------
    if (roomId && currentUserId) {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', currentUserId)
        .select();

      if (error) {
        console.error('Error updating chat_messages is_read in mark-chat-read:', error);
        return NextResponse.json(
          { error: 'Failed to mark locker chat messages as read', details: error.message },
          { status: 500 }
        );
      }

      console.log(`mark-chat-read: Marked ${data?.length ?? 0} messages as read for room ${roomId} (viewer: ${currentUserId})`);

      return NextResponse.json({
        success: true,
        type: 'locker',
        roomId,
        updatedCount: data?.length ?? 0,
      });
    }

    // -----------------------------------------------------------------------
    // 2. ADMIN CHAT UPDATES (admin_messages)
    // -----------------------------------------------------------------------
    if (targetUserId && (viewerRole === 'admin' || viewerRole === 'user')) {
      // If viewer is 'admin', messages sent by 'user' should be marked as read
      // If viewer is 'user', messages sent by 'admin' should be marked as read
      const targetSenderType = viewerRole === 'admin' ? 'user' : 'admin';

      const { data, error } = await supabaseAdmin
        .from('admin_messages')
        .update({ is_read: true })
        .eq('user_id', targetUserId)
        .eq('sender_type', targetSenderType)
        .select();

      if (error) {
        console.error('Error updating admin_messages is_read in mark-chat-read:', error);
        return NextResponse.json(
          { error: 'Failed to mark admin messages as read', details: error.message },
          { status: 500 }
        );
      }

      console.log(`mark-chat-read: Marked ${data?.length ?? 0} admin messages as read for user ${targetUserId} (viewerRole: ${viewerRole})`);

      return NextResponse.json({
        success: true,
        type: 'admin',
        targetUserId,
        viewerRole,
        updatedCount: data?.length ?? 0,
      });
    }

    // Missing required parameters
    console.warn('mark-chat-read: Invalid request payload:', { roomId, currentUserId, targetUserId, viewerRole });
    return NextResponse.json(
      {
        error: 'Invalid request payload. Provide either (roomId & currentUserId) for Locker Chat or (targetUserId & viewerRole) for Admin Chat.',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Unexpected error in mark-chat-read route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
