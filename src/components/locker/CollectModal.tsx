'use client';
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, CheckCircle, AlertCircle, ShieldQuestion, MessageSquare, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Locker, ChatMessage, VerificationResult } from "@/types/locker";
import { generateOTP } from "@/lib/locker-data";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLockerTransactions } from "@/hooks/useLockerTransactions";

interface CollectModalProps {
  locker: Locker | null;
  isOpen: boolean;
  onClose: () => void;
  onCollect: (lockerId: number) => void;
  transactionId?: string;
}

type CollectStep = 'security' | 'verifying' | 'otp' | 'chat' | 'success';

export function CollectModal({ locker, isOpen, onClose, onCollect, transactionId }: CollectModalProps) {
  const MAX_ATTEMPTS = 3;
  const [step, setStep] = useState<CollectStep>('security');
  const [userAnswer, setUserAnswer] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [otpGeneratedAt, setOtpGeneratedAt] = useState<Date | null>(null);
  const [otpTimeLeft, setOtpTimeLeft] = useState<number>(0);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const { markAsCollected } = useLockerTransactions();

  // Timer useEffect for Collect OTP timeout
  useEffect(() => {
    if (!otpGeneratedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
      const remaining = 600 - elapsed;
      if (remaining <= 0) {
        setOtpTimeLeft(0);
        clearInterval(interval);
        // Timeout! Handle OTP expiration
        setGeneratedOTP('');
        setOtpGeneratedAt(null);
        setOtp('');
        setStep('security');
        setAttempts(0);
        setUserAnswer('');
        setError('รหัส OTP หมดอายุแล้ว กรุณาตอบคำถามยืนยันสิทธิ์อีกครั้ง');
        toast.error('รหัส OTP หมดอายุแล้ว กรุณาตอบคำถามยืนยันสิทธิ์อีกครั้ง');
      } else {
        setOtpTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [otpGeneratedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const publishOTP = async (otpValue: string) => {
    try {
      const mqttModule = await import('mqtt');
      const connectFn = mqttModule.connect || (mqttModule.default && mqttModule.default.connect);
      if (connectFn && locker) {
        const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
        if (brokerUrl) {
          const client = connectFn(brokerUrl, {
            clientId: `lostreturn-otp-pub-${Math.random().toString(16).slice(2, 8)}`,
            connectTimeout: 8000,
            username: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
            password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
          });

          client.on('connect', () => {
            client.publish(`lostreturn/locker/${locker.id}/command`, JSON.stringify({ otp: otpValue }), { qos: 1 }, () => {
              client.end(true);
            });
          });

          client.on('error', (err) => {
            console.error('[MQTT] OTP publish error:', err);
            client.end(true);
          });
        }
      }
    } catch (mqttErr) {
      console.error('[MQTT] Failed to publish OTP:', mqttErr);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (attempts >= MAX_ATTEMPTS) {
      setError(`คุณตอบผิดครบ ${MAX_ATTEMPTS} ครั้งแล้ว กรุณาติดต่อผู้ฝากผ่านแชท`);
      setStep('chat');
      setChatMessages([{
        id: '1',
        sender: 'claimer',
        message: `ตอบคำถามผิดครบ ${MAX_ATTEMPTS} ครั้ง ขอความช่วยเหลือ`,
        timestamp: new Date()
      }]);
      return;
    }

    if (!userAnswer.trim()) {
      setError('กรุณากรอกคำตอบ');
      return;
    }

    if (!locker?.securityQuestion) {
      toast.error('ไม่พบคำถามลับ');
      return;
    }

    setStep('verifying');
    setError('');

    try {
      const response = await fetch('/api/verify-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAnswer: userAnswer.trim(),
          correctAnswer: locker.securityQuestion.answer,
          question: locker.securityQuestion.question
        })
      });

      if (!response.ok) {
        throw new Error('Failed to verify answer');
      }

      const data = await response.json();
      console.log('Verification result:', data);
      setVerificationResult(data);

      if (data.isMatch) {
        // Answer is correct - generate OTP
        const newOTP = generateOTP();
        publishOTP(newOTP);
        setGeneratedOTP(newOTP);
        setOtpGeneratedAt(new Date());
        setStep('otp');
        toast.success('ยืนยันตัวตนสำเร็จ!');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          // Max attempts reached - force chat
          setStep('chat');
          setChatMessages([{
            id: '1',
            sender: 'claimer',
            message: `ตอบคำถามผิดครบ ${MAX_ATTEMPTS} ครั้ง ขอความช่วยเหลือ`,
            timestamp: new Date()
          }]);
          toast.error(`ตอบผิดครบ ${MAX_ATTEMPTS} ครั้ง กรุณาติดต่อผู้ฝาก`);
        } else {
          // Still have attempts left - go back to security
          setStep('security');
          setUserAnswer('');
          setError(`คำตอบไม่ถูกต้อง (เหลือ ${MAX_ATTEMPTS - newAttempts} ครั้ง)`);
          toast.error(`คำตอบไม่ถูกต้อง เหลืออีก ${MAX_ATTEMPTS - newAttempts} ครั้ง`);
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStep('security');
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      toast.error('ไม่สามารถตรวจสอบคำตอบได้');
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('กรุณากรอก OTP 6 หลัก');
      return;
    }

    if (otpGeneratedAt) {
      const elapsed = Math.floor((new Date().getTime() - otpGeneratedAt.getTime()) / 1000);
      if (elapsed >= 600) {
        setError('รหัส OTP หมดอายุแล้ว');
        toast.error('รหัส OTP หมดอายุแล้ว');
        setGeneratedOTP('');
        setOtpGeneratedAt(null);
        setOtp('');
        setStep('security');
        setAttempts(0);
        setUserAnswer('');
        return;
      }
    }

    if (otp === generatedOTP) {
      setError('');
      setStep('verifying');

      try {
        if (transactionId) {
          // 1. Update Supabase with matched OTP, timestamp, status and collected_at
          const { error: updateError } = await supabase
            .from('locker_transactions')
            .update({
              otp: otp,
              otp_generated_at: otpGeneratedAt?.toISOString(),
              status: 'collected',
              collected_at: new Date().toISOString()
            })
            .eq('id', transactionId);

          if (updateError) {
            console.error('Error updating OTP in Supabase:', updateError);
          }

          // Update transaction status to collected
          await markAsCollected(transactionId);
        }

        // 2. Publish MQTT OPEN command
        try {
          const mqttModule = await import('mqtt');
          const connectFn = mqttModule.connect || (mqttModule.default && mqttModule.default.connect);
          if (connectFn && locker) {
            const brokerUrl = process.env.NEXT_PUBLIC_MQTT_BROKER_URL;
            if (brokerUrl) {
              const client = connectFn(brokerUrl, {
                clientId: `lostreturn-collect-${Math.random().toString(16).slice(2, 8)}`,
                connectTimeout: 8000,
                username: process.env.NEXT_PUBLIC_MQTT_USERNAME || undefined,
                password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || undefined,
              });

              client.on('connect', () => {
                client.publish(`lostreturn/locker/${locker.id}/command`, 'OPEN', { qos: 1 }, () => {
                  client.end(true);
                });
              });

              client.on('error', (err) => {
                console.error('[MQTT] Collect error:', err);
                client.end(true);
              });
            }
          }
        } catch (mqttErr) {
          console.error('[MQTT] Failed to publish OPEN command:', mqttErr);
        }

        setStep('success');
      } catch (err) {
        console.error('Error completing collection:', err);
        setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        setStep('otp');
      }
    } else {
      setError('รหัส OTP ไม่ถูกต้อง');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: 'claimer',
      message: newMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate depositor response (in real app this would be real-time)
    setTimeout(() => {
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'depositor',
        message: 'ขอบคุณที่ติดต่อมา กรุณารอสักครู่นะครับ',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, response]);
    }, 1500);
  };

  const handleDepositorApprove = () => {
    // Simulate depositor approving and sending OTP
    const newOTP = generateOTP();
    publishOTP(newOTP);
    setGeneratedOTP(newOTP);
    setOtpGeneratedAt(new Date());
    setStep('otp');
    toast.success('ผู้ฝากอนุมัติแล้ว! กรุณากรอก OTP');
  };

  const handleConfirm = async () => {
    if (locker) {
      onCollect(locker.id);
      toast.success('รับของสำเร็จ!');
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('security');
    setUserAnswer('');
    setOtp('');
    setGeneratedOTP('');
    setOtpGeneratedAt(null);
    setOtpTimeLeft(0);
    setError('');
    setChatMessages([]);
    setNewMessage('');
    setVerificationResult(null);
    setAttempts(0);
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
                  <div className={`p-1.5 sm:p-2 rounded-lg ${step === 'chat' ? 'bg-accent/10' : 'bg-warning/10'}`}>
                    {step === 'security' || step === 'verifying' ? (
                      <ShieldQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                    ) : step === 'chat' ? (
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    ) : (
                      <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg">
                    {step === 'security' || step === 'verifying' ? 'ยืนยันความเป็นเจ้าของ' : 
                     step === 'chat' ? 'ติดต่อผู้ฝาก' :
                     step === 'otp' ? 'กรอก OTP' : 'สำเร็จ'} - ช่อง {locker.id}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 sm:h-9 sm:w-9">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                {/* Security Question Step */}
                {step === 'security' && (
                  <form onSubmit={handleSecuritySubmit} className="space-y-6">
                    <div className="text-center mb-4">
                      <p className="text-muted-foreground">
                        สิ่งของในช่อง: <span className="font-medium text-foreground">{locker.itemDescription}</span>
                      </p>
                    </div>

                    {locker.securityQuestion ? (
                      <>
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-sm font-medium text-foreground mb-1">คำถามยืนยัน:</p>
                          <p className="text-foreground">{locker.securityQuestion.question}</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="answer">คำตอบของคุณ</Label>
                          <Input
                            id="answer"
                            placeholder="พิมพ์คำตอบ..."
                            value={userAnswer}
                            onChange={(e) => {
                              setUserAnswer(e.target.value);
                              setError('');
                            }}
                          />
                          {error && (
                            <div className="flex items-center gap-2 text-destructive text-sm">
                              <AlertCircle className="w-4 h-4" />
                              {error}
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          โอกาสตอบคำถาม: {MAX_ATTEMPTS - attempts}/{MAX_ATTEMPTS} ครั้ง
                        </p>

                        <Button type="submit" className="w-full" size="lg" disabled={attempts >= MAX_ATTEMPTS}>
                          ตรวจสอบคำตอบ
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">ไม่มีคำถามลับสำหรับช่องนี้</p>
                        <Button onClick={() => setStep('otp')} className="mt-4">
                          กรอก OTP โดยตรง
                        </Button>
                      </div>
                    )}
                  </form>
                )}

                {/* Verifying Step */}
                {step === 'verifying' && (
                  <div className="text-center py-8 space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="text-muted-foreground">กำลังตรวจสอบคำตอบด้วย AI...</p>
                  </div>
                )}

                {/* OTP Step */}
                {step === 'otp' && (
                  <form onSubmit={handleOTPVerify} className="space-y-6">
                    <div className="text-center mb-4">
                      <div className="p-4 rounded-2xl bg-success/10 inline-block mb-4">
                        <CheckCircle className="w-8 h-8 text-success" />
                      </div>
                      <p className="text-muted-foreground mb-2">OTP ของคุณคือ:</p>
                      <div className="text-3xl font-bold tracking-[0.3em] gradient-primary bg-clip-text text-transparent">
                        {generatedOTP}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otp">กรอกรหัส OTP เพื่อยืนยัน</Label>
                      <Input
                        id="otp"
                        placeholder="xxxxxx"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setError('');
                        }}
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={6}
                      />
                      {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="w-4 h-4" />
                          {error}
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      ยืนยัน OTP
                    </Button>
                    <p className="text-xs text-destructive font-semibold text-center mt-3">
                      รหัสจะหมดอายุใน {formatTime(otpTimeLeft)} นาที
                    </p>
                  </form>
                )}

                {/* Chat Step */}
                {step === 'chat' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">
                        ❌ คำตอบไม่ตรงกับที่บันทึกไว้ 
                        {verificationResult?.reason && (
                          <span className="block text-muted-foreground mt-1">({verificationResult.reason})</span>
                        )}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      กรุณาติดต่อผู้ฝากเพื่อยืนยันตัวตน เมื่อผู้ฝากอนุมัติจะส่ง OTP ให้คุณ
                    </p>

                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'claimer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                msg.sender === 'claimer'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="พิมพ์ข้อความ..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>

                    {/* Simulate depositor approval button (for demo) */}
                    <Button 
                      onClick={handleDepositorApprove} 
                      variant="outline" 
                      className="w-full"
                    >
                      🎭 จำลอง: ผู้ฝากอนุมัติ
                    </Button>
                  </div>
                )}

                {/* Success Step */}
                {step === 'success' && (
                  <div className="text-center space-y-6">
                    <div className="p-4 rounded-2xl bg-success/10 inline-block">
                      <CheckCircle className="w-12 h-12 text-success" />
                    </div>
                    
                    <div>
                      <p className="text-xl font-semibold text-foreground mb-2">ยืนยันสำเร็จ!</p>
                      <p className="text-muted-foreground">
                        ตู้ช่อง {locker.id} กำลังปลดล็อก...
                      </p>
                    </div>

                    <Button onClick={handleConfirm} className="w-full" size="lg" variant="success">
                      เสร็จสิ้น
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
