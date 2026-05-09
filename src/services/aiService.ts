import { GoogleGenAI } from '@google/genai';
import { collection, query, getDocs, limit, orderBy, addDoc, serverTimestamp, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function fetchPlatformContext() {
  let contextStr = "Here is some context about the current platform data:\\n\\n";
  try {
    const oppQ = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(10));
    const oppSnapshot = await getDocs(oppQ);
    const opportunities = oppSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (opportunities.length > 0) {
       contextStr += "Recent Opportunities (Internships/Jobs):\\n";
       opportunities.forEach(opp => {
         contextStr += `- ${opp.title} at ${opp.company} (${opp.location}, ${opp.type})\\n`;
       });
       contextStr += "\\n";
    }

    const evtQ = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(10));
    const evtSnapshot = await getDocs(evtQ);
    const events = evtSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (events.length > 0) {
      contextStr += "Upcoming Events:\\n";
      events.forEach(evt => {
        contextStr += `- ${evt.title} (${evt.type}) at ${evt.location}\\n`;
      });
      contextStr += "\\n";
    }
    
    contextStr += "Important Note: You are Campus Connect AI, the built-in intelligent assistant. Keep responses helpful, concise, and structured. Use Markdown.";
  } catch (error) {
    console.error("Error fetching context:", error);
  }
  return contextStr;
}

export async function sendMessageToAI(chatId: string, userId: string, messageText: string, history: {role: string, text: string}[], fileBase64String?: string, fileMimeType?: string) {
  // 1. Fetch context
  const context = await fetchPlatformContext();
  
  // 2. Prepare contents parameter
  // Role must be 'user' or 'model'
  const contents = [];
  
  // Provide system context as the first user message, or rather we use systemInstruction if possible.
  // We will configure systemInstruction and pass history in contents array.
  
  for (const msg of history) {
    contents.push({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    });
  }
  
  // Add the new user message
  const userParts: any[] = [{ text: messageText }];
  if (fileBase64String && fileMimeType) {
    userParts.push({
      inlineData: {
        data: fileBase64String,
        mimeType: fileMimeType
      }
    });
  }

  contents.push({
    role: 'user',
    parts: userParts
  });

  // 3. Save User message to firestore
  const newMsgRef = await addDoc(collection(db, `aiChats/${chatId}/messages`), {
    chatId,
    sender: 'user',
    message: messageText + (fileBase64String ? "\n*(Attached Document)*" : ""),
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'aiChats', chatId), {
    updatedAt: serverTimestamp()
  });

  return ai.models.generateContentStream({
    model: "gemini-3-flash-preview", // Following skill: Basic Text Tasks
    contents,
    config: {
      systemInstruction: context + "\n\nIf the user attaches a resume, act as an expert ATS (Applicant Tracking System) Analyzer and career coach. Score the resume, provide specific actionable suggestions and corrections to improve ATS parsing and impact, and recommend roles the candidate is a good fit for based on the resume.",
      temperature: 0.7
    }
  });
}

export async function createAiChat(userId: string, initialMessage: string) {
  // Determine title based on first message
  let title = "New Chat";
  try {
    const titleResp = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a concise 3-4 word title for a chat that starts with this message: "${initialMessage}". Don't use quotes.`
    });
    title = titleResp.text?.trim() || "New Chat";
  } catch (err: any) {
    console.warn("Failed to generate chat title due to AI rate limit/error, using default.", err);
  }

  const chatRef = await addDoc(collection(db, 'aiChats'), {
    userId,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return chatRef.id;
}

