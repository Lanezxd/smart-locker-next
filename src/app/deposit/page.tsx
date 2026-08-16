'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DepositRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?tab=deposit');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-600">กำลังเปิดหน้าฝากของ...</p>
      </div>
    </div>
  );
}
