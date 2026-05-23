'use client';
import { Box, Lock, Unlock, Package } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Locker, LockerStatus } from "@/types/locker";
import { getLockerStatusText } from "@/lib/locker-data";

interface LockerCardProps {
  locker: Locker;
  onClick?: (locker: Locker) => void;
}

const statusConfig: Record<LockerStatus, {
  icon: typeof Box;
  badgeVariant: "empty" | "occupied" | "locked";
  bgClass: string;
}> = {
  empty: {
    icon: Unlock,
    badgeVariant: "empty",
    bgClass: "from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40",
  },
  occupied: {
    icon: Package,
    badgeVariant: "occupied",
    bgClass: "from-warning/5 to-warning/10 border-warning/20 hover:border-warning/40",
  },
  locked: {
    icon: Lock,
    badgeVariant: "locked",
    bgClass: "from-destructive/5 to-destructive/10 border-destructive/20",
  },
};

export function LockerCard({ locker, onClick }: LockerCardProps) {
  const config = statusConfig[locker.status];
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: locker.status !== 'locked' ? 1.02 : 1 }}
      whileTap={{ scale: locker.status !== 'locked' ? 0.98 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => locker.status !== 'locked' && onClick?.(locker)}
        disabled={locker.status === 'locked'}
        className={cn(
          "w-full p-6 rounded-xl border-2 bg-gradient-to-br transition-all duration-300",
          "flex flex-col items-center justify-center gap-4",
          "shadow-card hover:shadow-elevated",
          config.bgClass,
          locker.status === 'locked' && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-lg font-semibold text-foreground">
            ช่อง {locker.id}
          </span>
          <Badge variant={config.badgeVariant}>
            {getLockerStatusText(locker.status)}
          </Badge>
        </div>

        {locker.imageUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden">
            <img 
              src={locker.imageUrl} 
              alt={locker.itemDescription || 'Item'} 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={cn(
            "w-16 h-16 rounded-xl flex items-center justify-center",
            locker.status === 'empty' && "bg-primary/10 text-primary",
            locker.status === 'occupied' && "bg-warning/10 text-warning",
            locker.status === 'locked' && "bg-destructive/10 text-destructive",
          )}>
            <Icon className="w-8 h-8" />
          </div>
        )}

        {locker.itemDescription && (
          <p className="text-sm text-muted-foreground text-center line-clamp-2">
            {locker.itemDescription}
          </p>
        )}
      </button>
    </motion.div>
  );
}
