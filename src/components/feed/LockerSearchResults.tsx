'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Package, ArrowRight, MapPin, Clock, Loader2 } from 'lucide-react';
import { LockerTransaction } from '@/hooks/useLockerTransactions';

interface LockerSearchResultsProps {
  transactions: LockerTransaction[];
  loading: boolean;
  searchQuery: string;
  onLockerClick: (lockerId: number) => void;
}

export const LockerSearchResults = ({ 
  transactions, 
  loading, 
  searchQuery,
  onLockerClick 
}: LockerSearchResultsProps) => {
  if (!searchQuery.trim()) return null;

  // Filter transactions by item description
  const filteredTransactions = transactions.filter(t => 
    t.status === 'deposited' && 
    t.item_description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">กำลังค้นหาตู้ล็อคเกอร์...</span>
          </div>
        </div>
      </div>
    );
  }

  if (filteredTransactions.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              ตู้ล็อคเกอร์ที่มีของตรงกัน ({filteredTransactions.length})
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            กดเพื่อไปรับของจากตู้ล็อคเกอร์
          </p>
        </div>

        {/* Results */}
        <div className="divide-y divide-border">
          {filteredTransactions.map((transaction, index) => (
            <motion.button
              key={transaction.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onLockerClick(transaction.locker_id)}
              className="w-full p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors text-left group"
            >
              {/* Locker number badge */}
              <div className="w-14 h-14 rounded-2xl bg-foreground text-background flex flex-col items-center justify-center shrink-0">
                <span className="text-xs opacity-70">ตู้</span>
                <span className="text-xl font-bold">
                  {String(transaction.locker_id).padStart(2, '0')}
                </span>
              </div>

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {transaction.item_description}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(transaction.deposited_at).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    ผู้ฝาก: {transaction.depositor_name}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground text-primary flex items-center justify-center transition-all">
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

