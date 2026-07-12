'use client';
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Send, CheckCircle, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Locker, SecurityQuestion } from "@/types/locker";
import { generateOTP } from "@/lib/locker-data";
import { toast } from "sonner";
import { useLockerTransactions } from "@/hooks/useLockerTransactions";

interface DepositModalProps {
  locker: Locker | null;
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (lockerId: number, data: DepositFormData, otp: string) => void;
  userId?: string;
}

export interface DepositFormData {
  itemDescription: string;
  depositorName: string;
  depositorContact: string;
  securityQuestion: SecurityQuestion;
}

export function DepositModal({ locker, isOpen, onClose, onDeposit, userId }: DepositModalProps) {
  const [step, setStep] = useState<'form' | 'security' | 'otp'>('form');
  const [formData, setFormData] = useState<DepositFormData>({
    itemDescription: '',
    depositorName: '',
    depositorContact: '',
    securityQuestion: {
      question: '',
      answer: '',
    },
  });
  const [generatedOTP, setGeneratedOTP] = useState('');
  const { createDeposit } = useLockerTransactions();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemDescription || !formData.depositorName || !formData.depositorContact) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setStep('security');
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.securityQuestion.question || !formData.securityQuestion.answer) {
      toast.error('กรุณากรอกคำถามและคำตอบลับ');
      return;
    }

    if (locker) {
      try {
        // Save to database (otp and otp_generated_at left blank/NULL)
        await createDeposit({
          locker_id: locker.id,
          item_description: formData.itemDescription,
          depositor_name: formData.depositorName,
          depositor_contact: formData.depositorContact,
          security_question: formData.securityQuestion.question,
          security_answer: formData.securityQuestion.answer,
          user_id: userId
        });
        
        onDeposit(locker.id, formData, '');
        toast.success('ฝากของสำเร็จ! ตั้งคำถามยืนยันสิทธิ์แล้ว');
        handleClose();
      } catch (err) {
        console.error('Error during deposit:', err);
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    }
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ 
      itemDescription: '', 
      depositorName: '', 
      depositorContact: '',
      securityQuestion: { question: '', answer: '' }
    });
    setGeneratedOTP('');
    onClose();
  };

  if (!locker) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 sm:pb-4 px-3 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                    {step === 'security' ? (
                      <ShieldQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    ) : (
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg">
                    {step === 'security' ? 'ตั้งคำถามลับ' : step === 'otp' ? 'รหัส OTP' : 'ฝากของ'} - ช่อง {locker.id}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 sm:h-9 sm:w-9">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                {step === 'form' && (
                  <form onSubmit={handleFormSubmit} className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemDescription">รายละเอียดสิ่งของ</Label>
                      <Textarea
                        id="itemDescription"
                        placeholder="เช่น กระเป๋าสตางค์สีดำ, โทรศัพท์มือถือ..."
                        value={formData.itemDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, itemDescription: e.target.value }))}
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="depositorName">ชื่อผู้ฝาก</Label>
                      <Input
                        id="depositorName"
                        placeholder="ชื่อ-นามสกุล"
                        value={formData.depositorName}
                        onChange={(e) => setFormData(prev => ({ ...prev, depositorName: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="depositorContact">เบอร์โทร / Email</Label>
                      <Input
                        id="depositorContact"
                        placeholder="08x-xxx-xxxx หรือ email@example.com"
                        value={formData.depositorContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, depositorContact: e.target.value }))}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      ถัดไป
                    </Button>
                  </form>
                )}

                {step === 'security' && (
                  <form onSubmit={handleSecuritySubmit} className="space-y-4">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">💡 คำถามลับ</strong> ช่วยยืนยันความเป็นเจ้าของ เพื่อให้ผู้รับของได้รหัส OTP ทันทีโดยไม่ต้องรอติดต่อคุณ
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="securityQuestion">คำถามลับ</Label>
                      <Textarea
                        id="securityQuestion"
                        placeholder="เช่น บัตรใบหน้าสุดในกระเป๋าคือบัตรอะไร? หรือ กระเป๋ามีตำหนิตรงไหน?"
                        value={formData.securityQuestion.question}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          securityQuestion: { ...prev.securityQuestion, question: e.target.value }
                        }))}
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="securityAnswer">คำตอบ (ระบบ AI จะตรวจจับคีย์เวิร์ด)</Label>
                      <Input
                        id="securityAnswer"
                        placeholder="เช่น บัตรประชาชน, มีรอยขีดที่มุมขวา"
                        value={formData.securityQuestion.answer}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          securityQuestion: { ...prev.securityQuestion, answer: e.target.value }
                        }))}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={() => setStep('form')} className="flex-1">
                        ย้อนกลับ
                      </Button>
                      <Button type="submit" className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ยืนยันการฝาก
                      </Button>
                    </div>
                  </form>
                )}

              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
