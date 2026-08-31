import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { publishMqttServer } from '@/lib/serverMqtt';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rateLimit';

const unlockLockerSchema = z.object({
  lockerId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]),
  transactionId: z.string().uuid('Invalid transactionId format').optional(),
  otp: z.string().trim().regex(/^\d{6}$/, 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก').optional(),
  action: z.enum(['collect', 'deposit', 'admin']).default('collect'),
  collectorName: z.string().max(100, 'ชื่อยาวเกินไป').optional(),
  collectorContact: z.string().max(100, 'ข้อมูลติดต่อยาวเกินไป').optional(),
});

export async function POST(req: Request) {
  try {
    // 1. General Rate Limiting Guard (Max 15 requests / min / IP)
    const rateLimit = checkRateLimit(req, {
      limit: 15,
      windowMs: 60 * 1000,
      prefix: 'locker-unlock',
    });

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit.reset, 'คุณส่งคำขอปลดล็อกตู้บ่อยเกินไป กรุณารอสักครู่');
    }

    // 2. Auth Guard
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing authentication token' }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const user = authData.user;

    // 3. Zod Input Validation
    const rawBody = await req.json().catch(() => null);
    const parsed = unlockLockerSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'ข้อมูลนำเข้าไม่ถูกต้อง';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { lockerId, transactionId, otp, action, collectorName, collectorContact } = parsed.data;

    // 4. Handle Admin Override Unlock
    if (action === 'admin') {
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
      }

      console.info(`[Audit Log] Admin ${user.id} unlocked locker #${lockerId} at ${new Date().toISOString()}`);
      await publishMqttServer(`lostreturn/locker/${lockerId}/command`, 'OPEN');
      return NextResponse.json({ success: true, message: 'Admin unlocked locker successfully' });
    }

    // 5. Handle Deposit Unlock (Pre-condition Guard for Empty/Available Locker)
    if (action === 'deposit') {
      // Stricter Rate Limiting for Deposit Action (Max 5 requests / min / IP)
      const depositRateLimit = checkRateLimit(req, {
        limit: 5,
        windowMs: 60 * 1000,
        prefix: 'locker-unlock-deposit',
      });

      if (!depositRateLimit.allowed) {
        return rateLimitExceededResponse(depositRateLimit.reset, 'คุณส่งคำขอเปิดตู้ฝากของบ่อยเกินไป กรุณารอสักครู่');
      }

      if (transactionId) {
        // Case 1: Client provided the newly created transactionId
        const { data: myTx, error: myTxError } = await supabaseAdmin
          .from('locker_transactions')
          .select('id, user_id, status, locker_id')
          .eq('id', transactionId)
          .eq('locker_id', lockerId)
          .maybeSingle();

        if (myTxError) {
          console.error('[API /api/locker/unlock] Error checking user transaction for deposit:', myTxError);
          return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบรายการฝาก' }, { status: 500 });
        }

        if (!myTx) {
          return NextResponse.json({ error: 'ไม่พบรายการฝากของที่ระบุ' }, { status: 404 });
        }

        // Must belong to the authenticated user who initiated the deposit
        if (myTx.user_id && myTx.user_id !== user.id) {
          return NextResponse.json({ error: 'คุณไม่มีสิทธิ์สั่งเปิดตู้สำหรับรายการนี้' }, { status: 403 });
        }

        // Verify there is NO OTHER conflicting active transaction on this locker
        const { data: conflictingTx, error: conflictError } = await supabaseAdmin
          .from('locker_transactions')
          .select('id')
          .eq('locker_id', lockerId)
          .eq('status', 'deposited')
          .neq('id', transactionId)
          .maybeSingle();

        if (conflictError) {
          console.error('[API /api/locker/unlock] Error checking conflicting transactions:', conflictError);
          return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะตู้' }, { status: 500 });
        }

        if (conflictingTx) {
          return NextResponse.json(
            { error: 'ตู้นี้ไม่ว่าง มีสิ่งของอื่นฝากอยู่ ไม่สามารถเปิดเพื่อฝากของได้' },
            { status: 409 }
          );
        }
      } else {
        // Case 2: No transactionId provided -> verify locker is available or has user's recent deposit
        const { data: existingTx, error: checkError } = await supabaseAdmin
          .from('locker_transactions')
          .select('id, user_id, status, created_at, deposited_at')
          .eq('locker_id', lockerId)
          .eq('status', 'deposited')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (checkError) {
          console.error('[API /api/locker/unlock] Error checking locker status for deposit:', checkError);
          return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะตู้' }, { status: 500 });
        }

        if (existingTx) {
          const txTimestamp = existingTx.created_at || existingTx.deposited_at;
          const isRecent = txTimestamp ? (Date.now() - new Date(txTimestamp).getTime() < 3 * 60 * 1000) : false;

          // Allow if this active transaction belongs to the current user and was created recently
          if (!(existingTx.user_id === user.id && isRecent)) {
            return NextResponse.json(
              { error: 'ตู้นี้ไม่ว่าง มีสิ่งของฝากอยู่ ไม่สามารถเปิดเพื่อฝากของได้' },
              { status: 409 }
            );
          }
        }
      }

      // Audit Log
      console.info(`[Audit Log] User ${user.id} requested deposit unlock for locker #${lockerId} (tx: ${transactionId || 'none'}) at ${new Date().toISOString()}`);

      await publishMqttServer(`lostreturn/locker/${lockerId}/command`, 'OPEN');
      return NextResponse.json({ success: true, message: 'Locker opened for deposit', lockerId });
    }

    // 6. Handle Collect (Claim) Unlock with OTP Verification
    if (!otp) {
      return NextResponse.json({ error: 'กรุณากรอกรหัส OTP 6 หลัก' }, { status: 400 });
    }

    // Query active transaction for this locker (Selective columns to avoid over-fetching)
    let query = supabaseAdmin
      .from('locker_transactions')
      .select('id, locker_id, otp, otp_generated_at, status')
      .eq('status', 'deposited');

    if (transactionId) {
      query = query.eq('id', transactionId);
    } else {
      query = query.eq('locker_id', lockerId);
    }

    const { data: transaction, error: txError } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Active deposit transaction not found' }, { status: 404 });
    }

    // Verify OTP
    if (!transaction.otp || transaction.otp !== otp) {
      return NextResponse.json({ error: 'รหัส OTP ไม่ถูกต้อง' }, { status: 400 });
    }

    // Check expiration (10 minutes = 600s)
    if (transaction.otp_generated_at) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(transaction.otp_generated_at).getTime()) / 1000);
      if (elapsedSeconds > 600) {
        return NextResponse.json({ error: 'รหัส OTP หมดอายุแล้ว กรุณายืนยันตัวตนใหม่' }, { status: 400 });
      }
    }

    // Update transaction to collected and clear lock fields
    const { error: updateError } = await supabaseAdmin
      .from('locker_transactions')
      .update({
        status: 'collected',
        collected_at: new Date().toISOString(),
        collector_user_id: user.id,
        collector_name: collectorName || user.email?.split('@')[0] || 'Collector',
        collector_contact: collectorContact || user.email || '',
        locked_by: null,
        locked_until: null,
        lock_reason: null,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('[API /api/locker/unlock] Error updating transaction:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Call stored RPC procedure if available
    try {
      await supabaseAdmin.rpc('mark_transaction_collected', { p_transaction_id: transaction.id });
    } catch {
      // Non-blocking if already updated directly
    }

    // Audit Log
    console.info(`[Audit Log] User ${user.id} claimed locker #${lockerId} (tx: ${transaction.id}) at ${new Date().toISOString()}`);

    // Publish MQTT OPEN command from server
    await publishMqttServer(`lostreturn/locker/${lockerId}/command`, 'OPEN');

    return NextResponse.json({
      success: true,
      message: 'ปลดล็อกตู้สำเร็จ',
      lockerId,
      transactionId: transaction.id
    });
  } catch (err: any) {
    console.error('[API /api/locker/unlock] Unexpected unlock error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
