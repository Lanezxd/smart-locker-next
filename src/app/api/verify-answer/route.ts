import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = body.question;
    const correctAnswer = body.correctAnswer;
    const userAnswer = body.userAnswer;

    // Safety checks for undefined or empty values
    if (!question || !correctAnswer || !userAnswer) {
      console.warn("Missing verification fields:", { question, correctAnswer, userAnswer });
      return NextResponse.json({ isMatch: false, reason: "Missing input data" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined in the environment.");
      return NextResponse.json({ isMatch: false, reason: "AI service not configured" });
    }

    // Initialize SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a locker identity verification system.
    Question: "${question}"
    Correct Answer: "${correctAnswer}"
    User Answer: "${userAnswer}"
    Does the user answer match the meaning of the correct answer? (Allow typos/synonyms).
    Return ONLY "true" or "false".`;

    let text = 'false';
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      text = (response.text() || '').trim().toLowerCase();

      console.log("Gemini response text:", text);
      if (response.usageMetadata) {
        console.log("Token Usage:", response.usageMetadata);
      }
    } catch (geminiError) {
      // Gemini SDK errors (invalid key, quota, network) — degrade gracefully
      console.error('Gemini API error in verify-answer:', geminiError);
      return NextResponse.json({
        isMatch: false,
        reason: "AI verification temporarily unavailable — please try again"
      });
    }

    const isMatch = text.includes('true');
    return NextResponse.json({ isMatch });

  } catch (error) {
    console.error('System Error in verify-answer:', error);
    return NextResponse.json({ error: 'System Error' }, { status: 500 });
  }
}