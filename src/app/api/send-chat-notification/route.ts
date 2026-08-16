import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface NotificationRequestBody {
  // Common fields
  content?: string;
  message?: string;
  message_type?: string;
  messageId?: string;
  message_id?: string;
  type?: 'locker' | 'admin';

  // Locker Chat (Case A)
  roomId?: string;
  room_id?: string;

  // Admin Chat (Case B)
  sender_type?: 'user' | 'admin';
  userId?: string;
  user_id?: string;
}

// Unified Minimal HTML Email Template for ALL Notification Types
function generateMinimalEmailHtml(chatLink: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 24px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <h1 style="font-size: 24px; font-weight: bold; color: #000000; margin: 0 0 16px 0;">มีคนพยายามติดต่อคุณผ่านหน้าเว็บ</h1>
    <p style="font-size: 16px; color: #333333; margin: 0 0 24px 0; line-height: 1.5;">คุณสามารถเข้าเว็บผ่านลิงค์ด้านล่าง</p>
    <p style="margin: 0;">
      <a href="${chatLink}" style="font-size: 16px; color: #2563eb; text-decoration: underline; word-break: break-all;">${chatLink}</a>
    </p>
  </body>
</html>`;
}

export async function POST(req: Request) {
  try {
    // =========================================================================
    // 1. AUTHENTICATION VERIFICATION
    // =========================================================================
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing bearer token' }, { status: 401 });
    }

    // Verify session token via supabaseAdmin
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      console.warn('Authentication failed in send-chat-notification:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const senderUserId = authData.user.id;
    const body: NotificationRequestBody = await req.json().catch(() => ({}));
    const currentMsgId = body.messageId || body.message_id;

    // Top-Level Request Logging
    console.log('[DEBUG Admin Chat] Received Payload:', JSON.stringify(body));

    // Determine notification context: Locker Chat (Case A) vs Admin Chat (Case B)
    const isLockerChat = Boolean(body.roomId || body.room_id || (body.type === 'locker' && !body.sender_type));
    const appUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://lostreturn.vercel.app').replace(/\/$/, '');

    // Unified Email Metadata
    const senderFrom = `"LostReturn" <${process.env.SMTP_USER}>`;
    const emailSubject = 'มีข้อความใหม่ถึงคุณ';

    // Prepare transporter with env configurations
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // =========================================================================
    // CASE A: LOCKER CHAT (chat_messages & chat_rooms)
    // =========================================================================
    if (isLockerChat) {
      const roomId = body.roomId || body.room_id;
      if (!roomId) {
        return NextResponse.json({ error: 'Missing roomId for locker chat notification' }, { status: 400 });
      }

      // Query chat room details
      const { data: room, error: roomError } = await supabaseAdmin
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError || !room) {
        console.error('Chat room not found:', { roomId, roomError });
        return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
      }

      // Determine receiver UUID
      let receiverUserId: string;

      if (senderUserId === room.depositor_id) {
        receiverUserId = room.claimer_id;
      } else if (senderUserId === room.claimer_id) {
        receiverUserId = room.depositor_id;
      } else {
        return NextResponse.json(
          { error: 'Forbidden: Authenticated user is not a participant in this chat room' },
          { status: 403 }
        );
      }

      // =========================================================================
      // GUARD 2: UNREAD DEBOUNCE
      // Check if unread messages sent by senderUserId already exist in this room
      // =========================================================================
      let unreadQuery = supabaseAdmin
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .eq('sender_id', senderUserId)
        .or('is_read.eq.false,is_read.is.null');

      if (currentMsgId) {
        unreadQuery = unreadQuery.neq('id', currentMsgId);
      }

      const { count: unreadCount, error: unreadErr } = await unreadQuery;
      if (!unreadErr) {
        const hasExistingUnread = currentMsgId ? (unreadCount ?? 0) > 0 : (unreadCount ?? 0) > 1;
        if (hasExistingUnread) {
          console.log(`Locker chat debounce triggered for room ${roomId}: ${unreadCount} unread message(s) exist.`);
          return NextResponse.json({ skipped: true, reason: 'Unread messages already exist' });
        }
      }

      // =========================================================================
      // SERVER-SIDE VERIFICATION DELAY (GRACE PERIOD)
      // Allow active recipients viewing the page time to mark the message as read
      // =========================================================================
      await delay(3500);

      // Re-check read state for current message
      if (currentMsgId) {
        const { data: messageData } = await supabaseAdmin
          .from('chat_messages')
          .select('is_read')
          .eq('id', currentMsgId)
          .maybeSingle();

        console.log('[Notification Check] Message ID:', currentMsgId, 'is_read state after delay:', messageData?.is_read);

        if (messageData?.is_read === true) {
          return NextResponse.json({ skipped: true, reason: 'Recipient is active on the page (Message already read)' });
        }
      }

      // =========================================================================
      // GLOBAL ONLINE PRESENCE (HEARTBEAT) GUARD
      // If the recipient is currently active/browsing the website within 90s, skip email
      // =========================================================================
      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('last_seen_at')
        .eq('user_id', receiverUserId)
        .maybeSingle();

      const lastSeen = recipientProfile?.last_seen_at;
      const isOnline = Boolean(lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 90 * 1000);

      console.log('[Presence Check] Recipient ID:', receiverUserId, 'Last seen:', lastSeen, 'Is Online:', isOnline);

      if (isOnline) {
        return NextResponse.json({
          skipped: true,
          reason: 'Recipient is currently online on the website (last_seen within 90s)',
        });
      }

      // Fetch dynamic email addresses for both sender and receiver
      const [senderUserRes, receiverUserRes] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(senderUserId),
        supabaseAdmin.auth.admin.getUserById(receiverUserId),
      ]);

      const senderEmail = senderUserRes.data?.user?.email;
      const receiverEmail = receiverUserRes.data?.user?.email;

      if (!senderEmail || !receiverEmail) {
        console.warn('Could not resolve emails for locker chat:', { senderEmail, receiverEmail });
        return NextResponse.json({ skipped: true, reason: 'Email address not found for participants' });
      }

      // =========================================================================
      // GUARD 1: SELF-EMAIL PREVENTION
      // =========================================================================
      if (senderEmail.toLowerCase().trim() === receiverEmail.toLowerCase().trim()) {
        console.log('Self-email prevented in locker chat:', senderEmail);
        return NextResponse.json({ skipped: true, reason: 'Sender and receiver are the same email' });
      }

      const chatLink = `${appUrl}?roomId=${roomId}`;

      const text = `
มีคนพยายามติดต่อคุณผ่านหน้าเว็บ

คุณสามารถเข้าเว็บผ่านลิงค์ด้านล่าง:
${chatLink}
      `.trim();

      const html = generateMinimalEmailHtml(chatLink);

      // Send mail via nodemailer
      const mailInfo = await transporter.sendMail({
        from: senderFrom,
        to: receiverEmail,
        replyTo: senderEmail,
        subject: emailSubject,
        text,
        html,
      });

      console.log('Locker chat notification email sent successfully:', mailInfo.messageId);
      return NextResponse.json({
        success: true,
        messageId: mailInfo.messageId,
        recipient: receiverEmail,
        type: 'locker',
      });
    }

    // =========================================================================
    // CASE B: ADMIN CHAT (admin_messages linked to student/user and user_roles)
    // =========================================================================
    const senderType = body.sender_type || 'user';
    let senderEmail: string | undefined = undefined;
    let receiverEmail: string | undefined = undefined;
    let chatLink = '';

    if (senderType === 'user') {
      // -----------------------------------------------------------------------
      // Subcase B1: Student/User Sends Message to Admin
      // -----------------------------------------------------------------------
      const studentUserId = body.user_id || body.userId || senderUserId;
      chatLink = `${appUrl}/admin/support`;

      // 1. Debounce Query: check existing unread messages where user_id = studentUserId AND sender_type = 'user' AND is_read = false
      let unreadQuery = supabaseAdmin
        .from('admin_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', studentUserId)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      if (currentMsgId) {
        unreadQuery = unreadQuery.neq('id', currentMsgId);
      }

      const { count: unreadCount, error: unreadErr } = await unreadQuery;
      if (!unreadErr) {
        const hasExistingUnread = currentMsgId ? (unreadCount ?? 0) > 0 : (unreadCount ?? 0) > 1;
        if (hasExistingUnread) {
          console.log(`[Admin Notification] Debounce triggered (User->Admin): ${unreadCount} unread message(s) exist for user ${studentUserId}`);
          return NextResponse.json({ skipped: true, reason: 'Unread messages already exist' });
        }
      }

      // =========================================================================
      // SERVER-SIDE VERIFICATION DELAY (GRACE PERIOD)
      // Allow active admin viewing the chat page time to mark the message as read
      // =========================================================================
      await delay(3500);

      // Re-check read state for current message
      if (currentMsgId) {
        const { data: messageData } = await supabaseAdmin
          .from('admin_messages')
          .select('is_read')
          .eq('id', currentMsgId)
          .maybeSingle();

        console.log('[Notification Check] Message ID:', currentMsgId, 'is_read state after delay:', messageData?.is_read);

        if (messageData?.is_read === true) {
          return NextResponse.json({ skipped: true, reason: 'Recipient is active on the page (Message already read)' });
        }
      }

      // 2. Query public.user_roles for admin user_id
      const { data: adminRoles, error: adminRoleErr } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      console.log('[DEBUG Admin Chat] Query user_roles result:', { adminRolesData: adminRoles, adminRolesError: adminRoleErr });

      const adminUserId = adminRoles?.[0]?.user_id || null;

      // =========================================================================
      // GLOBAL ONLINE PRESENCE (HEARTBEAT) GUARD for Admin
      // If the admin is currently active/browsing the website within 90s, skip email
      // =========================================================================
      if (adminUserId) {
        const { data: adminProfile } = await supabaseAdmin
          .from('profiles')
          .select('last_seen_at')
          .eq('user_id', adminUserId)
          .maybeSingle();

        const lastSeen = adminProfile?.last_seen_at;
        const isOnline = Boolean(lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 90 * 1000);

        console.log('[Presence Check] Admin Recipient ID:', adminUserId, 'Last seen:', lastSeen, 'Is Online:', isOnline);

        if (isOnline) {
          return NextResponse.json({
            skipped: true,
            reason: 'Recipient is currently online on the website (last_seen within 90s)',
          });
        }
      }

      // 3. Resolve Sender (Student) and Receiver (Admin) Emails dynamically
      const [studentUserRes, adminUserRes] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(studentUserId),
        adminUserId ? supabaseAdmin.auth.admin.getUserById(adminUserId) : Promise.resolve(null),
      ]);

      // Sender Email: student's email
      senderEmail = studentUserRes.data?.user?.email || authData.user.email;
      console.log('[DEBUG Admin Chat] Student Sender ID:', studentUserId, '| Email:', senderEmail);

      // Receiver Email (Admin): admin user email or fallback to ADMIN_EMAIL / SMTP_USER
      receiverEmail = adminUserRes?.data?.user?.email || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      console.log('[DEBUG Admin Chat] Resolved Admin Email:', receiverEmail);

      // Guaranteed Fallback if receiverEmail is missing or empty
      if (!receiverEmail) {
        receiverEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'thanapatappakarat@gmail.com';
        console.log('[DEBUG Admin Chat] Applied Fallback Admin Email:', receiverEmail);
      }

      // Diagnostic Log
      console.log('[Admin Notification] Sender:', senderEmail, '--> Admin Receiver:', receiverEmail);

    } else {
      // -----------------------------------------------------------------------
      // Subcase B2: Admin Responds to Student/User
      // -----------------------------------------------------------------------
      const studentUserId = body.user_id || body.userId;
      if (!studentUserId) {
        return NextResponse.json({ error: 'Missing user_id for student recipient' }, { status: 400 });
      }

      chatLink = `${appUrl}/contact-admin`;

      // 1. Debounce Query: check existing unread messages where user_id = studentUserId AND sender_type = 'admin' AND is_read = false
      let unreadQuery = supabaseAdmin
        .from('admin_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', studentUserId)
        .eq('sender_type', 'admin')
        .eq('is_read', false);

      if (currentMsgId) {
        unreadQuery = unreadQuery.neq('id', currentMsgId);
      }

      const { count: unreadCount, error: unreadErr } = await unreadQuery;
      if (!unreadErr) {
        const hasExistingUnread = currentMsgId ? (unreadCount ?? 0) > 0 : (unreadCount ?? 0) > 1;
        if (hasExistingUnread) {
          console.log(`[Admin Notification] Debounce triggered (Admin->User): ${unreadCount} unread message(s) exist for user ${studentUserId}`);
          return NextResponse.json({ skipped: true, reason: 'Unread messages already exist' });
        }
      }

      // =========================================================================
      // SERVER-SIDE VERIFICATION DELAY (GRACE PERIOD)
      // Allow active student viewing the contact-admin page time to mark the message as read
      // =========================================================================
      await delay(3500);

      // Re-check read state for current message
      if (currentMsgId) {
        const { data: messageData } = await supabaseAdmin
          .from('admin_messages')
          .select('is_read')
          .eq('id', currentMsgId)
          .maybeSingle();

        console.log('[Notification Check] Message ID:', currentMsgId, 'is_read state after delay:', messageData?.is_read);

        if (messageData?.is_read === true) {
          return NextResponse.json({ skipped: true, reason: 'Recipient is active on the page (Message already read)' });
        }
      }

      // =========================================================================
      // GLOBAL ONLINE PRESENCE (HEARTBEAT) GUARD for Student
      // If the student is currently active/browsing the website within 90s, skip email
      // =========================================================================
      const { data: studentProfile } = await supabaseAdmin
        .from('profiles')
        .select('last_seen_at')
        .eq('user_id', studentUserId)
        .maybeSingle();

      const lastSeen = studentProfile?.last_seen_at;
      const isOnline = Boolean(lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 90 * 1000);

      console.log('[Presence Check] Student Recipient ID:', studentUserId, 'Last seen:', lastSeen, 'Is Online:', isOnline);

      if (isOnline) {
        return NextResponse.json({
          skipped: true,
          reason: 'Recipient is currently online on the website (last_seen within 90s)',
        });
      }

      // 2. Resolve Sender (Admin) and Receiver (Student) Emails dynamically
      const [adminUserRes, studentUserRes] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(senderUserId),
        supabaseAdmin.auth.admin.getUserById(studentUserId),
      ]);

      // Sender Email: admin email with fallback
      senderEmail = adminUserRes.data?.user?.email || authData.user.email || process.env.ADMIN_EMAIL || process.env.SMTP_USER;

      // Receiver Email: student email
      receiverEmail = studentUserRes.data?.user?.email;

      // Fallback for sender email if empty
      if (!senderEmail) {
        senderEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'lostreturn.th@gmail.com';
      }

      // Diagnostic Log
      console.log('[Admin Notification] Sender:', senderEmail, '--> Student Receiver:', receiverEmail);
    }

    if (!senderEmail || !receiverEmail) {
      console.warn('[Admin Notification] Could not resolve emails:', { senderEmail, receiverEmail });
      return NextResponse.json({ skipped: true, reason: 'Email address not found for participants' });
    }

    // =========================================================================
    // GUARD 1: SELF-EMAIL PREVENTION
    // =========================================================================
    if (senderEmail.toLowerCase().trim() === receiverEmail.toLowerCase().trim()) {
      console.log('[Admin Notification] Self-email prevented:', senderEmail);
      return NextResponse.json({ skipped: true, reason: 'Sender and receiver are the same email' });
    }

    const text = `
มีคนพยายามติดต่อคุณผ่านหน้าเว็บ

คุณสามารถเข้าเว็บผ่านลิงค์ด้านล่าง:
${chatLink}
    `.trim();

    const html = generateMinimalEmailHtml(chatLink);

    // Log before sending email
    console.log('[DEBUG Admin Chat] Attempting to send email from:', senderEmail, 'to:', receiverEmail);

    // Send mail via nodemailer
    const mailInfo = await transporter.sendMail({
      from: senderFrom,
      to: receiverEmail,
      replyTo: senderEmail,
      subject: emailSubject,
      text,
      html,
    });

    console.log('[Admin Notification] Email sent successfully:', mailInfo.messageId);
    return NextResponse.json({
      success: true,
      messageId: mailInfo.messageId,
      recipient: receiverEmail,
      type: 'admin',
    });

  } catch (error: any) {
    console.error('System Error in send-chat-notification route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error while sending notification',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
