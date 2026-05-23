'use client';

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { LockerGrid } from "@/components/locker/LockerGrid";
import { DepositModal } from "@/components/locker/DepositModal";
import { CollectModal } from "@/components/locker/CollectModal";
import { mockLockers } from "@/lib/locker-data";
import { Locker } from "@/types/locker";
import { useLockerTransactions } from "@/hooks/useLockerTransactions";
import { useAuth } from "@/hooks/useAuth";

const DashboardPage = () => {
  const { user } = useAuth();
  const { transactions, loading, fetchTransactions, getTransactionByLocker } = useLockerTransactions();
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | undefined>();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);

  // Merge mock lockers with real transaction data
  const lockers = useMemo(() => {
    return mockLockers.map(locker => {
      const transaction = getTransactionByLocker(locker.id);
      if (transaction) {
        return {
          ...locker,
          status: 'occupied' as const,
          itemDescription: transaction.item_description,
          depositorName: transaction.depositor_name,
          depositorContact: transaction.depositor_contact,
          depositedAt: new Date(transaction.deposited_at),
          otp: transaction.otp || undefined,
          securityQuestion: transaction.security_question && transaction.security_answer ? {
            question: transaction.security_question,
            answer: transaction.security_answer
          } : undefined,
          imageUrl: transaction.image_url || undefined
        };
      }
      return { ...locker, status: 'empty' as const };
    });
  }, [transactions, getTransactionByLocker]);

  const handleLockerClick = (locker: Locker) => {
    setSelectedLocker(locker);
    const transaction = getTransactionByLocker(locker.id);
    setSelectedTransactionId(transaction?.id);
    
    if (locker.status === 'empty') {
      setIsDepositOpen(true);
    } else if (locker.status === 'occupied') {
      setIsCollectOpen(true);
    }
  };

  const handleDeposit = (_lockerId: number, _data: unknown, _otp: string) => {
    fetchTransactions();
  };

  const handleCollect = (_lockerId: number) => {
    fetchTransactions();
  };

  const handleRefresh = () => {
    fetchTransactions();
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">จัดการและดูสถานะตู้ล็อกเกอร์แบบเรียลไทม์</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2 w-full sm:w-auto" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </motion.div>

      {/* Stats */}
      <section className="mb-6 sm:mb-8">
        <StatsCards lockers={lockers} />
      </section>

      {/* Lockers Grid */}
      <section>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4"
        >
          สถานะช่องล็อกเกอร์
        </motion.h2>
        <LockerGrid lockers={lockers} onLockerClick={handleLockerClick} />
      </section>

      {/* Instructions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 sm:mt-8 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50 border border-border"
      >
        <h3 className="font-medium text-foreground text-sm sm:text-base mb-2">คำแนะนำ:</h3>
        <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
          <li>• คลิกที่ช่อง <span className="text-primary font-medium">ว่าง</span> เพื่อฝากของ</li>
          <li>• คลิกที่ช่อง <span className="text-warning font-medium">มีของ</span> เพื่อรับของคืน</li>
          <li>• ช่องที่ <span className="text-destructive font-medium">ล็อก</span> ไม่สามารถใช้งานได้</li>
        </ul>
      </motion.section>

      {/* Modals */}
      <DepositModal
        locker={selectedLocker}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onDeposit={handleDeposit}
        userId={user?.id}
      />
      <CollectModal
        locker={selectedLocker}
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        onCollect={handleCollect}
        transactionId={selectedTransactionId}
      />
    </div>
  );
};

export default DashboardPage;
