import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { question, correctAnswer, userAnswer } = await req.json();

    const prompt = `You are a locker identity verification system.
    Question: "${question}"
    Correct Answer: "${correctAnswer}"
    User Answer: "${userAnswer}"
    Does the user answer match the meaning of the correct answer? (Allow typos/synonyms).
    Return ONLY "true" or "false".`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: 'API Error' }, { status: 500 });

    console.log("Token Usage:", data.usageMetadata);

    const text = data.candidates[0].content.parts[0].text.trim().toLowerCase();
    return NextResponse.json({ isMatch: text.includes('true') });

  } catch (error) {
    return NextResponse.json({ error: 'System Error' }, { status: 500 });
  }
}