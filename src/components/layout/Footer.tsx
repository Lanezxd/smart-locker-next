'use client';

import Link from "next/link";
import { Box, ExternalLink, Mail, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <Box className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">
                Smart<span className="text-primary">Locker</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              ระบบตู้รับฝาก-คืนทรัพย์สินสูญหายอัตโนมัติ<br />
              ปลอดภัยด้วย IoT และ OTP
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">ลิงก์</h4>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/history" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                ประวัติการใช้งาน
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">ติดต่อ</h4>
            <div className="space-y-2">
              <a
                href="mailto:contact@rmuti.ac.th"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@rmuti.ac.th
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub Repository
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40">
          <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-destructive fill-destructive" /> by RMUTI KKC © 2024
          </p>
        </div>
      </div>
    </footer>
  );
}