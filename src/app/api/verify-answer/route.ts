import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = body.question;
    const correctAnswer = body.correctAnswer;
    const userAnswer = body.userAnswer;

    // Safety checks for undefined or empty values (คงเดิม)
    if (!question || !correctAnswer || !userAnswer) {
      console.warn("Missing verification fields:", { question, correctAnswer, userAnswer });
      return NextResponse.json({ isMatch: false, reason: "Missing input data" });
    }

    // เปลี่ยนมาดึงค่าจาก GROQ_API_KEY
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is not defined in the environment.");
      return NextResponse.json({ isMatch: false, reason: "AI service not configured" });
    }

    // Initialize Groq SDK
    const groq = new Groq({ apiKey });

    const prompt = `You are a locker identity verification system.
    Question: "${question}"
    Correct Answer: "${correctAnswer}"
    User Answer: "${userAnswer}"
    Does the user answer match the meaning of the correct answer? (Allow typos/synonyms).
    Return ONLY "true" or "false".`;

    let text = 'false';
    try {
      // เรียกใช้โมเดลของ Groq (เลือก llama-3.3-70b-versatile ที่ฉลาดและฟรีโควตาสูง)
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1, // ตั้งค่าต่ำเพื่อให้ผลลัพธ์เป็นคำว่า true/false นิ่ง ๆ แม่นยำ
      });

      text = (chatCompletion.choices[0]?.message?.content || '').trim().toLowerCase();

      console.log("Groq response text:", text);

      // แสดงปริมาณ Token Usage ในฝั่ง Groq
      if (chatCompletion.usage) {
        console.log("Token Usage (Groq):", chatCompletion.usage);
      }
    } catch (groqError) {
      // โหมดประคองระบบหาก Groq Error (ทำงานแบบเดิมกับ GeminiError)
      console.error('Groq API error in verify-answer:', groqError);
      return NextResponse.json({
        isMatch: false,
        reason: "AI verification temporarily unavailable — please try again"
      });
    }

    // ส่งค่าผลลัพธ์กลับไปรูปเดิมเหมือนโค้ดเดิมของคุณเป๊ะ ๆ 
    const isMatch = text.includes('true');
    return NextResponse.json({ isMatch });

  } catch (error) {
    console.error('System Error in verify-answer:', error);
    return NextResponse.json({ error: 'System Error' }, { status: 500 });
  }
}