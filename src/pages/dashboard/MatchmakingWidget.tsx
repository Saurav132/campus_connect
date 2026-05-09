import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { fetchPlatformContext } from '../../services/aiService';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function MatchmakingWidget() {
  const { userData } = useAuth();
  const [recommendations, setRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecommendations() {
      if (!userData) return;
      try {
        const platformData = await fetchPlatformContext();
        
        const prompt = `Based on the following user profile and platform data, generate 2 short and highly relevant actionable insights or recommendations for this user. 
Format as a brief markdown list. E.g. "We found a matching frontend internship at Google. [Apply Here]". Be creative and helpful. 
Do not use markdown bolding in a way that breaks layout, just simple text and bullet points.

User Profile:
Name: ${userData.displayName || 'Unknown'}
Role: ${userData.role || 'Unknown'}
Skills: ${(userData.skills || []).join(', ') || 'Various'}
Department: ${(userData as any).department || 'Unknown'}

Platform Data:
${platformData}
`;

        const resp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt
        });

        setRecommendations(resp.text || 'No new insights at this moment.');
      } catch (err: any) {
        if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
          setRecommendations("AI Quota Exceeded. Please configure your API billing details to view insights.");
        } else {
          setRecommendations("Unable to fetch AI insights at this moment.");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRecommendations();
  }, [userData]);

  return (
    <Card className="xl:col-span-2 relative overflow-hidden group border-[var(--card-border)] hover:border-yellow-500/30 transition-all duration-300">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:rotate-12">
        <Sparkles className="w-32 h-32 text-yellow-500" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" /> AI Career Insights
        </CardTitle>
        <CardDescription>Real-time contextual recommendations based on your profile and platform opportunities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" /> AI is analyzing opportunities...
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert text-[var(--text-primary)]">
            {recommendations.split('\\n').filter(r => r.trim().length > 0).map((rec, i) => (
              <div key={i} className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] backdrop-blur-sm mb-3">
                 <p className="text-sm font-medium leading-relaxed">{rec.replace(/^[-*]\\s/, '')}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
