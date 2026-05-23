'use client';

import { motion } from "framer-motion";
import { Package, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLockerTransactions } from "@/hooks/useLockerTransactions";

const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
};

const HistoryPage = () => {
  const { transactions, loading } = useLockerTransactions();

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground">ประวัติการใช้งาน</h1>
        <p className="text-muted-foreground">บันทึกการฝากและรับคืนทรัพย์สิน</p>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {transactions.map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card variant="default" className="overflow-hidden hover:shadow-elevated transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className={`p-6 flex items-center justify-center ${
                      record.status === 'collected' ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      {record.status === 'collected' ? (
                        <CheckCircle className="w-10 h-10 text-success" />
                      ) : (
                        <Package className="w-10 h-10 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-foreground">{record.item_description}</h3>
                          <Badge variant={record.status === 'collected' ? 'success' : 'occupied'}>
                            {record.status === 'collected' ? 'รับคืนแล้ว' : 'รอรับคืน'}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">ช่อง {record.locker_id}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">ผู้ฝาก</p>
                          <p className="font-medium text-foreground">{record.depositor_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ติดต่อ</p>
                          <p className="font-medium text-foreground">{record.depositor_contact}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ฝากเมื่อ: {formatDate(record.deposited_at)}
                        </span>
                        {record.collected_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-success" />
                            รับคืนเมื่อ: {formatDate(record.collected_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">ยังไม่มีประวัติการใช้งาน</p>
        </motion.div>
      )}
    </div>
  );
};

export default HistoryPage;
