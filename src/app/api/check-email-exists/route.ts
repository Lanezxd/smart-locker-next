import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ exists: false, error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check Supabase Auth Users using admin client
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (error) {
      console.warn('supabaseAdmin listUsers error:', error);
      return NextResponse.json({ exists: null, error: error.message });
    }

    const userExists = (data?.users || []).some(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    return NextResponse.json({ exists: userExists });
  } catch (err: unknown) {
    console.error('Error in check-email-exists:', err);
    return NextResponse.json({ exists: null, error: 'Internal server error' }, { status: 500 });
  }
}
