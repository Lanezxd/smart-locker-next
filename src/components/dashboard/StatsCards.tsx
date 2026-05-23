'use client';
import { Box, Package, Lock, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Locker } from "@/types/locker";

interface StatsCardsProps {
  lockers: Locker[];
}

export function StatsCards({ lockers }: StatsCardsProps) {
  const empty = lockers.filter((l) => l.status === "empty").length;
  const occupied = lockers.filter((l) => l.status === "occupied").length;
  const locked = lockers.filter((l) => l.status === "locked").length;
  const total = lockers.length;

  const stats = [
    {
      label: "ช่องทั้งหมด",
      value: total,
      icon: Box,
      color: "text-foreground",
      bg: "bg-secondary",
    },
    {
      label: "ช่องว่าง",
      value: empty,
      icon: Box,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "มีของฝาก",
      value: occupied,
      icon: Package,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "ล็อก/ซ่อม",
      value: locked,
      icon: Lock,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="default" className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
