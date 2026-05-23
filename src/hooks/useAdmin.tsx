'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdmin = (userId?: string) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async () => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
    }

    setIsAdmin(!!data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  // Also re-check when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (userId) {
        checkAdmin();
      }
    });
    return () => subscription.unsubscribe();
  }, [userId, checkAdmin]);

  return { isAdmin, loading };
};
